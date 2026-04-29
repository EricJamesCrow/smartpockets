export const SMARTPOCKETS_APP_PREVIEW_HOST_PATTERN_SOURCE = String.raw`smartpockets-app(?:-git)?-[a-z0-9-]+-crow-commerce\.vercel\.app`;

export const SMARTPOCKETS_APP_PREVIEW_HOST_PATTERN = new RegExp(`^${SMARTPOCKETS_APP_PREVIEW_HOST_PATTERN_SOURCE}$`);

export const SMARTPOCKETS_APP_PREVIEW_ORIGIN_PATTERN = new RegExp(`^https://${SMARTPOCKETS_APP_PREVIEW_HOST_PATTERN_SOURCE}$`);

export function isSmartPocketsAppPreviewHost(hostname: string) {
    return SMARTPOCKETS_APP_PREVIEW_HOST_PATTERN.test(hostname);
}

export function isSmartPocketsAppPreviewOrigin(origin: string) {
    try {
        const url = new URL(origin);

        return url.protocol === "https:" && isSmartPocketsAppPreviewHost(url.hostname);
    } catch {
        return false;
    }
}
