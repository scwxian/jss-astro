import type { Page } from "astro";
import { siteInfo } from "@shared/siteInfo.js";
import { getAssetUrl } from "@shared/scripts/asset-handling/r2-linking.js";

type ListItemMapper = (item: any, index: number) => Record<string, unknown>;

// GENERIC SHELL. Caller supplies list item mapper.
// Builds CollectionPage + ItemList schema.org object.
function buildCollectionSchema(page: Page<any>, buildListItem: ListItemMapper) {
	const itemListElement = page.data.map(buildListItem);

	return {
		"@type": "CollectionPage",
		mainEntity: {
			"@type": "ItemList",
			itemListElement,
			numberOfItems: itemListElement.length,
		},
	};
}

const productListItem: ListItemMapper = (product, index) => {
	const productUrl = new URL(`/products/${product.id}/`, siteInfo.url).href;
	const firstImage = product.data.images?.[0];

	return {
		"@type": "ListItem",
		position: index + 1,
		name: product.data.name,
		url: productUrl,
		...(firstImage && {
			image: getAssetUrl("products", product.id, firstImage),
		}),
	};
};

export function buildProductCollectionSchema(page: Page<any>) {
	return buildCollectionSchema(page, productListItem);
}

const blogListItem: ListItemMapper = (post, index) => {
	const postUrl = new URL(`/blog/${post.id}/`, siteInfo.url).href;
	const heroImage = post.data.heroImage;

	return {
		"@type": "ListItem",
		position: index + 1,
		name: post.data.title,
		url: postUrl,
		datePublished: post.data.pubDate.toISOString(),
		...(heroImage && {
			image: getAssetUrl("blog", post.id, heroImage),
		}),
	};
};

export function buildBlogCollectionSchema(page: Page<any>) {
	return buildCollectionSchema(page, blogListItem);
}
