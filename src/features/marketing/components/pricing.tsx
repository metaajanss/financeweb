import { getMessages } from "next-intl/server";
import { PricingClient } from "./pricing-client";
import { type PricingContent } from "@/shared/types/pricing";


export async function Pricing({ locale, showComparison = false }: { locale: string, showComparison?: boolean }) {
    const messages = await getMessages();
    const pricing = (messages as any).Landing.Pricing as PricingContent;
    const eyebrow = (pricing as any).eyebrow;

    return (
        <PricingClient 
            pricing={pricing} 
            eyebrow={eyebrow} 
            locale={locale} 
            showComparison={showComparison}
        />
    );
}
