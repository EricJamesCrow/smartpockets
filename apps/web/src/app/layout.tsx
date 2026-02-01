import "@repo/ui/globals.css";

export const metadata = {
  title: "Marketing Site",
  description: "Public marketing website",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
