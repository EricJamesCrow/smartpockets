"use client";

import { cx } from "../../../../utils/cx";
import { User01, Zap } from "@untitledui/icons";

interface ChatCardProps {
    message: string;
    sender?: string;
    time?: string;
    isAi?: boolean;
    className?: string;
}

export const ChatCard = ({ message, sender = "User", time = "Just now", isAi = false, className }: ChatCardProps) => {
    return (
        <div
            className={cx(
                "relative flex w-[280px] flex-col gap-3 rounded-2xl p-4 shadow-lg backdrop-blur-sm",
                isAi ? "bg-white/90 text-gray-900 dark:bg-gray-800/90 dark:text-white" : "bg-brand-solid text-white",
                className
            )}
        >
            <div className="flex items-center gap-3">
                <div
                    className={cx(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        isAi ? "bg-brand-solid text-white" : "bg-white/20 text-white"
                    )}
                >
                    {isAi ? <Zap className="h-4 w-4" /> : <User01 className="h-4 w-4" />}
                </div>
                <div className="flex flex-col">
                    <span className={cx("text-xs font-semibold", isAi ? "text-gray-900 dark:text-white" : "text-white")}>{sender}</span>
                    <span className={cx("text-[10px]", isAi ? "text-gray-500 dark:text-gray-400" : "text-white/80")}>{time}</span>
                </div>
            </div>

            <p className={cx("text-sm leading-relaxed", isAi ? "text-gray-600 dark:text-gray-300" : "text-white/90")}>{message}</p>
        </div>
    );
};
