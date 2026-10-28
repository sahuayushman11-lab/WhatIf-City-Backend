import { Router } from 'express';
import { SimulationController } from '../controllers/simulationController.js';

const router = Router();

router.post('/run', SimulationController.runSimulation);
router.post('/compare', SimulationController.compareSimulations);
router.get('/:id', SimulationController.getSimulationById);

export default router;
