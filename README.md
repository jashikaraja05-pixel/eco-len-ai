# ECO-LENSAI / EcoLens AI

Waste classification and disposal guidance for Neural Storm 2026, Green Planet GP-05.

- Repository: https://github.com/jashikaraja05-pixel/eco-lens-waste
- Intended live URL: https://eco-lens-waste.lovable.app (provided by the owner; deployment/domain availability not verified by this audit).

## Architecture and technologies

React 19, TypeScript, TanStack Start/Router, TanStack Query, Vite, Tailwind CSS v4, shadcn/Radix controls, Zod and Vitest. The interface remains in `src/routes/index.tsx`; browser persistence is isolated in `src/lib/eco-store.ts` and secret-backed classification in `src/lib/classify.functions.ts`.

Dashboard, Scan Waste, History and Learn Hub are views of the public `/` route. Accounts, sessions and scans currently use **localStorage**, not a database. Accounts use `ecolens_users`; history uses `ecolens_scans_${normalizedEmail}`. The connected Lovable Cloud database has no public application tables, policies or table grants as of the read-only audit on November 5, 2026. There is no database-backed scan dashboard to query without a new data/auth migration, which this task deliberately did not perform.

## Setup

```sh
git clone https://github.com/jashikaraja05-pixel/eco-lens-waste
cd eco-lens-waste
bun install
cp .env.example .env
bun run dev
```

Set the public Lovable Cloud URL and publishable key in your local `.env` if using its integrations. Set `LOVABLE_API_KEY` as a server-only hosted secret, or in your private local environment for development. Never prefix private keys with `VITE_`, commit secrets, or print them. This audit did not change production credentials. Browser password hashing and camera access require HTTPS or localhost.

```sh
bun run test
bun run build
```

The managed editor performs frontend builds/type checks automatically. The server entry runs in the hosted serverless runtime; there is no separately started Python backend.

## AI workflow and API contract

1. Upload JPEG/PNG/WebP (maximum 10 MiB original file) or capture a camera frame.
2. Decode and resize in-browser to a maximum 768px side and encode as JPEG.
3. Call `classifyWaste({ data: { image } })` through TanStack's server-function protocol, not a hand-built REST URL.
4. Validate the base64 MIME/signature and maximum 8,000,000-character payload on the server. Image headers alone do not prove that an entire image is valid; the browser decoder and provider provide additional checks.
5. The AI Gateway SDK streams `openai/gpt-6-astra` Responses output internally; the interface waits for the complete validated assessment. Credentials stay server-side. No automatic inference replay is added.
6. Return either `{ status: "classified", result: { item, category, bin, confidence, reasoning, steps, source } }` or `{ status: "uncertain", message }`. Invalid JSON, unknown categories and invalid disposal steps are rejected, never converted into a guessed residual classification.
7. Confidence below **55%**, or absent confidence, produces uncertainty and is not saved. The exact 55% boundary is accepted. Model confidence is subjective, not calibrated accuracy.
8. Save only validated classified results to the signed-in browser profile. If saving fails, keep the visible assessment and report the storage failure separately.

Categories: Organic → Green; Recyclable → Blue; Hazardous → Red authorized hazardous collection; E-waste → Red authorized e-waste collection; Residual → Black. Check local rules: colors and accepted materials differ. Do not puncture, burn or dismantle hazardous items. The five dashboard counters retain the existing grouping (e-waste included in Hazardous); the distribution lists all five categories separately. Counts are genuine saved local scans, not fabricated database or environmental figures.

## Authentication and persistence limitations

Email/password profiles are browser-local and **not production authentication**. New passwords use salted PBKDF2-SHA256 (210,000 iterations). Existing plaintext accounts upgrade after a successful login; untouched legacy passwords remain until that login. No passwords are uploaded or migrated into Cloud. Anyone controlling browser storage can alter profiles, sessions or scans; hashing does not create a trusted server identity. There is no application email-verification workflow, cross-device sync, password recovery or server-enforced per-user access control. Do not use this local profile system to protect sensitive data.

History persists across logout/login in the same browser, unless site storage is cleared or unavailable. Quota failures are explicit and never silently trim old scans. Clearing/deleting also handles legacy history so deleted scans do not reappear. Deletion actions affect local browser data only; the audit did not delete production database data.

The classification endpoint is currently public at the application level and can incur AI charges without trusted Cloud authentication. Existing CSRF middleware is retained, but CSRF is not authentication or rate limiting. Production hardening requires a separately approved Cloud-auth/history migration and durable rate/usage controls. Adding a Cloud-auth requirement now would block all existing browser-only accounts, so it was not applied silently.

## MobileNetV3 and Python

No Python service, MobileNetV3 integration, trained waste-classification weights, evaluation dataset or backend test suite exists in this repository. Generic ImageNet weights would not establish a trained five-category waste model. No training, accuracy, speed or environmental savings claims are made. Do not present the AI Gateway classifier as MobileNetV3.

## Security and deployment

See `AUDIT.md` for verified results, dependency advisories and remaining work. The root `.gitignore` is protected in this editor, so it could not be changed. Before pushing source, manually add `.env`, `.env.*`, `!.env.example`, `.dev.vars.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `secrets/` and `credentials*.json` to it. Ignoring a file does not remove already tracked secrets; review repository tracking/history without changing production credentials during this task.

No deployment was triggered. Before publishing manually: resolve the documented authentication/abuse risks and dependency advisories, run tests and the frontend build, verify hosted secret configuration, test camera/scans on HTTPS, verify the intended domain, then publish through Lovable. A successful local preview is not proof of production readiness.
