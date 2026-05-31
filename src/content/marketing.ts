import { Settings, Zap, Shield, Link as LinkIcon, Box } from "lucide-react";

export type MarketingPage = {
  slug: string;
  path: string;
  eyebrow?: string;
  title: string;
  description: string;
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  outcomes: Array<{ title: string; description: string }>;
  sections: Array<{ title: string; description: string; bullets: string[]; image?: string }>;
  related: Array<{ title: string; description: string; href: string }>;
  faqs?: Array<{ question: string; answer: string }>;
};

export function getBrandCopy(locale: string) {
  return {
    tagline: "Instant Responses. Qualified Leads. Booked Meetings.",
    rights: "© 2026 Payoff Lab. All rights reserved.",
    statusLabel: "Status",
    supportLabel: "Contact Support",
    termsLabel: "Terms of Service"
  };
}

export function getFooterGroups(locale: string) {
  return [
    {
      title: "Product",
      items: [
        { href: "/features", label: "Features" },
        { href: "/pricing", label: "Pricing" },
        { href: "/integrations", label: "Integrations" }
      ]
    },
    {
      title: "Company",
      items: [
        { href: "/about", label: "About" },
        { href: "/contact", label: "Contact" }
      ]
    }
  ];
}

export function getHeaderActions(locale: string) {
  return {
    pricingLabel: "Pricing",
    integrationsLabel: "Integrations",
    learnMore: "Learn More",
    mobileDescription: "Capture demand, qualify it faster, automate the right next step.",
    integrationsDesc: "Connect Payoff Lab with your favorite tools.",
    pricingDesc: "Simple, transparent pricing for teams of all sizes.",
    loginHref: "/login",
    loginLabel: "Log in",
    signupHref: "/signup",
    signupLabel: "Sign up"
  };
}

export function getMarketingNav(locale: string) {
  return [
    {
      label: "Features",
      featured: {
        title: "Automate everything",
        description: "Save time and increase efficiency with our advanced automation tools.",
        href: "/features"
      },
      items: [
        {
          href: "/features/automation",
          label: "Automation",
          description: "Build powerful workflows in minutes.",
          icon: Zap
        },
        {
          href: "/features/security",
          label: "Security",
          description: "Enterprise-grade security built-in.",
          icon: Shield
        }
      ]
    }
  ];
}

export function getIntegrationPageBySlug(slug: string, locale: string): MarketingPage | undefined {
  return undefined;
}
