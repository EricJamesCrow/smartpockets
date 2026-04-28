/**
 * Fixed, pointer-events-none grain overlay. SVG turbulence noise rendered
 * inline so we don't ship an extra asset. Subtle (opacity 0.05) — enough to
 * break digital flatness without becoming visible texture.
 */
export const Grain = () => (
    <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[60] opacity-[0.045] mix-blend-overlay"
        style={{
            backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 320 320' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "240px 240px",
        }}
    />
);
