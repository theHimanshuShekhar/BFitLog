import { expoClient } from "@better-auth/expo/client";
import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { authBaseUrl } from "../api/client";
import { createAuthStorage } from "./auth-storage";

export const authClient = createAuthClient({
	baseURL: authBaseUrl,
	plugins: [
		expoClient({
			scheme: "bfitlog",
			storagePrefix: "bfitlog",
			storage: createAuthStorage(Platform.OS, SecureStore),
		}),
		usernameClient(),
	],
});
