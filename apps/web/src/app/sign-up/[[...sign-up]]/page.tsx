import { SignUp } from "@clerk/nextjs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.smartpockets.com";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <SignUp forceRedirectUrl={APP_URL} />
    </div>
  );
}
