# 3WEEQ — Architecture & Refactoring Plan

**Document type:** Principal architecture review and migration blueprint  
**Project:** 3WEEQ storefront (Next.js App Router + Medusa + Stripe)  
**Repository state audited:** Next.js `16.3.8`, React `19.2.8`, Tailwind CSS `4`, GSAP `3.15`, Lenis `1.3`, Medusa `2.22`  
**Status:** Proposed. No application code has been modified. This file is the only deliverable.

---

## 0. Executive Summary

3WEEQ is a cinematic Arabic-first fragrance storefront built on a modern stack. The visual layer is strong and the commerce flow is functional, but the codebase has reached the point where presentation, animation, data access, and commerce state are coupled inside the same files. The result is predictable: every new section adds client JavaScript to the landing page, every cart change touches a large context provider, every Medusa response is consumed through an untyped fallback layer, and every motion sequence re-implements cleanup, reduced-motion handling, and ScrollTrigger registration.

This plan does not propose a rewrite. It proposes a **strangler migration**: keep the current routes and visual output working while moving responsibilities into explicit layers. The target is a **Feature-Sliced, domain-oriented `src/` architecture** with a server-first React model, a typed commerce boundary, a real design-token pipeline, and animation isolated into testable hooks. A monorepo extraction is documented as the long-term destination, not as a prerequisite.

The five highest-impact changes are:

1. **Separate the marketing shell from the commerce shell.** The root layout currently mounts `CartProvider`, `CartDrawer`, and `SmoothScroll` on every route, including the landing page. Commerce code and its client boundary should live under the store route group.
2. **Make server components the default again.** Most marketing sections are marked `"use client"` even though only their animation needs the client. Static copy, section structure, and data constants should render on the server; only motion and canvas work should hydrate.
3. **Introduce a real data layer.** `medusaFetch` uses `cache: "no-store"` for every request and `api.ts` silently converts failures into empty arrays. Replace this with a typed repository, explicit cache policy, tagged revalidation, and surfaced errors.
4. **Decompose the cart and the duplicated store UI.** `CartProvider` mixes cart business state with drawer visibility; `cart-drawer.tsx` and `cart-page-client.tsx` duplicate icons, line-item rows, and quantity steppers.
5. **Isolate motion.** GSAP timelines are written directly inside section components, several components query global DOM IDs, and one component reaches into another component's ScrollTrigger instance. Extract hooks, scope selectors, and standardize cleanup and reduced-motion behavior.

Success is not “more folders.” Success is: a new product section can be added without touching cart code; a new cart mutation can be added without editing the drawer; a Medusa outage produces a deliberate degraded state rather than a silent empty catalogue; and the marketing page ships less JavaScript than it does today.

---

## Part A — Directory Structure

### A.1 Principles

The target structure follows **Feature-Sliced Design (FSD)** with **Domain-Driven Design (DDD)** boundaries. FSD gives us a strict dependency direction; DDD gives us names that match the business.

- **`app/` is routing only.** Route files compose features and widgets. They do not contain business rules, large data literals, or animation timelines.
- **Features own use cases.** “Add to cart,” “filter catalogue,” “play featured film,” and “open the portal” are features.
- **Entities own domain models and rules.** `Product`, `Cart`, `Collection`, and `Civilization` are entities.
- **Widgets compose features into page-level blocks.** Header, footer, and cart drawer are widgets.
- **Shared holds infrastructure with no business knowledge.** UI primitives, HTTP client, motion utilities, configuration, and formatting.
- **Dependencies point downward only:** `app → widgets → features → entities → shared`. A lower layer must never import a higher layer.
- **Each slice exposes a public API through `index.ts`.** Deep imports across slices are prohibited.

### A.2 Target tree (in-place, single application)

```text
src/
├─ app/
│  ├─ (marketing)/
│  │  ├─ layout.tsx                 # marketing chrome only
│  │  ├─ page.tsx                   # composes marketing sections
│  │  ├─ loading.tsx
│  │  └─ error.tsx
│  ├─ (store)/
│  │  ├─ layout.tsx                 # CartProvider + CartDrawer + store header
│  │  ├─ products/
│  │  │  ├─ page.tsx
│  │  │  ├─ loading.tsx
│  │  │  └─ [handle]/
│  │  │     ├─ page.tsx
│  │  │     ├─ loading.tsx
│  │  │     └─ not-found.tsx
│  │  ├─ collections/page.tsx
│  │  ├─ cart/page.tsx
│  │  └─ checkout/page.tsx          # Phase 4
│  ├─ api/
│  │  ├─ webhooks/stripe/route.ts   # Phase 4
│  │  └─ revalidate/route.ts        # optional CMS/Medusa hook
│  ├─ layout.tsx                    # html, fonts, metadata, providers only
│  ├─ not-found.tsx
│  └─ globals.css
├─ widgets/
│  ├─ marketing-header/
│  ├─ store-header/
│  ├─ footer/
│  └─ cart-drawer/
├─ features/
│  ├─ marketing/
│  │  ├─ hero/
│  │  ├─ about-story/
│  │  ├─ featured-film/
│  │  ├─ packaging/
│  │  ├─ civilizations/
│  │  ├─ first-chapter/
│  │  ├─ journal/
│  │  ├─ newsletter/
│  │  └─ beyond/
│  ├─ catalog-filter/
│  ├─ product-purchase/
│  ├─ cart/
│  └─ checkout/                     # Phase 4
├─ entities/
│  ├─ product/
│  ├─ collection/
│  ├─ civilization/
│  └─ cart/
├─ shared/
│  ├─ ui/                           # primitives only
│  ├─ motion/                       # GSAP/Lenis setup + hooks
│  ├─ lib/                          # http, result, formatting, media
│  ├─ config/                       # env, routes, constants
│  ├─ i18n/                         # messages and helpers
│  ├─ styles/                       # tokens, motion CSS
│  └─ assets/                       # imported static assets
└─ types/                           # cross-domain contracts (temporary)
```

Each slice follows the same internal shape:

```text
features/cart/
├─ ui/
│  ├─ add-to-cart-button.tsx
│  ├─ cart-line-item.tsx
│  └─ quantity-stepper.tsx
├─ model/
│  ├─ cart-store.ts
│  └─ use-cart-mutation.ts
├─ api/
│  └─ cart.repository.ts
├─ lib/
│  └─ cart-errors.ts
└─ index.ts
```

The `index.ts` is the slice's contract. External code imports `@/features/cart`, never `@/features/cart/ui/cart-line-item`.

### A.3 Route groups and shell separation

Current `app/layout.tsx` mounts `CartProvider`, `SiteHeader`, `SmoothScroll`, and `CartDrawer` for every route. This means the landing page pays for cart state, cart API calls, and Lenis even when the visitor never shops.

Target:

| Route group | Layout responsibilities | Must not include |
|---|---|---|
| `(marketing)` | Marketing header, footer, smooth scroll, reveal observer | Cart provider, cart drawer, commerce API calls |
| `(store)` | Store header, cart provider, cart drawer, commerce metadata | Cinematic smooth scrolling, landing-page motion |
| `api` | Webhooks and revalidation only | UI code |

The marketing header becomes a server component with static links. The store header keeps a small client island for the cart badge. `SmoothScroll` is moved into `(marketing)/layout.tsx`; checkout forms must not run under Lenis because smooth scrolling interferes with native form behavior, focus scrolling, and mobile keyboards.

### A.4 Domain boundaries (DDD)

| Bounded context | Entities / use cases | Owns |
|---|---|---|
| **Catalogue** | Product, Collection, Civilization, filters, search | Read models, Medusa product queries, URL filter parsing |
| **Cart** | Cart, line item, quantity, merge, limit | Cart identity, optimistic mutations, drawer state |
| **Checkout** | Shipping option, payment intent, order | Checkout session, Stripe handoff, webhook verification |
| **Content** | Hero, story chapters, journal, packaging, newsletter | Copy, media manifests, motion storyboards |
| **Identity / i18n** | Locale, direction, messages | Translation catalogue, formatting |

Each context gets its own model. Do not pass raw Medusa DTOs into UI components. The adapter maps Medusa shapes into internal entities; if Medusa changes a field name, only the adapter changes.

### A.5 Current-to-target mapping

| Current path | Target path | Notes |
|---|---|---|
| `app/page.tsx` | `app/(marketing)/page.tsx` | Composition only |
| `app/components/hero.tsx` | `features/marketing/hero/` | Split static shell from parallax island |
| `app/components/about-section.tsx` | `features/marketing/about-story/` | Move `CIVILIZATIONS` to `model/content.ts` |
| `app/components/featured-fragrance.tsx` | `features/marketing/featured-film/` | Frame loader becomes a hook |
| `app/components/civilizations-section.tsx` | `features/marketing/civilizations/` | Frame constants move to model |
| `app/components/packaging-section.tsx` | `features/marketing/packaging/` | Fix duplicated responsive images |
| `app/components/*-section.tsx` | `features/marketing/*/` | One slice per narrative section |
| `app/components/site-header.tsx` | `widgets/marketing-header/` + `widgets/store-header/` | Remove duplication |
| `app/components/store/cart-provider.tsx` | `entities/cart/model/` + `features/cart/model/` | Split business and UI state |
| `app/components/store/cart-drawer.tsx` | `widgets/cart-drawer/` | Reuse shared line item |
| `app/components/store/cart-page-client.tsx` | `features/cart/ui/cart-page.tsx` | Reuse shared line item |
| `app/lib/api.ts` | `entities/*/api/*.repository.ts` | Typed, explicit errors |
| `app/lib/medusa-fetch.ts` | `shared/lib/http/medusa-client.ts` | One client, explicit cache |
| `app/types/index.ts` | `entities/*/model/types.ts` + `types/contracts.ts` | Split by domain |
| `app/(store)/layout.tsx` | `app/(store)/layout.tsx` | Keep, narrow responsibilities |
| `app/layout.tsx` | `app/layout.tsx` | Remove cart and Lenis |

`app/p` and `app/packiging` are stray prompt dumps with no extension. They are not routes, but they pollute the routing directory. Move them to `docs/prompts/` or delete them during Phase 1.

### A.6 North-star monorepo

Once the storefront is stable, extract shared contracts and UI:

```text
apps/
├─ storefront/          # this Next.js app
└─ medusa/              # backend
packages/
├─ contracts/           # Zod schemas + inferred types
├─ ui/                  # design-system primitives
├─ config/              # eslint, tsconfig, tailwind presets
└─ motion/              # GSAP/Lenis primitives
```

Do not start here. A monorepo before the boundaries are clean simply distributes the coupling across more packages.

---

## Part B — Component Architecture & Atomic Design

### B.1 Server-first component model

The default must be a **server component**. `"use client"` is an exception with a reason, placed as deep in the tree as possible.

| Component | Rendering | Why |
|---|---|---|
| Section shell, headings, copy | Server | No state, no events |
| `ProductCard` | Server | Static markup plus `Link` |
| `ProductGallery` | Client island | Selection state |
| `ProductPurchasePanel` | Client island | Variant and cart state |
| `SiteHeader` | Server shell | Static links |
| Cart badge | Client island | Subscribes to cart |
| `CartDrawer` | Client island, lazy | Only needed after interaction |
| Hero | Server shell + client parallax | DOM stays server-rendered |
| Featured film | Client island, lazy | Canvas and scroll |
| Journal | Server | Content and links |
| Newsletter form | Client island | Form state and API |

Practical rule: if a file only needs `useEffect` for an animation, split it into `hero.tsx` (server) and `hero-parallax.tsx` (client). The copy remains server-rendered and indexable.

### B.2 Atomic Design without the folder prison

Atomic Design is a **taxonomy**, not a directory hierarchy. Use it to reason about reuse, not to create `atoms/`, `molecules/`, `organisms/` folders that force constant reclassification.

- **Primitives (`shared/ui`)**: `Button`, `IconButton`, `Input`, `Select`, `Dialog`, `Drawer`, `Badge`, `Tag`, `Price`, `MediaFrame`, `SectionHeading`, `Skeleton`, `VisuallyHidden`.
- **Composites (`features/*/ui`)**: `CartLineItem`, `QuantityStepper`, `ProductVariantPicker`, `FilterRow`, `ActiveFilter`.
- **Blocks (`widgets`)**: `StoreHeader`, `MarketingHeader`, `CartDrawer`, `Footer`.
- **Templates (`app/*/layout.tsx`)**: shell, spacing, providers, metadata.
- **Pages (`app/**/page.tsx`)**: data fetching, composition, route metadata.

A primitive must be domain-agnostic. `Button` does not know about carts. `Price` knows how to format money but not where the price came from. A composite may know a domain entity; a widget may know several features.

### B.3 Smart and dumb components

- **Dumb components** receive data and callbacks through props. They are pure, easy to test, and never call APIs.
- **Smart components** own data access or state. They live in `features/*/model` or in page files. They pass plain data down.
- **No component both fetches and renders a large tree.** A smart wrapper + dumb presentational component is the default for anything reused.

Use composition instead of boolean explosion:

```tsx
// Bad: variants multiply
<CartLineItem showImage showRemove showPrice compact />

// Good: explicit slots
<CartLineItem
  media={<ProductThumb product={item.product} />}
  title={...}
  price={<Price amount={item.total} currency={item.currency} />}
  actions={<QuantityStepper ... />}
/>
```

Use compound components for overlays:

```tsx
<Drawer>
  <Drawer.Trigger asChild><CartButton /></Drawer.Trigger>
  <Drawer.Content side="left">
    <Drawer.Header title="حقيبة التسوق" />
    <Drawer.Body>{children}</Drawer.Body>
    <Drawer.Footer>{summary}</Drawer.Footer>
  </Drawer.Content>
</Drawer>
```

### B.4 Animation isolation

Motion is currently embedded in section components. That makes the sections hard to test, hard to reuse, and hard to reason about during refactors. The target separates:

- **Motion primitives** in `shared/motion`: one GSAP registration point, `useReducedMotion`, `useIsomorphicLayoutEffect`, `useGsapContext`, Lenis integration.
- **Feature hooks** in each feature: `use-hero-parallax.ts`, `use-about-sequence.ts`, `use-featured-film-scrub.ts`, `use-civilizations-scrub.ts`, `use-packaging-reveal.ts`.
- **Presentational components** that own refs but not timelines. A hook receives refs and returns nothing.

Mandatory rules:

1. Register GSAP plugins **once** in `shared/motion/gsap.ts`, not at module scope in every component.
2. Wrap every GSAP setup in `gsap.context()` or `useGSAP()` and revert on cleanup.
3. Never query a global ID owned by another component. `PortalTransition` currently finds `#story`, `#about-room`, `#first-chapter`, and another component's ScrollTrigger via `ScrollTrigger.getAll().find(...)`. Replace this with either:
   - a shared section context that exposes refs, or
   - CSS scroll-driven animations where supported, with a JS fallback.
4. Scope all selectors to a section ref (`gsap.utils.toArray(".about-image", section)`), never `document.querySelector`.
5. Respect `prefers-reduced-motion` in the hook, not in five separate components.
6. Kill ScrollTriggers, timelines, ResizeObservers, and window listeners in the same cleanup.
7. Lazy-load GSAP and ScrollTrigger below the fold. The hero’s CSS entrance does not need GSAP at all; only pointer parallax does.
8. Move magic timing and scroll distances (`+=3600`, `+=4800`, frame counts, 152, 101) into named constants beside the storyboard.

Example hook contract:

```ts
export function useHeroParallax(
  sectionRef: RefObject<HTMLElement>,
  imageRef: RefObject<HTMLElement>,
  textRef: RefObject<HTMLElement>,
) {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      // quickTo setup and pointer listeners scoped to sectionRef
    }, sectionRef);
    return () => ctx.revert();
  }, [sectionRef, imageRef, textRef]);
}
```

### B.5 Component contracts

Every shared primitive should expose a small, typed contract:

```tsx
type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };
```

Rules:

- Extend native element props; do not re-invent `onClick`, `disabled`, `aria-*`.
- Support `asChild` for links and buttons.
- Forward refs where focus or measurement is needed.
- Keep a single source of truth for variants (CVA).
- Never hardcode brand hex values inside a component; use semantic tokens.

### B.6 File and naming conventions

- Files: `kebab-case.tsx`, `kebab-case.ts`.
- Components: `PascalCase` exports.
- Hooks: `use-*.ts` file, `useX` export.
- Types: `PascalCase`; no `I` prefix.
- Constants: `SCREAMING_SNAKE_CASE` only for true constants.
- One primary component per file; small private helpers may share the file.
- Target maximum: 200 lines per component file, 300 per hook. Beyond that, split by responsibility.

---

## Part C — State Management & Data Fetching

### C.1 Classify state before choosing a tool

| State type | Examples | Tool |
|---|---|---|
| URL state | `q`, `civilization`, `collection`, `product_type`, `offset` | `searchParams` + typed parser |
| Server state | Products, collections, civilizations, cart | Server Components + repository |
| Local UI state | Drawer open, selected image, quantity draft | `useState` / `useReducer` |
| Cross-tree client state | Cart contents, cart badge | Context + `useOptimistic` |
| Form state | Checkout address, payment | React Hook Form + Zod (Phase 4) |

No global state library is required today. Add Zustand only if checkout requires cross-route client state that cannot live in the URL or server. Do not add Redux.

### C.2 Cart state redesign

Current `CartProvider` owns cart data, API mutations, drawer visibility, and error strings. Split it:

- `entities/cart/model/cart-context.tsx`: cart entity, line items, totals, status.
- `features/cart/model/use-cart-mutations.ts`: add, update, remove, merge, limit checks.
- `widgets/cart-drawer/model/use-drawer-state.ts`: open/close, focus restoration, scroll lock.
- `features/cart/ui/*`: line item, quantity stepper, empty state, summary.

Use `useOptimistic` for quantity changes and removals, with rollback on API failure. Keep the server response as the source of truth. The current dual identity (`threeweeq_cart_id` HttpOnly cookie plus `localStorage`) must be documented as one source of truth with the other as a bootstrap hint; never write two competing identities.

The item limit (`cartItemLimit`) belongs in domain rules, not in the drawer component. Error translation belongs in `features/cart/lib/cart-errors.ts`, not inline in UI.

### C.3 URL state for catalogue

The products page already uses `searchParams`, which is correct. Formalize it:

```ts
const productSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  civilization: z.string().trim().optional(),
  collection: z.string().trim().optional(),
  product_type: z.string().trim().optional(),
  offset: z.coerce.number().int().min(0).default(0),
});
```

Parse once at the route boundary. Pass a typed `CatalogFilters` object down. Build hrefs with a single helper. Never read raw `string | string[]` inside presentational components.

### C.4 Data access layer

Replace `app/lib/api.ts` with repositories:

```text
entities/product/api/product.repository.ts
entities/collection/api/collection.repository.ts
entities/civilization/api/civilization.repository.ts
entities/cart/api/cart.repository.ts
shared/lib/http/medusa-client.ts
```

Each repository:

- Accepts a typed input.
- Calls the Medusa client with an explicit cache policy.
- Validates the response with Zod at the boundary.
- Maps DTOs to internal entities.
- Returns `Result<T, AppError>` instead of silently returning empty arrays.

```ts
type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

The UI decides whether a failure is a full error page, a degraded section, or a retry. Today, a Medusa outage looks identical to an empty catalogue; that is an architectural defect, not a design choice.

Use `server-only` imports in repositories to prevent accidental client bundles. Never expose the Medusa admin token or Stripe secret to the browser.

### C.5 Cache policy

Global `cache: "no-store"` plus `force-dynamic` on the whole store layout discards Next.js caching, CDN efficiency, and streaming benefits. Replace with intent:

| Data | Cache | Revalidate | Tags |
|---|---|---|---|
| Product list | `force-cache` / ISR | 300s | `products` |
| Product detail | ISR | 600s | `product:{handle}`, `products` |
| Collections | ISR | 3600s | `collections` |
| Civilizations | ISR | 3600s | `civilizations` |
| Cart | `no-store` | — | — |
| Checkout session | `no-store` | — | — |
| Marketing content | static | build time | — |

When Medusa changes a product, call `revalidateTag("products")` from a signed webhook or an internal route. This is how the storefront stays fast without showing stale prices indefinitely.

### C.6 Errors and resilience

- Distinguish **transport failure**, **unauthorized**, **not found**, **validation error**, and **business rule violation**.
- Do not catch and return `[]`. Surface a typed error and render a deliberate fallback.
- Add timeouts to Medusa calls; retry only idempotent GETs, with jitter and a small cap.
- Log server errors with a request ID; never log cookies or tokens.
- Map Medusa error payloads into user-facing Arabic messages in one place.
- Add `error.tsx` per route group and a global `not-found.tsx`.

### C.7 Checkout state machine

Phase 4 checkout should be an explicit state machine, not a pile of booleans:

```text
idle → validating-cart → collecting-address → loading-shipping
     → collecting-payment → creating-payment-intent → confirming
     → succeeded | failed | cancelled
```

Each transition has a guard, an allowed event, and a recoverable error. Stripe webhooks are the authority for payment success; the browser redirect is only a hint. Verify webhook signatures, persist idempotency keys, and never trust client-reported totals.

### C.8 Types and contracts

`app/types/index.ts` is a single large file. Split it:

- `entities/product/model/types.ts`
- `entities/cart/model/types.ts`
- `entities/collection/model/types.ts`
- `types/api.ts` for transport envelopes
- `types/contracts.ts` temporarily for cross-domain contracts

Prefer Zod schemas as the source of truth and infer TypeScript types. When the monorepo exists, move schemas to `packages/contracts` and share them with Medusa. This eliminates the current risk of the frontend and backend drifting on custom fields such as `civilization`, `olfactory_pyramid`, `specifications`, and `media.role`.

---

## Part D — Styling & UI System

### D.1 Token architecture

The current `@theme inline` block is a good start, but it mixes primitives and semantics. Introduce three layers:

1. **Primitive tokens:** raw values (`--navy-950`, `--navy-900`, `--gold-500`, `--sand-100`).
2. **Semantic tokens:** purpose (`--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-border`, `--color-focus`).
3. **Component tokens:** only when a component needs a local decision (`--button-primary-bg`).

Then add semantic utilities in Tailwind:

```css
@theme inline {
  --color-background: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-foreground: var(--color-text);
  --color-muted: var(--color-text-muted);
  --color-accent: var(--color-accent);
  --color-border: var(--color-border);
}
```

Replace the many arbitrary values (`bg-[#020A14]`, `text-[#B58E4B]`, `border-[#B58E4B]/90`) with `bg-background`, `text-accent`, `border-accent/90`. This is not cosmetic: arbitrary values bypass the theme, make dark/light or seasonal themes impossible, and create inconsistent contrast.

### D.2 `cn` and CVA

Add `clsx` and `tailwind-merge` behind a `cn()` helper. Add `class-variance-authority` for variants.

```ts
// shared/lib/cn.ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center font-primary transition-transform duration-[250ms] ease-out-expo focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-3 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "bg-accent text-background hover:scale-[1.01] active:scale-[0.99]",
        ghost: "text-foreground/80 hover:text-accent",
        outline: "border border-border text-foreground hover:border-accent/60",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
```

This removes repeated CTA markup and guarantees consistent focus, hover, and disabled behavior.

### D.3 Responsive strategy

The site currently remaps `md` to `64rem` (1024px) and uses a single breakpoint. That is a valid art direction choice, but it is fragile because `md` no longer means what every Tailwind developer expects.

Do not change it during the first migration phase. Instead:

- Keep `md = 64rem` until a visual regression suite exists.
- Add explicit `sm` and `xl` tokens only where needed.
- Prefer container queries for components that appear in different columns (`ProductCard`, journal cards).
- Normalize the scale in Phase 4, with screenshot diffs for every section.

### D.4 RTL and Arabic typography

- Keep `dir="rtl"` on `<html>`.
- Use logical properties: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`.
- Reserve physical `left`/`right` for art-directed overlays and gradients where the composition is intentionally asymmetric.
- Never apply `letter-spacing` to Arabic. Preserve the current `.font-primary { letter-spacing: 0 }` guardrail.
- Use Arabic-Indic or Latin digits deliberately. Pick one for prices and dates, and centralize it in `format.ts`.
- Do not concatenate Arabic and English labels without a wrapper; mixed-direction runs need `dir` or `<bdi>`.
- Ensure line heights are generous for Arabic; the current `--text-body` line height of `1.7` is a good baseline.

### D.5 Accessibility

- Every interactive element has a visible `:focus-visible` state.
- The cart drawer is a dialog: focus trap, `aria-modal`, Escape to close, restore focus to the trigger, lock background scroll.
- Quantity steppers announce changes; icon-only buttons require `aria-label`.
- Images carry meaningful `alt`; decorative images use `alt=""`.
- Color contrast is checked against the semantic token pairs, not against raw hex.
- `prefers-reduced-motion` is honored in CSS and JS. The current global reduced-motion rule is good; the JS hooks must match it.
- Touch targets are at least 44×44 CSS pixels.

### D.6 Motion tokens

Define motion once:

```css
@theme inline {
  --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast: 200ms;
  --duration-base: 300ms;
  --duration-slow: 800ms;
}
```

Use the same values in TS:

```ts
export const motion = {
  easeOutExpo: [0.22, 1, 0.36, 1],
  fast: 0.2,
  base: 0.3,
  slow: 0.8,
} as const;
```

This prevents the current drift where CSS uses `800ms`, GSAP uses `0.8`, and components use arbitrary `duration-[250ms]`.

---

## Part E — Performance & Optimization

### E.1 Budgets

Set explicit budgets before optimizing:

| Metric | Target (mobile, p75) |
|---|---|
| LCP | < 2.5s |
| CLS | < 0.1 |
| INP | < 200ms |
| Initial JS for marketing route | < 180 KB gzip (excluding lazy 3D/film) |
| Initial JS for store route | < 220 KB gzip |
| Hero image | < 250 KB desktop, < 120 KB mobile |
| Font payload | < 120 KB total, two files maximum |

Measure with Lighthouse, WebPageTest, and real-user monitoring. Do not accept lab-only results.

### E.2 Server components and client islands

The biggest performance win is not a smaller library; it is shipping less JavaScript. Every marketing section currently hydrates because it is `"use client"`. Convert copy, headings, links, and static data to server components. Keep only:

- pointer parallax,
- scroll-scrubbed canvas,
- view-transition gallery,
- journal reveal observer,
- newsletter form.

This alone can remove a large fraction of the landing page's hydration cost.

### E.3 Frame sequences

`featured-fragrance.tsx` loads 152 JPEG frames with `Promise.all` on mount. `civilizations-section.tsx` loads 101 WebP frames the same way. Both approaches:

- start a large network burst immediately, competing with the hero,
- hold decoded images in memory,
- create long main-thread decode work,
- delay interactivity.

Target strategy:

1. Replace the image sequence with a short MP4/WebM (AV1/H.264 fallback) and drive `currentTime` from scroll, or use `requestVideoFrameCallback` for frame-accurate painting.
2. If frames must stay, lazily start loading when the section is within one viewport (`IntersectionObserver`), load in small batches, and decode off the critical path.
3. Preload only the first 3–5 frames and the poster.
4. Cap DPR at 2 and render at the displayed size.
5. Provide a static poster for reduced motion and slow connections.
6. Prefer `content-visibility: auto` on off-screen marketing sections, with explicit intrinsic sizes to avoid CLS.

### E.4 Images

- Replace raw `<img>` in `hero.tsx` and `packaging-section.tsx`. Both currently render a desktop `next/image` and a mobile `<img>` simultaneously; CSS hides one, but the browser still downloads both. Use `<picture>` with `media` sources and one preload matching the active source, or a single `next/image` with `sizes` if art direction is not essential.
- Keep `priority` on exactly one hero image.
- Add `sizes` to every `fill` image.
- Use AVIF/WebP with fallbacks; the current `next.config.ts` already enables both.
- Set `quality` deliberately; `90` is expensive for a full-screen image. Test `75–80`.
- Lazy-load below-the-fold editorial images; eager-load only the first viewport.

### E.5 Fonts

The self-hosted two-family setup is correct. Keep it, but:

- Preload only the fonts used in the first viewport.
- Ensure `font-display: swap` (already present).
- Subset Arabic and Latin ranges (already declared).
- Avoid loading a second weight if the design does not use it.
- Do not import fonts through CSS from a third party.

### E.6 JavaScript and bundle splitting

- Lazy-load `FeaturedFragrance` and `CivilizationsSection` with `next/dynamic` and a reserved-height placeholder.
- Lazy-load `CartDrawer`; mount it on first open or idle.
- Import GSAP core and ScrollTrigger only inside the motion layer; avoid top-level plugin registration in feature files.
- Audit `three` (installed but not used in the audited components). If unused, remove it. If used later, isolate it behind a dynamic import and a separate chunk.
- Keep `lucide-react` imports per icon, not barrel imports.
- Add `@next/bundle-analyzer` in CI and fail the build if a budget is exceeded.

### E.7 Caching and delivery

- Static marketing assets are immutable and hashed; serve with long-lived cache headers.
- Medusa reads use ISR and tags (see C.5), not `no-store`.
- Cart and checkout responses are private and uncached.
- Put a CDN in front of the storefront and Medusa’s public API.
- Add `stale-while-revalidate` at the edge for catalogue reads.
- Add a health check and a graceful “store unavailable” state.

### E.8 Security and operational performance

- Add security headers: `Content-Security-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`.
- Verify Stripe webhook signatures and make handlers idempotent.
- Keep secrets server-only; prefix only truly public values with `NEXT_PUBLIC_`.
- Add structured server logs with request IDs and Medusa latency.
- Add Web Vitals reporting and error tracking.
- Add a status page or at minimum a clear degraded-state UI.

### E.9 Measurement plan

1. Record a baseline before any refactor: Lighthouse mobile/desktop, bundle sizes, route payloads, LCP element, hydration time.
2. Add Playwright visual snapshots for every marketing section at 390px, 768px, 1024px, and 1440px.
3. After each phase, compare bundle size, LCP, INP, and screenshots.
4. Block merges that regress the budgets by more than 5% without an explicit waiver.

---

## Part F — Refactoring Roadmap

The migration is deliberately incremental. Every phase must leave the site buildable, deployable, and visually unchanged unless the phase explicitly changes behavior.

### Phase 0 — Guardrails (1–2 days)

**Goal:** make refactoring safe.

- Add `typecheck`, `lint`, and `format` scripts.
- Add Vitest + React Testing Library for unit tests.
- Add Playwright for the cart and catalogue flows.
- Add visual snapshots for the landing page and store pages.
- Add bundle analyzer and a baseline performance report.
- Fix the failing lint baseline in `medusa/` or scope lint to the storefront until the backend is cleaned.
- Document the definition of done and PR checklist.

**Exit criteria:** CI runs typecheck, lint, unit tests, and smoke tests on every PR. A baseline report is committed under `docs/`.

### Phase 1 — Foundations (3–5 days)

**Goal:** create the structure without changing behavior.

- Introduce `src/` and update the `@/*` alias.
- Move `app/globals.css`, fonts, and shared utilities.
- Add `cn`, CVA, and the first primitives (`Button`, `Input`, `Badge`, `Price`, `MediaFrame`).
- Add semantic tokens while keeping the existing palette values identical.
- Split `types/index.ts` into domain files and re-export from a temporary barrel.
- Move stray `app/p` and `app/packiging` files out of the routing tree.
- Add `server-only` guards to server modules.

**Risk:** import churn. Mitigate with mechanical moves, one commit per domain, and a green build after each.

**Exit criteria:** same routes, same visuals, same behavior; build and tests pass; no new warnings.

### Phase 2 — Shells and motion isolation (5–8 days)

**Goal:** stop shipping commerce and motion code where it is not needed.

- Create `(marketing)` and `(store)` layouts.
- Remove `CartProvider`, `CartDrawer`, and `SmoothScroll` from the root layout.
- Split `SiteHeader` into marketing and store headers.
- Convert marketing sections to server shells + client islands.
- Extract motion hooks: hero, about, featured film, civilizations, packaging, portal.
- Replace global DOM queries and cross-component ScrollTrigger lookup with refs/context.
- Fix duplicated responsive images in hero and packaging.
- Lazy-load the film and civilizations sections.

**Risk:** hydration mismatches and scroll-trigger regressions. Mitigate with visual snapshots and a section-by-section rollout.

**Exit criteria:** landing page JavaScript drops measurably; no visual regression; reduced-motion paths still work; cart still works on store routes only.

### Phase 3 — Commerce domain (5–8 days)

**Goal:** make the store maintainable and truthful under failure.

- Split `CartProvider` into entity state, mutations, and drawer UI state.
- Extract shared `CartLineItem`, `QuantityStepper`, and cart icons.
- Introduce repositories and `Result` errors.
- Add Zod validation at the Medusa boundary.
- Replace global `no-store` with the cache policy table.
- Add tagged revalidation.
- Move catalogue filters to a typed parser.
- Add tests for cart limit, merge, quantity, removal, and API failure.

**Risk:** cart regressions. Mitigate with the existing CDP/Playwright cart flow plus unit tests for reducers and repositories.

**Exit criteria:** all cart flows pass; a simulated Medusa outage produces an explicit degraded state; catalogue pages can be cached and revalidated.

### Phase 4 — Checkout, i18n, and hardening (8–12 days)

**Goal:** complete the commercial loop and prepare for scale.

- Build `/checkout` with the state machine from C.7.
- Integrate Stripe Payment Element and webhooks.
- Add shipping options, order confirmation, and failure recovery.
- Add `next-intl` routing and message catalogues; remove hardcoded UI strings.
- Add metadata, Open Graph, sitemap, robots, and JSON-LD for all public routes.
- Add security headers, CSP, and observability.
- Normalize breakpoints with visual regression coverage.

**Risk:** payment correctness and i18n routing. Mitigate with Stripe test clocks, webhook replay tests, and locale-by-locale QA.

**Exit criteria:** end-to-end test purchase succeeds in Stripe test mode; webhook is idempotent; all public pages have metadata; Arabic and English render correctly with RTL.

### Phase 5 — Monorepo extraction (optional, after stability)

- Extract `packages/contracts`, `packages/ui`, `packages/config`, `packages/motion`.
- Share Zod schemas with Medusa.
- Add Turborepo and remote caching.
- Keep the storefront deployable independently.

Do this only after Phases 0–4 are stable. Otherwise the monorepo multiplies unfinished boundaries.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Visual regressions during section extraction | High | High | Playwright screenshots at four widths; one section per PR |
| ScrollTrigger breakage after layout split | High | High | Keep a motion QA checklist; test reduced motion and resize |
| Cart regressions during provider split | Medium | High | Unit tests for reducer + existing end-to-end cart flow |
| Medusa type drift | Medium | High | Zod contracts shared with backend in Phase 5 |
| Cache staleness after enabling ISR | Medium | Medium | Tagged revalidation + short TTLs initially |
| Stripe webhook duplication | Medium | High | Idempotency keys and event deduplication table |
| Bundle creep from new abstractions | Medium | Medium | Bundle analyzer budget in CI |
| Arabic text breakage from letter-spacing | Low | High | Preserve `.font-primary` guardrail; visual QA |
| Refactor stalls halfway | Medium | High | Phase exit criteria; no phase starts before the previous is green |

---

## Coding Standards (Mandatory)

1. Server components by default; `"use client"` only at the smallest interactive leaf.
2. No business logic in JSX. Extract to a hook, reducer, or repository.
3. No `any`. Use `unknown` at boundaries and validate with Zod.
4. No raw hex values in components; use semantic tokens.
5. No deep relative imports (`../../..`); use `@/` aliases and slice public APIs.
6. No cross-slice deep imports; import from the slice `index.ts`.
7. No global DOM queries in components; scope to refs.
8. Every GSAP timeline has a cleanup; every event listener is removed.
9. Every async UI path has loading, empty, error, and success states.
10. Every interactive element is keyboard reachable and has a visible focus state.
11. Every image has dimensions or a reserved aspect ratio.
12. Every new dependency needs a written justification and a bundle-size check.
13. Arabic strings live in a message catalogue once i18n lands; until then, keep them in a feature-level `content.ts`, not scattered in JSX.
14. Prefer composition and slots over boolean prop explosions.
15. Keep files under the size limits from B.6; split by responsibility, not by line count alone.

---

## Definition of Done

A change is complete only when:

- `typecheck`, `lint`, and unit tests pass.
- The relevant Playwright flow passes.
- Visual snapshots show no unintended diff.
- Loading, empty, error, and reduced-motion states are covered.
- No new client component was added without justification.
- No new arbitrary color or spacing value was introduced.
- Bundle and performance budgets are respected.
- The change is documented in the PR with before/after evidence.

---

## Assumptions and Boundaries

- The visual language, Arabic-first direction, and cinematic pacing are product requirements and must not be redesigned in this plan.
- Medusa remains the commerce backend; Stripe remains the payment provider.
- The migration happens in place first. A monorepo is a later option.
- `next-intl` is installed but not configured; the plan treats full i18n as Phase 4, not a blocker for architecture cleanup.
- No code is changed by this document. All paths, findings, and recommendations are proposals for subsequent implementation work.
