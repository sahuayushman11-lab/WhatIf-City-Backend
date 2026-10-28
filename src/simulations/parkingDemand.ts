import { SimulationResult, TimeStepRecord } from '../models/types.js';

export interface ParkingSimulationParams {
  capacityStalls: number;
  arrivalRateVehPerHour: number;
  meanParkingDurationHours: number;
  hourlyPriceUsd: number;
  carpoolReservedStalls?: number;
  transitSubsidyActive?: boolean;
  simulationDurationHours: number;
  randomSeed?: number;
}

export class ParkingDemandSimulationEngine {
  static run(params: ParkingSimulationParams, name = 'Parking Demand'): SimulationResult {
    const hours = params.simulationDurationHours || 8;
    const capacity = params.capacityStalls;
    let arrivalRate = params.arrivalRateVehPerHour;

    // Price elasticity effect: higher price or transit subsidy lowers arrival demand
    if (params.hourlyPriceUsd > 2.0) {
      const excessPrice = params.hourlyPriceUsd - 2.0;
      arrivalRate = Math.max(10, arrivalRate * (1 - excessPrice * 0.08));
    }
    if (params.transitSubsidyActive) {
      arrivalRate *= 0.88; // 12% shift to transit
    }

    const dwellTime = params.meanParkingDurationHours;
    const dischargeRatePerHour = capacity / dwellTime; // steady state turnover

    let currentOccupancy = Math.round(capacity * 0.35); // 35% starting occupancy
    let cumulativeArrivals = 0;
    let cumulativeServed = 0;
    let overflowCars = 0;
    let peakOccupancy = currentOccupancy;
    let totalSearchDelayMinutes = 0;

    const timeSeries: TimeStepRecord[] = [];
    const stepIntervalMinutes = 15;
    const totalSteps = (hours * 60) / stepIntervalMinutes;

    for (let step = 1; step <= totalSteps; step++) {
      const arrivalsThisStep = Math.round((arrivalRate / 60) * stepIntervalMinutes);
      const departuresThisStep = Math.min(
        currentOccupancy,
        Math.round((dischargeRatePerHour / 60) * stepIntervalMinutes)
      );

      cumulativeArrivals += arrivalsThisStep;
      currentOccupancy = Math.max(0, currentOccupancy - departuresThisStep);

      const availableStalls = capacity - currentOccupancy;
      let acceptedCars = arrivalsThisStep;
      let rejectedCars = 0;

      if (arrivalsThisStep > availableStalls) {
        acceptedCars = Math.max(0, availableStalls);
        rejectedCars = arrivalsThisStep - acceptedCars;
        overflowCars += rejectedCars;
      }

      currentOccupancy += acceptedCars;
      cumulativeServed += acceptedCars;
      peakOccupancy = Math.max(peakOccupancy, currentOccupancy);

      // Search time penalty when lot is > 85% full
      const occupancyRatio = currentOccupancy / capacity;
      let searchMinutes = 1.5;
      if (occupancyRatio > 0.85) {
        searchMinutes += 12 * Math.pow((occupancyRatio - 0.85) / 0.15, 2);
      }
      totalSearchDelayMinutes += searchMinutes * acceptedCars;

      const elapsedMins = step * stepIntervalMinutes;
      const h = Math.floor(elapsedMins / 60);
      const m = elapsedMins % 60;

      timeSeries.push({
        second: elapsedMins * 60,
        timeLabel: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        isGreen: currentOccupancy < capacity,
        arrivals: arrivalsThisStep,
        departures: departuresThisStep,
        queueLength: currentOccupancy,
        cumulativeArrivals,
        cumulativeDepartures: cumulativeServed,
        cumulativeDelayVehicleSeconds: Math.round(totalSearchDelayMinutes * 60),
        pedestrianCrossingActive: false,
      });
    }

    const peakRatio = peakOccupancy / capacity;
    const avgDelayPerVehicle = cumulativeServed > 0 ? (totalSearchDelayMinutes * 60) / cumulativeServed : 0;

    return {
      scenarioName: name,
      modelVersion: 'v1.0.0-parking-queue',
      modelType: 'parking',
      parameters: { ...params },
      kpis: {
        totalArrivals: cumulativeArrivals,
        totalDepartures: cumulativeServed,
        remainingQueue: currentOccupancy,
        maxQueueLength: peakOccupancy,
        avgQueueLength: Math.round(peakOccupancy * 0.75),
        totalDelayVehicleSeconds: Math.round(totalSearchDelayMinutes * 60),
        avgDelayPerVehicleSeconds: Number(avgDelayPerVehicle.toFixed(1)),
        throughputPerHour: Math.round(cumulativeServed / hours),
        unservedDemand: overflowCars,
        degreeOfSaturation: Number(peakRatio.toFixed(2)),
        levelOfService: peakRatio > 0.95 ? 'LOS F' : peakRatio > 0.85 ? 'LOS D' : 'LOS B',
        pedestrianWaitAvgSeconds: 0,
      },
      timeSeries,
      assumptions: [
        `Capacity: ${capacity} parking stalls with mean dwell duration of ${dwellTime} hrs.`,
        `Non-linear cruising delay model applied above 85% occupancy threshold.`,
        `Overflow vehicles are diverted away when facility hits 100% saturation.`,
      ],
      warnings:
        peakOccupancy >= capacity
          ? [`Parking deck hit 100% capacity. ${overflowCars} incoming vehicles overflowed or had to cruise.`]
          : [],
      dataSource: 'synthetic_baseline',
      executionTimestamp: new Date().toISOString(),
    };
  }
}
