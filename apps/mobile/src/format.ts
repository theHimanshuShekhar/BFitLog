export const kgFormatter = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 1,
	minimumFractionDigits: 1,
});

export const integerFormatter = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 0,
});

export const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

export function formatKg(value: number) {
	return `${kgFormatter.format(value)} kg`;
}

export function formatSeconds(value: number) {
	return `${integerFormatter.format(value)} sec`;
}

export function formatDateTime(value: string) {
	return dateTimeFormatter.format(new Date(value));
}
