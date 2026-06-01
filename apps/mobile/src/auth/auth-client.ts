import { expoClient } from "@better-auth/expo/client";
import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { apiBaseUrl } from "../api/client";

export const authClient = createAuthClient({
	baseURL: apiBaseUrl,
	plugins: [
		expoClient({
			scheme: "bfitlog",
			storagePrefix: "bfitlog",
			storage: SecureStore,
		}),
		usernameClient(),
	],
});
