import { isSmartPocketsAppPreviewHost } from "@repo/ui/utils/smartpockets-preview";

const DEFAULT_LOCAL_MARKETING_URL = "http://localhost:3001";
const DEFAULT_PREVIEW_MARKETING_URL = "https://preview.smartpockets.com";
const DEFAULT_PRODUCTION_MARKETING_URL = "https://smartpockets.com";
const DEFAULT_PRODUCTION_APP_URL = "https://app.smartpockets.com";

type AuthRoutingEnv = Partial<
    Record<
        | "NODE_ENV"
        | "VERCEL_ENV"
        | "NEXT_PUBLIC_LOCAL_MARKETING_URL"
        | "NEXT_PUBLIC_MARKETING_URL",
        string
    >
>;

export function getAuthHostUrl(env: AuthRoutingEnv = process.env) {
    if (env.NODE_ENV === "development") {
        return env.NEXT_PUBLIC_LOCAL_MARKETING_URL || DEFAULT_LOCAL_MARKETING_URL;
    }

    if (env.VERCEL_ENV === "preview") {
        return DEFAULT_PREVIEW_MARKETING_URL;
    }

    return env.NEXT_PUBLIC_MARKETING_URL || DEFAULT_PRODUCTION_MARKETING_URL;
}

export function buildAuthPageUrl(authHostUrl: string, pathname: "/sign-in" | "/sign-up") {
    return new URL(pathname, authHostUrl).toString();
}

export function isTrustedAppRedirectOrigin(origin: string) {
    if (origin === "http://localhost:3000") {
        return true;
    }

    if (origin === DEFAULT_PRODUCTION_APP_URL) {
        return true;
    }

    try {
        const url = new URL(origin);

        return url.protocol === "https:" && isSmartPocketsAppPreviewHost(url.hostname);
    } catch {
        return false;
    }
}

export function getSafeAppRedirectUrl(requestUrl: URL) {
    if (isTrustedAppRedirectOrigin(requestUrl.origin)) {
        return requestUrl.href;
    }

    return DEFAULT_PRODUCTION_APP_URL;
}

export function buildSignInRedirectUrl({ authHostUrl, requestUrl }: { authHostUrl: string; requestUrl: URL }) {
    const signInUrl = new URL(buildAuthPageUrl(authHostUrl, "/sign-in"));
    signInUrl.searchParams.set("redirect_url", getSafeAppRedirectUrl(requestUrl));

    return signInUrl;
}
