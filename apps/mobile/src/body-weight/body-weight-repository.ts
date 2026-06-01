import type { BodyWeightGoal, BodyWeightLog } from '@bfitlog/shared';
import { bodyWeightGoalSchema, bodyWeightLogSchema } from '@bfitlog/shared';
import type { BodyWeightStore } from './body-weight-store';

export type BodyWeightSyncClient = {
  pushGoal(goal: BodyWeightGoal): Promise<BodyWeightGoal>;
  pushLog(log: BodyWeightLog): Promise<void>;
  pullGoal(): Promise<BodyWeightGoal | null>;
  pullLogs(): Promise<BodyWeightLog[]>;
};

export class BodyWeightRepository {
  constructor(
    private readonly store: BodyWeightStore,
    private readonly syncClient?: BodyWeightSyncClient,
  ) {}

  async getGoal(): Promise<BodyWeightGoal | null> {
    return (await this.store.load()).goal;
  }

  async saveGoal(goal: BodyWeightGoal): Promise<void> {
    const parsed = bodyWeightGoalSchema.parse(goal);
    const state = await this.store.load();
    await this.store.save({ ...state, goal: parsed, dirtyGoal: true });
  }

  async listLogs(includeDeleted = false): Promise<BodyWeightLog[]> {
    const state = await this.store.load();
    const logs = includeDeleted ? state.logs : state.logs.filter((log) => !log.deletedAt);
    return [...logs].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
  }

  async saveLog(log: BodyWeightLog): Promise<void> {
    const parsed = bodyWeightLogSchema.parse(log);
    const state = await this.store.load();
    const logs = upsertById(state.logs, parsed);
    await this.store.save({
      ...state,
      logs,
      dirtyLogIds: unique([...state.dirtyLogIds, parsed.id]),
    });
  }

  async deleteLog(id: string, deletedAt: string): Promise<void> {
    const state = await this.store.load();
    const existing = state.logs.find((log) => log.id === id);
    if (!existing) return;

    const deleted: BodyWeightLog = { ...existing, updatedAt: deletedAt, deletedAt };
    await this.store.save({
      ...state,
      logs: upsertById(state.logs, deleted),
      dirtyLogIds: unique([...state.dirtyLogIds, id]),
    });
  }

  async sync(): Promise<void> {
    if (!this.syncClient) return;

    const state = await this.store.load();
    let goal = state.goal;
    let dirtyGoal = state.dirtyGoal;

    if (state.dirtyGoal && goal) {
      goal = await this.syncClient.pushGoal(goal);
      dirtyGoal = false;
    }

    const dirtyLogIds = new Set(state.dirtyLogIds);
    for (const log of state.logs) {
      if (dirtyLogIds.has(log.id)) {
        await this.syncClient.pushLog(log);
        dirtyLogIds.delete(log.id);
      }
    }

    const [remoteGoal, remoteLogs] = await Promise.all([
      this.syncClient.pullGoal(),
      this.syncClient.pullLogs(),
    ]);

    await this.store.save({
      goal: chooseNewestGoal(goal, remoteGoal),
      logs: mergeLogs(state.logs, remoteLogs),
      dirtyGoal,
      dirtyLogIds: [...dirtyLogIds],
    });
  }
}

function upsertById(logs: BodyWeightLog[], next: BodyWeightLog) {
  const withoutExisting = logs.filter((log) => log.id !== next.id);
  return [...withoutExisting, next];
}

function mergeLogs(local: BodyWeightLog[], remote: BodyWeightLog[]) {
  const byId = new Map<string, BodyWeightLog>();
  for (const log of [...local, ...remote]) {
    const existing = byId.get(log.id);
    if (!existing || log.updatedAt >= existing.updatedAt) {
      byId.set(log.id, log);
    }
  }
  return [...byId.values()];
}

function chooseNewestGoal(local: BodyWeightGoal | null, remote: BodyWeightGoal | null) {
  if (!local) return remote;
  if (!remote) return local;
  return remote.updatedAt > local.updatedAt ? remote : local;
}

function unique(values: string[]) {
  return [...new Set(values)];
}
