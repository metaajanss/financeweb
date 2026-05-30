'use client';
import { ReactNode } from 'react';
import { LazyMotion, domMax } from 'framer-motion';

export function FramerLazyProvider({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={domMax}>
            {children}
        </LazyMotion>
    );
}
