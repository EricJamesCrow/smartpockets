import type { ReactNode } from "react";

interface LegalPageLayoutProps {
    title: string;
    subtitle: string;
    description: string;
    /** Optional 1B kicker prefix (e.g. "II · PRIVACY"). Falls back to subtitle. */
    kicker?: string;
    /** Single italic accent word for the headline. Defaults to first word of title. */
    italicWord?: string;
    children: ReactNode;
}

/**
 * Shared layout for marketing legal pages (privacy, terms, etc.).
 *
 * 1B aesthetic: mono kicker with moss dot, Fraunces italic accent on the
 * headline (one word, never more), Geist body copy, hairline borders. The
 * `prose` plugin handles inner article styling.
 */
export const LegalPageLayout = ({
    title,
    subtitle,
    description,
    kicker,
    italicWord,
    children,
}: LegalPageLayoutProps) => {
    const titleParts = title.split(/\s+/);
    const renderTitle = () => {
        if (italicWord) {
            const idx = title.indexOf(italicWord);
            if (idx === -1) {
                return (
                    <>
                        <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300">
                            {italicWord}
                        </em>{" "}
                        {title}
                    </>
                );
            }
            return (
                <>
                    {title.slice(0, idx)}
                    <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300">
                        {italicWord}
                    </em>
                    {title.slice(idx + italicWord.length)}
                </>
            );
        }
        if (titleParts.length === 1) {
            return (
                <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300">
                    {titleParts[0]}
                </em>
            );
        }
        return (
            <>
                <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300">
                    {titleParts[0]}
                </em>{" "}
                {titleParts.slice(1).join(" ")}
            </>
        );
    };

    return (
        <div className="bg-primary">
            <section className="relative overflow-hidden py-16 md:py-24">
                {/* Soft moss + champagne aurora wash */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 hidden dark:block"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 22% 18%, rgba(127,184,154,0.06), transparent 36%), radial-gradient(circle at 78% 14%, rgba(212,197,156,0.04), transparent 32%)",
                    }}
                />
                <div className="relative mx-auto max-w-container px-4 md:px-8">
                    <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                        <p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.28em] text-tertiary dark:text-stone-500">
                            <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-[var(--sp-moss-mint,#7fb89a)]" />
                            {kicker ?? subtitle}
                        </p>
                        <h1 className="mt-4 text-balance text-display-md font-medium leading-[1.05] tracking-[-0.025em] text-primary md:text-display-lg">
                            {renderTitle()}
                        </h1>
                        <p className="mt-5 max-w-2xl text-pretty text-md leading-7 text-tertiary md:mt-6 md:text-lg">
                            {description}
                        </p>
                        <p className="mt-6 font-[family-name:var(--font-geist-mono)] text-[0.7rem] uppercase tracking-[0.22em] text-tertiary dark:text-stone-500">
                            {subtitle}
                        </p>
                    </div>
                </div>
            </section>

            <section className="border-t border-secondary bg-primary pb-16 md:pb-24 dark:border-[var(--sp-moss-line,rgba(255,255,255,0.08))]">
                <div className="mx-auto max-w-container px-4 pt-12 md:px-8 md:pt-16">
                    <div className="prose md:prose-lg mx-auto md:max-w-180">{children}</div>
                </div>
            </section>
        </div>
    );
};
