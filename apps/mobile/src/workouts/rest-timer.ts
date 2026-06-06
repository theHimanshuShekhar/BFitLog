export type RestTimerState = {
	exerciseName: string;
	remainingSeconds: number;
	paused: boolean;
};

export function tickRestTimer(timer: RestTimerState | null): RestTimerState | null {
	if (!timer || timer.paused) return timer;
	const remainingSeconds = timer.remainingSeconds - 1;
	if (remainingSeconds <= 0) return null;
	return { ...timer, remainingSeconds };
}

export function pauseRestTimer(timer: RestTimerState | null): RestTimerState | null {
	return timer ? { ...timer, paused: true } : null;
}

export function resumeRestTimer(timer: RestTimerState | null): RestTimerState | null {
	return timer ? { ...timer, paused: false } : null;
}
