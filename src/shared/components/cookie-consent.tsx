"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { CookieIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);
    const t = useTranslations("CookieConsent");
    const locale = useLocale();

    useEffect(() => {
        const consent = localStorage.getItem("cookie_consent");
        if (!consent) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem("cookie_consent", "accepted");
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem("cookie_consent", "declined");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[99999] pointer-events-auto max-w-[320px] animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                        <CookieIcon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        {t("message").includes("experience") ? "Privacy" : "Gizlilik"}
                    </span>
                </div>

                <p className="text-[12px] text-muted-foreground leading-snug">
                    {t("message")}
                    {" "}
                    <Link
                        href={`/${locale}/cookie-policy`}
                        className="text-primary hover:underline font-medium"
                    >
                        {t("learnMore")}
                    </Link>
                </p>

                <div className="flex gap-2">
                    <Button
                        onClick={handleAccept}
                        size="sm"
                        className="h-8 text-[11px] px-3 rounded-xl flex-1 font-bold"
                    >
                        {t("accept")}
                    </Button>
                    <Button
                        onClick={handleDecline}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[11px] px-3 rounded-xl flex-1 font-bold hover:bg-muted text-muted-foreground"
                    >
                        {t("decline")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
