# VisitVise – Server 

Secured rebuild of the visitor-management API (Express 5, Mongoose 9, Node 20+).
**The old URLs keep working** (`/api/register`, `/login`, `/me`, `/visits`, `/pass/:code`, `/scan`, `/admin/data`), so the current React app still runs; everything new lives beside them.

## Run
```bash
cp .env.example .env     # set MONGO_URI, JWT_SECRET (>= 32 chars), APP_URL, SMTP_* (optional)
npm install
npm run migrate          # only if you have data from v1 (safe to re-run)
npm run create-admin -- "Your Name" you@example.com 'StrongPass123'
npm run dev              # http://localhost:3000       npm test -> 22 tests
```
No default admin exists any more. The first admin comes from `ADMIN_EMAIL` + a strong `ADMIN_PASSWORD` (created once on boot) or from `create-admin`.

## Security fixes
| # | Problem in v1 | Fix |
|---|---|---|
| 1 | Seeded `admin@example.com` / `Admin@123` | Removed. Strong password required; `npm run migrate` warns loudly if the old default is still active |
| 2 | Built client served from the wrong folder (`server/src/client/dist`) | `CLIENT_DIST` (default `../client/dist`) + SPA fallback |
| 3 | `Badge.jsx` vs `badge.jsx` import (breaks on Linux/CI) | Frontend fix, listed below |
| 4 | No rate limits / helmet; unlimited pass-code guessing | helmet, global / auth / pass / walk-in / gate limiters, login lockout (5 fails, 15 min), 10-character codes (50 bits), public pass view shows no email or phone |
| 5 | Visitor name / company injected into email HTML | Every value HTML-escaped |
| 6 | JWT in `localStorage`, 6-character passwords, no reset or verification | httpOnly cookie (Bearer still accepted for the old client), 8+ chars with letter and number, tokens die on password change or role change, reset and verify-email flows |
| 7 | "On site now" never cleaned up; past "expected" visits stayed forever | `no_show` and auto check-out (scheduler, every 5 min); stats now count today's reality |
| 8 | Server-local time; overnight windows rejected | Per-site IANA timezone; overnight and multi-day windows supported |
| 9 | Admin list returned everything; scans never shown; no `.env.example` | Pagination everywhere, scan log and audit log endpoints, `.env.example`, nodemon is a dev dependency |
| + | Guards had to be admins | New `security` role with only gate permissions |
| + | Role could be chosen at registration | Zod strips unknown keys; role is always `user` |
| + | Open CORS, no NoSQL guard, public uploads | CORS allow-list, operator stripping, private authorised file serving, magic-byte image checks |

## Roles
`user` (host) · `security` (guard: scan, check-in/out, walk-in, delivery, on-site list) · `admin` (everything, plus configuration).

## Features -> endpoints
| Feature | Endpoints |
|---|---|
| Guard role, QR / link / typed-code scanning, check-in **and check-out** by scan | `POST /api/gate/scan {code, area, mode: access\|checkout}` (also old `POST /api/scan`). `code` may be the QR link, the code, or `ABCD-2345` |
| QR + calendar invite in every pass email, SMS / WhatsApp (Twilio), `.ics` downloads | `GET /api/pass/:code/qr.svg`, `/ics`; `GET /api/visits/:id/ics`; `notifyVia: ["email","sms","whatsapp"]` |
| Lifecycle: `no_show`, overstay alerts, auto check-out, live "on site now" | scheduler (`src/jobs`), `GET /api/gate/onsite`, `GET /api/admin/rollcall` (roll-call with phones) |
| Edit / reschedule / resend, group invites, recurring and multi-day passes | `PATCH /api/visits/:id`, `POST /api/visits/:id/resend`, `POST /api/visits/group`, `POST /api/visits {repeat:{weekdays,until}}`, `endDate` |
| Walk-in with host approval | `GET /api/walkin/hosts?q=`, `POST /api/walkin` (photo optional), host decides via `POST /api/visits/:id/decision` or the emailed link `POST /api/approvals/:id/:token`; kiosk polls `GET /api/pass/:code` |
| Visitor photo + ID capture (private, ID deleted at check-out) | `POST /api/gate/visits/:id/photo`, `/id-document`, `GET /api/files/:bucket/:name`, `GET /api/pass/:code/photo` |
| Agreement / NDA and health declaration | `POST /api/pass/:code/agreement`, `/declaration`, `POST /api/gate/visits/:id/clear-declaration`; switched on per site |
| Admin-configurable areas, capacity, sensitive areas that need approval, blackout dates, opening hours, blocklist | `/api/admin/areas`, `/admin/sites`, `/admin/blocklist`, `GET /api/admin/approvals`, `POST /api/admin/visits/:id/approve-areas` |
| Real time | `GET /api/events` (Server-Sent Events: arrivals, refusals, walk-ins, overstays) |
| Analytics, CSV export, audit and scan logs | `GET /api/admin/analytics`, `/admin/export/visits\|scans`, `/admin/audit`, `/admin/scans`, `/admin/visits` |
| User management, multi-site | `/api/admin/users` (create guards/admins, disable, reset), `/api/admin/sites` |
| Notifications, delegate, webhooks (Slack / Teams / any URL, signed, SSRF-safe) | `/api/notifications`, `PUT /api/me/delegate`, `/api/admin/webhooks` |
| Host conveniences | `GET /api/visitors/suggest?q=` (returning-visitor autocomplete), `GET /api/visits?page&q&status&from&to` |
| Delivery fast lane, parking / vehicle | `POST /api/gate/delivery`, `PATCH /api/gate/visits/:id/vehicle`, `vehicle` on visits |
| Privacy | retention per site (auto-anonymise), `POST /api/admin/visits/:id/anonymise`, visitor "forget me" `POST /api/pass/:code/forget`, consent timestamp on walk-ins |

## What the frontend needs
* Auth now uses an httpOnly cookie: drop the `localStorage` token (the old one still works meanwhile). Add `credentials: 'include'` if the API is on another origin.
* Fix the `Badge.jsx` / `badge.jsx` import case, and add a **Vite dev proxy** (`/api` -> `http://localhost:3000`) — the old client had none, so `npm run dev` could not reach the API.
* Add: camera QR scanner (`BarcodeDetector` or html5-qrcode) on the Gate screen, guard view, walk-in kiosk and approval page (`/approve/:id/:token?d=approve`), edit / group / repeat forms, scan and audit tables, analytics charts, area / site / blocklist screens.
* `GET /api/visits` without `?page` still returns the plain array; with `?page` it returns `{items, pagination}`.

## Notes and limits
* Verified here: syntax of all files, **22 tests** (time windows incl. overnight and multi-day, recurrence, pass-code / QR parsing, calendar files, CSV and HTML escaping, SSRF guard, plus the real gate, policy and lifecycle code against an in-memory fake database), and that all 32 modules load with every import resolving. It was **not run against a live MongoDB, SMTP or Twilio** (no network in the build environment), so smoke-test login, scanning and the walk-in flow once.
* Server-Sent Events and the scheduler are in-process. With several instances use Redis pub/sub and run the scheduler from one instance (or cron).
* `GET /api/walkin/hosts` lists host names to kiosk users; set `KIOSK_KEY` (header `x-kiosk-key`) to restrict it to your kiosk devices.
* "Server Room" is seeded as a sensitive area (needs admin approval). Change it under `/api/admin/areas`.
* Existing pass codes (8 characters) keep working; new ones have 10.
* Rotate `JWT_SECRET` and any SMTP or database credentials that were in the shared zip.


# VisitPass – Frontend 

React 18 + Vite + Tailwind CSS 3 for the **visitvise-backend** v2. Glassmorphism UI, light / dark **theme toggle**, role-based screens, live updates.

## Run
```bash
# 1. backend (../visitvise-backend): npm install, copy .env.example to .env, npm run dev   -> http://localhost:3000
# 2. frontend:
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ -> the server serves ../client/dist, or set CLIENT_DIST in the server .env
```
The Vite dev server **proxies `/api` to the backend** (the old client had no proxy, so `npm run dev` could not reach the API). Same-origin means the httpOnly login cookie, the live event stream and the private images all work with no CORS setup. In production let the Express server serve `dist/` (it already does when `CLIENT_DIST` points at it).

## Design
* **Glass** surfaces over a gradient + floating-blob backdrop, soft shadows, animated toasts and result cards.
* **Theme toggle** (sun / moon) on every screen. It is saved in `localStorage`, applied before first paint (no flash) and follows the OS setting on the first visit.
* Responsive: sidebar on desktop, slide-over menu on phones; the scanner and kiosk are built for phones and tablets.
* Print stylesheet: the visitor badge and the roll-call list print cleanly (everything else is hidden).

## Screens
| Who | Screens |
|---|---|
| Visitor (no login) | **Pass page** `/pass/:code` (badge with QR and photo, live status, sign the agreement, health declaration, add to calendar, print, "erase my data"), **Walk-in kiosk** `/kiosk` (find the host, details, photo, wait for approval, get the badge; `?key=` for a kiosk device key), **Host approval link** `/approve/:id/:token` (one-tap approve / deny from the email) |
| Host (`user`) | Dashboard (today, on site, waiting for you, coming up; walk-in approvals), **Register a visitor** (returning-visitor autocomplete, several visitors at once, multi-day pass, repeat weekly, areas with 🔒 sensitive areas, vehicle, send by email / SMS / WhatsApp), My visitors (search, status tabs, edit / reschedule, resend, cancel), Visit detail (gate activity timeline, calendar file), Settings (profile, password, "cover for me" delegate) |
| Guard (`security`) | **Gate desk**: camera QR scanner (check-in / access or check-out, area picker, big green / red result with photo, health-flag clearing, session log), Expected today, **On site now** (live), photo / ID / vehicle capture, **courier fast lane** |
| Admin | Overview analytics (visits per day, busiest hours, areas, purposes, top hosts, no-show rate, avg visit), All visits (+ anonymise), **Restricted-area approvals**, Users (create guards / admins, roles, disable, reset), **Sites & policy** (hours, holidays, agreement text, health declaration, walk-in length, auto check-out, data retention), Areas (capacity, sensitive), Blocklist, Logs (gate scans + audit trail), Webhooks (Slack / Teams / signed JSON), Roll-call (printable) + CSV export |

Everyone also gets notifications (bell with live count) and **live toasts** for arrivals, refusals, walk-ins, overstays and no-shows.

## Notes
* The QR scanner uses `html5-qrcode` and needs **HTTPS or localhost** for camera access; the guard can always type the code (dashes and spaces are fine) or paste the pass link.
* Photo and ID capture open the device camera on phones and a file picker on desktops. ID images are deleted by the server at check-out.
* Verified in the build environment: all 39 source files parse (JSX), no undefined identifiers, every import and named export resolves, and all 83 API calls match a route in `visitvise-backend`. It could **not** be bundled or opened in a browser there (no network for `npm install`), so run it once and report anything odd.
