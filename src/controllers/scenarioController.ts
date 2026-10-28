import { Request, Response, NextFunction } from 'express';
import { scenarioService } from '../services/scenarioService.js';
import { z } from 'zod';

const createScenarioSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.enum(['traffic', 'pedestrian', 'parking', 'transit', 'one-way', 'waste']),
  description: z.string().min(5),
  locationType: z.string().default('intersection'),
  inputParameters: z.record(z.any()),
  baselineParameters: z.record(z.any()),
  defaultPlanA: z.record(z.any()),
  defaultPlanB: z.record(z.any()),
  visibility: z.enum(['public', 'private', 'unlisted']).default('public'),
  dataSource: z.string().default('synthetic_baseline'),
  modelVersion: z.string().default('v1.0.0-discrete-queue'),
});

export class ScenarioController {
  static async getAllScenarios(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, search } = req.query;
      const scenarios = await scenarioService.getAllScenarios({
        category: category as string,
        search: search as string,
      });
      res.status(200).json({
        success: true,
        data: scenarios,
        count: scenarios.length,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getScenarioById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const scenario = await scenarioService.getScenarioById(id);
      if (!scenario) {
        return res.status(404).json({
          success: false,
          error: `Scenario with id '${id}' not found.`,
        });
      }
      res.status(200).json({
        success: true,
        data: scenario,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createScenario(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createScenarioSchema.parse(req.body);
      const created = await scenarioService.createScenario(validated as any);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }
}
