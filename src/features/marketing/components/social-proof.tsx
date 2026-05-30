import { getMessages } from "next-intl/server";

type TrustItem = {
    value: string;
    label: string;
};

type HeroContent = {
    trustItems: TrustItem[];
};

export async function SocialProof() {
    const messages = await getMessages();
    const hero = (messages as { Landing: { Hero: HeroContent } }).Landing.Hero;

    return (
        <section className="border-y border-zinc-200/80 bg-white/70 py-6 dark:border-white/10 dark:bg-background/80">
            <div className="container mx-auto max-w-7xl px-4">
                <div className="grid gap-4 md:grid-cols-3">
                    {hero.trustItems.map((item) => (
                        <div
                            key={item.value}
                            className="rounded-[1.5rem] border border-black/5 bg-white px-5 py-5 shadow-sm dark:border-white/10 dark:bg-zinc-950/70"
                        >
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                                {item.value}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base">
                                {item.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
