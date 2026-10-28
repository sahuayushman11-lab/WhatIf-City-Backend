import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('WhatIf City REST API Endpoints', () => {
  it('GET /api/health returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toContain('WhatIf City');
  });

  it('GET /api/scenarios returns array of default scenarios', async () => {
    const res = await request(app).get('/api/scenarios');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const defaultScenario = res.body.data.find((s: any) => s.id === 'traffic-college-gate');
    expect(defaultScenario).toBeDefined();
    expect(defaultScenario.name).toContain('Morning Traffic');
  });

  it('GET /api/scenarios/:id returns specific scenario or 404', async () => {
    const res = await request(app).get('/api/scenarios/traffic-college-gate');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('traffic-college-gate');

    const notFoundRes = await request(app).get('/api/scenarios/non-existent-id');
    expect(notFoundRes.status).toBe(404);
  });

  it('POST /api/simulations/run produces deterministic KPIs and time series', async () => {
    const payload = {
      scenarioName: 'Test Intersection Run',
      parameters: {
        arrivalRateVehiclesPerMin: 25,
        initialQueueVehicles: 8,
        dischargeRateVehiclesPerMin: 30,
        signalCycleLengthSeconds: 90,
        effectiveGreenTimeSeconds: 35,
        amberAndAllRedSeconds: 4,
        pedestrianCrossingDurationSeconds: 20,
        simulationDurationMinutes: 10,
        randomSeed: 42,
      },
    };

    const res = await request(app).post('/api/simulations/run').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kpis).toBeDefined();
    expect(res.body.data.kpis.totalArrivals).toBeGreaterThan(0);
    expect(res.body.data.kpis.totalDepartures).toBeGreaterThan(0);
    expect(res.body.data.timeSeries.length).toBeGreaterThan(0);
  });

  it('POST /api/simulations/run returns 400 for invalid signal timing parameters', async () => {
    const invalidPayload = {
      parameters: {
        arrivalRateVehiclesPerMin: 25,
        initialQueueVehicles: 5,
        dischargeRateVehiclesPerMin: 30,
        signalCycleLengthSeconds: 60,
        effectiveGreenTimeSeconds: 58, // 58 + 4 = 62 > 60!
        amberAndAllRedSeconds: 4,
        pedestrianCrossingDurationSeconds: 15,
        simulationDurationMinutes: 10,
      },
    };

    const res = await request(app).post('/api/simulations/run').send(invalidPayload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Validation failed');
  });

  it('POST /api/simulations/compare executes comparative analysis across 3 plans', async () => {
    const baseParams = {
      arrivalRateVehiclesPerMin: 28,
      initialQueueVehicles: 12,
      dischargeRateVehiclesPerMin: 30,
      signalCycleLengthSeconds: 90,
      effectiveGreenTimeSeconds: 30,
      amberAndAllRedSeconds: 4,
      pedestrianCrossingDurationSeconds: 20,
      simulationDurationMinutes: 15,
      randomSeed: 42,
    };

    const planAParams = {
      ...baseParams,
      effectiveGreenTimeSeconds: 45,
    };

    const planBParams = {
      ...baseParams,
      effectiveGreenTimeSeconds: 40,
      exclusivePedestrianPhase: true,
      signalCycleLengthSeconds: 100,
    };

    const comparePayload = {
      baseline: baseParams,
      planA: planAParams,
      planB: planBParams,
      names: {
        baseline: 'Morning Baseline',
        planA: 'Plan A: Green Extension',
        planB: 'Plan B: Ped Scramble',
      },
      objective: 'balanced',
    };

    const res = await request(app).post('/api/simulations/compare').send(comparePayload);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.baseline).toBeDefined();
    expect(res.body.data.planA).toBeDefined();
    expect(res.body.data.planB).toBeDefined();
    expect(res.body.data.differencesPlanA.length).toBeGreaterThan(0);
    expect(res.body.data.tradeOffs.length).toBeGreaterThan(0);
    expect(res.body.data.objectiveScores).toBeDefined();
  });

  it('POST /api/projects saves a project and GET /api/projects lists it', async () => {
    const projectPayload = {
      title: 'University Gate Traffic Re-timing Study',
      description: 'Evaluating Plan A vs Plan B for hackathon presentation',
      scenariosSnapshot: {
        scenarioId: 'traffic-college-gate',
        baselineParams: {
          arrivalRateVehiclesPerMin: 28,
          initialQueueVehicles: 10,
          dischargeRateVehiclesPerMin: 30,
          signalCycleLengthSeconds: 90,
          effectiveGreenTimeSeconds: 30,
          amberAndAllRedSeconds: 4,
          pedestrianCrossingDurationSeconds: 20,
          simulationDurationMinutes: 15,
          randomSeed: 42,
        },
        planAParams: {
          arrivalRateVehiclesPerMin: 28,
          initialQueueVehicles: 10,
          dischargeRateVehiclesPerMin: 32,
          signalCycleLengthSeconds: 90,
          effectiveGreenTimeSeconds: 45,
          amberAndAllRedSeconds: 4,
          pedestrianCrossingDurationSeconds: 20,
          simulationDurationMinutes: 15,
          randomSeed: 42,
        },
        planBParams: {
          arrivalRateVehiclesPerMin: 28,
          initialQueueVehicles: 10,
          dischargeRateVehiclesPerMin: 36,
          signalCycleLengthSeconds: 100,
          effectiveGreenTimeSeconds: 40,
          amberAndAllRedSeconds: 4,
          pedestrianCrossingDurationSeconds: 25,
          exclusivePedestrianPhase: true,
          simulationDurationMinutes: 15,
          randomSeed: 42,
        },
      },
    };

    const createRes = await request(app).post('/api/projects').send(projectPayload);
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const projectId = createRes.body.data.id;

    const listRes = await request(app).get('/api/projects');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((p: any) => p.id === projectId)).toBe(true);

    // Delete project
    const delRes = await request(app).delete(`/api/projects/${projectId}`);
    expect(delRes.status).toBe(200);
  });
});
