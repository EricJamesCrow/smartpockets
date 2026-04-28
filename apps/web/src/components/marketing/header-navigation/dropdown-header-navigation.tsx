import type { FC, ReactNode } from "react";
import { BookClosed, CreditCard02, FileCode01, LifeBuoy01, PlayCircle, Receipt, Stars02 } from "@untitledui/icons";
import { NavMenuItemLink } from "./base-components/nav-menu-item";

const ComingSoonBadge = () => (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        Coming soon
    </span>
);

interface DropdownItem {
    title: string;
    subtitle: string;
    href: string;
    Icon: FC<{ className?: string }>;
    badge?: ReactNode;
    disabled?: boolean;
}

const productItems: DropdownItem[] = [
    {
        title: "Credit Card Management",
        subtitle: "Track your cards, compare benefits, and maximize rewards effortlessly.",
        href: "#",
        Icon: CreditCard02,
        disabled: true,
    },
    {
        title: "Transactions",
        subtitle: "Monitor spending across all your accounts in one unified dashboard.",
        href: "#",
        Icon: Receipt,
        badge: <ComingSoonBadge />,
        disabled: true,
    },
    {
        title: "Form 568",
        subtitle: "File your California LLC annual tax form in minutes, not hours.",
        href: "#",
        Icon: FileCode01,
        badge: <ComingSoonBadge />,
        disabled: true,
    },
];

const resourceItems: DropdownItem[] = [
    {
        title: "Blog",
        subtitle: "The latest industry news and guides curated by our expert team.",
        href: "/blog",
        Icon: BookClosed,
    },
    {
        title: "Customer stories",
        subtitle: "Learn how our customers are using SmartPockets to manage their finances.",
        href: "/customer-stories",
        Icon: Stars02,
    },
    {
        title: "Video tutorials",
        subtitle: "Get up and running on our newest features and in-depth guides.",
        href: "/tutorials",
        Icon: PlayCircle,
    },
    {
        title: "Help and support",
        subtitle: "Need help with something? Our expert team is here to help 24/7.",
        href: "/help",
        Icon: LifeBuoy01,
    },
];

const DropdownMenu = ({ items }: { items: DropdownItem[] }) => {
    return (
        <div className="px-3 pb-2 md:max-w-84 md:p-0">
            <nav className="overflow-hidden bg-primary py-2 shadow-xs ring-1 ring-secondary_alt md:p-2 md:shadow-lg">
                <ul className="flex flex-col gap-0.5">
                    {items.map(({ title, subtitle, href, Icon, badge, disabled }) => (
                        <li key={title} className={disabled && badge ? "opacity-50" : undefined}>
                            {disabled ? (
                                <div className={`inline-flex w-full gap-3 px-4 py-3 sm:max-w-80 sm:p-3 ${badge ? "cursor-not-allowed" : "cursor-default"}`}>
                                    <Icon className="mt-0.5 size-4 shrink-0 stroke-[2.3px] text-fg-brand-primary" />
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-md font-semibold text-primary">{title}</span>
                                                {badge}
                                            </div>
                                            <span className="line-clamp-2 text-sm text-tertiary">{subtitle}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <NavMenuItemLink icon={Icon} title={title} subtitle={subtitle} href={href} badge={badge} />
                            )}
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
};

export const ProductsDropdown = () => <DropdownMenu items={productItems} />;
export const ResourcesDropdown = () => <DropdownMenu items={resourceItems} />;
