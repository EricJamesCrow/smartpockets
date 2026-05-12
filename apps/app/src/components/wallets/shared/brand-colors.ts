// apps/app/src/components/wallets/shared/brand-colors.ts

/**
 * Brand-color palette for mini credit-card previews inside a wallet card.
 * Maps a card network slug → gradient + accent chip color.
 */
export const brandColors: Record<
  string,
  { bg: string; accent: string }
> = {
  visa: { bg: "from-blue-600 to-blue-800", accent: "bg-yellow-400" },
  mastercard: { bg: "from-red-500 to-orange-500", accent: "bg-yellow-500" },
  amex: { bg: "from-slate-600 to-slate-800", accent: "bg-blue-400" },
  discover: { bg: "from-orange-500 to-orange-600", accent: "bg-white" },
  other: { bg: "from-gray-600 to-gray-800", accent: "bg-gray-400" },
};

export type BrandKey = keyof typeof brandColors;
