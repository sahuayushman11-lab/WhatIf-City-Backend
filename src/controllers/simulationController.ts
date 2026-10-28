import { Request, Response, NextFunction } from 'express';
import { TrafficQueueSimulationEngine } from '../simulations/trafficQueue.js';
import { ScenarioComparisonEngine } from '../simulations/comparisonEngine.js';
import { trafficParamsSchema, compareRequestSchema } from '../validators/simulationValidator.js';
import { scenarioService } from '../services/scenarioService.js';
import crypto from 'crypto';

export class SimulationController {
  static async runSimulation(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedParams = trafficParamsSchema.parse(req.body.parameters ?? req.body);
      const scenarioName = req.body.scenarioName || 'Custom Simulation Run';
      const scenarioId = req.body.scenarioId;

      const result = TrafficQueueSimulationEngine.run(validatedParams, {
        scenarioName,
        scenarioId,
      });

      // Persist in history
      const runId = crypto.randomUUID();
      const runRecord = {
        id: runId,
        scenarioId,
        createdAt: new Date().toISOString(),
        result,
      };
      scenarioService.saveSimulationRun(runId, runRecord);

      res.status(200).json({
        success: true,
        data: {
          runId,
          ...result,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async compareSimulations(req: Request, res: Response, next: NextFunction) {
    try {
      const { baseline, planA, planB, names, objective } = compareRequestSchema.parse(req.body);

      const baselineResult = TrafficQueueSimulationEngine.run(baseline, {
        scenarioName: names?.baseline || 'Baseline Scenario',
      });
      const planAResult = TrafficQueueSimulationEngine.run(planA, {
        scenarioName: names?.planA || 'Proposed Plan A',
      });
      const planBResult = TrafficQueueSimulationEngine.run(planB, {
        scenarioName: names?.planB || 'Proposed Plan B',
      });

      const comparison = ScenarioComparisonEngine.compare(
        baselineResult,
        planAResult,
        planBResult,
        objective
      );

      res.status(200).json({
        success: true,
        data: comparison,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSimulationById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const run = scenarioService.getSimulationRun(id);
      if (!run) {
        return res.status(404).json({
          success: false,
          error: 'Simulation run not found.',
        });
      }
      res.status(200).json({
        success: true,
        data: run,
      });
    } catch (err) {
      next(err);
    }
  }
}
