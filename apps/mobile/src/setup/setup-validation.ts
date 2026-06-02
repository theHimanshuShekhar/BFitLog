export type SetupFormValues = {
	adminUsername: string;
	adminDisplayName: string;
	adminPassword: string;
	partnerUsername: string;
	partnerDisplayName: string;
	partnerPassword: string;
};

export type SetupFormErrors = Partial<Record<keyof SetupFormValues, string>>;

const usernamePattern = /^[a-zA-Z0-9_-]+$/;

export function validateSetupForm(values: SetupFormValues): SetupFormErrors {
	const errors: SetupFormErrors = {};
	const adminUsername = values.adminUsername.trim();
	const partnerUsername = values.partnerUsername.trim();

	validateUsername("adminUsername", "Admin", adminUsername, errors);
	validateRequired(
		"adminDisplayName",
		"Admin display name is required.",
		values.adminDisplayName,
		errors,
	);
	validatePassword("adminPassword", "Admin", values.adminPassword, errors);

	validateUsername("partnerUsername", "Partner", partnerUsername, errors);
	validateRequired(
		"partnerDisplayName",
		"Partner display name is required.",
		values.partnerDisplayName,
		errors,
	);
	validatePassword("partnerPassword", "Partner", values.partnerPassword, errors);

	if (
		adminUsername &&
		partnerUsername &&
		adminUsername.toLowerCase() === partnerUsername.toLowerCase()
	) {
		errors.partnerUsername =
			"Partner username must be different from admin username.";
	}

	return errors;
}

function validateUsername(
	field: keyof SetupFormValues,
	label: string,
	value: string,
	errors: SetupFormErrors,
) {
	if (!value) {
		errors[field] = `${label} username is required.`;
		return;
	}
	if (value.length < 2) {
		errors[field] = `${label} username must be at least 2 characters.`;
		return;
	}
	if (!usernamePattern.test(value)) {
		errors[field] =
			`${label} username can only use letters, numbers, underscores, and hyphens.`;
	}
}

function validatePassword(
	field: keyof SetupFormValues,
	label: string,
	value: string,
	errors: SetupFormErrors,
) {
	if (value.length < 8) {
		errors[field] = `${label} password must be at least 8 characters.`;
	}
}

function validateRequired(
	field: keyof SetupFormValues,
	message: string,
	value: string,
	errors: SetupFormErrors,
) {
	if (!value.trim()) errors[field] = message;
}
