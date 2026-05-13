import { Router, Response, Request, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { sendError } from '../../utils/response';
import {
  createThemePresetController,
  deleteThemePresetController,
  getSiteSettingsController,
  getThemeController,
  listThemePresetsController,
  publishThemeController,
  updateSiteSettingsController,
  updateThemePresetController,
  uploadFaviconController,
} from './settings.controller';
import { faviconUpload } from './settings.service';

const router = Router();

function handleUploadError(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 'El favicon supera el límite máximo de 2 MB', 413);
    }

    return sendError(res, `Error al subir favicon: ${err.message}`, 400);
  }

  if (err instanceof Error) {
    return sendError(res, err.message, 400);
  }

  return next(err);
}

// Active theme
router.get('/theme', authMiddleware, (req: AuthRequest, res: Response) => getThemeController(req, res));
router.put('/theme', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => publishThemeController(req, res));

// Presets
router.get('/theme/presets', authMiddleware, (req: AuthRequest, res: Response) => listThemePresetsController(req, res));
router.post('/theme/presets', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => createThemePresetController(req, res));
router.patch('/theme/presets/:id', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => updateThemePresetController(req, res));
router.delete('/theme/presets/:id', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => deleteThemePresetController(req, res));

// Favicon upload
router.post(
  '/upload-favicon',
  authMiddleware,
  requirePermission('settings:manage'),
  faviconUpload.single('favicon'),
  handleUploadError,
  (req: AuthRequest, res: Response) => uploadFaviconController(req, res),
);

// Site branding
router.get('/site', authMiddleware, (req: AuthRequest, res: Response) => getSiteSettingsController(req, res));
router.put('/site', authMiddleware, requirePermission('settings:manage'), (req: AuthRequest, res: Response) => updateSiteSettingsController(req, res));

export default router;
