import React from "react";
import Image from "next/image";
import { cn } from "@/shared/utils";

interface BrandLogoProps {
    className?: string; // Container styles (e.g., size)
    imageClassName?: string; // Image styles
}

export function BrandLogo({ className, imageClassName }: BrandLogoProps) {
    return (
        <div className={cn("relative flex items-center justify-center shrink-0", className)}>
            <Image
                src="/jmplogo.png"
                alt="Jumpix Logo"
                width={160}
                height={44}
                priority
                fetchPriority="high"
                unoptimized
                className={cn("h-full w-auto object-contain", imageClassName)}
            />
        </div>
    );
}

export function BrandWordmark({ className }: { className?: string }) {
    return (
        <div className={cn("text-lg font-black tracking-tighter bg-gradient-to-br from-purple-600 to-indigo-600 bg-clip-text text-transparent", className)}>
            Jumpix
        </div>
    );
}
