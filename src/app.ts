import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import simulationRoutes from './routes/simulationRoutes.js';
import scenarioRoutes from './routes/scenarioRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

export const app = express();

// Security and CORS
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Payload size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WhatIf City Simulation Backend',
    version: '1.0.0',
    mode: process.env.NODE_ENV || 'development',
  });
});

// Main API Routes
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/simulations', simulationRoutes);
app.use('/api/projects', projectRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling
app.use(errorHandler);
