import { getCollection } from "astro:content";

// Sort priority for product status: Best Seller (isFeatured: true, status: "active") -> Normal (status: "active", isFeatured: false/undefined) -> Pre-orders (status: "pre-order") -> Out of Stock (status: "out-of-stock")
function getProductSortPriority(item) {
	const { status, isFeatured } = item.data;

	if (status === "active" && isFeatured === true) return 1;
	if (status === "active") return 2;
	if (status === "pre-order") return 3;
	if (status === "out-of-stock") return 4;
	return 5; // Fallback for any other status
}

// Sort products by display priority: Best Seller -> Normal -> Pre-orders -> Out of Stock
function sortProductsByPriority(items) {
	return items.sort((a, b) => {
		const priorityA = getProductSortPriority(a);
		const priorityB = getProductSortPriority(b);
		return priorityA - priorityB;
	});
}

// Generates paginated paths for an entire content collection.
export async function getPaginatedCollectionPaths(collectionName, paginate, pageSize = 12) {
	const allItems = await getCollection(collectionName);
	const publishedItems = allItems.filter((item) => item.data.status !== "draft");
	const sortedItems = sortProductsByPriority(publishedItems);
	return paginate(sortedItems, { pageSize });
}

// Generates paginated paths grouped by unique categories within a collection.
export async function getPaginatedCategoryPaths(collectionName, paginate, pageSize = 12) {
	const allItems = await getCollection(collectionName);
	const publishedItems = allItems.filter((item) => item.data.status !== "draft");
	const uniqueCategories = [...new Set(publishedItems.map((item) => item.data.category))].filter(Boolean);

	return uniqueCategories.flatMap((category) => {
		const categoryItems = publishedItems.filter((item) => item.data.category === category);
		const sortedCategoryItems = sortProductsByPriority(categoryItems);
		const categorySlug = category.toLowerCase();
		return paginate(sortedCategoryItems, {
			params: { category: categorySlug },
			pageSize,
		});
	});
}

// Generates paginated paths grouped by unique category+subCategory combinations.
export async function getPaginatedSubCategoryPaths(collectionName, paginate, pageSize = 12) {
	const allItems = await getCollection(collectionName);
	const publishedItems = allItems.filter((item) => item.data.status !== "draft");

	// Filter to items with subCategory defined
	const itemsWithSubCategory = publishedItems.filter((item) => item.data.subCategory !== undefined);

	// Get unique category+subCategory combinations
	const uniquePairs = [
		...new Set(itemsWithSubCategory.map((item) => `${item.data.category}::${item.data.subCategory}`)),
	];

	return uniquePairs.flatMap((pair) => {
		const [category, subCategory] = pair.split("::");
		const pairItems = publishedItems.filter(
			(item) => item.data.category === category && item.data.subCategory === subCategory
		);
		const sortedItems = sortProductsByPriority(pairItems);
		const categorySlug = category.toLowerCase();
		const subCategorySlug = subCategory.toLowerCase().replace(/\s+/g, "-");

		return paginate(sortedItems, {
			params: { category: categorySlug, subcategory: subCategorySlug },
			pageSize,
		});
	});
}
