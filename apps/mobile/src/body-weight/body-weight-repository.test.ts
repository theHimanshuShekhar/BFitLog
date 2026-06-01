import type { BodyWeightGoal, BodyWeightLog } from '@bfitlog/shared';
import { describe, expect, it } from 'vitest';
import { BodyWeightRepository, type BodyWeightSyncClient } from './body-weight-repository';
import { BodyWeightStore, MemoryStorage } from './body-weight-store';

const userId = 'better-auth-user';
const logId = '00000000-0000-4000-8000-000000000111';
const now = '2026-06-01T10:00:00.000Z';

function createRepository(syncClient?: BodyWeightSyncClient) {
  return new BodyWeightRepository(new BodyWeightStore(new MemoryStorage()), syncClient);
}

describe('BodyWeightRepository', () => {
  it('saves and lists body weight logs locally before sync', async () => {
    const repository = createRepository();
    const log: BodyWeightLog = {
      id: logId,
      userId,
      measuredAt: now,
      weightKg: 91.2,
      createdAt: now,
      updatedAt: now,
    };

    await repository.saveLog(log);

    await expect(repository.listLogs()).resolves.toEqual([log]);
  });

  it('pushes dirty goal and logs during sync', async () => {
    const pushedLogs: BodyWeightLog[] = [];
    let pushedGoal: BodyWeightGoal | null = null;
    const syncClient: BodyWeightSyncClient = {
      async pushGoal(goal) {
        pushedGoal = goal;
        return goal;
      },
      async pushLog(log) {
        pushedLogs.push(log);
      },
      async pullGoal() {
        return pushedGoal;
      },
      async pullLogs() {
        return pushedLogs;
      },
    };
    const repository = createRepository(syncClient);
    const goal: BodyWeightGoal = { userId, targetKg: 85, direction: 'lose', updatedAt: now };
    const log: BodyWeightLog = {
      id: logId,
      userId,
      measuredAt: now,
      weightKg: 91.2,
      createdAt: now,
      updatedAt: now,
    };

    await repository.saveGoal(goal);
    await repository.saveLog(log);
    await repository.sync();

    expect(pushedGoal).toEqual(goal);
    expect(pushedLogs).toEqual([log]);
    await expect(repository.getGoal()).resolves.toEqual(goal);
    await expect(repository.listLogs()).resolves.toEqual([log]);
  });

  it('hides deleted logs by default', async () => {
    const repository = createRepository();
    const log: BodyWeightLog = {
      id: logId,
      userId,
      measuredAt: now,
      weightKg: 91.2,
      createdAt: now,
      updatedAt: now,
    };

    await repository.saveLog(log);
    await repository.deleteLog(log.id, '2026-06-01T11:00:00.000Z');

    await expect(repository.listLogs()).resolves.toEqual([]);
    await expect(repository.listLogs(true)).resolves.toHaveLength(1);
  });
});
