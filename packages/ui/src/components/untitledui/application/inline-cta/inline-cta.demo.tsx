"use client";

import { FileIcon } from "@untitledui/file-icons";
import { CheckCircle, LayersTwo02, Mail01 } from "@untitledui/icons";
import { Button } from "../../base/buttons/button";
import { Form } from "../../base/form/form";
import { Input } from "../../base/input/input";
import { FeaturedIcon } from "../../foundations/featured-icon/featured-icon";
import { VisaIcon } from "../../foundations/payment-icons";

export const InlineCTAImage = () => {
    return (
        <div className="flex w-full flex-col overflow-hidden rounded-xl bg-primary shadow-xs sm:flex-row">
            <div className="relative h-50 w-full sm:h-auto sm:w-60">
                <img src="https://www.untitledui.com/application/smiling-girl-2.webp" alt="Smiling girl" className="absolute inset-0 size-full object-cover" />
                <div className="absolute inset-0 size-full rounded-t-xl border border-black/10 sm:rounded-l-xl sm:rounded-tr-none" />
            </div>
            <div className="flex-1 rounded-b-xl border border-t-0 border-secondary px-4 py-5 sm:rounded-r-xl sm:rounded-bl-none sm:border-t sm:border-l-0 sm:p-6">
                <div className="flex flex-col">
                    <h3 className="text-md font-semibold text-primary">We've just released a new update!</h3>
                    <p className="mt-0.5 text-sm text-tertiary">Check out the all new dashboard view. Pages and now load faster.</p>
                    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
                        <Button color="secondary" size="md">
                            Dismiss
                        </Button>
                        <Button size="md">Changelog</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const InlineCTAActions = () => {
    return (
        <div className="w-full flex-1 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset sm:p-6">
            <div className="flex flex-col">
                <h3 className="text-md font-semibold text-primary">We've just released a new update!</h3>
                <p className="mt-0.5 text-sm text-tertiary">Check out the all new dashboard view. Pages and now load faster.</p>
                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
                    <Button color="secondary" size="md">
                        Dismiss
                    </Button>
                    <Button size="md">Changelog</Button>
                </div>
            </div>
        </div>
    );
};

export const InlineCTAEmailField = () => {
    return (
        <div className="w-full flex-1 rounded-xl bg-primary px-4 py-5 shadow-xs ring-1 ring-secondary ring-inset sm:p-6">
            <div className="flex flex-col">
                <h3 className="text-md font-semibold text-primary">We've just released a new update!</h3>
                <p className="mt-0.5 text-sm text-tertiary">Check out the all new dashboard view. Pages and now load faster.</p>
                <Form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const data = Object.fromEntries(new FormData(e.currentTarget));
                        console.log("Form data:", data);
                    }}
                    className="mt-5 flex flex-col gap-3 sm:w-full sm:max-w-100 sm:flex-row sm:items-end sm:gap-4"
                >
                    <div className="flex-1">
                        <Input
                            isRequired
                            hideRequiredIndicator
                            size="md"
                            name="email"
                            label="Subscribe to updates"
                            placeholder="you@untitledui.com"
                            icon={Mail01}
                        />
                    </div>
                    <Button size="lg" type="submit">
                        Subscribe
                    </Button>
                </Form>
            </div>
        </div>
    );
};

export const InlineCTAChangePlan = () => {
    return (
        <div className="w-full flex-1 rounded-xl bg-primary px-4 pt-5 pb-4 shadow-xs ring-1 ring-secondary ring-inset sm:p-6">
            <div className="flex flex-col">
                <h3 className="text-md font-semibold text-primary">Change your plan</h3>
                <p className="mt-0.5 text-sm text-tertiary">Flexible pricing that grows with you.</p>

                <div className="mt-5">
                    <div className="group block overflow-hidden rounded-lg bg-primary ring-1 ring-secondary ring-inset">
                        <div className="flex items-center gap-3 border-b border-secondary py-3 pr-5 pl-4">
                            <FeaturedIcon color="brand" theme="light" size="sm" icon={LayersTwo02} />

                            <span className="text-md font-semibold text-secondary">Basic plan</span>
                        </div>
                        <div className="flex flex-col p-4">
                            <div className="flex flex-col gap-1">
                                <p className="flex items-baseline gap-1">
                                    <span className="text-display-sm font-semibold text-secondary">$10</span>
                                    <span className="text-sm text-tertiary">per month</span>
                                </p>
                                <p className="text-sm text-tertiary">Includes up to 10 users, 20 GB individual data and access to all features.</p>
                            </div>
                            <div className="mt-6 flex flex-row gap-3">
                                <Button color="secondary" size="md">
                                    Learn more
                                </Button>
                                <Button size="md">Upgrade plan</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const InlineCTAUpgradePlan = () => {
    return (
        <div className="w-full flex-1 rounded-xl bg-primary px-4 py-5 shadow-xs ring-1 ring-secondary ring-inset sm:p-6">
            <div className="flex flex-col">
                <h3 className="text-md font-semibold text-primary">Upgrade your plan</h3>
                <p className="mt-0.5 text-sm text-tertiary">Need more space? Upgrade your plan today.</p>
                <ul className="mt-5 flex flex-col gap-4">
                    {[
                        { title: "10 users", subtitle: "Add up to 10 team members." },
                        { title: "20 GB data", subtitle: "Up to 20 GB individual data." },
                        { title: "All features", subtitle: "Access to advanced features and analytics." },
                    ].map((item) => (
                        <li key={item.title} className="flex gap-3">
                            <CheckCircle aria-hidden="true" className="size-6 shrink-0 text-fg-success-primary" />
                            <div className="flex flex-col gap-0.5">
                                <p className="text-md font-medium text-secondary">{item.title}</p>
                                <p className="text-md text-tertiary">{item.subtitle}</p>
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
                    <Button color="secondary" size="md">
                        All plans
                    </Button>
                    <Button size="md">Upgrade plan</Button>
                </div>
            </div>
        </div>
    );
};

export const InlineCTAPaymentMethod = () => {
    return (
        <div className="w-full flex-1 rounded-xl bg-primary p-4 pt-5 shadow-xs ring-1 ring-secondary ring-inset sm:p-6">
            <div className="flex flex-col">
                <h3 className="text-md font-semibold text-primary">Payment method</h3>
                <p className="mt-0.5 text-sm text-tertiary">Change how you pay for your plan.</p>
                <div className="mt-5 flex gap-2 rounded-lg bg-primary p-4 ring-1 ring-secondary ring-inset md:gap-4">
                    <VisaIcon className="h-6 w-8.5 md:h-10 md:w-14.5" />
                    <div className="flex flex-1 flex-col gap-2">
                        <div className="flex justify-between gap-2">
                            <div>
                                <p className="text-sm font-medium text-secondary">Visa ending in 1234</p>
                                <p className="text-sm text-tertiary">Expiry 06/2025</p>
                            </div>
                            <Button color="secondary" size="md">
                                Edit
                            </Button>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Mail01 aria-hidden="true" className="size-4 text-fg-quaternary" />{" "}
                            <span className="text-sm text-tertiary">billing@untitledui.com</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const InlineCTAReceipt = () => {
    return (
        <div className="w-full flex-1 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
            <div className="flex flex-col">
                <h3 className="text-md font-semibold text-primary">Your latest receipt is available</h3>
                <p className="mt-0.5 text-sm text-tertiary">Download receipt for January 2025.</p>
                <div className="mt-5 flex flex-col gap-5 rounded-lg bg-primary sm:flex-row sm:gap-4 sm:border sm:border-secondary sm:p-4">
                    <div className="flex flex-1 items-start gap-3">
                        <FileIcon type="pdf" theme="light" className="size-10 dark:hidden" />
                        <FileIcon type="pdf" theme="dark" className="size-10 not-dark:hidden" />

                        <div>
                            <p className="text-sm font-medium text-secondary">Receipt_January_2025.pdf</p>
                            <p className="text-sm text-tertiary">200 KB</p>
                        </div>
                    </div>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <Button color="secondary" size="md">
                            Download
                        </Button>
                        <Button size="md">View</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
