"use client";

import React from "react";
import { m } from "framer-motion";
import { StarIcon } from "lucide-react";
import { useLocale } from "next-intl";
import Image from "next/image";

const testimonialsListTr = [
    {
        text: "Payoff Lab operasyonlarımızı yönetme şeklimizi tamamen değiştirdi. Sadece otomasyon özellikleri bile bize haftada 20 saat kazandırdı.",
        name: "Sarah Jenkins",
        role: "CTO, TechFlow Inc.",
        image: "https://i.pravatar.cc/150?u=sarah"
    },
    {
        text: "Bu yıl yaptığımız en iyi yatırım. Destek ekibi inanılmaz ve platform kusursuz çalışıyor. Kesinlikle tavsiye ederim.",
        name: "Michael Chen",
        role: "Kurucu, GrowthLab",
        image: "https://i.pravatar.cc/150?u=michael"
    },
    {
        text: "Basit, sezgisel ve güçlü. Biz büyüdükçe o da bizimle birlikte ölçekleniyor, bu tam da ihtiyacımız olan şeydi.",
        name: "Elena Rodriguez",
        role: "Operasyon Direktörü, ScaleUp",
        image: "https://i.pravatar.cc/150?u=elena"
    },
    {
        text: "Daha önce denediğimiz tüm SaaS platformlarından çok daha hızlı bir arayüze sahip. Ekip hemen adapte oldu.",
        name: "David Kim",
        role: "Ürün Yöneticisi, Nova",
        image: "https://i.pravatar.cc/150?u=david"
    },
    {
        text: "Veri analizlerindeki yapay zeka desteği sayesinde kullanıcı davranışlarını hiç olmadığı kadar iyi anlıyoruz.",
        name: "Laura Smith",
        role: "Pazarlama Lideri, Vertex",
        image: "https://i.pravatar.cc/150?u=laura"
    }
];

const testimonialsListEn = [
    {
        text: "Payoff Lab completely changed the way we manage our operations. The automation features alone saved us 20 hours a week.",
        name: "Sarah Jenkins",
        role: "CTO, TechFlow Inc.",
        image: "https://i.pravatar.cc/150?u=sarah"
    },
    {
        text: "The best investment we made this year. The support team is incredible and the platform works flawlessly. Highly recommended.",
        name: "Michael Chen",
        role: "Founder, GrowthLab",
        image: "https://i.pravatar.cc/150?u=michael"
    },
    {
        text: "Simple, intuitive, and powerful. It scales with us as we grow, which is exactly what we needed.",
        name: "Elena Rodriguez",
        role: "Director of Operations, ScaleUp",
        image: "https://i.pravatar.cc/150?u=elena"
    },
    {
        text: "It has a much faster interface than any SaaS platform we've tried before. The team adapted immediately.",
        name: "David Kim",
        role: "Product Manager, Nova",
        image: "https://i.pravatar.cc/150?u=david"
    },
    {
        text: "Thanks to the AI support in data analytics, we understand user behavior better than ever before.",
        name: "Laura Smith",
        role: "Marketing Lead, Vertex",
        image: "https://i.pravatar.cc/150?u=laura"
    }
];

export const TestimonialsColumn = (props: {
    className?: string;
    testimonials: typeof testimonialsListTr;
    duration?: number;
}) => {
    return (
        <div className={props.className}>
            <m.div
                animate={{
                    translateY: "-50%",
                }}
                transition={{
                    duration: props.duration || 10,
                    repeat: Infinity,
                    ease: "linear",
                    repeatType: "loop",
                }}
                className="flex flex-col gap-6 pb-6 bg-transparent"
                style={{ willChange: "transform" }}
            >
                {[
                    ...new Array(2).fill(0).map((_, index) => (
                        <React.Fragment key={index}>
                            {props.testimonials.map(({ text, image, name, role }) => (
                                <div className="p-8 rounded-[2rem] border border-zinc-200 dark:border-white/5 bg-white dark:bg-black/50 backdrop-blur-sm shadow-xl max-w-sm w-full relative overflow-hidden group hover:border-zinc-300 transition-all font-sans" key={name}>

                                    <div className="flex gap-1 text-amber-400 dark:text-amber-500 mb-4">
                                        {[...Array(5)].map((_, idx) => (
                                            <StarIcon key={idx} className="w-4 h-4 fill-current" />
                                        ))}
                                    </div>

                                    <div className="text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed relative z-10">&quot;{text}&quot;</div>

                                        <div className="flex items-center gap-3 mt-6 relative z-10 w-full pt-4 border-t border-zinc-200 dark:border-white/5">
                                        <Image
                                            width={40}
                                            height={40}
                                            src={image}
                                            alt={name}
                                            sizes="40px"
                                            className="h-10 w-10 rounded-full ring-2 ring-zinc-100 dark:ring-white/10 grayscale group-hover:grayscale-0 transition-all duration-300"
                                        />
                                        <div className="flex flex-col">
                                            <div className="font-semibold tracking-tight leading-5 text-zinc-900 dark:text-white">{name}</div>
                                            <div className="text-sm leading-5 text-zinc-500">{role}</div>
                                        </div>
                                    </div>

                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                                </div>
                            ))}
                        </React.Fragment>
                    )),
                ]}
            </m.div>
        </div>
    );
};

export function Testimonials() {
    const locale = useLocale();
    const isEn = locale === 'en';
    const list = isEn ? testimonialsListEn : testimonialsListTr;

    // Split testimonials into 3 arrays for staggered columns
    const col1 = list.slice(0, 5);
    const col2 = [...list.slice(2, 5), ...list.slice(0, 2)];
    const col3 = [...list.slice(4, 5), ...list.slice(0, 4)];

    return (
        <section className="py-24 lg:py-32 bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden z-0 flex flex-col items-center justify-center min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.03),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.03),transparent_40%)]">
            {/* Ambient Background Glow, deeply localized */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[400px] bg-purple-500/5 dark:bg-white/5 blur-[150px] rounded-[100%] pointer-events-none -z-10" />

            <div className="container mx-auto px-4 max-w-7xl mb-12 relative z-10">
                <div className="text-center ">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-balance mb-6 text-zinc-900 dark:text-white font-sans">
                        {isEn ? "Loved by Businesses " : "Her Yerde İşletmelerin "}<span className="text-zinc-500">{isEn ? "Everywhere" : "Gözdesi"}</span>
                    </h2>
                    <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-medium font-sans">
                        {isEn ? "Don't just take our word for it, join hundreds of happy teams who grew and accelerated their operations with us." : "Sadece bizim sözümüze güvenmeyin, bizimle büyüyen ve operasyonlarını hızlandıran yüzlerce mutlu ekibe katılın."}
                    </p>
                </div>
            </div>

            {/* Scrolling Columns Container */}
            <div className="relative w-full max-w-[1200px] mx-auto h-[600px] lg:h-[800px] overflow-hidden flex justify-center gap-6 px-4">

                {/* Top/Bottom Gradient Fades */}
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-zinc-50 dark:from-zinc-950 to-transparent z-20 pointer-events-none"></div>
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 to-transparent z-20 pointer-events-none"></div>

                <TestimonialsColumn
                    testimonials={col1}
                    duration={20}
                    className="hidden md:block overflow-hidden h-full"
                />

                <TestimonialsColumn
                    testimonials={col2}
                    duration={25}
                    className="overflow-hidden h-full mt-12 lg:mt-24"
                />

                <TestimonialsColumn
                    testimonials={col3}
                    duration={22}
                    className="hidden lg:block overflow-hidden h-full mt-10"
                />

            </div>
        </section>
    );
}
