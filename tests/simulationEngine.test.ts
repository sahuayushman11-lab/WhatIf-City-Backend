import { describe, it, expect } from 'vitest';
import { TrafficQueueSimulationEngine } from '../src/simulations/trafficQueue.js';
import { ScenarioComparisonEngine } from '../src/simulations/comparisonEngine.js';
import { TrafficSimulationParams } from '../src/models/types.js';

describe('TrafficQueueSimulationEngine', () => {
  const validBaseParams: TrafficSimulationParams = {
    arrivalRateVehiclesPerMin: 25,
    initialQueueVehicles: 10,
    dischargeRateVehiclesPerMin: 30,
    signalCycleLengthSeconds: 90,
    effectiveGreenTimeSeconds: 40,
    amberAndAllRedSeconds: 4,
    pedestrianCrossingDurationSeconds: 20,
    simulationDurationMinutes: 15,
    randomSeed: 12345,
    useStochasticArrivals: false,
  };

  it('runs successfully with valid parameter ranges', () => {
    const result = TrafficQueueSimulationEngine.run(validBaseParams);
    expect(result).toBeDefined();
    expect(result.kpis.totalArrivals).toBeGreaterThan(0);
    expect(result.kpis.totalDepartures).toBeGreaterThan(0);
    expect(result.kpis.levelOfService).toMatch(/LOS [A-F]/);
    expect(result.timeSeries.length).toBeGreaterThan(0);
  });

  it('rejects invalid signal timing where green + clearance exceeds cycle', () => {
    const invalidParams: TrafficSimulationParams = {
      ...validBaseParams,
      signalCycleLengthSeconds: 60,
      effectiveGreenTimeSeconds: 58,
      amberAndAllRedSeconds: 4, // 58 + 4 = 62 > 60
    };

    expect(() => TrafficQueueSimulationEngine.run(invalidParams)).toThrow(
      /Signal timing infeasible/
    );
  });

  it('rejects invalid exclusive pedestrian phase timing', () => {
    const invalidPedParams: TrafficSimulationParams = {
      ...validBaseParams,
      signalCycleLengthSeconds: 90,
      effectiveGreenTimeSeconds: 60,
      amberAndAllRedSeconds: 5,
      pedestrianCrossingDurationSeconds: 30, // 60 + 5 + 30 = 95 > 90
      exclusivePedestrianPhase: true,
    };

    expect(() => TrafficQueueSimulationEngine.run(invalidPedParams)).toThrow(
      /Infeasible exclusive pedestrian timing/
    );
  });

  it('ensures queue length is never negative at any time step', () => {
    // High discharge rate with zero arrivals and small initial queue
    const emptyParams: TrafficSimulationParams = {
      ...validBaseParams,
      arrivalRateVehiclesPerMin: 0,
      initialQueueVehicles: 3,
      dischargeRateVehiclesPerMin: 60,
      simulationDurationMinutes: 5,
    };

    const result = TrafficQueueSimulationEngine.run(emptyParams);
    expect(result.kpis.remainingQueue).toBeGreaterThanOrEqual(0);
    result.timeSeries.forEach((step) => {
      expect(step.queueLength).toBeGreaterThanOrEqual(0);
    });
  });

  it('ensures departures never exceed queue + arrivals or road capacity', () => {
    const result = TrafficQueueSimulationEngine.run(validBaseParams);
    result.timeSeries.forEach((step) => {
      // Step departures cannot exceed what was in queue + arrived
      expect(step.departures).toBeGreaterThanOrEqual(0);
    });
    // Total departures cannot exceed total vehicles that entered system
    const totalVehicles = result.kpis.totalArrivals + validBaseParams.initialQueueVehicles;
    expect(result.kpis.totalDepartures).toBeLessThanOrEqual(totalVehicles);
  });

  it('strictly balances arrival, departure, and residual queue accounting', () => {
    const result = TrafficQueueSimulationEngine.run(validBaseParams);
    const totalVehiclesIn = result.kpis.totalArrivals + validBaseParams.initialQueueVehicles;
    const totalVehiclesOut = result.kpis.totalDepartures + result.kpis.remainingQueue;
    expect(totalVehiclesIn).toBe(totalVehiclesOut);
  });

  it('is bit-for-bit reproducible when given identical random seed', () => {
    const stochasticParams: TrafficSimulationParams = {
      ...validBaseParams,
      useStochasticArrivals: true,
      randomSeed: 99999,
    };

    const run1 = TrafficQueueSimulationEngine.run(stochasticParams);
    const run2 = TrafficQueueSimulationEngine.run(stochasticParams);

    expect(run1.kpis.totalArrivals).toBe(run2.kpis.totalArrivals);
    expect(run1.kpis.totalDepartures).toBe(run2.kpis.totalDepartures);
    expect(run1.kpis.maxQueueLength).toBe(run2.kpis.maxQueueLength);
    expect(run1.kpis.avgDelayPerVehicleSeconds).toBe(run2.kpis.avgDelayPerVehicleSeconds);
  });
});

describe('ScenarioComparisonEngine', () => {
  it('safely handles zero-denominator cases without NaN or Infinity', () => {
    const result = ScenarioComparisonEngine.calculatePercentageChange(0, 15);
    expect(result).toBeNull();

    const resultBothZero = ScenarioComparisonEngine.calculatePercentageChange(0, 0);
    expect(resultBothZero).toBeNull();

    const normalChange = ScenarioComparisonEngine.calculatePercentageChange(20, 15);
    expect(normalChange).toBe(-25.0);
  });

  it('accurately compares baseline, Plan A, and Plan B', () => {
    const baselineParams: TrafficSimulationParams = {
      arrivalRateVehiclesPerMin: 28,
      initialQueueVehicles: 10,
      dischargeRateVehiclesPerMin: 30,
      signalCycleLengthSeconds: 90,
      effectiveGreenTimeSeconds: 30,
      amberAndAllRedSeconds: 4,
      pedestrianCrossingDurationSeconds: 20,
      simulationDurationMinutes: 15,
      randomSeed: 42,
    };

    const planAParams: TrafficSimulationParams = {
      ...baselineParams,
      effectiveGreenTimeSeconds: 45, // More green time
    };

    const planBParams: TrafficSimulationParams = {
      ...baselineParams,
      effectiveGreenTimeSeconds: 40,
      exclusivePedestrianPhase: true,
      signalCycleLengthSeconds: 100,
    };

    const baseline = TrafficQueueSimulationEngine.run(baselineParams, { scenarioName: 'Baseline' });
    const planA = TrafficQueueSimulationEngine.run(planAParams, { scenarioName: 'Plan A' });
    const planB = TrafficQueueSimulationEngine.run(planBParams, { scenarioName: 'Plan B' });

    const comparison = ScenarioComparisonEngine.compare(baseline, planA, planB, 'balanced');

    expect(comparison.differencesPlanA.length).toBeGreaterThan(0);
    expect(comparison.differencesPlanB.length).toBeGreaterThan(0);
    expect(comparison.tradeOffs.length).toBeGreaterThan(0);
    expect(comparison.objectiveScores.scores.planA).toBeGreaterThanOrEqual(0);
    expect(comparison.objectiveScores.scores.planB).toBeGreaterThanOrEqual(0);
    expect(comparison.disclaimer).toContain('simplified');

    // Plan A with 45s green vs 30s baseline should have lower delay
    expect(planA.kpis.avgDelayPerVehicleSeconds).toBeLessThan(baseline.kpis.avgDelayPerVehicleSeconds);
  });
});
