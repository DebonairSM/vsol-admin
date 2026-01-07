import type { APIRequestContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

type AdminLoginResponse = {
  accessToken: string;
  refreshToken?: string;
  token?: string; // backward compatibility
  user?: {
    id: number;
    username: string;
    role: string;
  };
};

type CreateCycleResponse = {
  id: number;
  monthLabel: string;
};

const ADMIN_TOKEN_PATH = path.join(__dirname, '../.auth/admin-token.json');
const ADMIN_TOKEN_LOCK_PATH = `${ADMIN_TOKEN_PATH}.lock`;

function envOrDefault(name: string, defaultValue: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : defaultValue;
}

function readCachedAdminToken(): string | null {
  try {
    const raw = fs.readFileSync(ADMIN_TOKEN_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

function writeCachedAdminToken(token: string) {
  const dir = path.dirname(ADMIN_TOKEN_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ADMIN_TOKEN_PATH, JSON.stringify({ token, createdAt: new Date().toISOString() }, null, 2));
}

function clearCachedAdminToken() {
  try {
    fs.unlinkSync(ADMIN_TOKEN_PATH);
  } catch {
    // ignore
  }
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  const dir = path.dirname(ADMIN_TOKEN_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const start = Date.now();
  const timeoutMs = 15_000;

  while (true) {
    try {
      const fd = fs.openSync(ADMIN_TOKEN_LOCK_PATH, 'wx');
      fs.closeSync(fd);
      break;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'EEXIST') throw err;
      if (Date.now() - start > timeoutMs) break;
      await sleep(200);
    }
  }

  try {
    return await fn();
  } finally {
    try {
      fs.unlinkSync(ADMIN_TOKEN_LOCK_PATH);
    } catch {
      // ignore
    }
  }
}

export async function loginAsAdmin(request: APIRequestContext): Promise<string> {
  const cached = readCachedAdminToken();
  if (cached) {
    // Validate cached token against the currently running server.
    const meResp = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${cached}` }
    });
    if (meResp.ok()) return cached;

    clearCachedAdminToken();
  }

  // Defaults align with `apps/api/src/db/seed.ts` (admin users all share password "admin123").
  // Prefer a dedicated admin user for E2E to avoid relying on whatever local admins were changed to.
  const username = envOrDefault('TEST_ADMIN_USERNAME', 'e2e-admin');
  const password = envOrDefault('TEST_ADMIN_PASSWORD', 'admin123');

  return await withFileLock(async () => {
    const cachedAfterLock = readCachedAdminToken();
    if (cachedAfterLock) {
      const meResp = await request.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${cachedAfterLock}` }
      });
      if (meResp.ok()) return cachedAfterLock;

      clearCachedAdminToken();
    }

    // Retry a few times in case the dev server is still coming up.
    for (let attempt = 1; attempt <= 5; attempt++) {
      const resp = await request.post('/api/auth/login', {
        data: { username, password },
      });

      if (resp.ok()) {
        const json = (await resp.json()) as AdminLoginResponse;
        const token = json.accessToken || json.token;
        if (!token) throw new Error('[E2E] Admin login response missing access token');
        writeCachedAdminToken(token);
        return token;
      }

      const body = await resp.text();

      // Avoid hammering the rate limiter; callers should be structured to login once, but be defensive.
      if (resp.status() === 429) {
        await sleep(2_000);
        continue;
      }

      // If unauthorized, don't keep retrying — it's likely a config problem.
      throw new Error(`[E2E] Admin login failed (status ${resp.status()}). Body: ${body}`);
    }

    throw new Error('[E2E] Admin login failed after retries (possible rate limit or server not ready)');
  });
}

export async function createCycleAsAdmin(request: APIRequestContext): Promise<{
  cycleId: number;
  monthLabel: string;
}> {
  const token = await loginAsAdmin(request);
  const monthLabel = `E2E ${new Date().toISOString().slice(0, 7)} ${Date.now()}`;

  const resp = await request.post('/api/cycles', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      monthLabel,
      globalWorkHours: 160,
    },
  });

  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(
      `[E2E] Create cycle failed (status ${resp.status()}). Body: ${body}`
    );
  }

  const json = (await resp.json()) as CreateCycleResponse;
  return { cycleId: json.id, monthLabel: json.monthLabel };
}

export async function archiveCycleAsAdmin(
  request: APIRequestContext,
  cycleId: number
): Promise<void> {
  const token = await loginAsAdmin(request);
  const resp = await request.delete(`/api/cycles/${cycleId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok()) {
    // Best-effort cleanup: don't hard fail the entire suite on cleanup.
    const body = await resp.text().catch(() => '');
    // eslint-disable-next-line no-console
    console.warn(
      `[E2E] Failed to archive cycle ${cycleId} (status ${resp.status()}). Body: ${body}`
    );
  }
}

