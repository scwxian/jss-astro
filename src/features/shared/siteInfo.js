export const siteInfo = {
	name: "Your Store Name",
	url: "https://yoursite.com/",
	domain: "yoursite.com",
	description:
		"Your Store Name is a modern online retailer offering quality products with fast shipping and excellent customer service.",
	logo: "https://yoursite.com/meta-assets/logo.png",
	image: "https://yoursite.com/meta-assets/cover-image.png",
	socialShareImage: "https://yoursite.com/meta-assets/social-share-image.webp",
	businessName: "Your Store Name",
	address: {
		streetAddress: "123 Example Street, Suite 100",
		locality: "Springfield",
		postalCode: "12345",
		region: "Illinois",
		country: "US",
	},
	email: "hello@yoursite.com",
	phone: "+1-555-123-4567",
	whatsapp: "15551234567",
	socials: {
		instagram: "https://www.instagram.com/yourstore",
		facebook: "https://www.facebook.com/yourstore",
		twitter: "https://twitter.com/yourstore",
		tiktok: "https://www.tiktok.com/@yourstore",
	},
	defaultCurrency: "USD",
	shippingDestinations: ["US", "CA"],
	keywords:
		"online store, buy products online, fast shipping, quality goods, ecommerce shop",
	legalBusinessName: "YOUR STORE NAME LLC",
	legalBusinessAddress:
		"123 Example Street, Suite 100, Springfield, Illinois, 12345",
	legalBusinessRegNo: "123456789",
};

export const countryCodeMap = {
	US: "United States",
	CA: "Canada",
	MY: "Malaysia",
	SG: "Singapore",
};

export const shopHubSEO = {
	// --- MAIN HUBS ---
	"all": {
		title: `Shop All Products | ${siteInfo.name}`,
		hiddenH1: "Browse Our Full Collection of Quality Products",
		description: "Discover our complete range of products. Fast shipping, secure checkout, and excellent customer service.",
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
		hiddenH1: "Buy Premium Category One Products Online",
		description: "Explore our selection of Category One products. Handpicked items with fast delivery and easy returns.",
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
		hiddenH1: "Flexible Options for Category Two",
		description: "Find the best Category Two products with flexible plans and fast delivery. Perfect for everyday use or gifting.",
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
		hiddenH1: "Buy Subcategory A Products Online",
		description: "Shop custom Subcategory A items. Quality assured, freshly stocked, and delivered fast.",
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
