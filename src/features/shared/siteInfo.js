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
	companyProfiles: {
		linkedin: "https://www.linkedin.com/company/yourstore",
		googleBusiness: "https://maps.google.com/?cid=0000000000000000000",
		wikidata: "",
	},
	foundingDate: "2025",
	slogan: "Quality products, fair prices",
	knowsAbout: ["Online Retail", "E-commerce", "Customer Service"],
	defaultCurrency: "USD",
	shippingDestinations: ["US", "CA"],
	keywords:
		"online store, buy products online, fast shipping, quality goods, ecommerce shop",
	legalBusinessName: "YOUR STORE NAME LLC",
	legalBusinessAddress:
		"123 Example Street, Suite 100, Springfield, Illinois, 12345",
	legalBusinessRegNo: "123456789",
};

// Identity URLs for schema.org sameAs: socials + company profiles, empties dropped.
export const orgSameAs = [
	...Object.values(siteInfo.socials),
	...Object.values(siteInfo.companyProfiles),
].filter(Boolean);

export const countryCodeMap = {
	US: "United States",
	CA: "Canada",
	MY: "Malaysia",
	SG: "Singapore",
};
