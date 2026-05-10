"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Edit05, Trash01 } from "@untitledui/icons";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Dropdown } from "@repo/ui/untitledui/base/dropdown/dropdown";
import { cx } from "@/utils/cx";
import { truncate } from "@/utils/truncate";
import { RenameThreadDialog } from "./RenameThreadDialog";
import { DeleteThreadConfirm } from "./DeleteThreadConfirm";

interface ChatHistoryItemProps {
    threadId: string;
    title: string;
    isActive: boolean;
    summary?: string;
}

/**
 * A single chat thread row in the sidebar.
 *
 * Renders the thread Link with a kebab menu (UntitledUI Pro Dropdown) that
 * exposes Rename and Delete actions. Inline rename uses a small form that
 * temporarily replaces the Link. Delete opens a Modal confirm; if the active
 * thread is deleted, navigates back to "/" so the deleted thread does not
 * stay loaded in the chat pane.
 *
 * The dropdown's open state is owned locally per-instance — NOT lifted to the
 * parent. The parent renders this component twice per thread (once in the
 * desktop sidebar and once in the mobile sidebar, gated by responsive
 * `hidden`/`lg:hidden` classes). A single shared `openMenuId` would flip
 * BOTH instances open simultaneously, and because React Aria's `Popover`
 * portals into `document.body`, the mobile-instance popover renders fully
 * visible on desktop even though its `lg:hidden` parent isn't — that
 * produced the "two dropdowns" bug (CROWDEV-352). React Aria's
 * `MenuTrigger` auto-closes a menu on outside click, so the
 * "only one open at a time" UX still holds without lifted state.
 */
export function ChatHistoryItem({
    threadId,
    title,
    isActive,
    summary,
}: ChatHistoryItemProps) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const renameThread = useMutation(api.agent.threads.renameThread);
    const deleteThread = useMutation(api.agent.threads.deleteThread);
    const router = useRouter();

    const handleRename = async (newTitle: string) => {
        await renameThread({ threadId: threadId as Id<"agentThreads">, title: newTitle });
        setIsRenaming(false);
    };

    const handleDeleteConfirmed = async () => {
        await deleteThread({ threadId: threadId as Id<"agentThreads"> });
        setConfirmDeleteOpen(false);
        if (isActive) router.push("/");
    };

    const handleMenuAction = (key: React.Key) => {
        setIsMenuOpen(false);
        if (key === "rename") {
            setIsRenaming(true);
        } else if (key === "delete") {
            setConfirmDeleteOpen(true);
        }
    };

    if (isRenaming) {
        return (
            <li>
                <RenameThreadDialog
                    currentTitle={title}
                    onConfirm={handleRename}
                    onCancel={() => setIsRenaming(false)}
                />
            </li>
        );
    }

    return (
        <li
            className="group/item relative"
            data-test="sidebar-thread-row"
            data-test-thread-id={threadId}
            data-test-thread-title={title}
        >
            <Link
                href={`/${threadId}`}
                title={summary ?? title}
                aria-current={isActive ? "page" : undefined}
                className={cx(
                    "flex items-center gap-2 rounded-md pl-2 pr-8 py-1.5 text-sm transition-colors",
                    isActive
                        ? "bg-secondary text-primary dark:bg-[var(--sp-surface-panel-strong)]"
                        : "text-secondary hover:bg-secondary/50 hover:text-primary dark:hover:bg-white/5",
                )}
            >
                <span className="block truncate" data-test="sidebar-thread-title">
                    {truncate(title, 40)}
                </span>
            </Link>
            <div
                className={cx(
                    "absolute right-1 top-1/2 -translate-y-1/2 transition-opacity",
                    isMenuOpen
                        ? "opacity-100"
                        : "opacity-0 group-hover/item:opacity-100 focus-within:opacity-100",
                )}
            >
                <Dropdown.Root isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
                    <Dropdown.DotsButton
                        className="size-7 p-1"
                        aria-label={`Actions for ${title}`}
                        data-test="sidebar-thread-kebab"
                    />
                    <Dropdown.Popover className="w-min" placement="bottom right">
                        <Dropdown.Menu onAction={handleMenuAction}>
                            <Dropdown.Item id="rename" icon={Edit05} label="Rename" />
                            <Dropdown.Item id="delete" icon={Trash01} label="Delete" />
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown.Root>
            </div>
            <DeleteThreadConfirm
                open={confirmDeleteOpen}
                threadTitle={title}
                onConfirm={handleDeleteConfirmed}
                onCancel={() => setConfirmDeleteOpen(false)}
            />
        </li>
    );
}
