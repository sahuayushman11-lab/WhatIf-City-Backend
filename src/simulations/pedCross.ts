import { SimulationResult, TimeStepRecord } from '../models/types.js';

export interface PedestrianCrossingParams {
  pedestrianArrivalRatePerMin: number;
  vehicularTrafficPerHour: number;
  crossingLengthMeters: number;
  pedestrianWalkSpeedMps?: number;
  crossingType: 'unsignalized_zebra' | 'pelican_pushbutton' | 'raised_island';
  signalCycleSeconds?: number;
  flashingBeaconEnabled?: boolean;
  simulationDurationMinutes: number;
}

export class PedestrianCrossingSimulationEngine {
  static run(params: PedestrianCrossingParams, name = 'Pedestrian Crosswalk'): SimulationResult {
    const duration = params.simulationDurationMinutes || 30;
    const speed = params.pedestrianWalkSpeedMps || 1.2;
    const walkTimeSeconds = Math.ceil(params.crossingLengthMeters / speed);
    const pedArrivalRate = params.pedestrianArrivalRatePerMin;
    const vehRatePerSec = (params.vehicularTrafficPerHour || 800) / 3600;

    let waitingPeds = 0;
    let totalPedsCrossed = 0;
    let totalPedsArrived = 0;
    let maxPedQueue = 0;
    let cumulativePedWaitSec = 0;

    // Crossing characteristics
    const cycle = params.signalCycleSeconds || 60;
    const isPelican = params.crossingType === 'pelican_pushbutton';
    const isIsland = params.crossingType === 'raised_island';

    const timeSeries: TimeStepRecord[] = [];

    for (let t = 1; t <= duration * 60; t += 2) {
      const arrived = (pedArrivalRate / 60) * 2;
      totalPedsArrived += arrived;
      waitingPeds += arrived;

      let isPedWalkPhase = false;
      if (isPelican) {
        // Pelican grants walk every cycle if button pressed
        const offset = t % cycle;
        isPedWalkPhase = offset < walkTimeSeconds;
      } else if (isIsland) {
        // 2-stage crossing: shorter gap needed
        const headwayGap = 1.0 / Math.max(0.01, vehRatePerSec);
        isPedWalkPhase = headwayGap > (walkTimeSeconds / 2);
      } else {
        // Uncontrolled zebra: yields probabilistically (yield rate ~ 60%)
        const yieldProb = params.flashingBeaconEnabled ? 0.88 : 0.62;
        isPedWalkPhase = Math.random() < yieldProb;
      }

      let crossed = 0;
      if (isPedWalkPhase && waitingPeds > 0) {
        crossed = Math.min(waitingPeds, 8); // 8 peds can cross in 2s
        waitingPeds -= crossed;
        totalPedsCrossed += crossed;
      }

      maxPedQueue = Math.max(maxPedQueue, Math.round(waitingPeds));
      cumulativePedWaitSec += waitingPeds * 2;

      if (t % 30 === 0 || t === duration * 60) {
        const mins = Math.floor(t / 60);
        const secs = t % 60;
        timeSeries.push({
          second: t,
          timeLabel: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
          isGreen: isPedWalkPhase,
          arrivals: Math.round(arrived),
          departures: Math.round(crossed),
          queueLength: Math.round(waitingPeds),
          cumulativeArrivals: Math.round(totalPedsArrived),
          cumulativeDepartures: Math.round(totalPedsCrossed),
          cumulativeDelayVehicleSeconds: Math.round(cumulativePedWaitSec),
          pedestrianCrossingActive: isPedWalkPhase,
        });
      }
    }

    const avgWait = totalPedsArrived > 0 ? cumulativePedWaitSec / totalPedsArrived : 0;

    return {
      scenarioName: name,
      modelVersion: 'v1.0.0-ped-cross',
      modelType: 'pedestrian',
      parameters: { ...params },
      kpis: {
        totalArrivals: Math.round(totalPedsArrived),
        totalDepartures: Math.round(totalPedsCrossed),
        remainingQueue: Math.round(waitingPeds),
        maxQueueLength: maxPedQueue,
        avgQueueLength: Number((maxPedQueue * 0.5).toFixed(1)),
        totalDelayVehicleSeconds: Math.round(cumulativePedWaitSec),
        avgDelayPerVehicleSeconds: Number(avgWait.toFixed(1)), // used as avg pedestrian delay
        throughputPerHour: Math.round((totalPedsCrossed / duration) * 60),
        unservedDemand: Math.round(waitingPeds),
        degreeOfSaturation: Number((waitingPeds / 20).toFixed(2)),
        levelOfService: avgWait <= 10 ? 'LOS A' : avgWait <= 25 ? 'LOS B' : avgWait <= 40 ? 'LOS C' : 'LOS D',
        pedestrianWaitAvgSeconds: Number(avgWait.toFixed(1)),
      },
      timeSeries,
      assumptions: [
        `Crossing width: ${params.crossingLengthMeters}m at design walking speed ${speed} m/s (Clearance walk interval = ${walkTimeSeconds}s).`,
        `Crossing design: ${params.crossingType} ${params.flashingBeaconEnabled ? 'with RRFB flashing beacons' : ''}.`,
        `Yield compliance and headway gaps derived from synthetic campus pedestrian crossing trials.`,
      ],
      warnings:
        avgWait > 35
          ? [`High pedestrian waiting delay (${avgWait.toFixed(1)}s). May lead to risky mid-block jaywalking against vehicular flow.`]
          : [],
      dataSource: 'synthetic_baseline',
      executionTimestamp: new Date().toISOString(),
    };
  }
}
