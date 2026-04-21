import { PreferencesForm } from "./PreferencesForm";

export default function NotificationsSettingsPage() {
    return (
        <div className="mx-auto max-w-2xl px-6 py-10">
            <h1 className="text-2xl font-semibold text-primary">Notifications</h1>
            <p className="mt-2 text-sm text-tertiary">
                Choose which emails from SmartPockets you want to receive.
            </p>
            <PreferencesForm />
        </div>
    );
}
