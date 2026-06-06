import { useCallback, useEffect, useState } from "react";
import { listVisibleUsers, type VisibleUser } from "./visible-users-api";

type CurrentUser = {
	id: string;
	name: string;
	username?: string | null | undefined;
	role?: string | null | undefined;
};

export function useVisibleUsers(currentUser: CurrentUser | null | undefined) {
	const [visibleUsers, setVisibleUsers] = useState<VisibleUser[]>([]);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

	const loadVisibleUsers = useCallback(async () => {
		if (!currentUser) return;
		try {
			const users = await listVisibleUsers();
			setVisibleUsers(users.length ? users : [currentUserToVisibleUser(currentUser)]);
			setSelectedUserId((current) => current ?? currentUser.id);
		} catch {
			setVisibleUsers([currentUserToVisibleUser(currentUser)]);
			setSelectedUserId((current) => current ?? currentUser.id);
		}
	}, [currentUser]);

	useEffect(() => {
		void loadVisibleUsers();
	}, [loadVisibleUsers]);

	return {
		visibleUsers,
		selectedUserId: selectedUserId ?? currentUser?.id ?? null,
		setSelectedUserId,
		reloadVisibleUsers: loadVisibleUsers,
	};
}

function currentUserToVisibleUser(user: CurrentUser): VisibleUser {
	return {
		id: user.id,
		username: user.username ?? user.name,
		name: user.name,
		role: user.role === "admin" ? "admin" : "member",
	};
}
