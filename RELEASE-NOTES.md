# Fieldwork redesign, release candidate

This change preserves campaign creation in the left sidebar, spreadsheet imports, custom variables, the composer, delivery reports, and sender settings. The visual system uses forest green, pale green surfaces, lime workflow markers, and plain sans-serif text.

## Fixed

- Authentication errors now show a retry screen instead of an endless loading spinner.
- Protected campaign, contact, configuration, export, and sending endpoints with session authentication.
- Persistent Postgres-backed sessions, secure production cookies, session regeneration at login, and origin checks for cross-site writes.
- Removed database connection-string logging and the automatic known-password admin bootstrap. Existing admin accounts are unchanged.
- SMTP failures are no longer recorded as sent. Permanent authentication failures are not repeatedly retried.
- Sends are serialized in one server process so concurrent campaigns cannot bypass the configured daily cap there. Usage increments are atomic.
- An accepted message is not resent merely because usage accounting failed. Further sends pause in that process until the accounting issue is fixed and the service is restarted.
- New sender configurations default to an app cap of 150. Existing saved limits are preserved. Gmail's separate limits still apply.
- Blank composer defaults, send confirmation, destructive-import confirmation, correct resend content, and unfilled-variable checks.
- Spreadsheet replacement is transactional. Imports validate campaign identity, reject more than 1,000 rows, and retain custom columns.
- CSV and XLSX are supported. Legacy XLS was advertised but not correctly supported by the parser; it now gives an honest conversion instruction.
- Refreshed compatible dependencies. Production dependency audit reduced from 31 findings (1 critical, 22 high) to 11 (0 critical, 4 high). Remaining major-version migrations are deliberately not forced into this UI change.

## Verified locally

Clean `npm ci --ignore-scripts`, `npm test`, and `npm run build` pass. The tests include:

- TypeScript checking and production client/server builds.
- Mocked SMTP sends: concurrent daily cap, permanent rejection, authentication failure, no duplicate after accounting failure, unfilled variables.
- CSV/XLSX import, custom fields, duplicates, malformed email, unsupported file types.
- Mocked API routes: unauthenticated reads/sends blocked, individual/test/bulk failure handling.
- Real Chromium rendering at desktop and 390px phone width, no horizontal page overflow, campaign creation/selection, variables, preview, CSV upload, reports, settings, logs, login, and backend-offline state.

No real emails were sent. Screenshots use example.com demo data and are not live production records.

## Release checks still required

1. Finish GitHub sign-in with the owner's 2FA or use an owner-approved repository-scoped push route. Do not reuse another project's token.
2. Apply this patch to a fresh clone of the current default branch, not the local source-only baseline. Review any upstream changes before committing to a feature branch.
3. Confirm the existing Railway service points to this repository and check which branch auto-deploys. Check its build and database logs before diagnosing the live spinner.
4. Confirm Railway has a nonempty `SESSION_SECRET`. The new server intentionally refuses a production start without one. Do not display secrets or rotate an existing secret without planning session invalidation. A new session table is created in the existing database.
5. Confirm Netlify's existing `VITE_API_BASE_URL` points to the intended Railway API. Current production bundle uses `https://campus-email-automation-production.up.railway.app`. Netlify serves only the frontend.
6. Deploy only after the preceding checks. Verify health, admin login, session persistence, campaign reads, report reads, and rendered desktop/mobile UI on the live app. A real self-test email requires an approved self address; do not send to campaign recipients for testing.

## Known limits

SMTP app-password authentication is preserved and labeled honestly. This is not Google OAuth. The password is still stored by the existing database schema; an OAuth migration or encrypted credential storage needs a separate credential plan. The send queue remains process-local rather than durable across restarts. Keep one sending server instance. A multi-instance quota reservation and a durable/idempotent worker queue remain future work. Ambiguous network timeouts and deployment interruptions must be reconciled with mail logs before retrying a campaign. Third-party cookie restrictions can affect cross-site Netlify/Railway sessions on some browsers; test the owner's browser before calling the release ready.

Remaining high-severity dependency packages: drizzle-orm, nodemailer, zod, and zod-validation-error (via zod). Their fixes require deliberate version migration. The production build also warns about a JavaScript chunk over 500 kB.
