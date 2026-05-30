'use client';

import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTranslations } from 'next-intl';

export function JumpixTour() {
    const t = useTranslations('Tour');
    const hasInitialized = useRef(false);

    useEffect(() => {
        // Prevent double initialization in strict mode
        if (hasInitialized.current) return;
        
        const hasSeenTour = localStorage.getItem('hasSeenJumpixTour_v3');

        if (!hasSeenTour) {
            hasInitialized.current = true;
            // Add a small delay to ensure UI elements are rendered
            setTimeout(() => {
                const driverObj = driver({
                    showProgress: true,
                    animate: true,
                    popoverClass: 'driverjs-theme',
                    nextBtnText: t('buttons.next'),
                    prevBtnText: t('buttons.prev'),
                    doneBtnText: t('buttons.done'),
                    steps: [
                        {
                            popover: {
                                title: t('step1.title'),
                                description: t('step1.description'),
                            }
                        },
                        {
                            element: '#tour-overview',
                            popover: {
                                title: t('step2.title'),
                                description: t('step2.description'),
                                side: 'right'
                            }
                        },
                        {
                            element: '#tour-pipeline',
                            popover: {
                                title: t('step3.title'),
                                description: t('step3.description'),
                                side: 'right'
                            }
                        },
                        {
                            element: '#tour-conversations',
                            popover: {
                                title: t('step4.title'),
                                description: t('step4.description'),
                                side: 'right'
                            }
                        },
                        {
                            element: '#tour-sequences',
                            popover: {
                                title: t('step6.title'),
                                description: t('step6.description'),
                                side: 'right'
                            }
                        },
                        {
                            element: '#tour-team',
                            popover: {
                                title: t('step7.title'),
                                description: t('step7.description'),
                                side: 'right'
                            }
                        },
                        {
                            element: '#tour-wizard',
                            popover: {
                                title: t('step8.title'),
                                description: t('step8.description'),
                                side: 'right'
                            }
                        }
                    ],
                    onDestroyed: () => {
                        localStorage.setItem('hasSeenJumpixTour_v3', 'true');
                    }
                });

                driverObj.drive();
            }, 500);
        }
    }, [t]);

    return null;
}
