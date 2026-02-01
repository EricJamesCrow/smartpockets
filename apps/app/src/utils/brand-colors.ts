/**
 * Brand Color Utilities
 * Generates a 12-shade color palette from a single hex value
 * and applies it as CSS custom properties.
 */

type HSL = { h: number; s: number; l: number };
type RGB = { r: number; g: number; b: number };

const BRAND_COLOR_STYLE_ID = "brand-color-overrides";

// Color shade stops matching UntitledUI theme.css
const SHADE_STOPS = [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/**
 * Convert hex color to HSL
 */
export function hexToHsl(hex: string): HSL {
  const rgb = hexToRgb(hex);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Generate brand color palette from a base hex color
 * The input color is treated as the 600 shade (primary brand color)
 */
export function generateBrandPalette(hex: string): Record<number, string> {
  const { h, s, l } = hexToHsl(hex);

  // Configuration for each shade
  // Lightness and saturation adjustments relative to input color
  const shadeConfig: Record<number, { lightness: number; saturationMult: number }> = {
    25: { lightness: 97, saturationMult: 0.3 },
    50: { lightness: 95, saturationMult: 0.4 },
    100: { lightness: 91, saturationMult: 0.55 },
    200: { lightness: 83, saturationMult: 0.7 },
    300: { lightness: 72, saturationMult: 0.85 },
    400: { lightness: 58, saturationMult: 0.95 },
    500: { lightness: 48, saturationMult: 1 },
    600: { lightness: l, saturationMult: 1 }, // Original color
    700: { lightness: Math.max(l - 10, 20), saturationMult: 1 },
    800: { lightness: Math.max(l - 18, 15), saturationMult: 0.92 },
    900: { lightness: Math.max(l - 26, 12), saturationMult: 0.85 },
    950: { lightness: Math.max(l - 34, 8), saturationMult: 0.75 },
  };

  const palette: Record<number, string> = {};

  for (const shade of SHADE_STOPS) {
    const config = shadeConfig[shade]!;
    const newS = Math.min(s * config.saturationMult, 100);
    const rgb = hslToRgb(h, newS, config.lightness);
    palette[shade] = `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
  }

  return palette;
}

/**
 * Apply brand color CSS variables to the document
 */
export function applyBrandColor(hex: string): void {
  if (typeof document === "undefined") return;

  const palette = generateBrandPalette(hex);

  // Build CSS string
  const cssVars = SHADE_STOPS.map(
    (shade) => `--color-brand-${shade}: ${palette[shade]};`
  ).join("\n  ");

  const css = `:root {\n  ${cssVars}\n}`;

  // Remove existing style if present
  removeBrandColor();

  // Create and inject new style element
  const style = document.createElement("style");
  style.id = BRAND_COLOR_STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Remove custom brand color (revert to CSS defaults)
 */
export function removeBrandColor(): void {
  if (typeof document === "undefined") return;

  const existing = document.getElementById(BRAND_COLOR_STYLE_ID);
  if (existing) {
    existing.remove();
  }
}

/**
 * Check if a custom brand color is currently applied
 */
export function hasBrandColorOverride(): boolean {
  if (typeof document === "undefined") return false;
  return document.getElementById(BRAND_COLOR_STYLE_ID) !== null;
}
