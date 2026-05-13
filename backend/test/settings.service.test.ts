import fsPromises from 'fs/promises';
import { prismaMock } from './singleton';

jest.mock('../src/modules/audit/audit.service', () => ({
  logAuditOrThrow: jest.fn().mockResolvedValue(undefined),
  sanitizeSnapshot: jest.fn((value) => value),
}));

import { updateSiteSettings } from '../src/modules/settings/settings.service';

describe('settings.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
  });

  it('updates favicon and removes previous local upload after commit', async () => {
    const unlinkSpy = jest.spyOn(fsPromises, 'unlink').mockResolvedValue(undefined);

    prismaMock.themeSettings.findUnique
      .mockResolvedValueOnce({ tokensJson: 'Gestión de Turnos' } as any)
      .mockResolvedValueOnce({ tokensJson: '/uploads/old.ico' } as any);

    await updateSiteSettings(
      { faviconUrl: '/uploads/new.ico' },
      { id: 'admin-id', ipAddress: '127.0.0.1' },
    );

    expect(prismaMock.themeSettings.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { key: 'site_favicon_url' },
      update: expect.objectContaining({
        tokensJson: '/uploads/new.ico',
        updatedByUserId: 'admin-id',
      }),
    }));
    expect(unlinkSpy).toHaveBeenCalledWith(expect.stringContaining('old.ico'));

    unlinkSpy.mockRestore();
  });

  it('does not remove external previous favicon URLs', async () => {
    const unlinkSpy = jest.spyOn(fsPromises, 'unlink').mockResolvedValue(undefined);

    prismaMock.themeSettings.findUnique
      .mockResolvedValueOnce({ tokensJson: 'Gestión de Turnos' } as any)
      .mockResolvedValueOnce({ tokensJson: 'https://cdn.example.com/favicon.ico' } as any);

    await updateSiteSettings(
      { faviconUrl: '/uploads/new.ico' },
      { id: 'admin-id', ipAddress: '127.0.0.1' },
    );

    expect(unlinkSpy).not.toHaveBeenCalled();

    unlinkSpy.mockRestore();
  });
});
