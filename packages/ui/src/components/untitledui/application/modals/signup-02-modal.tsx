"use client";

import { useEffect, useState } from "react";
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components";
import { ContentDivider } from "../content-divider/content-divider";
import { Dialog, Modal, ModalOverlay } from "../modals/modal";
import { Button } from "../../base/buttons/button";
import { CloseButton } from "../../base/buttons/close-button";
import { SocialButton } from "../../base/buttons/social-button";
import { Form } from "../../base/form/form";
import { Input } from "../../base/input/input";
import { UntitledLogoMinimal } from "../../foundations/logo/untitledui-logo-minimal";

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

export const Signup02Modal = () => {
    const [isOpen, setIsOpen] = useModalState();

    return (
        <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
            <ModalOverlay isDismissable>
                <Modal>
                    <Dialog>
                        <div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl sm:max-w-100">
                            <CloseButton onClick={() => setIsOpen(false)} theme="light" size="lg" className="absolute top-3 right-3" />
                            <div className="flex flex-col items-center justify-center gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
                                <UntitledLogoMinimal className="size-8" />
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                    <AriaHeading slot="title" className="text-md font-semibold text-primary">
                                        Create an account
                                    </AriaHeading>
                                    <p className="text-sm text-tertiary">Start your free 30-day trial. Cancel anytime.</p>
                                </div>
                            </div>
                            <div className="h-5 w-full" />
                            <div className="flex flex-col gap-4 px-4 pb-4 sm:gap-5 sm:px-6 sm:pb-6">
                                <Form
                                    className="flex flex-col gap-4"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const data = Object.fromEntries(new FormData(e.currentTarget));
                                        console.log("Form data:", data);
                                        setIsOpen(false);
                                    }}
                                >
                                    <Input isRequired hideRequiredIndicator name="email" placeholder="Enter your email" size="md" />
                                    <Button type="submit" size="lg" color="primary">
                                        Get started
                                    </Button>
                                </Form>
                                <ContentDivider type="single-line">
                                    <span className="text-sm font-medium text-tertiary">OR</span>
                                </ContentDivider>
                                <div className="flex flex-col gap-3">
                                    <SocialButton social="google" theme="color">
                                        Sign up with Google
                                    </SocialButton>
                                    <SocialButton social="facebook" theme="color">
                                        Sign up with Facebook
                                    </SocialButton>
                                    <SocialButton social="apple" theme="color">
                                        Sign up with Apple
                                    </SocialButton>
                                </div>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </AriaDialogTrigger>
    );
};
