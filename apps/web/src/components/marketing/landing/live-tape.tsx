import { cx } from "@repo/ui/utils";

interface TapeItem {
    symbol: string;
    detail: string;
    delta: string;
    tone: "up" | "down" | "neutral";
}

const ITEMS: readonly TapeItem[] = [
    { symbol: "AMEX_PLAT", detail: "UTIL 38.2%", delta: "−0.42%", tone: "down" },
    { symbol: "MARRIOTT_BLD", detail: "PMT DUE 4D", delta: "$320.10", tone: "neutral" },
    { symbol: "SAPPHIRE_R", detail: "REWARDS", delta: "+1,840 PTS", tone: "up" },
    { symbol: "DISCOVER_IT", detail: "APR 18.99%", delta: "STATIC", tone: "neutral" },
    { symbol: "CITI_DBL_CASH", detail: "CASHBACK", delta: "+$48.20", tone: "up" },
    { symbol: "CAP1_VENTURE", detail: "BAL", delta: "$1,204.00", tone: "neutral" },
    { symbol: "WELLS_AUTOPAY", detail: "STATUS", delta: "ACTIVE", tone: "up" },
    { symbol: "BOA_TRAVEL", detail: "UTIL 11.0%", delta: "−2.10%", tone: "down" },
    { symbol: "FIRST_TECH_CU", detail: "FICO Δ", delta: "+12 PTS", tone: "up" },
];

const TONE_CLASS = {
    up: "text-brand-400",
    down: "text-rose-400",
    neutral: "text-zinc-300",
} as const;

const Row = () => (
    <div className="flex shrink-0 items-center gap-8 px-4 font-mono text-[11px] uppercase tracking-[0.14em]" aria-hidden="true">
        {ITEMS.map((item, idx) => (
            <span key={`${item.symbol}-${idx}`} className="flex items-center gap-2 text-zinc-500">
                <span className="text-zinc-300">{item.symbol}</span>
                <span className="text-zinc-600">·</span>
                <span>{item.detail}</span>
                <span className="text-zinc-600">·</span>
                <span className={cx("font-semibold", TONE_CLASS[item.tone])}>{item.delta}</span>
                <span className="text-zinc-700">{idx < ITEMS.length - 1 ? "//" : ""}</span>
            </span>
        ))}
    </div>
);

export function LiveTape() {
    return (
        <div
            className="relative isolate overflow-hidden border-y border-white/[0.06] bg-[#06090b]"
            role="presentation"
        >
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#06090b] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#06090b] to-transparent" />
            <div className="pointer-events-none absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 items-center gap-2 sm:flex">
                <span className="size-1.5 animate-pulse rounded-full bg-brand-400 shadow-[0_0_10px_rgba(60,203,127,0.7)]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">LIVE</span>
            </div>
            <div className="flex w-max animate-marquee items-center py-2.5 will-change-transform [animation-duration:55s] hover:[animation-play-state:paused]">
                <Row />
                <Row />
            </div>
        </div>
    );
}
