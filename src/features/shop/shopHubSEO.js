import { siteInfo } from "@shared/siteInfo.js";

export const shopHubSEO = {
	// --- MAIN HUBS ---
	"all": {
		title: `Shop All Products | ${siteInfo.name}`,
		description: "Discover our complete range of products. Fast shipping, secure checkout, and excellent customer service.",
		pageSubtitle: "",
		moreInfo: [
			{
				q: "Why shop with us?",
				a: `We curate high-quality products at fair prices. Shop <a href="/shop/all/">our full catalog</a> with confidence.`,
			},
			{
				q: "Do you offer international shipping?",
				a: "We currently ship to select countries. Check our shipping page for details and rates.",
			},
		],
	},

	"category-1": {
		title: `Shop Category One | ${siteInfo.name}`,
		description: "Explore our selection of Category One products. Handpicked items with fast delivery and easy returns.",
		pageSubtitle: "Our Flagship Line",
		moreInfo: [
			{
				q: "What is Category One?",
				a: `Category One features our flagship product line. Browse <a href="/shop/category-1/">the collection</a> to learn more.`,
			},
			{
				q: "Are these products covered by warranty?",
				a: "Yes, all Category One items include a standard manufacturer warranty. Contact support for details.",
			},
		],
	},

	"category-2": {
		title: `Shop Category Two | ${siteInfo.name}`,
		description: "Find the best Category Two products with flexible plans and fast delivery. Perfect for everyday use or gifting.",
		pageSubtitle: "Flexible Plans & Options",
		moreInfo: [
			{
				q: "How do Category Two plans work?",
				a: "Choose your plan, set your schedule, and we handle the rest. Fresh stock delivered to your door.",
			},
			{
				q: "Are there any hidden fees?",
				a: "Absolutely not. Total flexibility, zero hidden clauses. Cancel or modify anytime via your account.",
			},
		],
	},

	// --- SUBCATEGORIES ---
	"subcategory-a": {
		title: `Shop Subcategory A | ${siteInfo.name}`,
		description: "Shop custom Subcategory A items. Quality assured, freshly stocked, and delivered fast.",
		pageSubtitle: "Handpicked Quality",
		moreInfo: [
			{
				q: "What makes Subcategory A special?",
				a: `Each item is selected with a specific purpose in mind. Browse <a href="/shop/subcategory-a/">the range</a> to see what's in stock.`,
			},
			{
				q: "Are these items high quality?",
				a: "We source only trusted suppliers. Quality checks on every batch before shipping.",
			},
		],
	},
};
