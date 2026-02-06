import type { ReactNode } from "react";

interface LegalPageLayoutProps {
    title: string;
    subtitle: string;
    description: string;
    children: ReactNode;
}

export const LegalPageLayout = ({ title, subtitle, description, children }: LegalPageLayoutProps) => {
    return (
        <div className="bg-primary">
            <section className="py-16 md:py-24">
                <div className="mx-auto max-w-container px-4 md:px-8">
                    <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                        <span className="text-sm font-semibold text-brand-secondary md:text-md">{subtitle}</span>
                        <h1 className="mt-3 text-display-md font-semibold text-primary md:text-display-lg">{title}</h1>
                        <p className="mt-4 text-lg text-tertiary md:mt-6 md:text-xl">{description}</p>
                    </div>
                </div>
            </section>

            <section className="bg-primary pb-16 md:pb-24">
                <div className="mx-auto max-w-container px-4 md:px-8">
                    <div className="prose md:prose-lg mx-auto md:max-w-180">{children}</div>
                </div>
            </section>
        </div>
    );
};
