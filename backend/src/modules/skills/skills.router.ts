import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import {
  assignUserSkillsController,
  createSkillController,
  deleteSkillController,
  listSkillsController,
  updateSkillController,
} from './skills.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('skills:view'), (req: AuthRequest, res: Response) => listSkillsController(req, res));
router.post('/', requirePermission('skills:create'), (req: AuthRequest, res: Response) => createSkillController(req, res));
router.patch('/:id', requirePermission('skills:update'), (req: AuthRequest, res: Response) => updateSkillController(req, res));
router.delete('/:id', requirePermission('skills:delete'), (req: AuthRequest, res: Response) => deleteSkillController(req, res));
router.put('/users/:userId', requirePermission('skills:assign'), (req: AuthRequest, res: Response) => assignUserSkillsController(req, res));

export default router;
