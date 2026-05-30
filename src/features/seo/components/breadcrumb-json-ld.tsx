import React from 'react';
import JsonLd from './json-ld';

interface BreadcrumbJsonLdProps {
    items: {
        name: string;
        item: string;
    }[];
}

export default function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
    const jsonLdData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.item,
        })),
    };

    return <JsonLd data={jsonLdData} />;
}
