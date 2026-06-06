import { beforeEach, describe, expect, it, vi } from "vitest";

const { alert } = vi.hoisted(() => ({ alert: vi.fn() }));

vi.mock("react-native", () => ({
	Alert: { alert },
}));

import { confirmDestructive } from "./confirm";

describe("confirmDestructive", () => {
	beforeEach(() => {
		alert.mockClear();
	});

	it("waits for the native destructive button before resolving true", async () => {
		const promise = confirmDestructive("Delete it?");
		expect(alert).toHaveBeenCalledTimes(1);
		expect(await Promise.race([promise, Promise.resolve("pending")])).toBe(
			"pending",
		);

		const buttons = alert.mock.calls[0]?.[2] as Array<{
			text: string;
			onPress?: () => void;
		}>;
		buttons.find((button) => button.text === "Delete")?.onPress?.();

		await expect(promise).resolves.toBe(true);
	});

	it("resolves false from the native cancel button", async () => {
		const promise = confirmDestructive("Delete it?");
		const buttons = alert.mock.calls[0]?.[2] as Array<{
			text: string;
			onPress?: () => void;
		}>;
		buttons.find((button) => button.text === "Cancel")?.onPress?.();

		await expect(promise).resolves.toBe(false);
	});
});
