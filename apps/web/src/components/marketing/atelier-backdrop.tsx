/**
 * Obsidian Atelier backdrop — fixed atmosphere layer behind every section.
 * - Onyx base with two cool spotlights and one warm amber breath
 * - Hairline blueprint grid (4rem) with deeper 16rem accent grid
 * - SVG film-grain — generated, no asset cost
 * - Vignette so glass surfaces feel embedded, not stamped on
 *
 * This is intentionally CSS/SVG only — no GSAP needed for the canvas itself,
 * which keeps it server-safe and prerendered.
 */
export const AtelierBackdrop = () => {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            {/* Onyx base */}
            <div className="absolute inset-0 bg-[#08090c]" />

            {/* Cool spotlight, top-left */}
            <div
                className="absolute -top-[20%] -left-[10%] h-[70vh] w-[70vw] opacity-70"
                style={{
                    background:
                        "radial-gradient(ellipse at center, rgba(63, 84, 107, 0.55) 0%, rgba(33, 45, 64, 0.25) 40%, transparent 70%)",
                    filter: "blur(60px)",
                }}
            />
            {/* Cool spotlight, bottom-right */}
            <div
                className="absolute -right-[15%] -bottom-[20%] h-[60vh] w-[60vw] opacity-50"
                style={{
                    background:
                        "radial-gradient(ellipse at center, rgba(46, 60, 80, 0.7) 0%, rgba(20, 28, 40, 0.3) 40%, transparent 70%)",
                    filter: "blur(80px)",
                }}
            />
            {/* Warm amber breath, mid-right */}
            <div
                className="absolute top-[30%] right-[10%] h-[40vh] w-[40vw] opacity-30"
                style={{
                    background:
                        "radial-gradient(ellipse at center, rgba(217, 165, 70, 0.45) 0%, rgba(180, 130, 40, 0.18) 40%, transparent 70%)",
                    filter: "blur(80px)",
                }}
            />

            {/* Blueprint grid — hairline */}
            <svg className="absolute inset-0 h-full w-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="atelier-grid" width="64" height="64" patternUnits="userSpaceOnUse">
                        <path d="M 64 0 L 0 0 0 64" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                    <pattern id="atelier-grid-major" width="256" height="256" patternUnits="userSpaceOnUse">
                        <path d="M 256 0 L 0 0 0 256" fill="none" stroke="white" strokeWidth="0.75" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#atelier-grid)" />
                <rect width="100%" height="100%" fill="url(#atelier-grid-major)" />
            </svg>

            {/* Film grain via SVG turbulence */}
            <svg className="absolute inset-0 h-full w-full opacity-[0.06] mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
                <filter id="atelier-grain">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
                    <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0" />
                </filter>
                <rect width="100%" height="100%" filter="url(#atelier-grain)" />
            </svg>

            {/* Top vignette */}
            <div
                className="absolute inset-x-0 top-0 h-40"
                style={{
                    background: "linear-gradient(to bottom, rgba(8,9,12,0.9), transparent)",
                }}
            />
            {/* Bottom vignette */}
            <div
                className="absolute inset-x-0 bottom-0 h-40"
                style={{
                    background: "linear-gradient(to top, rgba(8,9,12,0.9), transparent)",
                }}
            />
        </div>
    );
};
