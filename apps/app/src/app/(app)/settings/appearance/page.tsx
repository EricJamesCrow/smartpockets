"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { applyBrandColor, removeBrandColor } from "@/utils/brand-colors";
import { Code02 } from "@untitledui/icons";
import type { Color } from "react-aria-components";
import {
    ColorField,
    ColorSwatch,
    Radio,
    RadioGroup,
    parseColor,
} from "react-aria-components";
import { IconNotification } from "@repo/ui/untitledui/application/notifications/notifications";
import {
    Dark,
    Light,
    System,
} from "@repo/ui/untitledui/application/modals/base-components/appearances";
import {
    DefaultBanner,
    DefaultBannerSM,
    NoneBanner,
    NoneBannerSM,
    SimplifiedBanner,
} from "@repo/ui/untitledui/application/modals/base-components/banners";
import { SectionFooter } from "@repo/ui/untitledui/application/section-footers/section-footer";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { TableRowActionsDropdown } from "@repo/ui/untitledui/application/table/table";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { FileTrigger } from "@repo/ui/untitledui/base/file-upload-trigger/file-upload-trigger";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { InputBase } from "@repo/ui/untitledui/base/input/input";
import { RadioButtonBase } from "@repo/ui/untitledui/base/radio-buttons/radio-buttons";
import { Select } from "@repo/ui/untitledui/base/select/select";
import { Toggle } from "@repo/ui/untitledui/base/toggle/toggle";
import { cx } from "@repo/ui/utils";

const DEFAULTS = {
    theme: "system" as const,
    brandColor: "#7F56D9",
    transparentSidebar: true,
    language: "en-US",
    bannerAppearance: "simplified" as const,
};

const themes = [
    {
        value: "system",
        label: "System preference",
        component: System,
    },
    {
        value: "light",
        label: "Light mode",
        component: Light,
    },
    {
        value: "dark",
        label: "Dark mode",
        component: Dark,
    },
];

const banners = [
    {
        value: "default",
        label: "Default",
        description: "Default solid brand color.",
        component: DefaultBanner,
        componentSM: DefaultBannerSM,
    },
    {
        value: "simplified",
        label: "Simplified",
        description: "Minimal and simplified.",
        component: SimplifiedBanner,
        componentSM: NoneBannerSM,
    },
    {
        value: "custom",
        label: "Custom styling",
        description: "Manage styling with CSS.",
        component: NoneBanner,
        componentSM: NoneBannerSM,
    },
];

const languageOptions = [
    {
        id: "en-US",
        label: "English (US)",
        icon: (
            <img
                src="https://www.untitledui.com/images/flags/US.svg"
                alt="United States flag"
                className="size-5"
            />
        ),
    },
    {
        id: "de-DE",
        label: "German (DE)",
        icon: (
            <img
                src="https://www.untitledui.com/images/flags/DE.svg"
                alt="German flag"
                className="size-5"
            />
        ),
    },
    {
        id: "es-ES",
        label: "Spanish (ES)",
        icon: (
            <img
                src="https://www.untitledui.com/images/flags/ES.svg"
                alt="Spanish flag"
                className="size-5"
            />
        ),
    },
];

type Theme = "system" | "light" | "dark";
type BannerAppearance = "default" | "simplified" | "custom";

export default function AppearancePage() {
    const colorSwatches = [
        "#535862",
        "#099250",
        "#1570EF",
        "#444CE7",
        "#6938EF",
        "#BA24D5",
        "#DD2590",
        "#E04F16",
    ];

    const prefs = useQuery(api.userPreferences.get);
    const updateAppearance = useMutation(api.userPreferences.updateAppearance);
    const { setTheme: applyTheme } = useTheme();

    // Local state for form
    const [customColor, setCustomColor] = useState<Color>(
        parseColor(DEFAULTS.brandColor)
    );
    const [color, setColor] = useState<Color>(customColor);
    const [uploadedAvatar, setUploadedAvatar] = useState<string | undefined>(
        "https://www.untitledui.com/logos/images/ContrastAI.jpg"
    );
    const [theme, setTheme] = useState<Theme>(DEFAULTS.theme);
    const [transparentSidebar, setTransparentSidebar] = useState(
        DEFAULTS.transparentSidebar
    );
    const [language, setLanguage] = useState(DEFAULTS.language);
    const [bannerAppearance, setBannerAppearance] = useState<BannerAppearance>(
        DEFAULTS.bannerAppearance
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Sync local state from Convex when preferences load
    useEffect(() => {
        if (prefs !== undefined && !isInitialized) {
            const a = prefs?.appearance;
            if (a) {
                if (a.theme) setTheme(a.theme);
                if (a.brandColor) {
                    try {
                        const c = parseColor(a.brandColor);
                        setColor(c);
                        setCustomColor(c);
                    } catch {
                        // Invalid color, use default
                    }
                }
                if (a.transparentSidebar !== undefined)
                    setTransparentSidebar(a.transparentSidebar);
                if (a.language) setLanguage(a.language);
                if (a.bannerAppearance) setBannerAppearance(a.bannerAppearance);
            }
            setIsInitialized(true);
        }
    }, [prefs, isInitialized]);

    const handleAvatarUpload = (files: FileList | null) => {
        const file = files?.[0];
        if (!file) return;
        setUploadedAvatar(URL.createObjectURL(file));
    };

    const handleCustomColorChange = (value: Color | null) => {
        if (!value) return;

        const hexValue = value.toString("hex");

        // If the custom color is already selected, update the color and apply immediately.
        if (color.toString("hex") === customColor.toString("hex")) {
            setColor(value);
            applyBrandColor(hexValue);
        }

        setCustomColor(value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            await updateAppearance({
                theme,
                brandColor: color.toString("hex"),
                transparentSidebar,
                language,
                bannerAppearance,
            });

            toast.custom((t) => (
                <IconNotification
                    title="Appearance updated"
                    description="Your settings have been saved."
                    color="success"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } catch {
            toast.custom((t) => (
                <IconNotification
                    title="Failed to save"
                    description="Could not save settings. Please try again."
                    color="error"
                    onClose={() => toast.dismiss(t)}
                />
            ));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to saved values or defaults
        const a = prefs?.appearance;
        if (a) {
            const savedTheme = a.theme ?? DEFAULTS.theme;
            setTheme(savedTheme);
            applyTheme(savedTheme); // Revert theme visually

            if (a.brandColor) {
                try {
                    const c = parseColor(a.brandColor);
                    setColor(c);
                    setCustomColor(c);
                    applyBrandColor(a.brandColor); // Revert brand color visually
                } catch {
                    setColor(parseColor(DEFAULTS.brandColor));
                    setCustomColor(parseColor(DEFAULTS.brandColor));
                    removeBrandColor(); // Remove custom brand color
                }
            } else {
                setColor(parseColor(DEFAULTS.brandColor));
                setCustomColor(parseColor(DEFAULTS.brandColor));
                removeBrandColor(); // Remove custom brand color
            }
            setTransparentSidebar(a.transparentSidebar ?? DEFAULTS.transparentSidebar);
            setLanguage(a.language ?? DEFAULTS.language);
            setBannerAppearance(a.bannerAppearance ?? DEFAULTS.bannerAppearance);
        } else {
            // Reset to defaults
            setTheme(DEFAULTS.theme);
            applyTheme(DEFAULTS.theme);
            setColor(parseColor(DEFAULTS.brandColor));
            setCustomColor(parseColor(DEFAULTS.brandColor));
            removeBrandColor();
            setTransparentSidebar(DEFAULTS.transparentSidebar);
            setLanguage(DEFAULTS.language);
            setBannerAppearance(DEFAULTS.bannerAppearance);
        }
    };

    const handleReset = () => {
        // Reset to defaults
        setTheme(DEFAULTS.theme);
        applyTheme(DEFAULTS.theme); // Apply default theme visually
        setColor(parseColor(DEFAULTS.brandColor));
        setCustomColor(parseColor(DEFAULTS.brandColor));
        removeBrandColor(); // Remove custom brand color (use CSS defaults)
        setTransparentSidebar(DEFAULTS.transparentSidebar);
        setLanguage(DEFAULTS.language);
        setBannerAppearance(DEFAULTS.bannerAppearance);
    };

    // Loading state
    if (prefs === undefined) {
        return (
            <div className="flex flex-col gap-6 px-4 lg:px-8">
                <SectionHeader.Root>
                    <SectionHeader.Group>
                        <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                            <SectionHeader.Heading>
                                Appearance
                            </SectionHeader.Heading>
                            <SectionHeader.Subheading>
                                Change how your dashboard looks and feels.
                            </SectionHeader.Subheading>
                        </div>
                    </SectionHeader.Group>
                </SectionHeader.Root>
                <div className="flex items-center justify-center py-16">
                    <p className="text-sm text-tertiary">
                        Loading preferences...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <Form
            className="flex flex-col gap-6 px-4 lg:px-8"
            onSubmit={handleSubmit}
        >
            <SectionHeader.Root>
                <SectionHeader.Group>
                    <div className="flex flex-1 flex-col justify-center gap-0.5 self-stretch">
                        <SectionHeader.Heading>Appearance</SectionHeader.Heading>
                        <SectionHeader.Subheading>
                            Change how your dashboard looks and feels.
                        </SectionHeader.Subheading>
                    </div>

                    <div className="absolute top-0 right-0 md:static">
                        <TableRowActionsDropdown />
                    </div>
                </SectionHeader.Group>
            </SectionHeader.Root>

            {/* Form content */}
            <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                    <SectionLabel.Root
                        size="sm"
                        title="Company logo"
                        description="Update your company logo."
                    />

                    <div className="flex items-center gap-5">
                        <img
                            src={uploadedAvatar}
                            alt="Company logo"
                            className="size-16 rounded-2xl object-cover ring-1 ring-avatar-contrast-border ring-inset"
                        />

                        <div className="flex gap-4">
                            <FileTrigger
                                acceptedFileTypes={["image/*"]}
                                onSelect={handleAvatarUpload}
                            >
                                <Button size="sm" color="secondary">
                                    Replace logo
                                </Button>
                            </FileTrigger>
                        </div>
                    </div>
                </div>

                <hr className="h-px w-full border-none bg-border-secondary" />

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                    <SectionLabel.Root
                        size="sm"
                        title="Brand color"
                        description="Select or customize your brand color."
                    />

                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <RadioGroup
                            aria-label="Brand color"
                            value={color?.toString("hex")}
                            onChange={(value) => {
                                setColor(parseColor(value));
                                applyBrandColor(value); // Apply immediately
                            }}
                            className="flex flex-col items-start gap-4 md:flex-row md:items-center"
                        >
                            <div className="flex gap-2">
                                {colorSwatches.map((swatchColor) => (
                                    <Radio
                                        key={swatchColor}
                                        value={swatchColor}
                                        aria-label={parseColor(
                                            swatchColor
                                        ).getColorName("en-US")}
                                    >
                                        {({ isSelected, isFocused }) => (
                                            <ColorSwatch
                                                id={`color-${swatchColor}`}
                                                color={swatchColor}
                                                className={cx(
                                                    "size-7 cursor-pointer rounded-full outline-1 -outline-offset-1 outline-black/10",
                                                    (isSelected || isFocused) &&
                                                        "ring-2 ring-focus-ring ring-offset-2 ring-offset-bg-primary"
                                                )}
                                            />
                                        )}
                                    </Radio>
                                ))}
                            </div>
                            <Radio
                                value={customColor.toString("hex")}
                                aria-label={customColor.getColorName("en-US")}
                                className="flex shrink-0 items-center gap-3"
                            >
                                {({ isSelected, isFocused }) => (
                                    <>
                                        <label
                                            htmlFor="custom-color-input"
                                            className="text-sm font-semibold text-secondary"
                                        >
                                            Custom
                                        </label>
                                        <ColorSwatch
                                            color={customColor}
                                            className={cx(
                                                "size-7 shrink-0 cursor-pointer rounded-full outline-1 -outline-offset-1 outline-black/10",
                                                (isSelected || isFocused) &&
                                                    "ring-2 ring-focus-ring ring-offset-2 ring-offset-bg-primary"
                                            )}
                                        />
                                        <ColorField
                                            aria-label="Custom color"
                                            className="md:hidden"
                                            value={customColor}
                                            onChange={handleCustomColorChange}
                                        >
                                            <InputBase
                                                id="custom-color-input"
                                                size="sm"
                                                wrapperClassName="w-24"
                                            />
                                        </ColorField>
                                    </>
                                )}
                            </Radio>
                        </RadioGroup>
                        <ColorField
                            aria-label="Custom color"
                            value={customColor}
                            onChange={handleCustomColorChange}
                            className="max-md:hidden"
                        >
                            <InputBase size="sm" wrapperClassName="w-24" />
                        </ColorField>
                    </div>
                </div>

                <hr className="h-px w-full border-none bg-border-secondary" />

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                    <SectionLabel.Root
                        size="sm"
                        title="Display preference"
                        description="Switch between light and dark modes."
                    />

                    <div className="-m-4 w-screen overflow-auto p-4 lg:w-[calc(100%+48px)]">
                        <RadioGroup
                            aria-label="Display preference"
                            value={theme}
                            onChange={(value) => {
                                setTheme(value as Theme);
                                applyTheme(value); // Apply immediately
                            }}
                            className="flex gap-5"
                        >
                            {themes.map((themeOption) => (
                                <Radio
                                    key={themeOption.value}
                                    value={themeOption.value}
                                    aria-label={themeOption.label}
                                    className="flex cursor-pointer flex-col gap-3"
                                >
                                    {({ isSelected, isFocusVisible }) => (
                                        <>
                                            <section
                                                className={cx(
                                                    "relative h-33 w-50 rounded-[10px] bg-utility-gray-100",
                                                    isSelected &&
                                                        "outline-2 outline-offset-2 outline-focus-ring"
                                                )}
                                            >
                                                <themeOption.component className="size-full" />

                                                {isSelected && (
                                                    <RadioButtonBase
                                                        size="md"
                                                        isSelected={isSelected}
                                                        isFocusVisible={
                                                            isFocusVisible
                                                        }
                                                        className="absolute bottom-2 left-2"
                                                    />
                                                )}
                                            </section>
                                            <section className="w-full">
                                                <p className="text-sm font-semibold text-primary">
                                                    {themeOption.label}
                                                </p>
                                            </section>
                                        </>
                                    )}
                                </Radio>
                            ))}
                        </RadioGroup>
                    </div>
                </div>

                <hr className="h-px w-full border-none bg-border-secondary" />

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                    <SectionLabel.Root
                        size="sm"
                        title="Transparent sidebar"
                        description="Make the sidebar transparent."
                    />
                    <Toggle
                        aria-label="Transparent sidebar"
                        isSelected={transparentSidebar}
                        onChange={setTransparentSidebar}
                        size="md"
                    />
                </div>

                <hr className="h-px w-full border-none bg-border-secondary" />

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                    <SectionLabel.Root
                        size="sm"
                        title="Language"
                        description="Default language for public dashboard."
                    />

                    <div className="w-max min-w-50">
                        <Select
                            name="language"
                            aria-label="Language"
                            size="sm"
                            selectedKey={language}
                            onSelectionChange={(key) =>
                                setLanguage(key as string)
                            }
                            items={languageOptions}
                        >
                            {(item) => (
                                <Select.Item id={item.id} icon={item.icon}>
                                    {item.label}
                                </Select.Item>
                            )}
                        </Select>
                    </div>
                </div>

                <hr className="h-px w-full border-none bg-border-secondary" />

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(200px,280px)_1fr] lg:gap-8">
                    <SectionLabel.Root
                        size="sm"
                        title="Banner appearance"
                        description="Change how banners appear to visitors."
                    />

                    <div className="-m-4 w-screen overflow-auto p-4 lg:w-[calc(100%+48px)]">
                        <RadioGroup
                            aria-label="Banner appearances"
                            value={bannerAppearance}
                            onChange={(value) =>
                                setBannerAppearance(value as BannerAppearance)
                            }
                            className="flex gap-5"
                        >
                            {banners.map((banner) => (
                                <Radio
                                    key={banner.value}
                                    value={banner.value}
                                    aria-label={banner.label}
                                    className="flex cursor-pointer flex-col gap-3"
                                >
                                    {({ isSelected, isFocusVisible }) => (
                                        <>
                                            <section
                                                className={cx(
                                                    "relative h-33 w-50 rounded-[10px] bg-utility-gray-100 before:absolute before:inset-0 before:z-10 before:rounded-[10px] before:border before:border-primary",
                                                    isSelected &&
                                                        "outline-2 outline-offset-2 outline-focus-ring"
                                                )}
                                            >
                                                <banner.component className="size-full" />

                                                {isSelected && (
                                                    <RadioButtonBase
                                                        size="md"
                                                        isSelected={isSelected}
                                                        isFocusVisible={
                                                            isFocusVisible
                                                        }
                                                        className="absolute bottom-2 left-2 z-1"
                                                    />
                                                )}

                                                {banner.value === "custom" && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            iconLeading={Code02}
                                                            color="secondary"
                                                            className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                                                        >
                                                            Edit CSS
                                                        </Button>
                                                        <span className="absolute top-0 left-0 size-full rounded-md bg-linear-to-b from-[rgba(0,0,0,0.02)] to-[rgba(0,0,0,0.17)] to-90% backdrop-blur-[1.875px] sm:rounded-[10px]" />
                                                    </>
                                                )}
                                            </section>
                                            <section className="w-full">
                                                <p className="text-sm font-semibold text-primary">
                                                    {banner.label}
                                                </p>
                                                <p className="text-sm text-tertiary">
                                                    {banner.description}
                                                </p>
                                            </section>
                                        </>
                                    )}
                                </Radio>
                            ))}
                        </RadioGroup>
                    </div>
                </div>
            </div>

            <SectionFooter.Root>
                <Button
                    size="md"
                    color="link-gray"
                    type="button"
                    onClick={handleReset}
                >
                    Reset <span className="max-lg:hidden"> to default</span>
                </Button>
                <SectionFooter.Actions>
                    <Button
                        color="secondary"
                        size="md"
                        type="button"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        color="primary"
                        size="md"
                        isDisabled={isSaving}
                    >
                        {isSaving ? "Saving..." : "Save changes"}
                    </Button>
                </SectionFooter.Actions>
            </SectionFooter.Root>
        </Form>
    );
}
