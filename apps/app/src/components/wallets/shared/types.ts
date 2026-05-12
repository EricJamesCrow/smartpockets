// apps/app/src/components/wallets/shared/types.ts
import type { Id } from "@convex/_generated/dataModel";

export interface Wallet {
  _id: Id<"wallets">;
  name: string;
  color?: string;
  icon?: string;
  cardCount: number;
  isPinned: boolean;
}

export interface WalletCardProps {
  wallet: Wallet;
  isExtended: boolean;
}

export interface MiniCardPreviewProps {
  brand: string;
  lastFour?: string;
  displayName: string;
  index: number;
  total: number;
  isHovered: boolean;
}
