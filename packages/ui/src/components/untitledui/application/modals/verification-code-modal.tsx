"use client";

import { useEffect, useState } from "react";
import { Mail01 } from "@untitledui/icons";
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "../modals/modal";
import { Button } from "../../base/buttons/button";
import { CloseButton } from "../../base/buttons/close-button";
import { PinInput } from "../../base/pin-input/pin-input";
import { FeaturedIcon } from "../../foundations/featured-icon/featured-icon";
import { BackgroundPattern } from "../../shared-assets/background-patterns";

/**
 * This is a utility hook that automatically reopens the modal after
 * it's closed. It's used only for demo purposes and can be safely
 * removed and replaced with a regular `useState` hook.
 */
const useModalState = (defaultValue: boolean = true) => {
    const [isOpen, setIsOpen] = useState(defaultValue);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setIsOpen(true);
            }, 700);
        }
    }, [isOpen]);

    return [isOpen, setIsOpen] as const;
};

export const VerificationCodeModal = () => {
    const [isOpen, setIsOpen] = useModalState();

    return (
        <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
            <ModalOverlay isDismissable>
                <Modal>
                    <Dialog>
                        <div className="relative w-full max-w-102 overflow-hidden rounded-2xl bg-primary shadow-xl">
                            <CloseButton onClick={() => setIsOpen(false)} theme="light" size="lg" className="absolute top-3 right-3 z-20" />
                            <div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
                                <div className="relative flex w-full items-center justify-center">
                                    <FeaturedIcon color="brand" size="lg" theme="light" icon={Mail01} />

                                    <BackgroundPattern pattern="circle" size="sm" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <div className="z-10 flex flex-col items-center justify-center gap-0.5">
                                    <AriaHeading slot="title" className="text-md font-semibold text-primary">
                                        Please check your email.
                                    </AriaHeading>
                                    <p className="text-center text-sm text-tertiary">
                                        We've sent a code to&nbsp;<span className="text-sm font-semibold">olivia@untitledui.com</span>
                                    </p>
                                </div>
                            </div>
                            <div className="h-5 w-full" />
                            <div className="relative z-10 flex flex-col gap-1.5 px-[31.5px] sm:px-6.5">
                                <PinInput size="md" className="max-sm:hidden">
                                    <PinInput.Group maxLength={4}>
                                        <PinInput.Slot index={0} />
                                        <PinInput.Slot index={1} />
                                        <PinInput.Slot index={2} />
                                        <PinInput.Slot index={3} />
                                    </PinInput.Group>

                                    <PinInput.Description>
                                        Didn't get a code?&nbsp;
                                        <button className="cursor-pointer rounded-xs underline underline-offset-3 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2">
                                            Click to resend
                                        </button>
                                        .
                                    </PinInput.Description>
                                </PinInput>
                                <PinInput size="sm" className="sm:hidden">
                                    <PinInput.Group maxLength={4}>
                                        <PinInput.Slot index={0} />
                                        <PinInput.Slot index={1} />
                                        <PinInput.Slot index={2} />
                                        <PinInput.Slot index={3} />
                                    </PinInput.Group>

                                    <PinInput.Description>
                                        Didn't get a code?&nbsp;
                                        <button className="cursor-pointer rounded-xs underline underline-offset-3 outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2">
                                            Click to resend
                                        </button>
                                        .
                                    </PinInput.Description>
                                </PinInput>
                            </div>
                            <div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 *:grow sm:grid sm:grid-cols-2 sm:px-6 sm:pt-8 sm:pb-6">
                                <Button color="secondary" size="lg" onClick={() => setIsOpen(false)}>
                                    Cancel
                                </Button>
                                <Button color="primary" size="lg" onClick={() => setIsOpen(false)}>
                                    Verify
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </AriaDialogTrigger>
    );
};
