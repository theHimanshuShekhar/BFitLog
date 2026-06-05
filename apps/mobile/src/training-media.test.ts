import { describe, expect, it } from "vitest";
import { getInlineMediaEmbed } from "./training-media";

describe("training media embeds", () => {
	it("turns YouTube shorts and watch links into inline player embeds", () => {
		expect(
			getInlineMediaEmbed({
				kind: "video",
				url: "https://www.youtube.com/shorts/XFYMLdlaq04",
			}),
		).toEqual({
			type: "iframe",
			url: "https://www.youtube.com/embed/XFYMLdlaq04",
		});

		expect(
			getInlineMediaEmbed({
				kind: "video",
				url: "https://www.youtube.com/watch?v=hnSqbBk15tw&t=10s",
			}),
		).toEqual({
			type: "iframe",
			url: "https://www.youtube.com/embed/hnSqbBk15tw",
		});
	});

	it("embeds GIF sources inline when the URL points directly to an image", () => {
		expect(
			getInlineMediaEmbed({
				kind: "gif",
				url: "https://example.com/demo.GIF?cache=1",
			}),
		).toEqual({ type: "image", url: "https://example.com/demo.GIF?cache=1" });
	});

	it("keeps non-embeddable media as fallback links", () => {
		expect(
			getInlineMediaEmbed({
				kind: "gif",
				url: "https://makeagif.com/gif/seated-cable-row-5UBTxV",
			}),
		).toBeNull();
	});
});
