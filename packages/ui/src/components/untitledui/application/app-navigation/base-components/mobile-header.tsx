"use client";

import type { PropsWithChildren } from "react";
import { X as CloseIcon, Menu02 } from "@untitledui/icons";
import {
    Button as AriaButton,
    Dialog as AriaDialog,
    DialogTrigger as AriaDialogTrigger,
    Modal as AriaModal,
    ModalOverlay as AriaModalOverlay,
} from "react-aria-components";
import { cx } from "../../../../../utils/cx";
import { SmartPocketsLogoWithBadge } from "../../../foundations/logo";

export const MobileNavigationHeader = ({ children }: PropsWithChildren) => {
    return (
        <AriaDialogTrigger>
            <header className="border-secondary bg-primary flex h-16 items-center justify-between border-b py-3 pl-4 pr-2 lg:hidden">
                <SmartPocketsLogoWithBadge size="sm" />

                <AriaButton
                    aria-label="Expand navigation menu"
                    className="bg-primary text-fg-secondary outline-focus-ring hover:bg-primary_hover hover:text-fg-secondary_hover group flex items-center justify-center rounded-lg p-2 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <Menu02 className="size-6 transition duration-200 ease-in-out group-aria-expanded:opacity-0" />
                    <CloseIcon className="absolute size-6 opacity-0 transition duration-200 ease-in-out group-aria-expanded:opacity-100" />
                </AriaButton>
            </header>

            <AriaModalOverlay
                isDismissable
                className={({ isEntering, isExiting }) =>
                    cx(
                        "bg-overlay/70 fixed inset-0 z-50 cursor-pointer pr-16 backdrop-blur-md lg:hidden",
                        isEntering && "animate-in fade-in duration-300 ease-in-out",
                        isExiting && "animate-out fade-out duration-200 ease-in-out",
                    )
                }
            >
                {({ state }) => (
                    <>
                        <AriaButton
                            aria-label="Close navigation menu"
                            onPress={() => state.close()}
                            className="text-fg-white/70 outline-focus-ring hover:text-fg-white fixed right-2 top-3 flex cursor-pointer items-center justify-center rounded-lg p-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                            <CloseIcon className="size-6" />
                        </AriaButton>

                        <AriaModal className="w-full cursor-auto will-change-transform">
                            <AriaDialog className="outline-hidden focus:outline-hidden h-dvh">{children}</AriaDialog>
                        </AriaModal>
                    </>
                )}
            </AriaModalOverlay>
        </AriaDialogTrigger>
    );
};
