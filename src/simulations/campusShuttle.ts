import { SimulationResult, TimeStepRecord } from '../models/types.js';

export interface ShuttleSimulationParams {
  passengerArrivalRatePerMin: number;
  fleetSize: number;
  roundtripTimeMinutes: number;
  vehicleCapacityPax: number;
  operatingCostPerBusHour: number;
  simulationDurationMinutes: number;
}

export class CampusShuttleSimulationEngine {
  static run(params: ShuttleSimulationParams, name = 'Campus Shuttle'): SimulationResult {
    const duration = params.simulationDurationMinutes || 60;
    const headwayMinutes = params.roundtripTimeMinutes / Math.max(1, params.fleetSize);
    const capacityPerBus = params.vehicleCapacityPax;
    const arrivalRate = params.passengerArrivalRatePerMin;

    let waitingPax = 0;
    let totalBoarded = 0;
    let totalArrivals = 0;
    let maxWaitQueue = 0;
    let cumulativeWaitMinutes = 0;

    const timeSeries: TimeStepRecord[] = [];
    const headwaySeconds = Math.round(headwayMinutes * 60);

    for (let t = 1; t <= duration * 60; t += 30) {
      const arrived = Math.round((arrivalRate / 60) * 30);
      totalArrivals += arrived;
      waitingPax += arrived;

      let boarded = 0;
      const isBusArrival = t % headwaySeconds < 30;

      if (isBusArrival) {
        boarded = Math.min(waitingPax, capacityPerBus);
        waitingPax -= boarded;
        totalBoarded += boarded;
      }

      maxWaitQueue = Math.max(maxWaitQueue, waitingPax);
      cumulativeWaitMinutes += (waitingPax * 30) / 60;

      if (t % 60 === 0 || t === duration * 60) {
        const mins = Math.floor(t / 60);
        timeSeries.push({
          second: t,
          timeLabel: `${mins}:00`,
          isGreen: isBusArrival,
          arrivals: arrived,
          departures: boarded,
          queueLength: waitingPax,
          cumulativeArrivals: totalArrivals,
          cumulativeDepartures: totalBoarded,
          cumulativeDelayVehicleSeconds: Math.round(cumulativeWaitMinutes * 60),
          pedestrianCrossingActive: false,
        });
      }
    }

    const avgWaitSeconds = totalArrivals > 0 ? (cumulativeWaitMinutes * 60) / totalArrivals : 0;
    const hourlyCapacity = (60 / headwayMinutes) * capacityPerBus;
    const hourlyDemand = arrivalRate * 60;
    const vcRatio = hourlyCapacity > 0 ? hourlyDemand / hourlyCapacity : 999;

    return {
      scenarioName: name,
      modelVersion: 'v1.0.0-transit-headway',
      modelType: 'transit',
      parameters: { ...params },
      kpis: {
        totalArrivals,
        totalDepartures: totalBoarded,
        remainingQueue: waitingPax,
        maxQueueLength: maxWaitQueue,
        avgQueueLength: Math.round(maxWaitQueue * 0.6),
        totalDelayVehicleSeconds: Math.round(cumulativeWaitMinutes * 60),
        avgDelayPerVehicleSeconds: Number(avgWaitSeconds.toFixed(1)),
        throughputPerHour: Math.round((totalBoarded / duration) * 60),
        unservedDemand: waitingPax,
        degreeOfSaturation: Number(vcRatio.toFixed(2)),
        levelOfService: avgWaitSeconds <= 120 ? 'LOS A' : avgWaitSeconds <= 300 ? 'LOS C' : 'LOS F',
        pedestrianWaitAvgSeconds: Number(avgWaitSeconds.toFixed(1)),
      },
      timeSeries,
      assumptions: [
        `Fleet: ${params.fleetSize} shuttles on ${params.roundtripTimeMinutes}-min loop, providing a ${headwayMinutes.toFixed(1)}-min headway.`,
        `Effective passenger carrying capacity: ${Math.round(hourlyCapacity)} pax/hr.`,
        `FIFO boarding with fixed single-stop dwell absorption.`,
      ],
      warnings:
        vcRatio > 1.0
          ? [`Passenger demand exceeds shuttle carrying capacity. Headway is too long to clear peak student queues.`]
          : [],
      dataSource: 'synthetic_baseline',
      executionTimestamp: new Date().toISOString(),
    };
  }
}
