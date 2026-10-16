import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { blogAuthors } from "@shared/team.data.js";

// SHARED SCHEMAS & ENUMS
export const categorySchema = z.enum([
	"products",
	"digital",
	"subscriptions",
	"memberships",
]);
export const productStatusSchema = z.enum([
	"active",
	"draft",
	"out-of-stock",
	"pre-order",
]);

export const billingAlignmentSchema = z.enum(["anchored", "rolling"]);

export const videoMediaSchema = z.object({
	provider: z.enum(["youtube", "self-hosted"]),
	url: z.url(),
});

export const externalLinkSchema = z.object({
	platform: z.string(), // e.g., "Amazon", "eBay", "Shopee", "Lazada"
	url: z.url(),
});

export const additionalInfoSchema = z.object({
	summary: z.string(),
	content: z.string(),
});

export const nonPriceAlteringChoiceSchema = z.object({
	name: z.string(),
	skuSuffix: z.string(),
	moreInfo: z.string().optional(),
	iconSource: z.enum(["emoji", "r2Asset", "http"]).optional(),
	icon: z.string().optional(),
});

export const nonPriceAlteringOptionSchema = z.object({
	name: z.string(),
	tooltip: z.string().optional(),
	showLabel: z.boolean().optional().default(true),
	multiSelect: z.boolean().optional().default(false),
	pickCount: z.number().int().min(2).optional(),
	choices: z.array(nonPriceAlteringChoiceSchema),
});

// VARIANT SCHEMAS
const variantBaseSchema = z.object({
	name: z.string(),
	skuSuffix: z.string(),
	price: z.number(),
	compareAtPrice: z.number().optional(),
	moreInfo: z.string().optional(),
	iconSource: z.enum(["emoji", "r2Asset", "http"]).optional(),
	icon: z.string().optional(),
});

export const physicalVariantSchema = variantBaseSchema.extend({
	weightInGrams: z.number(),
	quantity: z.number().optional(),
	inStock: z.boolean(),
});

export const subscriptionVariantSchema = variantBaseSchema.extend({
	weightInGrams: z.number().optional(),
});
// Digital variants don't need extra fields right now, but we alias it for clarity
export const digitalVariantSchema = variantBaseSchema;

// PRODUCT SCHEMAS
export const baseProductSchema = z.object({
	masterSku: z.string(),
	status: productStatusSchema,
	isFeatured: z.boolean().optional(),
	isNew: z.boolean().optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date().optional(),
	name: z.string(),
	brand: z.string().optional(), // omit = own brand; set = third-party Brand name
	category: categorySchema,
	subCategory: z.string().optional(),
	tags: z.array(z.string()).default([]),
	images: z.array(z.string()),
	video: videoMediaSchema.optional(),
	basePrice: z.number(),
	options: z.array(nonPriceAlteringOptionSchema).optional(),
	variantSortOrder: z.array(z.string()).optional(), // top→bottom group name order
	showQuantitySelector: z.boolean().default(true),
	hideCartFAB: z.boolean().default(false),
	maxQuantity: z.number().default(10),
	stockCheckRequired: z.boolean().default(false),
	stockFallbackStatus: z
		.enum(["out-of-stock", "pre-order"])
		.default("out-of-stock"),
	shortDescription: z.string(),
	relatedProductIds: z.array(reference("products")).optional(),
	additionalInfo: z.array(additionalInfoSchema).optional(),
	externalLinks: z.array(externalLinkSchema).optional(),
	seo: z
		.object({
			title: z.string().optional(),
			description: z.string().optional(),
		})
		.optional(),
});

export const productSchema = z.discriminatedUnion("type", [
	baseProductSchema.extend({
		type: z.literal("physical"),
		trackVariantInventory: z.boolean(),
		globalQuantity: z.number().optional(),
		priceVariantGroups: z.array(
			z.object({
				name: z.string(),
				tooltip: z.string().optional(),
				showLabel: z.boolean().optional().default(true),
				variants: z.array(physicalVariantSchema),
			}),
		),
	}),
	baseProductSchema.extend({
		type: z.literal("subscription"),
    billingAlignment: billingAlignmentSchema.default("anchored"),
    hasDeliverySchedule: z.boolean().default(true),
		priceVariantGroups: z.array(
			z.object({
				name: z.string(),
				tooltip: z.string().optional(),
				showLabel: z.boolean().optional().default(true),
				variants: z.array(subscriptionVariantSchema),
			}),
		),
	}),
	baseProductSchema.extend({
		type: z.literal("digital"),
		priceVariantGroups: z.array(
			z.object({
				name: z.string(),
				tooltip: z.string().optional(),
				showLabel: z.boolean().optional().default(true),
				variants: z.array(digitalVariantSchema),
			}),
		),
	}),
]);

// BLOG SCHEMA
// Enum derived from team.data.js isBlogAuthor flags — single source of truth.
export const blogAuthorSchema = z.enum(Object.keys(blogAuthors) as [string, ...string[]]);

export const blogPostSchema = z.object({
	title: z.string(), 
	seo: z
		.object({
			title: z.string().optional(),
			description: z.string().optional(),
		}),
	subtitle: z.string().optional(), // Brief hook below the title
	summary: z.string().optional(), // HTML string, inserted into a TL;DR block
	faq: z.array(additionalInfoSchema).optional(), // FAQ accordions; drives FAQPage schema (blog only)
	pubDate: z.coerce.date(), // RSS, SEO, reader trust
	updatedAt: z.coerce.date().optional(), // dateModified in schema markup
	author: blogAuthorSchema, // brand voice attribution
	heroImage: z.string().optional(), // OG image when shared
	heroImageAlt: z.string().optional(), // a11y alt text for hero image
	heroImageCaption: z.string().optional(), // HTML string, hero figcaption credit
	category: z.string(), // primary grouping, one per post
	keywords: z.array(z.string()).default([]), // schema.org BlogPosting keywords only — not displayed
	citations: z.array(z.string().url()).default([]), // schema.org BlogPosting citation; honest source URLs only
	draft: z.boolean().default(false), // true = excluded from build output
	readTime: z.number().int().min(1).optional(), // minutes; auto-computed when omitted
});

// ASTRO COLLECTIONS
const products = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/products" }),
	schema: productSchema,
});

const blog = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
	schema: blogPostSchema,
});

export const collections = { products, blog };

// TYPESCRIPT TYPE EXPORTS
export type Category = z.infer<typeof categorySchema>;
export type ProductStatus = z.infer<typeof productStatusSchema>;
export type VideoMedia = z.infer<typeof videoMediaSchema>;
export type ExternalLink = z.infer<typeof externalLinkSchema>;
export type AdditionalInfo = z.infer<typeof additionalInfoSchema>;
export type NonPriceAlteringOption = z.infer< typeof nonPriceAlteringOptionSchema >;
export type NonPriceAlteringChoice = z.infer< typeof nonPriceAlteringChoiceSchema >;
export type PhysicalVariant = z.infer<typeof physicalVariantSchema>;
export type DigitalVariant = z.infer<typeof digitalVariantSchema>;
export type SubscriptionVariant = z.infer<typeof subscriptionVariantSchema>;
export type BillingAlignment = z.infer<typeof billingAlignmentSchema>;
export type ProductData =z.infer<typeof productSchema>;
export type ProductType = ProductData["type"];
export type BlogPostData = z.infer<typeof blogPostSchema>;
export type BlogAuthor = z.infer<typeof blogAuthorSchema>;

