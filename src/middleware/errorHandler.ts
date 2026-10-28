import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: 'Validation failed. Please verify input parameters.',
      details: formattedErrors,
    });
  }

  if (err instanceof Error) {
    // Check if error message is user-friendly validation error from simulation engine
    if (
      err.message.includes('Signal timing infeasible') ||
      err.message.includes('Infeasible exclusive pedestrian timing') ||
      err.message.includes('must be') ||
      err.message.includes('exceed')
    ) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }

  // Generic internal server error (never leak stack trace in response)
  console.error('[Unhandled Error]:', err);
  return res.status(500).json({
    success: false,
    error: 'An internal server error occurred while processing your request.',
  });
}
