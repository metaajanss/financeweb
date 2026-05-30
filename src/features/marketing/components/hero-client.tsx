"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { PlayCircleIcon, X } from "lucide-react";

export function HeroClient() {
    const [showDemoModal, setShowDemoModal] = useState(false);

    return (
        <>
            <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 w-full sm:w-auto h-12 text-base"
                onClick={() => setShowDemoModal(true)}
            >
                <PlayCircleIcon className="mr-2 h-4 w-4" />
                Watch Demo
            </Button>

            {/* Demo Video Modal */}
            {showDemoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowDemoModal(false)}>
                    <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowDemoModal(false)}
                            className="absolute -top-12 right-0 text-white hover:text-primary transition-colors"
                        >
                            <X size={32} />
                        </button>
                        <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                            <iframe
                                width="100%"
                                height="100%"
                                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                                title="Product Demo"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0"
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
