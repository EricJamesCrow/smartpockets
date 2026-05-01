"use client";

import { ArrowLeft, ArrowRight } from "@untitledui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/untitledui/base/buttons/button";

/**
 * 404 page — retoned for the 1B (moss + champagne) aesthetic.
 *
 * Mono kicker (`404 / NOT FOUND`), Fraunces italic accent on the headline,
 * Geist body copy, hairline borders. Mirrors the marketing landing's
 * micro-typography rules.
 */
export default function NotFound() {
    const router = useRouter();

    return (
        <section className="relative flex min-h-screen items-start overflow-hidden bg-primary py-16 md:items-center md:py-24">
            {/* Soft moss + champagne aurora wash — purely decorative */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 hidden dark:block"
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 22% 18%, rgba(127,184,154,0.08), transparent 36%), radial-gradient(circle at 78% 82%, rgba(212,197,156,0.06), transparent 32%)",
                }}
            />

            <div className="relative mx-auto max-w-container grow px-4 md:px-8">
                <div className="flex w-full max-w-3xl flex-col gap-10 md:gap-14">
                    <div className="flex flex-col gap-5 md:gap-7">
                        <p className="sp-kicker tracking-[0.28em] text-tertiary dark:text-stone-500">
                            <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-[var(--sp-moss-mint)]" />
                            404 / Not Found
                        </p>
                        <h1 className="text-balance text-[clamp(2rem,4vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.025em] text-primary">
                            This page{" "}
                            <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300">
                                isn&rsquo;t
                            </em>{" "}
                            part of the workshop.
                        </h1>
                        <p className="max-w-xl text-pretty text-md leading-7 text-tertiary md:text-lg">
                            The route you tried doesn&rsquo;t exist or has moved. No data
                            was harmed. Head back to the dashboard and pick up where you
                            left off.
                        </p>
                    </div>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <Button
                            color="secondary"
                            size="xl"
                            iconLeading={ArrowLeft}
                            onClick={() => router.back()}
                        >
                            Go back
                        </Button>
                        <Button size="xl" iconTrailing={ArrowRight} href="/">
                            Back to dashboard
                        </Button>
                    </div>

                    {/* Tiny hairline ledger so the page feels intentional, not blank */}
                    <div className="border-t border-secondary pt-6 dark:border-[var(--sp-moss-line)]">
                        <p className="sp-microcopy text-tertiary dark:text-stone-500">
                            <Link
                                href="/"
                                className="underline underline-offset-4 transition-colors hover:text-primary dark:hover:text-stone-200"
                            >
                                /
                            </Link>{" "}
                            &middot;{" "}
                            <Link
                                href="/credit-cards"
                                className="underline underline-offset-4 transition-colors hover:text-primary dark:hover:text-stone-200"
                            >
                                /credit-cards
                            </Link>{" "}
                            &middot;{" "}
                            <Link
                                href="/transactions"
                                className="underline underline-offset-4 transition-colors hover:text-primary dark:hover:text-stone-200"
                            >
                                /transactions
                            </Link>{" "}
                            &middot;{" "}
                            <Link
                                href="/settings"
                                className="underline underline-offset-4 transition-colors hover:text-primary dark:hover:text-stone-200"
                            >
                                /settings
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
