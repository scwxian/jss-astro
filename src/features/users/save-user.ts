import type { ActionAPIContext } from "astro:actions";
import type { userSessionSchema } from "@users/user.model.ts";
import type { z } from "astro/zod";

type UserSessionData = z.infer<typeof userSessionSchema>;

// Internal Utility: Save User Session. Saves, updates, or deletes user session data in Astro Sessions.
export const saveUserSession = async (
	saveInfo: boolean,
	userData: UserSessionData,
	session: ActionAPIContext["session"],
) => {
	if (!session) {
		throw new Error("Astro Session API is not available in this context.");
	}

	if (saveInfo) {
		await session.set("user", userData);
	} else {
		const existingSession = await session.get("user");
		if (existingSession) {
			await session.destroy();
		}
	}
};
