import type { CollectionEntry } from "astro:content";

export type PinnedPostConfig =
	| { mode: "latest" }
	| { mode: "slug"; slug: string };

// Per-category pin config. Key = category slug used in blog MDX frontmatter.
// Default (empty) pins the newest post; add a key to pin a specific post.
export const categoryPinnedPosts: Record<string, PinnedPostConfig> = {
	// "category-1": { mode: "slug", slug: "getting-started" },
	// "category-1": { mode: "latest" },
};

export function resolveHeroPost(
	posts: CollectionEntry<"blog">[],
	pageNumber: number,
	pinned?: PinnedPostConfig
): { heroPost?: CollectionEntry<"blog">; gridPosts: CollectionEntry<"blog">[] } {
	// Hero only first page
	if (pageNumber !== 1 || posts.length === 0) return { gridPosts: posts };

	if (!pinned || pinned.mode === "latest") {
		return { heroPost: posts[0], gridPosts: posts.slice(1) };
	}

	const pinnedPost = posts.find((post) => post.id === pinned.slug);
	if (!pinnedPost) return { heroPost: posts[0], gridPosts: posts.slice(1) };
	return {
		heroPost: pinnedPost,
		gridPosts: posts.filter((post) => post.id !== pinned.slug),
	};
}
