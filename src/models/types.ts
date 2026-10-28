/**
 * Shared Domain Types for WhatIf City
 */

export type ScenarioCategory = 'traffic' | 'pedestrian' | 'parking' | 'transit' | 'one-way' | 'waste';

export interface TrafficSimulationParams {
  arrivalRateVehiclesPerMin: number;
  initialQueueVehicles: number;
  dischargeRateVehiclesPerMin: number;
  signalCycleLengthSeconds: number;
  effectiveGreenTimeSeconds: number;
  amberAndAllRedSeconds?: number;
  pedestrianCrossingDurationSeconds: number;
  exclusivePedestrianPhase?: boolean;
  simulationDurationMinutes: number;
  randomSeed?: number;
  useStochasticArrivals?: boolean;
}

export interface TimeStepRecord {
  second: number;
  timeLabel: string;
  isGreen: boolean;
  arrivals: number;
  departures: number;
  queueLength: number;
  cumulativeArrivals: number;
  cumulativeDepartures: number;
  cumulativeDelayVehicleSeconds: number;
  pedestrianCrossingActive: boolean;
}

export type LevelOfService = 'LOS A' | 'LOS B' | 'LOS C' | 'LOS D' | 'LOS E' | 'LOS F';

export interface TrafficKPIs {
  totalArrivals: number;
  totalDepartures: number; // Vehicles served
  remainingQueue: number;
  maxQueueLength: number;
  avgQueueLength: number;
  totalDelayVehicleSeconds: number;
  avgDelayPerVehicleSeconds: number;
  throughputPerHour: number;
  unservedDemand: number;
  degreeOfSaturation: number; // v/c ratio
  levelOfService: LevelOfService;
  pedestrianWaitAvgSeconds?: number;
}

export interface SimulationResult {
  scenarioId?: string;
  scenarioName: string;
  modelVersion: string;
  modelType: ScenarioCategory;
  parameters: Record<string, any>;
  kpis: TrafficKPIs;
  timeSeries: TimeStepRecord[];
  assumptions: string[];
  warnings: string[];
  dataSource: 'synthetic_baseline' | 'user_configured' | 'measured_estimate';
  seedUsed?: number;
  executionTimestamp: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  category: ScenarioCategory;
  description: string;
  locationType: string;
  dataSource: string;
  modelVersion: string;
  visibility: 'public' | 'private' | 'unlisted';
  inputParameters: TrafficSimulationParams;
  baselineParameters: { name: string } & TrafficSimulationParams;
  defaultPlanA: { name: string } & TrafficSimulationParams;
  defaultPlanB: { name: string } & TrafficSimulationParams;
  knownLimitations?: string[];
  coordinates?: [number, number]; // [lat, lng]
}

export interface KPIDifference {
  metricKey: string;
  metricLabel: string;
  baselineValue: number;
  planValue: number;
  absoluteChange: number;
  percentageChange: number | null; // null if baseline is 0
  preferredDirection: 'lower' | 'higher';
  isImprovement: boolean;
  unit: string;
}

export interface TradeOffNote {
  dimension: string;
  winner: string;
  description: string;
  severity: 'positive' | 'warning' | 'neutral';
}

export interface ScenarioComparisonOutput {
  baseline: SimulationResult;
  planA: SimulationResult;
  planB: SimulationResult;
  differencesPlanA: KPIDifference[];
  differencesPlanB: KPIDifference[];
  tradeOffs: TradeOffNote[];
  objectiveScores: {
    objective: 'minimize_delay' | 'minimize_queue' | 'prioritize_pedestrians' | 'balanced';
    weightsDisclosed: Record<string, number>;
    scores: {
      baseline: number;
      planA: number;
      planB: number;
    };
    explanation: string;
  };
  disclaimer: string;
}

export interface SavedProject {
  id: string;
  ownerId?: string;
  title: string;
  description: string;
  scenariosSnapshot: {
    scenarioId: string;
    baselineParams: TrafficSimulationParams;
    planAParams: TrafficSimulationParams;
    planBParams: TrafficSimulationParams;
  };
  createdAt: string;
  updatedAt: string;
}
