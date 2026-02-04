import { cx } from "../../../../utils/cx";
import { SmartPocketsLogo } from "./smartpockets-logo";

interface SmartPocketsLogoWithBadgeProps {
    className?: string;
    size?: "sm" | "md" | "lg";
    showBadge?: boolean;
}

export function SmartPocketsLogoWithBadge({ className, size = "md", showBadge = true }: SmartPocketsLogoWithBadgeProps) {
    return (
        <span className={cx("inline-flex items-center gap-2", className)}>
            <SmartPocketsLogo size={size} />
            {showBadge && (
                <span className="relative -top-0.5 rounded-full bg-gray-100 px-1.5 py-px text-[8px] font-medium uppercase tracking-wide text-gray-500 ring-1 ring-inset ring-gray-200">
                    Alpha
                </span>
            )}
        </span>
    );
}
