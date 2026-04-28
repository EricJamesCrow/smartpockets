import type { FC, ReactNode } from "react";
import { BookClosed, CreditCard02, FileCode01, LifeBuoy01, PlayCircle, Receipt, Stars02 } from "@untitledui/icons";
import { NavMenuItemLink } from "./base-components/nav-menu-item";

const ComingSoonBadge = () => (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">Coming soon</span>
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
        title: "Credit card command center",
        subtitle: "Track balances, utilization, APRs, due dates, and transactions across connected accounts.",
        href: "/#features",
        Icon: CreditCard02,
    },
    {
        title: "Agent-assisted planning",
        subtitle: "Future-facing assistance for insight, organization, reminders, and portfolio hygiene.",
        href: "/#agentic",
        Icon: Receipt,
        badge: <ComingSoonBadge />,
        disabled: true,
    },
    {
        title: "Open source roadmap",
        subtitle: "Follow the product direction and contribute to the personal finance stack.",
        href: "/about",
        Icon: FileCode01,
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
        <div className="md:max-w-84 px-3 pb-2 md:p-0">
            <nav className="bg-primary shadow-xs ring-secondary_alt overflow-hidden rounded-2xl py-2 ring-1 md:p-2 md:shadow-lg">
                <ul className="flex flex-col gap-0.5">
                    {items.map(({ title, subtitle, href, Icon, badge, disabled }) => (
                        <li key={title} className={disabled && badge ? "opacity-50" : undefined}>
                            {disabled ? (
                                <div
                                    className={`inline-flex w-full gap-3 px-4 py-3 sm:max-w-80 sm:p-3 md:rounded-lg ${badge ? "cursor-not-allowed" : "cursor-default"}`}
                                >
                                    <Icon className="text-fg-brand-primary mt-0.5 size-4 shrink-0 stroke-[2.3px]" />
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-md text-primary font-semibold">{title}</span>
                                                {badge}
                                            </div>
                                            <span className="text-tertiary line-clamp-2 text-sm">{subtitle}</span>
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
