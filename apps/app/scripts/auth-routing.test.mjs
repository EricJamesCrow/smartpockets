import assert from "node:assert/strict";

import {
    buildSignInRedirectUrl,
    getAppOrigin,
    getAuthHostUrl,
    isTrustedAppRedirectOrigin,
} from "../src/lib/auth-routing.ts";

function assertSignInRedirect({ env, requestUrl, expectedAuthUrl, expectedRedirectUrl }) {
    const signInUrl = buildSignInRedirectUrl({
        authHostUrl: getAuthHostUrl(env),
        requestUrl: new URL(requestUrl),
        env,
    });

    assert.equal(`${signInUrl.origin}${signInUrl.pathname}`, expectedAuthUrl);
    assert.equal(signInUrl.searchParams.get("redirect_url"), expectedRedirectUrl);
}

assertSignInRedirect({
    env: { NODE_ENV: "production", VERCEL_ENV: "preview" },
    requestUrl: "https://smartpockets-app-git-eric-crowdev-225-prev-b554f3-crow-commerce.vercel.app/settings/institutions?pane=items",
    expectedAuthUrl: "https://preview.smartpockets.com/sign-in",
    expectedRedirectUrl: "https://app.preview.smartpockets.com/settings/institutions?pane=items",
});

assertSignInRedirect({
    env: { NODE_ENV: "production", VERCEL_ENV: "production" },
    requestUrl: "https://app.smartpockets.com/transactions?edit=txn_123",
    expectedAuthUrl: "https://smartpockets.com/sign-in",
    expectedRedirectUrl: "https://app.smartpockets.com/transactions?edit=txn_123",
});

assertSignInRedirect({
    env: { NODE_ENV: "development" },
    requestUrl: "http://localhost:3000/dashboard",
    expectedAuthUrl: "http://localhost:3001/sign-in",
    expectedRedirectUrl: "http://localhost:3000/dashboard",
});

assert.equal(getAppOrigin({ NODE_ENV: "production", VERCEL_ENV: "preview" }), "https://app.preview.smartpockets.com");
assert.equal(getAppOrigin({ NODE_ENV: "production", VERCEL_ENV: "production" }), "https://app.smartpockets.com");
assert.equal(getAppOrigin({ NODE_ENV: "development" }), "http://localhost:3000");
assert.equal(isTrustedAppRedirectOrigin("https://app.preview.smartpockets.com"), true);
assert.equal(isTrustedAppRedirectOrigin("https://app.smartpockets.com"), true);
assert.equal(isTrustedAppRedirectOrigin("http://localhost:3000"), true);
assert.equal(
    isTrustedAppRedirectOrigin("https://smartpockets-app-git-eric-crowdev-225-prev-b554f3-crow-commerce.vercel.app"),
    false,
);
