# ZPROP tools

A bilingual BM/EN tools portal. The homepage and `landing.html` show the phone landing design, with links to all six dedicated tools. The static-site creator is at `tools/host-html.html`. Property listings and property search are no longer part of the interface.

## Run

```sh
npm install
npm start
```

Open **http://localhost:4173**. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. Copy `.env.example` to `.env` for SMTP so users can reset a password or change their email; `npm start` loads that file when present. Playwright tests do not read `.env`.

Sign-in and all tools require the Node server. Open http://localhost:4173. Serving files directly through Laragon/Apache does not enforce server authentication; route the app through this server and keep private storage outside any separate static web root.

Opening the sign-in page as a local HTML file automatically takes you to http://localhost:4173/sign-in.html before entering credentials. Local static previews (including Laragon `.test` addresses) also use this server when their account API is missing. The language, sign-up mode and selected tool are preserved. Keep `npm start` running while using the app.

## Accounts

Open `sign-in.html` and choose **Create account** with an email address and a password of 12–128 characters. Registration signs you in and returns you to the requested tool. Use **Sign out** in the header to revoke the session. All six tool pages and creation APIs require authentication. The homepage and shared sites, short links and file links remain public.

Accounts persist in the private `.accounts/` directory with salted scrypt password hashes. Random session tokens use HTTP-only, SameSite cookies and expire after seven days. Sessions are held in memory, so restarting the server requires signing in again. Authentication requests have origin checks and a limit of 30 unsuccessful attempts per IP per 15 minutes.

Forgot password and changing a profile email both send a 6-digit code. Reset completes after that code and a new 12–128 character password; an email change also needs the current password. Set `SMTP_HOST`, `SMTP_FROM`, and usually `SMTP_PORT`, `SMTP_USER` and `SMTP_PASS` on the host. The local example sender is `zproptech@gmail.com` (`smtp.gmail.com`). Use a Gmail App Password, never the normal mailbox password. Never commit SMTP passwords or log the codes. Without SMTP, sign-in still works; reset and email changes are rejected until mail is configured.

Keep one Node process: sessions and the item-creation queue are in memory.

Production mode uses `https://zprop.tech` for authentication origin checks and sets Secure session cookies for HTTPS. `AUTH_ORIGIN` can override the exact allowed origin. Do not expose `.accounts/` through Apache or another file server.

## Deploy on zprop.tech

The public domain is configured in `js/public-origin.js`. The publishing forms, copy buttons and open links use `https://zprop.tech/sites/<name>/` for websites and `https://zprop.tech/<name>` for short links and files. Uploaded-site previews use the app server so you can still preview uploads during development.

1. Point the DNS records for `zprop.tech` to your hosting server and configure an HTTPS certificate for that domain.
2. Deploy this Node app, install its dependencies with `npm ci --omit=dev`, and run `npm run start:production` under your hosting platform's process manager.
3. Proxy all requests for `https://zprop.tech` to the Node server, preserving the original Host. It listens on `127.0.0.1:4173` by default. Set `PORT` if your host assigns a port, and `HOST=0.0.0.0` if your container platform requires it. Terminate HTTPS at the proxy.
4. Configure the proxy to accept uploads up to 256 MiB and allow enough time for uploads and ZIP extraction. Keep `.accounts/`, `.generated-sites/` and `.short-links/` on persistent private storage across deployments, with backups. Use one Node process with the current in-memory session implementation.
5. Verify account creation, site publishing and opening a shared site while signed out through the public HTTPS domain. DNS and hosting must be connected before public links resolve to this app.

Serve the app through Node, including `/sites/` and all APIs, rather than uploading only the HTML files to a static host. Existing saved sites and links use the same paths after migration. Set SMTP on the host so members can reset a password or confirm an email change with a code; per-user storage quotas remain a separate feature.

## Static sites

- Upload an `.html` or `.zip` file, or switch to **Paste HTML**.
- ZIPs need `index.html` at the site root. A single enclosing directory is automatically removed. Use relative asset paths such as `./css/styles.css`.
- Uploads and total extracted contents are limited to 256 MiB, with at most 2,000 ZIP entries. The allowed extensions are listed beside the upload control.
- An optional URL name uses 3–50 lowercase letters, numbers or hyphens, starting and ending with a letter or number. Leaving it empty generates a random name. Existing names cannot be overwritten.
- **Create static site** saves the site and returns `/sites/<name>/` with a preview, open link and copy-link button. Sites persist across server restarts in `.generated-sites/`, which is excluded from version control and direct HTTP access.
- Relative CSS, classic JavaScript, images and linked HTML pages work. Generated documents use a CSP sandbox with scripts enabled but no same-origin privileges, network API calls, frames or form submissions. They cannot access dashboard storage or the parent document. ES modules and other features requiring a normal same-origin context are outside this sandbox's supported scope.
- The pasted-code preview is deliberately script-free; scripts run after site creation in the isolated generated page. Pasted HTML can also be downloaded as `index.html`.

Do not expose `.generated-sites/` through a separate file server; serve generated content through the sandboxed `/sites/` route. Public links use zprop.tech even during development; use the embedded preview to check local uploads before deployment.

ZIP processing uses [fflate](https://github.com/101arrowz/fflate), with metadata checks before extraction and processing in a worker. Creation requests are queued with a bounded backlog. ZIP paths, duplicate names, disallowed file types and size limits are checked on the server.

## Other tabs

**Short links** opens **Your short links**, with a saved-link library like Bio pages. Choose **Create short link**, enter a destination and an optional unique name, then create it. Use **Edit link** to change the destination or name; saving updates the existing record and keeps the Dashboard count unchanged. Changing the name retires the old URL. **Cancel editing** restores the saved values, unsaved changes prompt before leaving, and deletion requires confirmation. Links persist across reloads and sign-ins. The library and Dashboard receive live change notifications. `GET/POST /api/short-links` and `GET/PUT/DELETE /api/short-links/<name>` enforce account ownership, origins, shared name reservations and revision checks; file links cannot be edited through these endpoints. Older owned records use revision 1 until updated. Records without ownership remain excluded. The interface lives in `short-links-page.js` and `short-links-page.css`.

The **Dashboard** tab at `tools/dashboard.html` shows six summary cards and a **Links** section for the signed-in account. The section combines all categories into one list with a total, search, category filter, 20 rows per page, CSV export, creation shortcuts and open/copy/edit/delete actions where applicable. The total always includes all categories, even when the list is filtered. Confirming deletion removes the owned record and its hosted public link; previously downloaded files and external QR destinations are unaffected. Draft bio pages and vCards without public URLs are labelled accordingly. QR codes with web destinations can open/copy those destinations; other QR types can be reopened in their editor. Development links open on localhost; hosted links use zprop.tech.

Cards and the list share one committed snapshot from `GET /api/dashboard-links`. Account-scoped `GET /api/dashboard-events` server-sent events trigger an immediate refresh after successful creates, updates or deletions, including changes from another browser. Streams reconnect automatically, close when the tab is hidden, and revalidate the session. A 30-second refresh remains as a fallback. `DELETE /api/dashboard-links/<category>/<id>` checks authentication, origin and ownership and uses the existing revision check for QR records. Reads and mutations use the same queue to avoid partially written records. `GET /api/dashboard-stats` remains available for counts alone. Bio drafts and published pages each count once, QR edits do not create extra items, and deleting either removes it from the count. Short links, file links and static sites created from this version store ownership metadata. Older records without ownership cannot be assigned to an account and are excluded.

File link, Share vCards and Static site now open saved-item libraries matching Short links, with a Create button, empty state and account-owned records. File links support open, copy, download and confirmed deletion; static sites support open, copy and confirmed deletion. Their existing upload forms open after Create. The libraries use the dashboard snapshot and live events, so new items and deletions also update Dashboard counts.

New vCards save contact details privately in `.created-vcards/` through `POST /api/vcards`. They can be reopened, edited, downloaded and deleted. `GET/PUT/DELETE /api/vcards/<id>` checks ownership; updates and deletion check revisions. Editing preserves the item ID and count. Repeated creation of the same unedited card counts once. Older fingerprint-only records remain listed and deletable, but their contact details cannot be recovered. Back up `.created-vcards/` with the other private storage directories. The shared libraries live in `js/item-library.js`; vCard formatting and persistence live in `js/vcard-model.js` and `scripts/vcards.cjs`.

For local bio-page testing, the creation dialog link-name prefix and published copy/open links use the current localhost or loopback address and port (for example `http://localhost:4173/sites/my-bio/`). Hosted bio pages continue to use `https://zprop.tech`.

| Tool | Current functionality |
| --- | --- |
| Bio pages | Block editor with profiles, links, headings, text, images, dividers, social links and custom HTML; nine starter templates, live phone preview, HTML download and publishing |
| Short links | Saved short URLs, custom or random names, copy/open controls and working redirects |
| File link | Upload a PDF or Excel file and create a unique, persistent link with open/download/copy controls |
| vCards | Downloadable `.vcf` contact cards |
| QR Codes | URL, WhatsApp, Location, Event and Vcard QR codes with preview after creation, colors and PNG/SVG downloads |

BM/EN and light/dark preferences persist across the dashboard, sign-in and tool pages.

The Dashboard and all six tool pages share a collapsible sidebar. The menu button switches to an icon rail on desktop and hides the tool navigation on mobile; the choice persists across pages. The Profile tab stays at the bottom and opens account details with the signed-in email, account type and sign-out action. Close it with the same tab, its close button, Escape or a click outside. Profile details follow the selected language and theme.

Choose **Profile → Manage account** (`/tools/profile.html`) to update your email, password or profile photo. An email change sends a 6-digit code to the new address; the change completes only after that code and the current password are submitted. Password changes require the current password. Both keep your account ID and owned items, rotate the current session and revoke other sessions. Email addresses must be unique; passwords use 12–128 characters. Administrators can change their email without recreating the initial admin on restart. Manage account remain accessible when tool access is blocked.

Photos accept PNG/JPG/WEBP uploads up to 5 MB, are cropped to a 256px square PNG in the browser, and are checked and stored in private account storage. Preview, save, cancel and removal are supported. The avatar is served only to its signed-in owner and appears in the sidebar. `/api/auth/profile` supports authenticated GET/PATCH and `/api/auth/avatar` serves the photo. Account writes are serialized; a private recovery journal completes interrupted credential changes on restart. Back up the complete `.accounts/` directory including hidden files.

The authenticated dashboard and all six tool pages use the ZPROP TECH black, metallic gold and warm-white design system in `premium-ui.css`. Shared shells are generated by `scripts/build-tool-pages.cjs`; the prominent Total Links card and live category distribution come from `scripts/dashboard-summary-shell.cjs` and `dashboard-summary.js`. Mobile navigation scrolls horizontally to the active category. Theme controls remain keyboard accessible, sync across tabs, and respect reduced motion. Public content and generated QR/HTML canvases retain their own styling.

QR Codes is at `tools/qr-codes.html` and opens **Your QR codes**, with Create, Edit and Delete controls like Bio pages. Codes belong to the signed-in account and persist in private `.qr-codes/` storage across page reloads, sign-ins and server restarts. Choose URL, WhatsApp, Location, Event or Vcard, fill in the details and press **Create QR code** to save and display the preview. Reopen a saved code with **Edit**, make changes and press **Update QR code**. Changes do not appear in the preview until saved; **Cancel editing** restores the last saved values. Unsaved changes prompt before leaving. Deleting asks for confirmation and removes the saved record; previously downloaded static QR images still work. Download the updated PNG (512, 1024 or 2048 px) or SVG after editing to replace older files. WhatsApp uses a phone number with country code, Location opens Google Maps coordinates, Event stores its original timezone and stable iCalendar identity, and Vcard encodes a vCard 3.0 contact. Colors require dark modules on a lighter background; exports keep a four-module quiet zone. `GET/POST /api/qr-codes` and `GET/PUT/DELETE /api/qr-codes/<id>` enforce sessions, ownership, origins, payload validation and revision checks. Back up `.qr-codes/` alongside the other private storage directories. The build copies the pinned `qrcode-generator` dependency into `assets/vendor/qrcode.js`, with its MIT license alongside. Payloads live in `qr-model.js`, the editor and library in `qr-page.js` / `qr-page.css`, and persistence in `scripts/qr-codes.cjs`.

Short links are created through `POST /api/short-links` and resolve directly at `/<name>` with an HTTP 302 redirect (for example, `https://zprop.tech/test123`). Existing `/s/<name>` URLs still work, and their records also resolve at the shorter address. Names used by the app, such as `tools`, `assets`, `api` and `sites`, are reserved. Records persist in the private `.short-links/` directory across server restarts. Names are case-insensitive, existing names cannot be overwritten, and only HTTP(S) destinations without embedded credentials are accepted. The displayed domain is zprop.tech; arbitrary domains cannot be provisioned by typing into the form. The former configuration-only drafts need to be created once using **Create short link**.

## Maintain and verify

File links use the existing `tools/transfer-files.html` address. Upload one `.pdf`, `.xls` or `.xlsx` file, up to 50 MiB, then optionally enter a link name. `POST /api/file-links` stores the file bytes and metadata privately alongside the shared link registry. PDFs are served inline with byte-range support; Excel files are served as downloads with their original filenames. The explicit download link also downloads PDFs. File links and short links use the same atomic name reservation, so neither can overwrite the other, including simultaneous requests or case variations. Empty, oversized, unsupported and mismatched files are rejected. Failed uploads release their reserved names. Files and links survive server restarts; deletion remains separate work.

Edit `js/tools-catalog.js` for tool descriptions. `js/static-site.js` and `css/static-site.css` implement the site creator; `js/bio-page.js` and `css/bio-page.css` implement the bio editor; `js/tool-pages.js` implements the remaining editors. Server upload and serving logic lives in `scripts/static-sites.cjs` and `scripts/serve.cjs`.

Bio pages start in **Your bio pages**. Choose **Create bio page** and enter a required, unique link name before customizing. Pages belong to the signed-in account. **Save draft** persists editable content and images; **Publish page** makes the page public. Reopen a published page and use **Save changes** to update the same live URL. The link name is fixed after creation; the editor omits the rename field and the API rejects rename attempts. Delete a page from the list to remove its content and public link.

Every block starts minimized. Use the plus button in its header to expand its editing fields, and the minus button to minimize it again. Minimizing only affects the editor; the block remains visible on the page unless its status is Off. Blocks with validation errors expand automatically. Drag its handle with a mouse or touch to reorder, or focus the handle and use the up/down arrow keys. Up to 30 blocks are supported, with duplicate and remove controls. Raster images (PNG, JPG, WEBP and GIF) can be up to 5 MiB each and 20 MiB in total. Images are embedded in downloads and published pages. Unsaved changes are indicated in the editor and protected by a leave-page prompt.

**Your profile** is also a block, with its own photo, display name and introduction. Add it from **Add block**, move it anywhere, duplicate it or remove it; multiple profiles and pages without profiles are supported. Existing saved profiles become the first block when reopened, preserving their content and photos. A legacy page with 30 content blocks keeps all 30 plus its migrated profile. Its published HTML stays unchanged until **Save changes** is used.

`GET/POST /api/bio-pages` and `GET/PUT/DELETE /api/bio-pages/<name>` manage pages, with session, ownership, origin, name-collision and revision checks. Editable state and published HTML are atomically stored together in the private `.generated-sites/<name>/.bio.json` record. Keep this storage persistent. Public pages are served at `/sites/<name>/` without caching, so saved changes appear immediately. Managed bio pages cannot run scripts; their link buttons can open destinations in a new tab. Standalone static-site behavior is unchanged. Bio pages exported before the saved-page editor have no ownership records and remain standalone static sites; they are not automatically assigned to an account.

```sh
npm run build
npm test -- --workers=2
```

The build regenerates `index.html`, the six pages under `tools/`, and the overview page. Browser tests run in headless Microsoft Edge at desktop and mobile sizes. They cover site creation from pasted HTML and uploaded HTML/ZIP, relative assets and nested navigation, isolation, validation errors, URL conflicts, existing tools, translation and theme persistence. Screenshots are saved in `test-results/`. Test-created sites also remain in `.generated-sites/`.

Each bio block has an On/Off status switch. Off blocks remain editable and saved, but are omitted from the preview, HTML download, published page and public page metadata. Save draft to retain status changes privately; Publish page / Save changes applies them to the live page. Older blocks default to On.

Bio blocks lift while their drag handle is held and follow the mouse or finger. A dashed placeholder shows the drop position; neighboring blocks animate into their new positions. Drag near the screen edges to scroll, release to drop, or press Escape to restore the original order. Reduced-motion preferences disable the swap and drop animations.

Bio blocks start minimized. Add block shows all editable content fields before inserting the block, with required fields marked and validated. Profiles can include their photo and introduction immediately; images can include descriptions and captions. Appearance offers nine starter templates, including Poster, Event and Editorial layouts, while preserving content and the three social footer slots. The phone preview has a black bezel, subtle glow and hidden scrollbars with scrolling retained.

Custom HTML blocks support up to 20,000 characters of HTML and inline CSS, an optional accessible title and a height of 80–1,600 pixels. They render in isolated sandboxed frames in the editor, public page and HTML download; scripts, forms and nested frames are disabled. The server validates the block size and height, and the selected page layout persists with the saved state.

## Admin workspace

The admin header offers BM/BI and a dark/light theme switch. Choices are saved using the same language and theme preferences as the rest of ZPROP. Charts, filters, account actions, dialogs and CSV headings follow the selected language.

Total users counts registered non-admin accounts from private account storage, including restricted users, independently of the period and tool filters. The dashboard shows the record-check timestamp and administrator count separately. Historical test accounts can be preserved outside live reporting with `node scripts/archive-test-accounts.cjs --apply`; its preview reports exact known fixture formats, including UUID-only QR ownership accounts and historical UI previews. Accounts are archived with a manifest, not deleted. Keep local server logs outside `test-results/`, which Playwright clears when tests start.

Open `/admin` or `/admin.html` on the Node server. The initial administrator is `farhan0701@gmail.com` with the initial password requested during setup. Signing in with this account opens the admin dashboard. Ordinary users cannot access admin pages or APIs. The password is salted and hashed in private account storage; it is never sent in a page or API response.

The dashboard provides signup totals and daily signup charts; 7-, 30- and 90-day usage charts with tool filters; totals for all six tools; a most-active-user ranking; searchable, sortable, paginated accounts; CSV export; independent tool/sign-in blocks and restore actions; and the latest 50 access changes. Reports refresh every 30 seconds while visible. Administrator accounts cannot be blocked through this interface.

A tool use means a successful create or save through a tool API (including repeated saves/downloads that use these APIs). Page views, reads, failed operations, deletions, and administrator actions are excluded. Historical actions before tracking was installed cannot be reconstructed. Reporting starts with the timestamp shown on the dashboard; older account signup dates are estimated from file creation dates and remain marked as estimates. Reports use Asia/Kuala_Lumpur (UTC+8). Existing public links remain published when their owner is restricted.

Sign-in blocks revoke all current sessions immediately. Tool blocks are enforced on tool documents and APIs, including already-signed-in users; an open tool shows the restriction on its next API call or session check. Restrictions survive restarts; all sessions follow the existing in-memory session lifecycle.

Back up `.admin/` (usage/access history and tracking start date) alongside `.accounts/` and the existing tool storage. Keep private storage on persistent disk. This file-backed server is intended to run as one Node process. `ADMIN_EMAIL` and `ADMIN_PASSWORD` in local `.env` create the first administrator if none exists. There is no default password in the source. Changing these later does not reset an existing administrator password. An existing regular account with the configured admin email causes startup to fail rather than silently granting it admin access. `ZPROP_ACCOUNTS_DIR` and `ZPROP_ADMIN_DIR` are optional private storage overrides used by the isolated admin tests.

Run `npx playwright test tests/admin.spec.js --workers=1` for desktop/mobile admin checks, including authorization, restart persistence, restrictions, charts, exports and access-management dialogs.

Automated Playwright tests now run on port 4174 with fresh accounts and admin history under private, ignored .test-data/ storage. They never reuse the live server on port 4173. Local-file preview tests intercept their fixed localhost URL and forward it to the isolated server. The one-time scripts/archive-test-accounts.cjs command previews recognized historical fixture accounts; --apply archives them under .accounts/.test-archive/ with a manifest. Archived accounts are preserved but excluded from signups, account lists, and usage reporting. Real accounts, including ordinary example.com addresses, are not filtered by email domain.

## Admin-only permissions

Administrator sessions are restricted to the admin dashboard. Opening the homepage, landing page, sign-in page, user tools, or the former /admin-account.html and /tools/profile.html settings pages redirects admins to the admin dashboard. Language and theme choices persist. Regular users retain their own profile page and tools.

User tool APIs, personal-dashboard APIs and its event stream reject administrator sessions with HTTP 403 and error userAccountRequired, before any tool operations are executed. Queued operations also recheck permissions. Admin sessions retain admin reporting, user access management, read-only profile information, session checks and sign-out. Admin photo, email and password changes through the profile API are rejected with HTTP 403 and error adminAccountLocked, including before queued changes execute. Sign out before registering or signing into a regular account; authenticating the same admin account remains supported. Public shared content stays viewable, and existing admin-owned content is preserved without granting tool access.

Role-separation and admin account-lock tests run against isolated test accounts and history. Existing account credentials and roles are preserved.
