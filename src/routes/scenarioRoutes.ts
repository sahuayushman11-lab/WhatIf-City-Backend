import { Router } from 'express';
import { ScenarioController } from '../controllers/scenarioController.js';

const router = Router();

router.get('/', ScenarioController.getAllScenarios);
router.get('/:id', ScenarioController.getScenarioById);
router.post('/', ScenarioController.createScenario);

export default router;
