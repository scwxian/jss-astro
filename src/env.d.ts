/**
 * Astro Locals Type Augmentation
 * Extends Astro's Locals interface to include Cloudflare runtime.
 */

import "astro";

declare module "astro" {
	interface Locals {
		runtime: {
			env: Env;
		};
	}
}