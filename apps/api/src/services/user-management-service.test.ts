import { afterEach, describe, expect, it, vi } from 'vitest';

import { db } from '../db';
import { UserManagementService } from './user-management-service';
import { EmailService } from './email-service';

vi.mock('../lib/password', () => ({
  hashPassword: vi.fn(async () => 'hash'),
}));

vi.mock('../lib/password-generator', () => ({
  generateStrongPassword: vi.fn(() => 'Str0ng!TempPassw0rd'),
}));

describe('UserManagementService.resetConsultantPasswordByConsultantId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.RESEND_KEY;
  });

  it('creates a consultant user when missing, sets mustChangePassword, and returns an email preview', async () => {
    vi.spyOn(db.query.consultants, 'findFirst').mockResolvedValue({
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    } as any);

    // 1) user lookup by consultantId -> missing
    // 2) usernameExists(base) -> not taken
    vi.spyOn(db.query.users, 'findFirst')
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce(null as any);

    const returningMock = vi.fn().mockResolvedValue([{ id: 10, username: 'JohnD', role: 'consultant' }]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    vi.spyOn(db as any, 'insert').mockReturnValue({ values: valuesMock });

    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    vi.spyOn(db as any, 'update').mockReturnValue({ set: setMock });

    vi.spyOn(EmailService, 'buildAccountCredentialsEmail').mockResolvedValue({
      subject: 'subject',
      html: '<p>html</p>',
      text: 'text',
    });

    const result = await UserManagementService.resetConsultantPasswordByConsultantId(1, false);

    expect(result.username).toBe('JohnD');
    expect(result.userId).toBe(10);
    expect(result.mustChangePassword).toBe(true);
    expect(result.newPassword).toBe('Str0ng!TempPassw0rd');
    expect(result.emailSent).toBe(false);
    expect(result.emailPreview?.to).toBe('john@example.com');

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'JohnD',
        role: 'consultant',
        consultantId: 1,
        mustChangePassword: true,
      })
    );
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mustChangePassword: true,
        passwordHash: 'hash',
      })
    );
  });

  it('resolves username collisions by appending numeric suffix', async () => {
    vi.spyOn(db.query.consultants, 'findFirst').mockResolvedValue({
      id: 2,
      name: 'John Doe',
      email: 'john@example.com',
    } as any);

    // Call order:
    // 1) lookup by consultantId -> missing
    // 2) usernameExists(JohnD) -> taken
    // 3) usernameExists(JohnD2) -> taken
    // 4) usernameExists(JohnD3) -> available
    vi.spyOn(db.query.users, 'findFirst')
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce({ id: 99 } as any)
      .mockResolvedValueOnce({ id: 98 } as any)
      .mockResolvedValueOnce(null as any);

    const returningMock = vi.fn().mockResolvedValue([{ id: 11, username: 'JohnD3', role: 'consultant' }]);
    const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
    vi.spyOn(db as any, 'insert').mockReturnValue({ values: valuesMock });

    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    vi.spyOn(db as any, 'update').mockReturnValue({ set: setMock });

    vi.spyOn(EmailService, 'buildAccountCredentialsEmail').mockResolvedValue({
      subject: 'subject',
      html: '<p>html</p>',
      text: 'text',
    });

    const result = await UserManagementService.resetConsultantPasswordByConsultantId(2, false);

    expect(result.username).toBe('JohnD3');
    expect(valuesMock).toHaveBeenCalledWith(expect.objectContaining({ username: 'JohnD3' }));
  });

  it('resets existing consultant user without creating a new account', async () => {
    vi.spyOn(db.query.consultants, 'findFirst').mockResolvedValue({
      id: 3,
      name: 'Jane Doe',
      email: 'jane@example.com',
    } as any);

    vi.spyOn(db.query.users, 'findFirst').mockResolvedValueOnce({
      id: 20,
      username: 'JaneD',
      role: 'consultant',
    } as any);

    const insertSpy = vi.spyOn(db as any, 'insert');

    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    vi.spyOn(db as any, 'update').mockReturnValue({ set: setMock });

    vi.spyOn(EmailService, 'buildAccountCredentialsEmail').mockResolvedValue({
      subject: 'subject',
      html: '<p>html</p>',
      text: 'text',
    });

    const result = await UserManagementService.resetConsultantPasswordByConsultantId(3, false);

    expect(result.userId).toBe(20);
    expect(result.username).toBe('JaneD');
    expect(insertSpy).not.toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: true }));
  });
});

