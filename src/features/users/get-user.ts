import { ActionError, defineAction } from "astro:actions";
import { type UserSessionData, userSessionSchema } from "@users/user.model.ts";
import { z } from "astro/zod";

export const getUser = defineAction({
	accept: "json",
	input: z.void(),
	handler: async (_input, context) => {
		if (!context.session) {
			throw new ActionError({
				code: "NOT_FOUND",
				message: "User session not found or expired",
			});
		}
		const sessionData = await context.session.get("user");
		if (!sessionData) {
			throw new ActionError({
				code: "NOT_FOUND",
				message: "User session not found or expired",
			});
		}
		const result = userSessionSchema.safeParse(sessionData);
		if (!result.success) {
			await context.session.destroy();
			throw new ActionError({
				code: "NOT_FOUND",
				message: "User session not found or expired",
			});
		}
		return {
			success: true,
			data: result.data as UserSessionData,
		};
	},
});
