"use client";

import type { FormEvent } from "react";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { Input } from "@repo/ui/untitledui/base/input/input";

/**
 * Concierge — the final reservation card.
 * Engraved feel: large serif headline, small mono caption, hairline border, amber wax seal.
 */
export const AtelierConcierge = () => {
    return (
        <section className="relative overflow-hidden px-4 py-24 md:px-8 md:py-32">
            <div className="mx-auto max-w-[1280px]">
                <div className="atelier-concierge relative overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent px-6 py-12 backdrop-blur-2xl md:px-12 md:py-20 lg:px-20 lg:py-24">
                    {/* Wax seal */}
                    <div className="pointer-events-none absolute top-8 right-8 hidden md:block">
                        <div className="atelier-seal relative flex size-20 items-center justify-center rounded-full border border-amber-300/30 bg-gradient-to-br from-amber-200/30 via-amber-300/10 to-transparent shadow-[inset_0_0_24px_rgba(252,211,77,0.18),0_0_40px_-8px_rgba(252,211,77,0.5)]">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                <circle cx="24" cy="24" r="20" stroke="rgba(252,211,77,0.55)" strokeWidth="0.6" />
                                <circle cx="24" cy="24" r="14" stroke="rgba(252,211,77,0.4)" strokeWidth="0.4" strokeDasharray="2 4" />
                                <path d="M24 12L31 24L24 36L17 24L24 12Z" stroke="rgba(252,211,77,0.85)" strokeWidth="0.8" fill="none" />
                                <text x="24" y="26.5" textAnchor="middle" fill="rgba(252,211,77,0.95)" fontSize="6" fontFamily="ui-monospace" letterSpacing="1">SP</text>
                            </svg>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
                        <div className="lg:col-span-7">
                            <p className="font-[family-name:var(--font-jetbrains)] text-[11px] tracking-[0.32em] text-amber-200/80 uppercase">
                                V / Concierge
                            </p>
                            <h2 className="mt-6 font-[family-name:var(--font-fraunces)] text-[40px] leading-[0.98] font-light tracking-[-0.03em] text-white sm:text-[56px] md:text-[72px] lg:text-[88px] [font-variation-settings:'opsz'_144,'SOFT'_30]">
                                Reserve a seat at the{" "}
                                <span className="text-amber-100/90 italic [font-variation-settings:'opsz'_144,'SOFT'_100,'WONK'_1]">
                                    workbench.
                                </span>
                            </h2>
                            <p className="mt-6 max-w-md font-[family-name:var(--font-familjen)] text-[16px] leading-[1.6] text-white/65 md:text-[17px]">
                                Atelier no.04 is currently in early access alpha. We invite a small cohort each week. Leave your address and we will hand-deliver an
                                invite when the next bench seat opens.
                            </p>
                        </div>

                        <div className="lg:col-span-5">
                            <Form
                                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                                    e.preventDefault();
                                    e.currentTarget.reset();
                                }}
                                className="flex w-full flex-col gap-3"
                            >
                                <Input
                                    isRequired
                                    size="md"
                                    name="email"
                                    type="email"
                                    placeholder="you@atelier.com"
                                    wrapperClassName="py-0.5"
                                    hint={
                                        <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.18em] text-white/35 uppercase">
                                            We honor our{" "}
                                            <a
                                                href="/privacy"
                                                className="rounded-xs underline-offset-3 outline-focus-ring underline focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                privacy
                                            </a>{" "}
                                            ·{" "}
                                            <a
                                                href="/terms"
                                                className="rounded-xs underline-offset-3 outline-focus-ring underline focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                terms
                                            </a>
                                        </span>
                                    }
                                />
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Button type="submit" size="xl" className="flex-1">
                                        Reserve seat
                                    </Button>
                                    <Button type="button" color="secondary" size="xl" href="/about" className="flex-1">
                                        Atelier brief
                                    </Button>
                                </div>
                            </Form>

                            {/* Engraved details */}
                            <div className="mt-8 grid grid-cols-2 gap-6 border-t border-white/[0.06] pt-6">
                                <div>
                                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.32em] text-white/40 uppercase">
                                        Cohort
                                    </p>
                                    <p className="mt-2 font-[family-name:var(--font-fraunces)] text-[24px] leading-none text-white [font-variation-settings:'opsz'_72,'SOFT'_50]">
                                        04 · 2026
                                    </p>
                                </div>
                                <div>
                                    <p className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.32em] text-white/40 uppercase">
                                        Seats
                                    </p>
                                    <p className="mt-2 font-[family-name:var(--font-fraunces)] text-[24px] leading-none text-amber-100 [font-variation-settings:'opsz'_72,'SOFT'_50]">
                                        12 / 100
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
