import { TrafficSimulationParams, SimulationResult, TimeStepRecord, TrafficKPIs, LevelOfService } from '../models/types.js';
import { SeededPRNG } from '../utils/prng.js';

export class TrafficQueueSimulationEngine {
  /**
   * Validates parameters and throws descriptive error if invalid
   */
  static validateParams(params: TrafficSimulationParams): { warnings: string[] } {
    const warnings: string[] = [];

    if (!params.signalCycleLengthSeconds || params.signalCycleLengthSeconds < 15) {
      throw new Error('Signal cycle length must be at least 15 seconds.');
    }
    if (params.signalCycleLengthSeconds > 300) {
      throw new Error('Signal cycle length cannot exceed 300 seconds.');
    }
    if (!params.effectiveGreenTimeSeconds || params.effectiveGreenTimeSeconds <= 0) {
      throw new Error('Effective green time must be greater than 0 seconds.');
    }
    const yellow = params.amberAndAllRedSeconds ?? 4;
    if (params.effectiveGreenTimeSeconds + yellow > params.signalCycleLengthSeconds) {
      throw new Error(
        `Signal timing infeasible: Effective green (${params.effectiveGreenTimeSeconds}s) + clearance (${yellow}s) exceeds cycle length (${params.signalCycleLengthSeconds}s).`
      );
    }
    if (params.pedestrianCrossingDurationSeconds < 0) {
      throw new Error('Pedestrian crossing duration cannot be negative.');
    }
    if (params.pedestrianCrossingDurationSeconds > params.signalCycleLengthSeconds) {
      throw new Error('Pedestrian crossing duration cannot exceed the signal cycle length.');
    }
    if (params.exclusivePedestrianPhase) {
      if (params.effectiveGreenTimeSeconds + yellow + params.pedestrianCrossingDurationSeconds > params.signalCycleLengthSeconds) {
        throw new Error(
          `Infeasible exclusive pedestrian timing: Green (${params.effectiveGreenTimeSeconds}s) + Clearance (${yellow}s) + Pedestrian Phase (${params.pedestrianCrossingDurationSeconds}s) exceeds cycle (${params.signalCycleLengthSeconds}s).`
        );
      }
    }
    if (params.arrivalRateVehiclesPerMin < 0) {
      throw new Error('Arrival rate cannot be negative.');
    }
    if (params.dischargeRateVehiclesPerMin <= 0) {
      throw new Error('Discharge rate must be greater than 0.');
    }
    if (params.initialQueueVehicles < 0) {
      throw new Error('Initial queue cannot be negative.');
    }
    if (!params.simulationDurationMinutes || params.simulationDurationMinutes < 1) {
      throw new Error('Simulation duration must be at least 1 minute.');
    }
    if (params.simulationDurationMinutes > 180) {
      throw new Error('Simulation duration capped at 180 minutes for interactive responsiveness.');
    }

    // Warnings for edge conditions
    const greenRatio = params.effectiveGreenTimeSeconds / params.signalCycleLengthSeconds;
    const capacityPerMin = params.dischargeRateVehiclesPerMin * greenRatio;
    const vcRatio = capacityPerMin > 0 ? params.arrivalRateVehiclesPerMin / capacityPerMin : 999;
    if (vcRatio > 1.0) {
      warnings.push(
        `Oversaturated conditions detected (v/c = ${vcRatio.toFixed(2)}). Arrival rate (${params.arrivalRateVehiclesPerMin} veh/min) exceeds green capacity (${capacityPerMin.toFixed(1)} veh/min). Queue will grow continuously.`
      );
    }
    if (greenRatio < 0.2) {
      warnings.push(`Low green time ratio (${(greenRatio * 100).toFixed(0)}%). May cause excessive delay and spillback.`);
    }

    return { warnings };
  }

  /**
   * Computes Level of Service according to Highway Capacity Manual (HCM) criteria for signalized intersections
   */
  static determineLOS(avgDelaySeconds: number, vcRatio: number): LevelOfService {
    if (vcRatio > 1.0) return 'LOS F';
    if (avgDelaySeconds <= 10) return 'LOS A';
    if (avgDelaySeconds <= 20) return 'LOS B';
    if (avgDelaySeconds <= 35) return 'LOS C';
    if (avgDelaySeconds <= 55) return 'LOS D';
    if (avgDelaySeconds <= 80) return 'LOS E';
    return 'LOS F';
  }

  /**
   * Executes deterministic or seeded discrete-time simulation
   */
  static run(
    params: TrafficSimulationParams,
    options: {
      scenarioName?: string;
      scenarioId?: string;
      timeStepSeconds?: number;
    } = {}
  ): SimulationResult {
    const { warnings } = this.validateParams(params);

    const timeStep = options.timeStepSeconds ?? 1; // 1 second step
    const totalSeconds = Math.round(params.simulationDurationMinutes * 60);
    const cycle = params.signalCycleLengthSeconds;
    const green = params.effectiveGreenTimeSeconds;
    const yellow = params.amberAndAllRedSeconds ?? 4;
    const pedCrossing = params.pedestrianCrossingDurationSeconds;
    const isExclusivePed = !!params.exclusivePedestrianPhase;

    const prng = new SeededPRNG(params.randomSeed ?? 42);
    const useStochastic = !!params.useStochasticArrivals;

    // Arrival and discharge rates in vehicles per second
    const arrivalRatePerSec = params.arrivalRateVehiclesPerMin / 60.0;
    const dischargeRatePerSec = params.dischargeRateVehiclesPerMin / 60.0;

    let currentQueue = Math.max(0, Math.round(params.initialQueueVehicles));
    let cumulativeArrivals = 0;
    let cumulativeDepartures = 0;
    let cumulativeDelayVehSec = 0;
    let maxQueue = currentQueue;
    let sumQueue = 0;

    // Fractional accumulators for deterministic continuous mode
    let arrivalAccumulator = 0;
    let dischargeAccumulator = 0;

    // Store decimated time series for UI responsiveness (max ~300 points for charts)
    const sampleInterval = Math.max(1, Math.floor(totalSeconds / 180));
    const timeSeries: TimeStepRecord[] = [];

    for (let t = 1; t <= totalSeconds; t += timeStep) {
      // 1. Determine Signal Phase State
      const cycleOffset = t % cycle;
      let isGreen = false;
      let isPedCrossing = false;

      if (isExclusivePed) {
        // Exclusive scramble phase at start of cycle
        if (cycleOffset < pedCrossing) {
          isPedCrossing = true;
          isGreen = false;
        } else if (cycleOffset < pedCrossing + green) {
          isGreen = true;
          isPedCrossing = false;
        } else {
          isGreen = false;
          isPedCrossing = false;
        }
      } else {
        // Standard vehicular green
        if (cycleOffset < green) {
          isGreen = true;
          isPedCrossing = false;
        } else {
          isGreen = false;
          // Pedestrian crosswalk concurrent with non-conflicting red phase
          if (cycleOffset >= green + yellow && cycleOffset < green + yellow + pedCrossing) {
            isPedCrossing = true;
          }
        }
      }

      // 2. Incoming Arrivals At Step t
      let arrivalsThisStep = 0;
      if (useStochastic) {
        const expectedStepArrival = arrivalRatePerSec * timeStep;
        arrivalsThisStep = prng.poisson(expectedStepArrival);
      } else {
        arrivalAccumulator += arrivalRatePerSec * timeStep;
        if (arrivalAccumulator >= 1.0) {
          arrivalsThisStep = Math.floor(arrivalAccumulator);
          arrivalAccumulator -= arrivalsThisStep;
        }
      }
      cumulativeArrivals += arrivalsThisStep;
      currentQueue += arrivalsThisStep;

      // 3. Departures At Step t
      let departuresThisStep = 0;
      if (isGreen) {
        dischargeAccumulator += dischargeRatePerSec * timeStep;
        const potentialDepartures = Math.floor(dischargeAccumulator);
        if (potentialDepartures > 0) {
          departuresThisStep = Math.min(currentQueue, potentialDepartures);
          currentQueue = Math.max(0, currentQueue - departuresThisStep);
          dischargeAccumulator -= departuresThisStep;
        }
      } else {
        // Red light: discharge accumulator resets to prevent burst carryover
        dischargeAccumulator = 0;
      }

      cumulativeDepartures += departuresThisStep;

      // 4. Queue and Delay Tracking
      maxQueue = Math.max(maxQueue, currentQueue);
      sumQueue += currentQueue;
      cumulativeDelayVehSec += currentQueue * timeStep;

      // 5. Sample record for time-series charts
      if (t % sampleInterval === 0 || t === totalSeconds || t === 1) {
        const mins = Math.floor(t / 60);
        const secs = t % 60;
        timeSeries.push({
          second: t,
          timeLabel: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
          isGreen,
          arrivals: arrivalsThisStep,
          departures: departuresThisStep,
          queueLength: currentQueue,
          cumulativeArrivals,
          cumulativeDepartures,
          cumulativeDelayVehicleSeconds: Math.round(cumulativeDelayVehSec),
          pedestrianCrossingActive: isPedCrossing,
        });
      }
    }

    // 6. Compute Aggregated KPIs
    const totalSteps = totalSeconds / timeStep;
    const avgQueue = totalSteps > 0 ? sumQueue / totalSteps : 0;
    const totalVehiclesEnteringSystem = cumulativeArrivals + params.initialQueueVehicles;
    const avgDelayPerVehicle = totalVehiclesEnteringSystem > 0 ? cumulativeDelayVehSec / totalVehiclesEnteringSystem : 0;
    const durationHours = params.simulationDurationMinutes / 60.0;
    const throughputPerHour = durationHours > 0 ? Math.round(cumulativeDepartures / durationHours) : 0;
    const greenRatio = green / cycle;
    const capacityPerMin = params.dischargeRateVehiclesPerMin * greenRatio;
    const degreeOfSaturation = capacityPerMin > 0 ? Number((params.arrivalRateVehiclesPerMin / capacityPerMin).toFixed(3)) : 999;
    const unservedDemand = Math.max(0, currentQueue);
    const los = this.determineLOS(avgDelayPerVehicle, degreeOfSaturation);

    // Approximate pedestrian wait time: average wait during red phase
    const pedWaitSeconds = Number(((cycle - pedCrossing) / 2).toFixed(1));

    const kpis: TrafficKPIs = {
      totalArrivals: cumulativeArrivals,
      totalDepartures: cumulativeDepartures,
      remainingQueue: currentQueue,
      maxQueueLength: maxQueue,
      avgQueueLength: Number(avgQueue.toFixed(1)),
      totalDelayVehicleSeconds: Math.round(cumulativeDelayVehSec),
      avgDelayPerVehicleSeconds: Number(avgDelayPerVehicle.toFixed(1)),
      throughputPerHour,
      unservedDemand,
      degreeOfSaturation,
      levelOfService: los,
      pedestrianWaitAvgSeconds: pedWaitSeconds,
    };

    const assumptions = [
      `Deterministic time-step simulation (Δt = ${timeStep}s) over ${params.simulationDurationMinutes} minutes.`,
      `Fixed signal cycle C = ${cycle}s with effective green g = ${green}s (g/C ratio = ${greenRatio.toFixed(2)}).`,
      `Saturation discharge rate = ${params.dischargeRateVehiclesPerMin} veh/min (${(params.dischargeRateVehiclesPerMin * 60).toFixed(0)} veh/hr green equivalent).`,
      `Vehicles follow First-In-First-Out (FIFO) queue discipline; no lane-changing or block spillback modeled.`,
      `Pedestrian walk phase: ${pedCrossing}s per cycle (${isExclusivePed ? 'Exclusive scramble' : 'Concurrent'}).`,
      `Educational model: simplified macro/meso queueing equations for scenario comparisons.`,
    ];

    return {
      scenarioId: options.scenarioId,
      scenarioName: options.scenarioName ?? 'Traffic Scenario Run',
      modelVersion: 'v1.0.0-discrete-queue',
      modelType: 'traffic',
      parameters: { ...params },
      kpis,
      timeSeries,
      assumptions,
      warnings,
      dataSource: 'synthetic_baseline',
      seedUsed: params.randomSeed ?? 42,
      executionTimestamp: new Date().toISOString(),
    };
  }
}
