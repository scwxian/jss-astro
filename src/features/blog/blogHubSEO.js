import { siteInfo } from "@shared/siteInfo.js";

// Keys MUST equal `category.toLowerCase()` in blog MDX frontmatter
// (collection-route-helpers.js → getPaginatedCategoryPaths).
// `all` = /blog/ home. Add a key before publishing the first post of a new category.
export const blogHubSEO = {
  // --- MAIN HUB ---
  "all": {
    title: `Blog | ${siteInfo.name}`,
    pageTitle: "Blog",
    pageSubtitle: "Guides, Stories & Updates",
    description: `Read the latest guides, stories and updates from ${siteInfo.name}.`,
  },

  // --- CATEGORY HUBS ---
  "category-1": {
    title: `Category One | ${siteInfo.name}`,
    pageTitle: "Category One",
    pageSubtitle: "Example category description",
    description: `Guides and articles in Category One from ${siteInfo.name}.`,
  },
};
