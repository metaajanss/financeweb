'use client';

import dynamic from 'next/dynamic';

const DynamicShowcase = dynamic(
    () => import('@/features/marketing/components/InteractiveShowcase').then((mod) => mod.InteractiveShowcase),
    { 
        ssr: false, 
        loading: () => <div className="w-full h-[600px] animate-pulse bg-muted/20 rounded-3xl mx-auto max-w-7xl my-24" /> 
    }
);

export function InteractiveShowcaseWrapper() {
    return <DynamicShowcase />;
}
