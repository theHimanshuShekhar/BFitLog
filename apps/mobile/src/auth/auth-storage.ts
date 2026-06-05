export type SyncAuthStorage = {
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
};

export function createWebAuthStorage(
	localStorageRef: Storage | undefined = typeof localStorage === "undefined"
		? undefined
		: localStorage,
): SyncAuthStorage {
	return {
		getItem: (key) => {
			try {
				return localStorageRef?.getItem?.(key) ?? null;
			} catch {
				return null;
			}
		},
		setItem: (key, value) => {
			try {
				localStorageRef?.setItem?.(key, value);
			} catch {
				// Browser storage may be disabled; auth requests can still use cookies.
			}
		},
	};
}

export function createAuthStorage(
	platform: string,
	nativeStorage: SyncAuthStorage,
): SyncAuthStorage {
	return platform === "web" ? createWebAuthStorage() : nativeStorage;
}
