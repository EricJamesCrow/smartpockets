"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import { FixtureRenderer } from "../_parts/FixtureRenderer";
import { ThemeToggle } from "../_parts/ThemeToggle";

export default function DevComponentPage() {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEV_TOOLS !== "1") {
        notFound();
    }
    const params = useParams<{ component: string }>();
    const component = params?.component;
    if (!component) {
        notFound();
    }
    return (
        <div className="mx-auto max-w-screen-md p-8">
            <Link href="/dev/tool-results" className="text-xs text-tertiary hover:underline">
                &lt;- back to index
            </Link>
            <header className="mb-6 mt-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">{component}</h1>
                <ThemeToggle />
            </header>
            <FixtureRenderer toolName={component} />
        </div>
    );
}
