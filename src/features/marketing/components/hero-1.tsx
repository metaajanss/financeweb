import { cn } from "@/shared/utils";
import { Button } from "@/shared/components/ui/button";
import { RocketIcon, ArrowRightIcon, PhoneCallIcon } from "lucide-react";
import { LogoCloud } from "@/features/marketing/components/logo-cloud-3";

export function HeroSection() {
	return (
		<section className="mx-auto w-full max-w-7xl relative">
			{/* Monochrome Glow - Subdued & Elegant */}
			<div
				aria-hidden="true"
				className="absolute inset-0 isolate hidden overflow-hidden lg:block pointer-events-none"
			>
				<div className="absolute inset-0 -top-24 isolate -z-10 bg-[radial-gradient(50%_50%_at_50%_0%,rgba(255,255,255,0.03),transparent)] dark:bg-[radial-gradient(50%_50%_at_50%_0%,rgba(255,255,255,0.05),transparent)]" />
			</div>

			{/* Faded Borders - Silver/Grey */}
			<div
				aria-hidden="true"
				className="absolute inset-x-0 top-0 mx-auto hidden h-px w-full max-w-5xl bg-gradient-to-r from-transparent via-foreground/20 to-transparent lg:block"
			/>

			{/* main content */}
			<div className="relative flex flex-col items-center justify-center gap-8 pt-32 pb-24 px-4">
				{/* Clean Background Lines */}
				<div
					aria-hidden="true"
					className="absolute inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none opacity-[0.15]"
				>
					<div className="absolute inset-y-0 left-12 w-px bg-gradient-to-b from-transparent via-foreground to-transparent" />
					<div className="absolute inset-y-0 right-12 w-px bg-gradient-to-b from-transparent via-foreground to-transparent" />
				</div>

				<a
					className={cn(
						"group mx-auto flex w-fit items-center gap-3 rounded-full border border-foreground/10 bg-surface/50 px-4 py-1.5 shadow-sm transition-all duration-300 hover:border-foreground/20",
						"animate-in fade-in slide-in-from-bottom-5"
					)}
					href="#"
				>
					<RocketIcon className="w-3.5 h-3.5" />
					<span className="text-xs font-semibold tracking-wide uppercase">New: Advanced AI Qualification</span>
					<span className="block h-4 border-l border-foreground/10" />
					<ArrowRightIcon className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-1" />
				</a>

				<h1
					className={cn(
						"text-balance text-center text-4xl font-black tracking-tight md:text-6xl lg:text-8xl leading-[1.05]",
						"animate-in fade-in slide-in-from-bottom-8 duration-700"
					)}
				>
					Automate Appointments <br className="hidden md:block" /> with AI Precision
				</h1>

				<p className="mx-auto max-w-2xl text-center text-base text-muted-foreground sm:text-xl animate-in fade-in slide-in-from-bottom-10 duration-1000 leading-relaxed font-light">
					Turn every conversation into a booked meeting. <br className="hidden lg:block" />
					High-performance AI assistance that qualifies leads 24/7 with surgical accuracy.
				</p>

				<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
					<Button className="rounded-full shadow-[0_0_20px_rgba(168,85,247,0.2)] px-8 h-12 text-base font-bold transition-all hover:scale-[1.02] active:scale-95 btn-primary-gradient" size="lg">
						Get Started Free
						<ArrowRightIcon className="w-5 h-5 ml-2" />
					</Button>
					<Button className="rounded-full px-8 h-12 text-base font-semibold border-foreground/20 hover:bg-foreground/5 text-foreground bg-transparent" size="lg" variant="outline">
						<PhoneCallIcon className="w-4 h-4 mr-2" />
						Book a Demo
					</Button>
				</div>
			</div>
		</section>
	);
}

export function LogosSection() {
	return (
		<section className="relative space-y-10 border-t border-border/50 py-20 grayscale transition-all hover:grayscale-0">
			<h2 className="text-center font-bold text-xs text-muted-foreground uppercase tracking-[0.3em] opacity-60">
				Trusted by <span className="text-foreground">Global Innovation Leaders</span>
			</h2>
			<div className="relative z-10 mx-auto max-w-5xl px-4 opacity-40 hover:opacity-100 transition-opacity">
				<LogoCloud logos={logos} />
			</div>
		</section>
	);
}

const logos = [
	{ src: "https://storage.efferd.com/logo/nvidia-wordmark.svg", alt: "Nvidia" },
	{ src: "https://storage.efferd.com/logo/supabase-wordmark.svg", alt: "Supabase" },
	{ src: "https://storage.efferd.com/logo/openai-wordmark.svg", alt: "OpenAI" },
	{ src: "https://storage.efferd.com/logo/turso-wordmark.svg", alt: "Turso" },
	{ src: "https://storage.efferd.com/logo/vercel-wordmark.svg", alt: "Vercel" },
	{ src: "https://storage.efferd.com/logo/github-wordmark.svg", alt: "GitHub" },
];
