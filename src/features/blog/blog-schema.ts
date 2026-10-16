import type { CollectionEntry } from "astro:content";
import type { AdditionalInfo } from "@contentconfig";
import { blogAuthors, buildPersonId, buildProfileUrl, buildAwards } from "@shared/team.data.js";
import { getAssetUrl } from "@scripts/asset-handling/r2-linking.js";
import { computeReadTime, stripHtml } from "@scripts/utils.js";
import { siteInfo } from "@shared/siteInfo.js";

// Shared fallback hero image, also used by BlogCard
export const DEFAULT_HERO_IMAGE =
	"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=800";

// Frontmatter override wins; otherwise word-count estimate from raw MDX body
export function getReadTime(post: CollectionEntry<"blog">, wpm = 220) {
	return post.data.readTime ?? computeReadTime(post.body, wpm);
}

interface AuthorProfile {
	id: string;
	name: string;
	role: string;
	profilePicUrl?: string;
	url: string;
	sameAs: string[];
	knowsAbout: string[];
	bio: string;
	awards?: { name: string; url: string; recognizedBy: string }[];
	seoDescription: string;
	blogSince?: string;
}

export function buildBlogPostSchema(post: CollectionEntry<"blog">, pageUrl: string) {
	const author = blogAuthors[post.data.author];
	const heroImage = post.data.heroImage
		? getAssetUrl("blog", post.id, post.data.heroImage)
		: siteInfo.image;

	return {
		"@type": "BlogPosting",
		headline: post.data.seo?.title || post.data.title,
		description: post.data.seo?.description || post.data.subtitle || post.data.summary || "",
		...(post.data.summary && { abstract: stripHtml(post.data.summary) }),
		image: heroImage,
		datePublished: post.data.pubDate.toISOString(),
		...(post.data.updatedAt && { dateModified: post.data.updatedAt.toISOString() }),
		author: {
			"@type": "Person",
			"@id": buildPersonId(author.id),
			name: author.name,
			...(author.profilePicUrl && { image: author.profilePicUrl }),
			url: buildProfileUrl(author.id),
			sameAs: author.sameAs,
			knowsAbout: author.knowsAbout,
			description: author.bio,
			...buildAwards(author),
		},
		publisher: { "@id": `${siteInfo.url}#organization` },
		isPartOf: { "@id": `${siteInfo.url}#website` },
		mainEntityOfPage: pageUrl,
		articleSection: post.data.category,
		keywords: post.data.keywords.join(", "),
		...(post.data.citations.length > 0 && { citation: post.data.citations }),
		inLanguage: "en",
		isAccessibleForFree: true,
	};
}

// FAQPage node — blog only; products intentionally emit none.
export function buildFaqSchema(items: AdditionalInfo[], pageUrl: string) {
	return {
		"@type": "FAQPage",
		"@id": `${pageUrl}#faq`,
		url: pageUrl,
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.summary,
			acceptedAnswer: {
				"@type": "Answer",
				text: stripHtml(item.content),
			},
		})),
	};
}

export function buildProfilePageSchema(author: AuthorProfile, pageUrl: string, dateModified?: string) {
	return {
		"@type": "ProfilePage",
		...(author.blogSince && { dateCreated: author.blogSince }),
		...(dateModified && { dateModified }),
		mainEntity: {
			"@type": "Person",
			"@id": buildPersonId(author.id),
			name: author.name,
			jobTitle: author.role,
			description: author.bio,
			...(author.profilePicUrl && { image: author.profilePicUrl }),
			url: pageUrl,
			sameAs: author.sameAs,
			knowsAbout: author.knowsAbout,
			...buildAwards(author),
			worksFor: { "@id": `${siteInfo.url}#organization` },
		},
	};
}
