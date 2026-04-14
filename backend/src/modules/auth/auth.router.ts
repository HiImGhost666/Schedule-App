import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import {
  changePasswordController,
  loginController,
  logoutController,
  meController,
  refreshController,
} from './auth.controller';

const router = Router();

router.post('/login', loginController);
router.post('/refresh', refreshController);
router.post('/logout', authMiddleware, (req: AuthRequest, res) => logoutController(req, res));
router.get('/me', authMiddleware, (req: AuthRequest, res) => meController(req, res));
router.patch('/change-password', authMiddleware, (req: AuthRequest, res) => changePasswordController(req, res));

export default router;
