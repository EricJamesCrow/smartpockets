import { SettingsTabs } from "@repo/ui/untitledui/application/tabs/settings-tabs";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-w-0 flex-1 bg-primary pt-8 pb-12">
      <div className="flex flex-col gap-8">
        <SettingsTabs />
        {children}
      </div>
    </main>
  );
}
