export type TrainingMediaKind = "gif" | "video";

export type TrainingMedia = {
	kind: TrainingMediaKind;
	url: string;
};

export type InlineMediaEmbed =
	| { type: "iframe"; url: string }
	| { type: "image"; url: string };

export function getInlineMediaEmbed(media: TrainingMedia): InlineMediaEmbed | null {
	const youtubeEmbedUrl = getYouTubeEmbedUrl(media.url);
	if (youtubeEmbedUrl) return { type: "iframe", url: youtubeEmbedUrl };

	if (media.kind === "gif" && isDirectImageUrl(media.url)) {
		return { type: "image", url: media.url };
	}

	return null;
}

function getYouTubeEmbedUrl(url: string) {
	const parsed = safeParseUrl(url);
	if (!parsed) return null;

	const hostname = parsed.hostname.replace(/^www\./, "");
	let videoId: string | null = null;
	if (hostname === "youtube.com" && parsed.pathname === "/watch") {
		videoId = parsed.searchParams.get("v");
	} else if (hostname === "youtube.com" && parsed.pathname.startsWith("/shorts/")) {
		videoId = parsed.pathname.split("/")[2] ?? null;
	} else if (hostname === "youtu.be") {
		videoId = parsed.pathname.slice(1) || null;
	}

	return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function isDirectImageUrl(url: string) {
	const parsed = safeParseUrl(url);
	return parsed ? /\.(gif|png|jpe?g|webp)$/i.test(parsed.pathname) : false;
}

function safeParseUrl(url: string) {
	try {
		return new URL(url);
	} catch {
		return null;
	}
}
