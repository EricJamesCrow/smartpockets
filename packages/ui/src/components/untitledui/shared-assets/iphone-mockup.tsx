"use client";

import { cx } from "../../../utils/cx";

interface IPhoneMockupProps {
    image?: string;
    imageDark?: string;
    className?: string;
    children?: React.ReactNode;
}

export const IPhoneMockup = ({ image, imageDark, className, children }: IPhoneMockupProps) => {
    return (
        <div className={cx("relative", className)}>
            {/* iPhone frame */}
            <div className="relative overflow-hidden rounded-[2.5rem] border-[8px] border-gray-800 bg-gray-800 shadow-xl dark:border-gray-700">
                {/* Dynamic Island */}
                <div className="absolute left-1/2 top-2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

                {/* Screen */}
                <div className="relative aspect-[9/19.5] w-full overflow-hidden rounded-[2rem] bg-gray-100 dark:bg-gray-900">
                    {image && (
                        <>
                            <img
                                src={image}
                                alt="App screenshot"
                                className={cx("h-full w-full object-cover", imageDark && "dark:hidden")}
                            />
                            {imageDark && (
                                <img
                                    src={imageDark}
                                    alt="App screenshot"
                                    className="hidden h-full w-full object-cover dark:block"
                                />
                            )}
                        </>
                    )}
                    {children}
                </div>
            </div>

            {/* Side button */}
            <div className="absolute -right-[3px] top-24 h-12 w-1 rounded-r bg-gray-800 dark:bg-gray-700" />
            {/* Volume buttons */}
            <div className="absolute -left-[3px] top-20 h-6 w-1 rounded-l bg-gray-800 dark:bg-gray-700" />
            <div className="absolute -left-[3px] top-32 h-10 w-1 rounded-l bg-gray-800 dark:bg-gray-700" />
            <div className="absolute -left-[3px] top-44 h-10 w-1 rounded-l bg-gray-800 dark:bg-gray-700" />
        </div>
    );
};
