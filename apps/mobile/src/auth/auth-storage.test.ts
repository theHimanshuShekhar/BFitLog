import { describe, expect, it } from "vitest";
import { createAuthStorage, createWebAuthStorage } from "./auth-storage";

describe("auth storage", () => {
	it("uses localStorage-compatible storage on web", () => {
		const values = new Map<string, string>();
		const storage = createWebAuthStorage({
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => {
				values.set(key, value);
			},
		} as Storage);

		storage.setItem("session", "cookie-value");

		expect(storage.getItem("session")).toBe("cookie-value");
	});

	it("selects web storage for Expo web", () => {
		const nativeStorage = {
			getItem: () => {
				throw new Error("native storage should not be used on web");
			},
			setItem: () => {
				throw new Error("native storage should not be used on web");
			},
		};

		const storage = createAuthStorage("web", nativeStorage);

		expect(() => storage.getItem("missing")).not.toThrow();
		expect(storage.getItem("missing")).toBeNull();
	});
});
