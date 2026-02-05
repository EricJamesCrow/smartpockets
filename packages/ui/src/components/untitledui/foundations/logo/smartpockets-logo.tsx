import { cx } from "../../../../utils/cx";

interface SmartPocketsLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Show abbreviated "SP" version for collapsed sidebars */
  collapsed?: boolean;
}

export function SmartPocketsLogo({ className, size = "md", collapsed = false }: SmartPocketsLogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  // Larger sizes for collapsed state to fill the space proportionally
  const collapsedSizeClasses = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  };

  if (collapsed) {
    return (
      <span className={cx("font-semibold tracking-tight", collapsedSizeClasses[size], className)}>
        <span className="text-primary">S</span>
        <span className="text-fg-brand-primary">P</span>
      </span>
    );
  }

  return (
    <span className={cx("font-semibold tracking-tight", sizeClasses[size], className)}>
      <span className="text-primary">Smart</span>
      <span className="text-fg-brand-primary">Pockets</span>
    </span>
  );
}
