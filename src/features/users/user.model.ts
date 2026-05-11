import { deliveryMethodSchema, emailSchema } from "@shared/shared.model.ts";
import { z } from "astro/zod";

export const addressSchema = z.object({
	firstName: z.string().min(3, "First name is required"),
	lastName: z.string().optional(),
	company: z.string().optional(),
	street1: z.string().min(5, "Address must be at least 5 characters"),
	street2: z.string().optional(),
	city: z.string().min(2, "City must be at least 2 characters"),
	postalCode: z
		.string()
		.min(3, "Postal code is too short")
		.max(12, "Postal code is too long")
		.regex(
			/^[a-zA-Z0-9][a-zA-Z0-9\s-]*[a-zA-Z0-9]$/,
			"Invalid postal code format",
		),
	state: z.string().min(1, "State is required"),
	country: z.string().default("MY"),
	phone: z.string().regex(/^\d{8,15}$/, "Phone must be 8-15 digits"),
});

export const userSessionSchema = z
	.object({
		email: emailSchema,
		deliveryMethod: deliveryMethodSchema,
		shipping: addressSchema,
		sameAsShipping: z.boolean(),
		billing: addressSchema,
	})
	.strict();

export type Address = z.infer<typeof addressSchema>;
export type UserSessionData = z.infer<typeof userSessionSchema>;
