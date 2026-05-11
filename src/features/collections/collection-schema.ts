import { siteInfo } from "@shared/siteInfo.js";
import { getAssetUrl } from "@shared/scripts/asset-handling/r2-linking.js";

export function buildCollectionSchema(page) {
	const itemListElement = page.data.map((product, index) => {
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
	});

	return {
		"@type": "CollectionPage",
		mainEntity: {
			"@type": "ItemList",
			itemListElement,
			numberOfItems: itemListElement.length,
		},
	};
}
