import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import messages from "../../../../../messages/en.json";

// Mock next-intl/server to avoid server-only errors in test environment
vi.mock("next-intl/server", () => ({
  getMessages: vi.fn().mockResolvedValue(messages),
  getTranslations: vi.fn(),
  getLocale: vi.fn().mockResolvedValue("en"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

// Mock the client component that uses useTranslations (next-intl client context)
// to avoid "NextIntlClientProvider not found" errors in unit tests
vi.mock("../marketing-mockups", () => ({
  HeroMockup: ({ path }: { path: string }) => (
    <div data-testid="hero-mockup" data-path={path}>Mockup</div>
  ),
  SectionMockup: () => <div data-testid="section-mockup">Section</div>,
}));

import { Hero } from "../hero";

describe("Hero Component", () => {
  it("renders the main heading correctly", async () => {
    render(await Hero({ locale: "en" }));

    expect(
      screen.getByText(/Find better leads, score intent, and launch outreach/i)
    ).toBeInTheDocument();
  });

  it("renders the badge text from translations", async () => {
    render(await Hero({ locale: "en" }));

    expect(
      screen.getByText(/Built for faster pipeline execution/i)
    ).toBeInTheDocument();
  });

  it("renders the primary call to action", async () => {
    render(await Hero({ locale: "en" }));

    expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
  });
});
