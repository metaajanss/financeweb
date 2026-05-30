# Project Context

This file contains the history of actions performed in the project and the core rules that must be followed for future development.

## Actions Performed So Far
- **Automated Blog System**: Copied and integrated the automated blog system.
- **Bug Fixes**: Resolved module import build errors.
- **Vercel Integration**: Checked and configured Vercel Cron Deployment compatibility (within Hobby plan limits).
- **GitHub**: Initialized the local Git repository and pushed the project to GitHub.
- **Super Admin**: Verified Super Admin content copy functionalities.
- **SEO & Analysis**: Analyzed the `debt-payoff-calculator.html` file and the project's overall SEO structure.
- **Home Page Integration**: Converted the vanilla `debt-payoff-calculator.html` into a Next.js React component and integrated it as the main home page (`src/app/[locale]/page.tsx`). Separated its CSS into `calculator.css`.
- **Ad Slots Integration**: Connected the 3 ad slots (Top, Mid, Bottom) on the home page to the Super Admin Ad Management page. Users can now input custom `<ins>` codes from the Super Admin panel.
- **Title and Branding Update**: Replaced "Jumpix" with "PayoffLab" across layout metadata and translation files to reflect the new brand identity. Tab title is now correct.
- **Localization Reset**: Enforced a strict "English-only" rule for both AI communications and the codebase. All Turkish texts in the admin panel and configuration files have been translated back to English.

## Core Rules
1. **Context Check:** Before writing any code, modifying files, or running new tools, you MUST review this `CONTEXT.md` file (or the latest project context).
2. **Status Updates:** Update this file whenever a significant feature is added, an architectural change is made, or a critical bug is fixed.
3. **SEO & Performance:** Always apply SEO and performance best practices for the web application.
4. **Design Aesthetics:** The UI must have a modern, aesthetic, and premium feel. Use Vanilla CSS for rich designs unless TailwindCSS is explicitly requested (the existing Tailwind infrastructure can be utilized since it's a Next.js project).
5. **Language Rule:** Communicate with the user in Turkish, but maintain the underlying codebase (variable names, git commits, logic) in English unless specified otherwise.

## Design System & Component Logic
- **Typography:** `Fraunces` is strictly used for branding and main headings to give a premium, editorial feel. `Hanken Grotesk` is used for body text and interactive elements (like links and buttons) for high legibility.
- **Color Palette (CSS Variables):**
  - `--ink`: Primary text color (dark, nearly black).
  - `--paper` & `--paper-2`: Warm, off-white backgrounds mimicking real paper.
  - `--line`: Subtle border and divider color.
  - `--muted`: Secondary text color for descriptions and legal links.
  - `--snow` & `--aval`: Accent colors used in gradients (like the brand dot) and interactive hover states.
- **Footer Architecture:** The footer is built using CSS Grid. It is divided into two main areas on desktop (Brand/Description vs Navigation Links) and stacks vertically on mobile devices. The links feature subtle color transitions on hover (switching to accent colors) to create an engaging user experience without complex animations.

---
*Note: This context file is stored in the project's root directory and helps the assistant understand the current state of the project upon every new request.*
- **Footer Update**: Created a modern, structured footer component on the home page using the established design tokens. Added navigation links for various financial calculators as requested.
