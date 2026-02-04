import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { BillingContent } from "./billing-content";

export default function BillingPage() {
    return (
        <>
            <ClerkLoaded>
                <BillingContent />
            </ClerkLoaded>
            <ClerkLoading>
                <div className="flex items-center justify-center py-16">
                    <p className="text-tertiary">Loading billing information...</p>
                </div>
            </ClerkLoading>
        </>
    );
}
