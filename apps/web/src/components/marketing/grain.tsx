/**
 * Fixed, pointer-events-none film-grain overlay used across the marketing
 * surface. Adds organic texture to the otherwise flat charcoal panels and
 * breaks up smooth gradients without dominating the design.
 */
export const Grain = () => (
    <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.05] mix-blend-overlay"
        style={{
            backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.85'/></svg>\")",
            backgroundSize: "240px 240px",
        }}
    />
);
