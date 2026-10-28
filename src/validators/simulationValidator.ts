import { z } from 'zod';

export const trafficParamsSchema = z.object({
  arrivalRateVehiclesPerMin: z
    .number({ invalid_type_error: 'Arrival rate must be a number' })
    .min(0, 'Arrival rate must be non-negative')
    .max(200, 'Arrival rate cannot exceed 200 veh/min'),
  initialQueueVehicles: z
    .number({ invalid_type_error: 'Initial queue must be a number' })
    .min(0, 'Initial queue must be non-negative')
    .max(1000, 'Initial queue cannot exceed 1000 vehicles'),
  dischargeRateVehiclesPerMin: z
    .number({ invalid_type_error: 'Discharge rate must be a number' })
    .min(1, 'Discharge rate must be at least 1 veh/min')
    .max(300, 'Discharge rate cannot exceed 300 veh/min'),
  signalCycleLengthSeconds: z
    .number({ invalid_type_error: 'Signal cycle length must be a number' })
    .min(15, 'Signal cycle length must be at least 15 seconds')
    .max(300, 'Signal cycle length cannot exceed 300 seconds'),
  effectiveGreenTimeSeconds: z
    .number({ invalid_type_error: 'Effective green time must be a number' })
    .min(1, 'Effective green time must be at least 1 second')
    .max(300, 'Effective green time cannot exceed 300 seconds'),
  amberAndAllRedSeconds: z.number().min(0).max(20).optional().default(4),
  pedestrianCrossingDurationSeconds: z
    .number({ invalid_type_error: 'Pedestrian crossing duration must be a number' })
    .min(0, 'Pedestrian crossing duration must be non-negative')
    .max(300, 'Pedestrian crossing duration cannot exceed 300 seconds'),
  exclusivePedestrianPhase: z.boolean().optional().default(false),
  simulationDurationMinutes: z
    .number({ invalid_type_error: 'Simulation duration must be a number' })
    .min(1, 'Simulation duration must be at least 1 minute')
    .max(180, 'Simulation duration cannot exceed 180 minutes'),
  randomSeed: z.number().int().optional().default(42),
  useStochasticArrivals: z.boolean().optional().default(false),
}).refine(
  (data) => {
    const yellow = data.amberAndAllRedSeconds ?? 4;
    return data.effectiveGreenTimeSeconds + yellow <= data.signalCycleLengthSeconds;
  },
  {
    message: 'Signal timing infeasible: Effective green time plus clearance interval exceeds the cycle length.',
    path: ['effectiveGreenTimeSeconds'],
  }
).refine(
  (data) => {
    if (data.exclusivePedestrianPhase) {
      const yellow = data.amberAndAllRedSeconds ?? 4;
      return (
        data.effectiveGreenTimeSeconds + yellow + data.pedestrianCrossingDurationSeconds <=
        data.signalCycleLengthSeconds
      );
    }
    return true;
  },
  {
    message: 'Exclusive pedestrian phase requires Green + Yellow + Pedestrian Walk <= Signal Cycle Length.',
    path: ['pedestrianCrossingDurationSeconds'],
  }
);

export const compareRequestSchema = z.object({
  baseline: trafficParamsSchema,
  planA: trafficParamsSchema,
  planB: trafficParamsSchema,
  names: z
    .object({
      baseline: z.string().optional(),
      planA: z.string().optional(),
      planB: z.string().optional(),
    })
    .optional(),
  objective: z.enum(['minimize_delay', 'minimize_queue', 'prioritize_pedestrians', 'balanced']).optional().default('balanced'),
});

export const projectCreateSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  description: z.string().max(500).optional().default(''),
  scenariosSnapshot: z.object({
    scenarioId: z.string(),
    baselineParams: trafficParamsSchema,
    planAParams: trafficParamsSchema,
    planBParams: trafficParamsSchema,
  }),
});
