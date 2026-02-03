import { SignIn } from "@clerk/nextjs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.smartpockets.com";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <SignIn forceRedirectUrl={APP_URL} />
    </div>
  );
}
