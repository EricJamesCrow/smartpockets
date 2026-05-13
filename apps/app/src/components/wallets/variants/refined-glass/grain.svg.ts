// apps/app/src/components/wallets/variants/refined-glass/grain.svg.ts

/**
 * Inline SVG `feTurbulence` grain pattern for the Refined + Glass variant.
 *
 * Same technique as Variant B (Refined Materiality). Kept as a separate
 * file (filter id `n2`) so the variant is tree-shaken independently and
 * does not collide with B's `n` filter id if both ever render together
 * during a side-by-side comparison harness.
 *
 * Technique credit: https://ibelick.com/blog/create-grainy-backgrounds-with-css
 * baseFrequency=.65 gives fine grain visible only at close range;
 * stitchTiles avoids the seam pattern in `repeat`.
 *
 * Apply via inline style:
 *   { backgroundImage: `url("${GRAIN_SVG_URL}")`, opacity: 0.08, mixBlendMode: "overlay" }
 */
export const GRAIN_SVG_URL =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>
      <filter id='n2'>
        <feTurbulence type='fractalNoise' baseFrequency='.65' stitchTiles='stitch'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#n2)' opacity='0.55'/>
    </svg>`
  );
