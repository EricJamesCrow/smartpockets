import { cx } from "../../../../utils/cx";

interface SmartPocketsLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function SmartPocketsLogo({ className, size = "md" }: SmartPocketsLogoProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <span className={cx("font-semibold tracking-tight", sizeClasses[size], className)}>
      <span className="text-primary">Smart</span>
      <span className="text-fg-brand-primary">Pockets</span>
    </span>
  );
}
