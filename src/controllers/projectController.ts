import { Request, Response, NextFunction } from 'express';
import { scenarioService } from '../services/scenarioService.js';
import { projectCreateSchema } from '../validators/simulationValidator.js';

export class ProjectController {
  static async getAllProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const projects = await scenarioService.getAllProjects();
      res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProjectById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const project = await scenarioService.getProjectById(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found.',
        });
      }
      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = projectCreateSchema.parse(req.body);
      const created = await scenarioService.createProject(validated as any);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await scenarioService.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or already deleted.',
        });
      }
      res.status(200).json({
        success: true,
        message: 'Project deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}
