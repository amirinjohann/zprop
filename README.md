# ZPROP tools

A bilingual BM/EN tools portal. The homepage and `landing.html` show the phone landing design, with links to all five dedicated tools. The static-site creator is at `tools/host-html.html`. Property listings and property search are no longer part of the interface.

## Run

```sh
npm install
npm start
```

Open **http://localhost:4173**. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

Sign-in and all tools require the Node server. Open http://localhost:4173. Serving files directly through Laragon/Apache does not enforce server authentication; route the app through this server and keep private storage outside any separate static web root.

Opening the sign-in page as a local HTML file automatically takes you to http://localhost:4173/sign-in.html before entering credentials. Local static previews (including Laragon `.test` addresses) also use this server when their account API is missing. The language, sign-up mode and selected tool are preserved. Keep `npm start` running while using the app.

## Accounts

Open `sign-in.html` and choose **Create account** with an email address and a password of 12–128 characters. Registration signs you in and returns you to the requested tool. Use **Sign out** in the header to revoke the session. All five tool pages and creation APIs require authentication. The homepage and shared sites, short links and file links remain public.

Accounts persist in the private `.accounts/` directory with salted scrypt password hashes. Random session tokens use HTTP-only, SameSite cookies and expire after seven days. Sessions are held in memory, so restarting the server requires signing in again. Authentication requests have origin checks and a limit of 30 unsuccessful attempts per IP per 15 minutes. Password reset and email verification are not configured.

Production mode uses `https://zprop.tech` for authentication origin checks and sets Secure session cookies for HTTPS. `AUTH_ORIGIN` can override the exact allowed origin. Do not expose `.accounts/` through Apache or another file server.

## Deploy on zprop.tech

The public domain is configured in `public-origin.js`. The publishing forms, copy buttons and open links use `https://zprop.tech/sites/<name>/` for websites and `https://zprop.tech/<name>` for short links and files. Uploaded-site previews use the app server so you can still preview uploads during development.

1. Point the DNS records for `zprop.tech` to your hosting server and configure an HTTPS certificate for that domain.
2. Deploy this Node app, install its dependencies with `npm ci --omit=dev`, and run `npm run start:production` under your hosting platform's process manager.
3. Proxy all requests for `https://zprop.tech` to the Node server, preserving the original Host. It listens on `127.0.0.1:4173` by default. Set `PORT` if your host assigns a port, and `HOST=0.0.0.0` if your container platform requires it. Terminate HTTPS at the proxy.
4. Configure the proxy to accept uploads up to 256 MiB and allow enough time for uploads and ZIP extraction. Keep `.accounts/`, `.generated-sites/` and `.short-links/` on persistent private storage across deployments, with backups. Use one Node process with the current in-memory session implementation.
5. Verify account creation, site publishing and opening a shared site while signed out through the public HTTPS domain. DNS and hosting must be connected before public links resolve to this app.

Serve the app through Node, including `/sites/` and all APIs, rather than uploading only the HTML files to a static host. Existing saved sites and links use the same paths after migration. Password recovery, email verification, per-user storage quotas and a site-management interface remain separate features.

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

For local bio-page testing, the link-name prefix and published copy/open links use the current localhost or loopback address and port (for example `http://localhost:4173/sites/my-bio/`). Hosted bio pages continue to use `https://zprop.tech`.

| Tool | Current functionality |
| --- | --- |
| Bio pages | Block editor with profile photos, links, headings, text, images and dividers; live phone preview, appearance controls, HTML download and publishing |
| Short links | Saved short URLs, custom or random names, copy/open controls and working redirects |
| File link | Upload a PDF or Excel file and create a unique, persistent link with open/download/copy controls |
| vCards | Downloadable `.vcf` contact cards |

BM/EN and light/dark preferences persist across the dashboard, sign-in and tool pages.

Short links are created through `POST /api/short-links` and resolve directly at `/<name>` with an HTTP 302 redirect (for example, `https://zprop.tech/test123`). Existing `/s/<name>` URLs still work, and their records also resolve at the shorter address. Names used by the app, such as `tools`, `assets`, `api` and `sites`, are reserved. Records persist in the private `.short-links/` directory across server restarts. Names are case-insensitive, existing names cannot be overwritten, and only HTTP(S) destinations without embedded credentials are accepted. The displayed domain is zprop.tech; arbitrary domains cannot be provisioned by typing into the form. The former configuration-only drafts need to be created once using **Create short link**.

## Maintain and verify

File links use the existing `tools/transfer-files.html` address. Upload one `.pdf`, `.xls` or `.xlsx` file, up to 50 MiB, then optionally enter a link name. `POST /api/file-links` stores the file bytes and metadata privately alongside the shared link registry. PDFs are served inline with byte-range support; Excel files are served as downloads with their original filenames. The explicit download link also downloads PDFs. File links and short links use the same atomic name reservation, so neither can overwrite the other, including simultaneous requests or case variations. Empty, oversized, unsupported and mismatched files are rejected. Failed uploads release their reserved names. Files and links survive server restarts; deletion remains separate work.

Edit `tools-catalog.js` for tool descriptions. `static-site.js` and `static-site.css` implement the site creator; `bio-page.js` and `bio-page.css` implement the bio editor; `tool-pages.js` implements the remaining editors. Server upload and serving logic lives in `scripts/static-sites.cjs` and `scripts/serve.cjs`.

Bio pages start in **Your bio pages**. Choose **Create bio page** and enter a required, unique link name before customizing. Pages belong to the signed-in account. **Save draft** persists editable content and images; **Publish page** makes the page public. Reopen a published page and use **Save changes** to update the same live URL. The link name can also be changed, which retires the old URL. Delete a page from the list to remove its content and public link.

Every block starts expanded. Use the minus button in its header to minimize its editing fields, and the plus button to expand it again. Minimizing only affects the editor; the block remains visible on the page unless its status is Off. Blocks with validation errors expand automatically. Drag its handle with a mouse or touch to reorder, or focus the handle and use the up/down arrow keys. Up to 30 blocks are supported, with duplicate and remove controls. Raster images (PNG, JPG, WEBP and GIF) can be up to 5 MiB each and 20 MiB in total. Images are embedded in downloads and published pages. Unsaved changes are indicated in the editor and protected by a leave-page prompt.

**Your profile** is also a block, with its own photo, display name and introduction. Add it from **Add block**, move it anywhere, duplicate it or remove it; multiple profiles and pages without profiles are supported. Existing saved profiles become the first block when reopened, preserving their content and photos. A legacy page with 30 content blocks keeps all 30 plus its migrated profile. Its published HTML stays unchanged until **Save changes** is used.

`GET/POST /api/bio-pages` and `GET/PUT/DELETE /api/bio-pages/<name>` manage pages, with session, ownership, origin, name-collision and revision checks. Editable state and published HTML are atomically stored together in the private `.generated-sites/<name>/.bio.json` record. Keep this storage persistent. Public pages are served at `/sites/<name>/` without caching, so saved changes appear immediately. Managed bio pages cannot run scripts; their link buttons can open destinations in a new tab. Standalone static-site behavior is unchanged. Bio pages exported before the saved-page editor have no ownership records and remain standalone static sites; they are not automatically assigned to an account.

```sh
npm run build
npm test -- --workers=2
```

The build regenerates `index.html`, the five pages under `tools/`, and the overview page. Browser tests run in headless Microsoft Edge at desktop and mobile sizes. They cover site creation from pasted HTML and uploaded HTML/ZIP, relative assets and nested navigation, isolation, validation errors, URL conflicts, existing tools, translation and theme persistence. Screenshots are saved in `test-results/`. Test-created sites also remain in `.generated-sites/`.

Each bio block has an On/Off status switch. Off blocks remain editable and saved, but are omitted from the preview, HTML download, published page and public page metadata. Save draft to retain status changes privately; Publish page / Save changes applies them to the live page. Older blocks default to On.

Bio blocks lift while their drag handle is held and follow the mouse or finger. A dashed placeholder shows the drop position; neighboring blocks animate into their new positions. Drag near the screen edges to scroll, release to drop, or press Escape to restore the original order. Reduced-motion preferences disable the swap and drop animations.
