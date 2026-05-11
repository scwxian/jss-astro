/**
 * R2 Asset URL Resolver
 *
 * Resolves the correct URL for content assets hosted on Cloudflare R2.
 * Handles both R2-hosted assets and external URLs (YouTube, Unsplash, etc.)
 *
 * @see .docs/standards/assets-handling-rules.md for usage guidelines
 */

const CDN_URL = "https://assets.yoursite.com";

/**
 * @param {string} collection - The name of the collection (e.g., "products", "blog")
 * @param {string} slug - The entry ID or slug (e.g., "colombia-el-paraiso")
 * @param {string} filename - The exact filename in R2, or a full external URL
 * @returns {string} The resolved URL string
 *
 * @example
 * // R2-hosted image
 * getAssetUrl("products", "colombia-el-paraiso", "hero.webp");
 * // Returns: "https://assets.yoursite.com/products/colombia-el-paraiso/hero.webp"
 *
 * @example
 * // External URL (passthrough)
 * getAssetUrl("products", "colombia-el-paraiso", "https://images.unsplash.com/photo-123");
 * // Returns: "https://images.unsplash.com/photo-123"
 *
 * @example
 * // Self-hosted video
 * getAssetUrl("products", "colombia-el-paraiso", "brew-demo.mp4");
 * // Returns: "https://assets.yoursite.com/products/colombia-el-paraiso/brew-demo.mp4"
 */
export function getAssetUrl(collection, slug, filename) {
	if (filename.startsWith("http://") || filename.startsWith("https://")) {
		return filename;
	}
	return `${CDN_URL}/${collection}/${slug}/${filename}`;
}
