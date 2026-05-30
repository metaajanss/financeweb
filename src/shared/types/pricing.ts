export type PricingPlan = {
    name: string;
    price: string;
    period: string;
    description: string;
    features: string[];
    ctaLabel: string;
    ctaHref: string;
    featured: boolean;
    isCustom: boolean;
};

export type FeatureComparison = {
    name: string;
    [key: string]: string | boolean;
};

export type ComparisonCategory = {
    name: string;
    features: FeatureComparison[];
};

export type ComparisonContent = {
    title: string;
    columnNames: string[];
    categories: ComparisonCategory[];
};

export type PricingContent = {
    title: string;
    subtitle: string;
    footnote: string;
    recommended: string;
    plans: PricingPlan[];
    Comparison: ComparisonContent;
};
