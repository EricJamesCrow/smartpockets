# Legal Pages Design

## Goal

Add `/privacy` and `/terms` pages to `apps/web` with real legal content from the SmartPockets Privacy Policy and Terms & Conditions documents. Extract the shared Header and Footer into `layout.tsx` so all marketing pages get consistent navigation.

## Changes

### 1. Extract Shared Layout

Move Header and Footer out of the landing page into `layout.tsx`.

- Extract `FooterLarge07` from `page.tsx` into `apps/web/src/components/marketing/footer.tsx`
- Import Header and Footer in `layout.tsx`, wrapping `{children}`
- Remove `<Header />` from `HeroCardMockup11` and `<FooterLarge07 />` from `HomePage` in `page.tsx`
- Header is not position-fixed, so the hero section flows naturally below it with no padding changes needed

### 2. Legal Page Layout Component

Create a shared `LegalPageLayout` at `apps/web/src/components/marketing/legal-page-layout.tsx`.

Props:
- `title`: Page heading (e.g., "Privacy Policy")
- `subtitle`: Date label (e.g., "Effective February 6, 2026")
- `description`: Intro paragraph
- `children`: Prose content (ReactNode)

Structure:
- Centered header section: brand-colored date label, display-sized title, tertiary description
- Prose section: `prose md:prose-lg md:max-w-180` container for legal content

### 3. Privacy Policy Page

Route: `/privacy` (`apps/web/src/app/privacy/page.tsx`)

Content: Full SmartPockets Privacy Policy (12 sections) from `docs/SmartPockets_Privacy_Policy.docx`. Rendered as static JSX using the `LegalPageLayout` component. Server Component (no `"use client"`).

### 4. Terms & Conditions Page

Route: `/terms` (`apps/web/src/app/terms/page.tsx`)

Content: Full SmartPockets Terms and Conditions (18 sections) from `docs/SmartPockets_Terms_and_Conditions.docx`. Same approach as Privacy Policy.

## Content Mapping

- Document section headings (`1. Information We Collect`) -> `<h2>`
- Subsection headings (`1.1 Information You Provide`) -> `<h3>`
- Body paragraphs -> `<p>`
- Bullet lists -> `<ul>` with `<li>`
- Numbered lists -> `<ol>` with `<li>`
- "Important" callouts -> `<blockquote>`
- Contact email -> `mailto:` link
- External links (Plaid privacy policy) -> `<a>` with `target="_blank" rel="noopener noreferrer"`

## Stack

| # | Branch | Scope |
|---|--------|-------|
| 1 | `extract-shared-layout` | Extract Footer, move Header + Footer into layout.tsx |
| 2 | `legal-page-layout` | Create shared LegalPageLayout component |
| 3 | `privacy-page` | Create /privacy with full content |
| 4 | `terms-page` | Create /terms with full content |

## Design Decisions

- **Shared layout over per-page Header/Footer**: Single source of truth, consistent across all pages
- **Simple LegalPage01 style**: Clean header + prose content, no CTAs or email signups on legal pages
- **Hardcoded JSX over MDX**: No CMS needed for two rarely-changing pages, avoids MDX tooling complexity
- **Server Components**: Legal pages are fully static, no client-side interactivity needed
- **Shared LegalPageLayout**: Avoids duplication between the two legal pages
