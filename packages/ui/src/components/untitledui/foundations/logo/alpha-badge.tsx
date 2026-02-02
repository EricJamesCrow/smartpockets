import { Badge } from "../../base/badges/badges";
import { SmartPocketsLogo } from "./smartpockets-logo";
import { cx } from "../../../../utils/cx";

interface SmartPocketsLogoWithBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
}

export function SmartPocketsLogoWithBadge({
  className,
  size = "md",
  showBadge = true
}: SmartPocketsLogoWithBadgeProps) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <SmartPocketsLogo size={size} />
      {showBadge && (
        <Badge size="sm" color="gray">
          Alpha
        </Badge>
      )}
    </div>
  );
}
