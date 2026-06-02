import { createApp } from '../app.js';
import { truncateAppTables } from '../test-utils/db.js';
import { beforeEach, describe, expect, it } from 'vitest';

const setupBody = {
  admin: { username: 'admin', password: 'password1234', displayName: 'Admin User' },
  partner: { username: 'partner', password: 'password1234', displayName: 'Partner User' },
};

async function createSession() {
  const app = createApp();
  await app.request('/setup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(setupBody),
  });
  const login = await app.request('/api/auth/sign-in/username', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password1234' }),
  });
  return { app, cookie: login.headers.get('set-cookie') ?? '' };
}

describe('training plan routes', () => {
  beforeEach(async () => {
    await truncateAppTables();
  });

  it('returns the seeded training plan template to authenticated users', async () => {
    await import('../db/seed-training-plan.js');
    const { app, cookie } = await createSession();

    const response = await app.request('/training-plan/template', { headers: { cookie } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.template.name).toBe('4-Day Beginner Upper/Lower Split');
    expect(body.template.days).toHaveLength(4);
    expect(body.template.days[0].exercises).toHaveLength(5);
    expect(body.template.days[0].exercises[0].exercise.media).toHaveLength(2);
  });
});
