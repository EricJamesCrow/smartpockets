import { cx } from "@repo/ui/utils";

interface SparklineProps {
    points: readonly number[];
    width?: number;
    height?: number;
    className?: string;
    /** Show a subtle grid in the background. */
    grid?: boolean;
    color?: string;
    /** Show a glowing dot at the end of the line. */
    showHead?: boolean;
    strokeWidth?: number;
    fill?: boolean;
}

/**
 * Minimal cockpit sparkline. Renders a path + optional area fill from a number
 * series. No client JS needed — purely visual atmosphere.
 */
export function Sparkline({
    points,
    width = 220,
    height = 56,
    className,
    grid = false,
    color = "var(--color-brand-400, rgb(60 203 127))",
    showHead = true,
    strokeWidth = 1.5,
    fill = true,
}: SparklineProps) {
    if (points.length < 2) return null;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const stepX = width / (points.length - 1);
    const padY = strokeWidth + 2;

    const coords = points.map((value, i) => {
        const x = i * stepX;
        const y = padY + (height - padY * 2) * (1 - (value - min) / range);
        return [x, y] as const;
    });

    const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${(width).toFixed(1)} ${height} L0 ${height} Z`;
    const [headX, headY] = coords[coords.length - 1]!;

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            className={cx("block", className)}
            role="img"
            aria-label="trend sparkline"
        >
            {grid ? (
                <g stroke="currentColor" strokeWidth="0.4" className="text-zinc-700/40">
                    <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} strokeDasharray="2 4" />
                    <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} strokeDasharray="2 4" />
                    <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} strokeDasharray="2 4" />
                </g>
            ) : null}
            {fill ? (
                <>
                    <defs>
                        <linearGradient id={`spark-fill-${points.join("-").slice(0, 12)}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.30" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={areaPath} fill={`url(#spark-fill-${points.join("-").slice(0, 12)})`} />
                </>
            ) : null}
            <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
            {showHead ? (
                <>
                    <circle cx={headX} cy={headY} r="3.5" fill={color} opacity="0.25" />
                    <circle cx={headX} cy={headY} r="2" fill={color} />
                </>
            ) : null}
        </svg>
    );
}
