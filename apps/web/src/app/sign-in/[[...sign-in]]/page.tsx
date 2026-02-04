import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <div className="bg-secondary flex min-h-screen items-center justify-center">
            <SignIn />
        </div>
    );
}
