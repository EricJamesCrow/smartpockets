"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { applyBrandColor, removeBrandColor } from "@/utils/brand-colors";
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
import { SectionFooter } from "@repo/ui/untitledui/application/section-footers/section-footer";
import { SectionHeader } from "@repo/ui/untitledui/application/section-headers/section-headers";
import { SectionLabel } from "@repo/ui/untitledui/application/section-headers/section-label";
import { TableRowActionsDropdown } from "@repo/ui/untitledui/application/table/table";
import { Button } from "@repo/ui/untitledui/base/buttons/button";
import { Form } from "@repo/ui/untitledui/base/form/form";
import { InputBase } from "@repo/ui/untitledui/base/input/input";
import { RadioButtonBase } from "@repo/ui/untitledui/base/radio-buttons/radio-buttons";
import { cx } from "@repo/ui/utils";

const DEFAULTS = {
    theme: "system" as const,
    brandColor: "#7F56D9",
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

type Theme = "system" | "light" | "dark";

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
    const [theme, setTheme] = useState<Theme>(DEFAULTS.theme);
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
            }
            setIsInitialized(true);
        }
    }, [prefs, isInitialized]);

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
        } else {
            // Reset to defaults
            setTheme(DEFAULTS.theme);
            applyTheme(DEFAULTS.theme);
            setColor(parseColor(DEFAULTS.brandColor));
            setCustomColor(parseColor(DEFAULTS.brandColor));
            removeBrandColor();
        }
    };

    const handleReset = () => {
        // Reset to defaults
        setTheme(DEFAULTS.theme);
        applyTheme(DEFAULTS.theme); // Apply default theme visually
        setColor(parseColor(DEFAULTS.brandColor));
        setCustomColor(parseColor(DEFAULTS.brandColor));
        removeBrandColor(); // Remove custom brand color (use CSS defaults)
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
