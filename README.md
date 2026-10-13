# Image Archive

A functional version of the supplied Frame0 draft: black canvas, window frames, A/B collections, chapters, a calendar index, and an image viewer.

## Add images without editing code

1. Open the hosted site and sign in with your ChatGPT owner account.
2. Choose **Manage → Add images**.
3. Choose collection A or B, enter a chapter such as `T1.1`, and set the image date.
4. Drop several images onto the upload area or choose files. Titles are filled from filenames and can be changed before uploading.
5. Click **Upload images**. Images appear in the archive immediately; publishing the website again is unnecessary.

JPG, PNG, WebP, and AVIF are supported up to 25 MB per original. The browser creates a display copy up to 2,400 pixels and a thumbnail up to 700 pixels. Original bytes are preserved for downloading. Uploads run one at a time, with per-file results and retries for failures. Keep the page open until uploads finish.

**Manage → Library** edits titles, captions, dates, chapters, and collection assignments. Arrow buttons change order within the same collection, chapter, and date. Deletion requires confirmation. **Export image list** downloads metadata; download originals separately for an independent backup.

**Manage → Archive settings** changes entrance and collection text and optionally sets an additional archive password. Owner sign-in is required for every write operation. The password protects gallery data and image bytes; it does not grant management access.

## Storage and hosting

The hosted version uses Cloudflare D1 for metadata and R2 for originals, display images, and thumbnails. Images survive refreshes, browser changes, and future source deployments. Browser storage is not used as the image database.

The Site was created owner-private. Sign in once with the owner account before extending sharing: the first authenticated archive visit stores that account's Site-specific ID as the manager. Additional visitor access is controlled by the Sites sharing policy; setting an archive password does not change the audience. The archive starts empty because the supplied HTML contains design mockups, not actual collection photographs.

The original draft and the earlier `prototype-web` project are preserved outside this project. Image data in local previews and in the hosted site are separate.

## Development

Requires Node.js 22.13 or newer and npm.

```sh
npm run install:ci
npm run dev
npm run build
```

The Sites starter supports Windows, macOS, and Linux. `npm run dev` starts the local preview at port 5173. Local owner sign-in is simulated only for loopback development; the hosted site uses ChatGPT sign-in.

Database schema: `db/schema.ts`. Append migrations with `npm run db:generate`. Apply unapplied migrations to the local D1 database using the starter's local commands before previewing. Sites applies production migrations during deployment. Keep `.openai/hosting.json` and its project ID for later updates.

Local migration command after building:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_gorgeous_wendell_vaughn.sql
```

## Verification

`node node_modules/typescript/bin/tsc --noEmit` checks types. `scripts/verify-archive.mjs` exercises the local app using Playwright and installed Edge. Set `ARCHIVE_PLAYWRIGHT_PATH` to the available Playwright package if it is not installed in the project. It expects three test JPGs in `outputs/qa`, uses only the local preview database, and clears existing local images before the test. Run it only against a disposable local preview. It never connects to the production site.
