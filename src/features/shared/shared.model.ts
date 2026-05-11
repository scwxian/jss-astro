import { z } from "astro/zod";

export const emailSchema = z
	.string()
	.trim()
	.pipe(z.email("Invalid email address"));
export const deliveryMethodSchema = z.enum(["ship", "pickup"]);
export const saveInfoSchema = z.boolean().optional().default(false);
