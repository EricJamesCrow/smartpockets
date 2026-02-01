"use client";

import { useEffect, useState } from "react";
import { CurrencyDollarCircle } from "@untitledui/icons";
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "../modals/modal";
import { Button } from "../../base/buttons/button";
import { CloseButton } from "../../base/buttons/close-button";
import * as RadioGroups from "../../base/radio-groups/radio-groups";
import { FeaturedIcon } from "../../foundations/featured-icon/featured-icon";
import { MastercardIcon, VisaIcon } from "../../foundations/payment-icons";
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

const paymentCards = [
    {
        value: "card-1",
        title: "Visa ending in 1234",
        description: "Expiry 06/2025",
        logo: <VisaIcon className="h-8 w-11.5" />,
    },
    {
        value: "card-2",
        title: "Mastercard ending in 1234",
        description: "Expiry 06/2025",
        logo: <MastercardIcon className="h-8 w-11.5" />,
    },
    {
        value: "card-3",
        title: "Visa ending in 1234",
        description: "Expiry 06/2025",
        logo: <VisaIcon className="h-8 w-11.5" />,
    },
];

export const PaymentMethodModal = () => {
    const [isOpen, setIsOpen] = useModalState();

    return (
        <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
            <ModalOverlay isDismissable>
                <Modal>
                    <Dialog>
                        <div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl sm:max-w-120">
                            <CloseButton onClick={() => setIsOpen(false)} theme="light" size="lg" className="absolute top-3 right-3" />
                            <div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
                                <div className="relative w-max">
                                    <FeaturedIcon color="gray" size="lg" theme="modern" icon={CurrencyDollarCircle} />

                                    <BackgroundPattern pattern="circle" size="sm" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <div className="z-10 flex flex-col gap-0.5">
                                    <AriaHeading slot="title" className="text-md font-semibold text-primary">
                                        Change your payment method
                                    </AriaHeading>
                                    <p className="text-sm text-tertiary">Update your plan payment details.</p>
                                </div>
                            </div>
                            <div className="h-5 w-full" />
                            <div className="px-4 sm:px-6">
                                <RadioGroups.PaymentIcon aria-label="Payment methods" defaultValue={paymentCards[0]?.value} items={paymentCards} />
                            </div>
                            <div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 sm:grid sm:grid-cols-2 sm:px-6 sm:pt-8 sm:pb-6">
                                <Button color="secondary" size="lg" onClick={() => setIsOpen(false)}>
                                    Cancel
                                </Button>
                                <Button color="primary" size="lg" onClick={() => setIsOpen(false)}>
                                    Confirm
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </AriaDialogTrigger>
    );
};
