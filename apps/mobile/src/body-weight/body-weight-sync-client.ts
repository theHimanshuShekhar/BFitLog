import type { BodyWeightGoal, BodyWeightLog } from "@bfitlog/shared";
import { buildAuthRequestInit } from "../api/auth-request";
import { apiBaseUrl } from "../api/client";
import { authClient } from "../auth/auth-client";
import type { BodyWeightSyncClient } from "./body-weight-repository";

type GoalResponse = { goal: BodyWeightGoal | null };
type LogsResponse = { logs: BodyWeightLog[] };

async function authFetch(path: string, init: RequestInit = {}) {
	const requestInit = buildAuthRequestInit(authClient.getCookie(), init);

	const response = await fetch(`${apiBaseUrl}${path}`, requestInit);

	if (!response.ok) {
		throw new Error(
			`${init.method ?? "GET"} ${path} failed with ${response.status}`,
		);
	}

	return response;
}

export class HttpBodyWeightSyncClient implements BodyWeightSyncClient {
	async pushGoal(goal: BodyWeightGoal): Promise<BodyWeightGoal> {
		const response = await authFetch("/body-weight/goal", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(goal),
		});
		const body = (await response.json()) as GoalResponse;
		if (!body.goal) throw new Error("Goal upsert returned no goal");
		return body.goal;
	}

	async pushLog(log: BodyWeightLog): Promise<void> {
		await authFetch(`/body-weight/logs/${log.id}`, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(log),
		});
	}

	async pullGoal(): Promise<BodyWeightGoal | null> {
		const response = await authFetch("/body-weight/goal");
		const body = (await response.json()) as GoalResponse;
		return body.goal;
	}

	async pullLogs(): Promise<BodyWeightLog[]> {
		const response = await authFetch("/body-weight/logs");
		const body = (await response.json()) as LogsResponse;
		return body.logs;
	}
}
