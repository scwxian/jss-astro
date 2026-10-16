import { siteInfo } from "@shared/siteInfo.js";

// Canonical Person @id — one node merged across about, author pages and blog posts.
export const buildPersonId = (id) => `${siteInfo.url}#person/${id}`;

// Canonical ProfilePage URL — resolves Person entity home for authors.
export const buildProfileUrl = (id) => `${siteInfo.url}blog/author/${id}/`;

// Awards → schema.org award (text) plus hasCredential proof link + issuing body.
export function buildAwards(member) {
	const awards = member.awards ?? [];
	if (!awards.length) return {};
	return {
		award: awards.map((a) => a.name),
		hasCredential: awards.map((a) => ({
			"@type": "Credential",
			name: a.name,
			url: a.url,
			recognizedBy: { "@type": "Organization", name: a.recognizedBy },
		})),
	};
}

// Central team registry. Consumed by profile pages and schema builders.
// hasProfile: true → entry gets a ProfilePage route (Person entity home).
// isBlogAuthor: true → entry can author posts (enum + BlogPosting author node).
// blogSince: fixed profile creation date for ProfilePage dateCreated.
export const teamMembers = [
	{
		id: "author-one",
		name: "Your Name",
		role: "Editor",
		image: "https://placehold.co/166x326?text=Author",
		profilePicUrl: "https://placehold.co/120x120?text=Author",
		url: buildProfileUrl("author-one"),
		sameAs: ["https://example.com"],
		knowsAbout: ["Topic One", "Topic Two"],
		shortBio: "A short bio used on the about page and team cards.",
		seoDescription: `Your Name writes for ${siteInfo.name}.`,
		bio: `Your Name writes guides and stories for ${siteInfo.name}.`,
		hasProfile: true,
		isBlogAuthor: true,
		isFounder: true,
	},
];

// Shared profile projection — one field list for profile + author registries.
const toProfile = (member) => ({
	id: member.id,
	name: member.name,
	role: member.role,
	profilePicUrl: member.profilePicUrl,
	url: member.url,
	sameAs: member.sameAs,
	knowsAbout: member.knowsAbout,
	bio: member.bio,
	awards: member.awards,
	seoDescription: member.seoDescription,
	blogSince: member.blogSince,
});

// ProfilePage route source — every member with a resolvable Person entity home.
export const authorProfiles = Object.fromEntries(
	teamMembers.filter((member) => member.hasProfile).map((member) => [member.id, toProfile(member)])
);

// Blog author source — drives post-author enum + BlogPosting author node.
export const blogAuthors = Object.fromEntries(
	teamMembers.filter((member) => member.isBlogAuthor).map((member) => [member.id, toProfile(member)])
);
