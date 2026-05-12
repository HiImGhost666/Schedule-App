import express from 'express';
import request from 'supertest';

jest.mock('../src/middleware/auth.middleware', () => {
  const { DEFAULT_ROLE_PERMISSIONS } = require('../src/modules/roles/roles.constants');
  return {
    authMiddleware: (req: any, res: any, next: any) => {
      const role = req.header('x-test-role') as any;

      if (!role) {
        return res.status(401).json({
          success: false,
          error: 'Token de acceso requerido',
          code: 'UNAUTHORIZED',
        });
      }

      const permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
      req.user = { 
        id: 'test-user', 
        roleName: role, 
        permissions, 
        name: 'Test User', 
        email: 'test@example.com', 
        status: 'active'
      };
      next();
    },
  };
});

jest.mock('../src/modules/audit/audit.service', () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  logAuditOrThrow: jest.fn().mockResolvedValue(undefined),
  sanitizeSnapshot: jest.fn((value) => value),
}));

type MockPrisma = {
  $transaction: jest.Mock;
  themeSettings: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
};

const mockPrisma: MockPrisma = {
  $transaction: jest.fn(),
  themeSettings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};
mockPrisma.$transaction.mockImplementation(async (fn: (tx: MockPrisma) => Promise<unknown>) => fn(mockPrisma));

jest.mock('../src/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../src/modules/settings/theme.accessibility', () => ({
  validateThemeContrast: jest.fn(() => []),
}));

jest.mock('../src/modules/settings/theme.presets', () => ({
  isBasePreset: jest.fn(() => false),
}));

jest.mock('../src/modules/settings/theme.service', () => ({
  getThemeSettings: jest.fn(),
  getThemePresets: jest.fn(),
  publishThemeSettings: jest.fn(),
  createCustomPreset: jest.fn(),
  updateCustomPreset: jest.fn(),
  deleteCustomPreset: jest.fn(),
}));

import settingsRouter from '../src/modules/settings/settings.router';
import * as themeService from '../src/modules/settings/theme.service';
import * as themePresets from '../src/modules/settings/theme.presets';

const app = express();
app.use(express.json());
app.use('/api/settings', settingsRouter);

const validThemePayload = {
  preset: 'custom',
  tokens: {
    brandPrimary: '#0F172A',
    brandPrimaryHover: '#1E293B',
    brandSecondary: '#334155',
    pageBackground: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#E2E8F0',
    textPrimary: '#0F172A',
    textMuted: '#475569',
    borderColor: '#CBD5E1',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
  },
  overrides: {
    sidebar: {
      background: '#0F172A',
      text: '#F8FAFC',
      activeBackground: '#1E293B',
      activeText: '#F8FAFC',
      logoVariant: 'logo_claro',
    },
    topbar: {
      background: '#FFFFFF',
      text: '#0F172A',
    },
    buttons: {
      primaryBackground: '#0F172A',
      primaryText: '#FFFFFF',
      secondaryBackground: '#E2E8F0',
      secondaryText: '#0F172A',
      dangerBackground: '#DC2626',
      dangerText: '#FFFFFF',
    },
    badges: {
      adminBackground: '#1E3A8A',
      adminText: '#FFFFFF',
      managerBackground: '#065F46',
      managerText: '#FFFFFF',
      viewerBackground: '#6B7280',
      viewerText: '#FFFFFF',
      activeBackground: '#16A34A',
      activeText: '#FFFFFF',
      disabledBackground: '#9CA3AF',
      disabledText: '#111827',
      lockedBackground: '#DC2626',
      lockedText: '#FFFFFF',
    },
    calendar: {
      todayBackground: '#FEF3C7',
      activeButtonBackground: '#1E293B',
      nowIndicator: '#DC2626',
    },
    toasts: {
      background: '#111827',
      text: '#F9FAFB',
      successPrimary: '#16A34A',
      successSecondary: '#15803D',
      errorBackground: '#DC2626',
      errorText: '#FFFFFF',
    },
  },
};

describe('settings.router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
    mockPrisma.themeSettings.findUnique.mockResolvedValue(null);
    mockPrisma.themeSettings.upsert.mockResolvedValue({});
    (themeService.getThemeSettings as jest.Mock).mockResolvedValue({ preset: 'corporate' });
    (themeService.publishThemeSettings as jest.Mock).mockResolvedValue({ before: { preset: 'corporate' }, after: { preset: 'custom' } });
  });

  it('returns active theme on GET /theme', async () => {
    const response = await request(app).get('/api/settings/theme').set('x-test-role', 'employee');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(themeService.getThemeSettings).toHaveBeenCalledTimes(1);
  });

  it('returns 401 on PUT /theme when role header is missing', async () => {
    const response = await request(app).put('/api/settings/theme').send(validThemePayload);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: 'Token de acceso requerido',
      code: 'UNAUTHORIZED',
    });
    expect(themeService.publishThemeSettings).not.toHaveBeenCalled();
  });

  it('returns 403 on PUT /theme for employee', async () => {
    const response = await request(app)
      .put('/api/settings/theme')
      .set('x-test-role', 'employee')
      .send(validThemePayload);

    expect(response.status).toBe(403);
    expect(themeService.publishThemeSettings).not.toHaveBeenCalled();
  });

  it('rejects invalid payload on PUT /theme', async () => {
    const response = await request(app)
      .put('/api/settings/theme')
      .set('x-test-role', 'admin')
      .send({ preset: 'custom' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('BAD_REQUEST');
    expect(themeService.publishThemeSettings).not.toHaveBeenCalled();
  });

  it('publishes theme with valid payload on PUT /theme', async () => {
    const response = await request(app)
      .put('/api/settings/theme')
      .set('x-test-role', 'admin')
      .send(validThemePayload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(themeService.publishThemeSettings).toHaveBeenCalledTimes(1);
  });

  it('rejects deleting base preset', async () => {
    jest.mocked(themePresets.isBasePreset).mockReturnValueOnce(true);

    const response = await request(app)
      .delete('/api/settings/theme/presets/corporate')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('updates site settings through PUT /site', async () => {
    mockPrisma.themeSettings.findUnique.mockImplementation(({ where }: any) => {
      if (where.key === 'site_title') return Promise.resolve({ tokensJson: 'Gestión de Turnos' });
      if (where.key === 'site_favicon_url') return Promise.resolve({ tokensJson: '/uploads/old.ico' });
      return Promise.resolve(null);
    });

    const response = await request(app)
      .put('/api/settings/site')
      .set('x-test-role', 'admin')
      .send({ faviconUrl: '/uploads/new.ico' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { faviconUrl: '/uploads/new.ico' },
      message: 'Configuración del sitio actualizada',
    });
  });
});
