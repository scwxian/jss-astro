import { getCollection } from "astro:content";

// Pagination page sizes
const SHOP_PAGE_SIZE = 12;
const BLOG_PAGE_SIZE = 9;

// GENERIC CORE. Caller supplies published filter + sort.
// Generates paginated paths for an entire content collection.
export async function getPaginatedPaths(collectionName, paginate, { pageSize, published, sort }) {
	const allItems = await getCollection(collectionName);
	const publishedItems = allItems.filter(published);
	const sortedItems = sort(publishedItems);
	return paginate(sortedItems, { pageSize });
}

// Generates paginated paths grouped by unique categories within a collection.
export async function getPaginatedCategoryPaths(collectionName, paginate, { pageSize, published, sort }) {
	const allItems = await getCollection(collectionName);
	const publishedItems = allItems.filter(published);
	const uniqueCategories = [...new Set(publishedItems.map((item) => item.data.category))].filter(Boolean);

	return uniqueCategories.flatMap((category) => {
		const categoryItems = publishedItems.filter((item) => item.data.category === category);
		const sortedCategoryItems = sort(categoryItems);
		const categorySlug = category.toLowerCase();
		return paginate(sortedCategoryItems, {
			params: { category: categorySlug },
			pageSize,
		});
	});
}

// PRODUCT CONFIG
export const productPublished = (item) => item.data.status !== "draft";

// Sort priority for product status: Best Seller (isFeatured: true, status: "active") -> Normal (status: "active", isFeatured: false/undefined) -> Pre-orders (status: "pre-order") -> Out of Stock (status: "out-of-stock")
function getProductSortPriority(item) {
	const { status, isFeatured, isNew } = item.data;
	if (status === "active" && isFeatured === true) return 1;
	if (status === "active" && isNew === true) return 2;
	if (status === "active") return 3;
	if (status === "pre-order") return 4;
	if (status === "out-of-stock") return 5;
	return 6; // Fallback for any other status
}

// Sort by display priority, then cheapest basePrice within each tier
export function sortProductsByPriority(items) {
	return items.sort((a, b) => {
		const priorityA = getProductSortPriority(a);
		const priorityB = getProductSortPriority(b);
		if (priorityA !== priorityB) return priorityA - priorityB;
		return a.data.basePrice - b.data.basePrice;
	});
}

export function getPaginatedProductPaths(paginate, pageSize = SHOP_PAGE_SIZE) {
	return getPaginatedPaths("products", paginate, {
		pageSize,
		published: productPublished,
		sort: sortProductsByPriority,
	});
}

export function getPaginatedProductCategoryPaths(paginate, pageSize = SHOP_PAGE_SIZE) {
	return getPaginatedCategoryPaths("products", paginate, {
		pageSize,
		published: productPublished,
		sort: sortProductsByPriority,
	});
}

// Generates paginated paths grouped by unique category+subCategory combinations.
export async function getPaginatedSubCategoryPaths(paginate, pageSize = SHOP_PAGE_SIZE) {
	const allItems = await getCollection("products");
	const publishedItems = allItems.filter(productPublished);

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

// BLOG CONFIG
// Drafts surface in dev for preview; production build strips them.
const SHOW_DRAFTS = import.meta.env.DEV;
export const blogPublished = (item) => SHOW_DRAFTS || !item.data.draft;

// Sort posts newest first
const sortBlogByPubDateDesc = (items) =>
	items.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

export function getPaginatedBlogPaths(paginate, pageSize = BLOG_PAGE_SIZE) {
	return getPaginatedPaths("blog", paginate, {
		pageSize,
		published: blogPublished,
		sort: sortBlogByPubDateDesc,
	});
}

export function getPaginatedBlogCategoryPaths(paginate, pageSize = BLOG_PAGE_SIZE) {
	return getPaginatedCategoryPaths("blog", paginate, {
		pageSize,
		published: blogPublished,
		sort: sortBlogByPubDateDesc,
	});
}
