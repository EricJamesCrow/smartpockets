import { ClerkProvider } from "@clerk/nextjs";
import "@repo/ui/globals.css";
import "@repo/ui/theme.css";

export const metadata = {
  title: "SmartPockets - Smart Credit Card Management",
  description: "Organize your credit cards into wallets, track spending, and never miss a payment.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-primary text-primary antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
