"use client";

import { useEffect, useState } from "react";
import { User01, UsersPlus } from "@untitledui/icons";
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "../modals/modal";
import { AvatarLabelGroup } from "../../base/avatar/avatar-label-group";
import { Button } from "../../base/buttons/button";
import { CloseButton } from "../../base/buttons/close-button";
import { Select } from "../../base/select/select";
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

const people = [
    { id: "@phoenix", label: "Phoenix Baker", avatarUrl: "https://www.untitledui.com/images/avatars/phoenix-baker?fm=webp&q=80" },
    { id: "@olivia", label: "Olivia Rhye", avatarUrl: "https://www.untitledui.com/images/avatars/olivia-rhye?fm=webp&q=80" },
    { id: "@lana", label: "Lana Steiner", avatarUrl: "https://www.untitledui.com/images/avatars/lana-steiner?fm=webp&q=80" },
    { id: "@demi", label: "Demi Wilkinson", avatarUrl: "https://www.untitledui.com/images/avatars/demi-wilkinson?fm=webp&q=80" },
    { id: "@candice", label: "Candice Wu", avatarUrl: "https://www.untitledui.com/images/avatars/candice-wu?fm=webp&q=80" },
    { id: "@natali", label: "Natali Craig", avatarUrl: "https://www.untitledui.com/images/avatars/natali-craig?fm=webp&q=80" },
    { id: "@abraham", label: "Abraham Baker", avatarUrl: "https://www.untitledui.com/images/avatars/abraham-baker?fm=webp&q=80" },
    { id: "@adem", label: "Adem Lane", avatarUrl: "https://www.untitledui.com/images/avatars/adem-lane?fm=webp&q=80" },
    { id: "@jackson", label: "Jackson Reed", avatarUrl: "https://www.untitledui.com/images/avatars/jackson-reed?fm=webp&q=80" },
    { id: "@jessie", label: "Jessie Meyton", avatarUrl: "https://www.untitledui.com/images/avatars/jessie-meyton?fm=webp&q=80" },
];

export const UserInviteModal = () => {
    const [isOpen, setIsOpen] = useModalState();

    return (
        <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
            <ModalOverlay isDismissable>
                <Modal>
                    <Dialog>
                        <div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl sm:max-w-100">
                            <CloseButton onClick={() => setIsOpen(false)} theme="light" size="lg" className="absolute top-3 right-3" />
                            <div className="flex flex-col gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
                                <div className="relative w-max">
                                    <FeaturedIcon color="gray" size="lg" theme="modern" icon={UsersPlus} />

                                    <BackgroundPattern pattern="circle" size="sm" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <div className="z-10 flex flex-col gap-0.5">
                                    <AriaHeading slot="title" className="text-md font-semibold text-primary">
                                        Share with people
                                    </AriaHeading>
                                    <p className="text-sm text-tertiary">The following users have access to this project:</p>
                                </div>
                            </div>
                            <div className="h-5 w-full" />
                            <div className="relative flex flex-col gap-4 px-4 sm:gap-5 sm:px-6">
                                <div className="flex flex-col gap-3">
                                    <div className="flex w-full flex-row items-center gap-3">
                                        <AvatarLabelGroup
                                            size="md"
                                            src="https://www.untitledui.com/images/avatars/candice-wu?fm=webp&q=80"
                                            title="Candice Wu"
                                            subtitle="candice@untitledui.com"
                                        />
                                        <Button size="sm" color="link-destructive" className="ml-auto">
                                            Remove
                                        </Button>
                                    </div>
                                    <div className="flex w-full flex-row items-center gap-3">
                                        <AvatarLabelGroup size="md" initials="DW" title="Demi Wilkinson" subtitle="demi@untitledui.com" />
                                        <Button size="sm" color="link-destructive" className="ml-auto">
                                            Remove
                                        </Button>
                                    </div>
                                    <div className="flex w-full flex-row items-center gap-3">
                                        <AvatarLabelGroup
                                            size="md"
                                            src="https://www.untitledui.com/images/avatars/drew-cano?fm=webp&q=80"
                                            title="Drew Cano"
                                            subtitle="drew@untitledui.com"
                                        />
                                        <Button size="sm" color="link-destructive" className="ml-auto">
                                            Remove
                                        </Button>
                                    </div>
                                </div>

                                <Select label="Team member" placeholder="Select team member" placeholderIcon={User01} size="md" items={people}>
                                    {(item) => (
                                        <Select.Item key={item.id} id={item.id} avatarUrl={item.avatarUrl}>
                                            {item.label}
                                        </Select.Item>
                                    )}
                                </Select>
                            </div>
                            <div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 *:grow sm:grid sm:grid-cols-2 sm:px-6 sm:pt-8 sm:pb-6">
                                <Button color="secondary" size="lg" onClick={() => setIsOpen(false)}>
                                    Cancel
                                </Button>
                                <Button color="primary" size="lg" onClick={() => setIsOpen(false)}>
                                    Done
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </AriaDialogTrigger>
    );
};
