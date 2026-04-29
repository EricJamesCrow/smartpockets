const DEFAULT_LOCAL_APP_URL = "http://localhost:3000";
const DEFAULT_LOCAL_MARKETING_URL = "http://localhost:3001";
const DEFAULT_PREVIEW_APP_URL = "https://app.preview.smartpockets.com";
const DEFAULT_PREVIEW_MARKETING_URL = "https://preview.smartpockets.com";
const DEFAULT_PRODUCTION_APP_URL = "https://app.smartpockets.com";
const DEFAULT_PRODUCTION_MARKETING_URL = "https://smartpockets.com";

type AuthRoutingEnv = Partial<
    Record<
        | "NODE_ENV"
        | "VERCEL_ENV"
        | "NEXT_PUBLIC_APP_ORIGIN"
        | "NEXT_PUBLIC_APP_URL"
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

function normalizeOrigin(value: string | undefined, fallback: string) {
    if (!value) {
        return fallback;
    }

    try {
        return new URL(value).origin;
    } catch {
        return fallback;
    }
}

export function getAppOrigin(env: AuthRoutingEnv = process.env) {
    if (env.NODE_ENV === "development") {
        return normalizeOrigin(env.NEXT_PUBLIC_APP_ORIGIN, DEFAULT_LOCAL_APP_URL);
    }

    if (env.VERCEL_ENV === "preview") {
        return normalizeOrigin(env.NEXT_PUBLIC_APP_ORIGIN, DEFAULT_PREVIEW_APP_URL);
    }

    return normalizeOrigin(env.NEXT_PUBLIC_APP_ORIGIN || env.NEXT_PUBLIC_APP_URL, DEFAULT_PRODUCTION_APP_URL);
}

export function isTrustedAppRedirectOrigin(origin: string) {
    try {
        const url = new URL(origin);

        return (
            url.origin === DEFAULT_PRODUCTION_APP_URL ||
            url.origin === DEFAULT_PREVIEW_APP_URL ||
            url.origin === DEFAULT_LOCAL_APP_URL
        );
    } catch {
        return false;
    }
}

export function getSafeAppRedirectUrl(requestUrl: URL, env: AuthRoutingEnv = process.env) {
    const appUrl = new URL(getAppOrigin(env));
    appUrl.pathname = requestUrl.pathname;
    appUrl.search = requestUrl.search;
    appUrl.hash = requestUrl.hash;

    return appUrl.toString();
}

export function buildSignInRedirectUrl({
    authHostUrl,
    requestUrl,
    env = process.env,
}: {
    authHostUrl: string;
    requestUrl: URL;
    env?: AuthRoutingEnv;
}) {
    const signInUrl = new URL(buildAuthPageUrl(authHostUrl, "/sign-in"));
    signInUrl.searchParams.set("redirect_url", getSafeAppRedirectUrl(requestUrl, env));

    return signInUrl;
}
