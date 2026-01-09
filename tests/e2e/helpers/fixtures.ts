import type { APIRequestContext } from '@playwright/test';
import { loginAsAdmin } from './admin-api';

/**
 * Helper functions for creating test data fixtures
 */

export interface TestConsultant {
  id?: number;
  name: string;
  hourlyRate: number;
  startDate?: Date;
  email?: string;
  phone?: string;
  address?: string;
}

export interface TestCycle {
  id?: number;
  monthLabel: string;
  globalWorkHours?: number;
  omnigoBonus?: number;
}

/**
 * Create a test consultant via API
 */
export async function createTestConsultant(
  request: APIRequestContext,
  consultant: TestConsultant
): Promise<{ id: number; name: string }> {
  const token = await loginAsAdmin(request);
  
  const startDate = consultant.startDate || new Date();
  
  const resp = await request.post('/api/consultants', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      name: consultant.name,
      hourlyRate: consultant.hourlyRate,
      startDate: startDate.toISOString(),
      email: consultant.email,
      phone: consultant.phone,
      address: consultant.address,
    },
  });

  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(
      `[E2E] Create consultant failed (status ${resp.status()}). Body: ${body}`
    );
  }

  const json = await resp.json() as { id: number; name: string };
  return json;
}

/**
 * Delete a test consultant via API
 */
export async function deleteTestConsultant(
  request: APIRequestContext,
  consultantId: number
): Promise<void> {
  const token = await loginAsAdmin(request);
  const resp = await request.delete(`/api/consultants/${consultantId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok()) {
    // Best-effort cleanup: don't hard fail on cleanup
    const body = await resp.text().catch(() => '');
    console.warn(
      `[E2E] Failed to delete consultant ${consultantId} (status ${resp.status()}). Body: ${body}`
    );
  }
}

/**
 * Create a test cycle via API
 */
export async function createTestCycle(
  request: APIRequestContext,
  cycle: TestCycle
): Promise<{ id: number; monthLabel: string }> {
  const token = await loginAsAdmin(request);

  const resp = await request.post('/api/cycles', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      monthLabel: cycle.monthLabel,
      globalWorkHours: cycle.globalWorkHours || 160,
      omnigoBonus: cycle.omnigoBonus,
    },
  });

  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(
      `[E2E] Create cycle failed (status ${resp.status()}). Body: ${body}`
    );
  }

  const json = await resp.json() as { id: number; monthLabel: string };
  return json;
}

/**
 * Generate a unique test consultant name
 */
export function generateTestConsultantName(prefix = 'E2E Consultant'): string {
  return `${prefix} ${Date.now()}`;
}

/**
 * Generate a unique test cycle month label
 */
export function generateTestCycleLabel(): string {
  const now = new Date();
  const timestamp = Date.now();
  return `E2E ${now.toISOString().slice(0, 7)} ${timestamp}`;
}

/**
 * Generate test consultant data
 */
export function generateTestConsultantData(overrides?: Partial<TestConsultant>): TestConsultant {
  return {
    name: generateTestConsultantName(),
    hourlyRate: 50.0,
    startDate: new Date(),
    email: `test${Date.now()}@example.com`,
    phone: `+55 11 9${Math.floor(Math.random() * 100000000)}`,
    ...overrides,
  };
}
