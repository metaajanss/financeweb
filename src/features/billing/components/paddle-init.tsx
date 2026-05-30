'use client';

import { useEffect, useState } from 'react';
import { getPaddleCustomerId } from '@/features/billing/services/paddle';

interface PaddleInitProps {
    locale?: string;
}

export function PaddleInit({ locale = 'en' }: PaddleInitProps) {
    const [customerId, setCustomerId] = useState<string | null>(null);

    useEffect(() => {
        getPaddleCustomerId().then(id => {
            if (id) setCustomerId(id);
        });
    }, []);

    useEffect(() => {
        const initPaddle = () => {
            try {
                if (typeof window === 'undefined' || !(window as any).Paddle) {
                    console.warn('[Paddle Init] Paddle.js not yet available');
                    return;
                }

                const paddle = (window as any).Paddle;
                const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
                const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';

                if (!token) {
                    console.warn('[Paddle Init] NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is missing');
                    return;
                }

                // Prepare pwCustomer object for Retain
                const pwCustomer = customerId ? { id: customerId } : {};

                paddle.Environment.set(environment);
                paddle.Initialize({
                    token,
                    pwCustomer,
                    eventCallback: (_data: any) => {
                    },
                    checkout: {
                        settings: {
                            displayMode: 'overlay',
                            theme: 'dark',
                            locale: locale,
                            allowLogout: true,
                        },
                    },
                });


            } catch (err: any) {
                console.error('[Paddle Init] Background initialization error:', err);
            }
        };

        // Wait for paddle.js CDN script to load
        const script = document.getElementById('paddle-js-script');
        if (script) {
            script.addEventListener('load', initPaddle);
            // If already loaded, initialise immediately
            if ((window as any).Paddle) initPaddle();
            return () => script.removeEventListener('load', initPaddle);
        } else {
            // Retry in case script hasn't been injected yet
            const interval = setInterval(() => {
                if ((window as any).Paddle) {
                    clearInterval(interval);
                    initPaddle();
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, [locale, customerId]);

    // This component is invisible
    return null;
}
