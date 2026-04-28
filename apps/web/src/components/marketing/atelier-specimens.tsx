"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { CreditCard } from "@repo/ui/untitledui/shared-assets/credit-card/credit-card";

const specimens = [
    {
        ref: "Spec. A·17",
        name: "Daily driver",
        desc: "Cashback rotation, autopay locked.",
        type: "brand-dark" as const,
        meta: ["APR", "—", "0.00%"],
        meta2: ["Util.", "—", "12%"],
    },
    {
        ref: "Spec. B·24",
        name: "Travel reserve",
        desc: "Lounge access, no foreign fees.",
        type: "gradient-strip" as const,
        meta: ["APR", "—", "21.99%"],
        meta2: ["Util.", "—", "4%"],
    },
    {
        ref: "Spec. C·09",
        name: "Business plate",
        desc: "Routing rule: vendors over $250.",
        type: "salmon-strip" as const,
        meta: ["APR", "—", "18.74%"],
        meta2: ["Util.", "—", "31%"],
    },
];

/**
 * Specimens: three credit-card "exhibits" each under a hairline glass plinth.
 * Each plinth has a JetBrains-mono spec sheet beneath the card.
 */
export const AtelierSpecimens = () => {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!rootRef.current) return;
        const ctx = gsap.context(() => {
            // Entrance via IntersectionObserver to keep SSR content visible.
            const items = rootRef.current?.querySelectorAll<HTMLElement>("[data-specimen]") ?? [];
            const io = new IntersectionObserver(
                (entries) => {
                    entries.forEach((e) => {
                        if (e.isIntersecting) {
                            const el = e.target as HTMLElement;
                            gsap.fromTo(el, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "expo.out", overwrite: "auto" });
                            io.unobserve(el);
                        }
                    });
                },
                { threshold: 0.2 },
            );
            items.forEach((c) => io.observe(c));

            // Subtle float per specimen — perpetual.
            const floats = gsap.utils.toArray<HTMLElement>("[data-specimen-card]");
            floats.forEach((el, i) => {
                gsap.to(el, {
                    y: -10,
                    rotate: i === 1 ? 0 : i === 0 ? -2 : 2,
                    duration: 4 + i * 0.5,
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut",
                    delay: i * 0.3,
                });
            });

            return () => io.disconnect();
        }, rootRef);
        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={rootRef}
            id="provenance"
            className="relative overflow-hidden px-4 py-24 md:px-8 md:py-32"
        >
            <div className="mx-auto max-w-[1280px]">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
                    <div className="md:col-span-2">
                        <p className="font-[family-name:var(--font-jetbrains)] text-[11px] tracking-[0.32em] text-amber-200/80 uppercase">
                            III / Specimens
                        </p>
                    </div>
                    <div className="md:col-span-10">
                        <h2 className="font-[family-name:var(--font-fraunces)] text-[36px] leading-[1] font-light tracking-[-0.02em] text-white sm:text-[48px] md:text-[60px] lg:text-[72px] [font-variation-settings:'opsz'_144,'SOFT'_60]">
                            Each card,{" "}
                            <span className="text-white/55 italic [font-variation-settings:'opsz'_144,'SOFT'_100,'WONK'_1]">
                                a complete dossier.
                            </span>
                        </h2>
                    </div>
                </div>

                {/* Specimen plinths */}
                <div className="mt-16 grid grid-cols-1 gap-6 md:mt-20 md:grid-cols-3 md:gap-8">
                    {specimens.map((s, i) => (
                        <div
                            key={s.ref}
                            data-specimen
                            className="group relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-5 backdrop-blur-2xl md:p-6"
                        >
                            {/* Plinth ruler */}
                            <div className="flex items-center justify-between font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.32em] text-white/40 uppercase">
                                <span>{s.ref}</span>
                                <span>No.0{i + 1}</span>
                            </div>

                            {/* Card under glass */}
                            <div className="relative mt-6 flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.04] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_70%)] md:h-52">
                                {/* Spotlights */}
                                <div className="pointer-events-none absolute -top-12 left-1/2 h-32 w-48 -translate-x-1/2 bg-amber-200/10 blur-3xl" />

                                {/* Plinth shadow */}
                                <div className="pointer-events-none absolute right-1/2 bottom-3 h-3 w-32 translate-x-1/2 rounded-full bg-black/70 blur-xl" />

                                <div data-specimen-card className="relative will-change-transform">
                                    <CreditCard type={s.type} cardHolder="Eric Crow" width={210} />
                                </div>

                                {/* Hairline rule */}
                                <div className="pointer-events-none absolute right-4 bottom-3 left-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                            </div>

                            {/* Plate */}
                            <div className="mt-5">
                                <p className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.32em] text-amber-200/80 uppercase">
                                    Hallmark
                                </p>
                                <h3 className="mt-2 font-[family-name:var(--font-fraunces)] text-[26px] leading-[1.05] font-light tracking-[-0.02em] text-white [font-variation-settings:'opsz'_72,'SOFT'_50]">
                                    {s.name}
                                </h3>
                                <p className="mt-2 font-[family-name:var(--font-familjen)] text-[13px] leading-[1.55] text-white/55">
                                    {s.desc}
                                </p>

                                <dl className="mt-5 space-y-1.5 border-t border-white/[0.06] pt-4">
                                    <div className="flex items-baseline justify-between font-[family-name:var(--font-jetbrains)] text-[11px] tracking-[0.18em] uppercase">
                                        <dt className="text-white/40">{s.meta[0]}</dt>
                                        <dd className="flex items-center gap-1.5 text-white/85">
                                            <span className="text-white/30">{s.meta[1]}</span>
                                            <span>{s.meta[2]}</span>
                                        </dd>
                                    </div>
                                    <div className="flex items-baseline justify-between font-[family-name:var(--font-jetbrains)] text-[11px] tracking-[0.18em] uppercase">
                                        <dt className="text-white/40">{s.meta2[0]}</dt>
                                        <dd className="flex items-center gap-1.5 text-amber-200/90">
                                            <span className="text-white/30">{s.meta2[1]}</span>
                                            <span>{s.meta2[2]}</span>
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
