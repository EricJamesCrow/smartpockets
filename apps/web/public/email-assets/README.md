# Email assets

Static assets served for email templates. Referenced from
[packages/email/emails/_config/email-config.ts](../../../../packages/email/emails/_config/email-config.ts).

Expected files (both committed in W7.14 via design handoff):

- `logo.png`   1x, recommended 240 x 60
- `logo@2x.png` 2x retina, 480 x 120

**Before the first prod send** (spec §15 precondition 6):

1. Drop the PNGs in this directory.
2. Redeploy `apps/web`.
3. Curl the prod URL: `https://smartpockets.com/email-assets/logo.png` should
   return `200 image/png`.
4. Send a smoke weekly-digest to the design lead to confirm the logo renders
   across Gmail / Outlook / Apple Mail.
