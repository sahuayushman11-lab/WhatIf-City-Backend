import { Router } from 'express';
import { ProjectController } from '../controllers/projectController.js';

const router = Router();

router.get('/', ProjectController.getAllProjects);
router.post('/', ProjectController.createProject);
router.get('/:id', ProjectController.getProjectById);
router.delete('/:id', ProjectController.deleteProject);

export default router;
