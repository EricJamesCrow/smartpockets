// JS mirror of CSS motion tokens defined in apps/app/src/app/globals.css.
// CSS tokens (--sp-motion-fast/base/slow, --sp-ease-productive) are the
// canonical declaration; these JS exports exist because framer-motion's
// `transition` prop needs JS numbers/arrays, not CSS variables.
//
// Keep these in sync with globals.css :root block.

/** 150ms — button press, hover state changes. */
export const SP_MOTION_FAST_MS = 150;
/** 220ms — banner, dialog, sidebar item. */
export const SP_MOTION_BASE_MS = 220;
/** 320ms — large layout transitions; rare in chat. */
export const SP_MOTION_SLOW_MS = 320;

/** Productive ease curve — matches --sp-ease-productive in globals.css. */
export const SP_EASE_PRODUCTIVE: [number, number, number, number] = [0.32, 0.72, 0, 1];

/** Convenience: framer-motion `transition` shape using the base duration + productive ease. */
export const SP_TRANSITION_BASE = {
    duration: SP_MOTION_BASE_MS / 1000,
    ease: SP_EASE_PRODUCTIVE,
} as const;

/** Convenience: framer-motion `transition` shape using the fast duration + productive ease. */
export const SP_TRANSITION_FAST = {
    duration: SP_MOTION_FAST_MS / 1000,
    ease: SP_EASE_PRODUCTIVE,
} as const;
