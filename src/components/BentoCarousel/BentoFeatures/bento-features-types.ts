export interface FeatureItem {
	label: string;
	value: string;
}

export interface StatItem {
	label: string;
	value: string | number;
}

export interface MediaItem {
	src: string;
	alt: string;
	caption?: string;
}

export interface BentoFeaturesData {
	features?: FeatureItem[];
	stats?: StatItem[];
	media?: MediaItem;
}
