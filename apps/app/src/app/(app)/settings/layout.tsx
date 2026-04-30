import { SettingsTabs } from "@repo/ui/untitledui/application/tabs/settings-tabs";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-w-0 flex-1 bg-primary pt-8 pb-12">
      <div className="flex flex-col gap-8">
        <div className="px-4 lg:px-8">
          <p className="font-[family-name:var(--font-geist-mono)] text-[0.65rem] uppercase tracking-[0.24em] text-tertiary dark:text-stone-500">
            <span className="mr-2 inline-block h-1 w-1 -translate-y-0.5 rounded-full bg-[var(--sp-moss-mint)]" />
            Workspace
          </p>
          <h1 className="mt-1.5 text-display-xs font-medium leading-tight tracking-[-0.02em] text-primary">
            <em className="font-[family-name:var(--font-fraunces)] font-medium italic text-stone-300 dark:text-stone-300">
              Settings
            </em>
          </h1>
        </div>
        <SettingsTabs />
        {children}
      </div>
    </main>
  );
}
