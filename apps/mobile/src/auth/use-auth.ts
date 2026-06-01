import { authClient } from "./auth-client";

export function useAuth() {
	return authClient.useSession();
}
