# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`wa-order-parser` connects to WhatsApp Business via WhatsApp Web (`whatsapp-web.js`), listens for incoming cart/`order` messages, and appends each cart product as a row in a **per-day** `orders.csv`. On a daily schedule (and on demand) it then closes the previous day: it reads that day's CSV and (re)builds an **expedition sheet** and per-client **invoices** as XLSX. It does not auto-reply, does not read chat history, and only ingests events received while the process is running.

The repo is a small monorepo: the root holds the vendored `whatsapp-web.js` source, and **the actual app lives in `app/`**. The root `package.json` just forwards `start`/`build-day`/`test` into `app/` (and `postinstall` installs `app/`'s deps).

`PRD.md` is the authoritative spec (in Russian). When behavior is ambiguous, follow `PRD.md` — it defines the exact CSV format, dedup, retry, timezone, grouping, numbering, and document-layout rules that the code and tests are built against.

## Commands

Run from the repo root (forwarded into `app/`) or from inside `app/`:

```bash
npm install                       # installs app/ deps (root postinstall → app/)
npm start                         # run the app: order intake + daily scheduler
npm run build-day -- 2026-06-25   # manually (re)build documents for one day
npm test                          # run all mocha tests in app/tests/*.test.js
```

Single test file / grep (from `app/`):

```bash
npx mocha tests/csv.test.js
npx mocha tests/csv.test.js -g "name"
```

Background run uses `pm2 start app/index.js --name wa-order-parser`.

## Dependencies

Runtime deps live in **`app/package.json`** (the root `package.json` has none — it only orchestrates). Node 18+ is required (`fs/promises`, `Intl` timezone formatting).

| Package | Used by | Why |
|---|---|---|
| `whatsapp-web.js` | `app/index.js` | WhatsApp Web client (`Client`, `LocalAuth`). The only WhatsApp-aware dependency. **Unofficial**, not affiliated with WhatsApp. |
| `qrcode-terminal` | `app/index.js` | Renders the link QR in the terminal on first auth. Loaded lazily inside the `qr` handler — a missing install logs but doesn't crash. |
| `node-cron` | `lib/scheduler.js` | Schedules the daily document build at `GENERATE_TIME` in the configured timezone. |
| `exceljs` | `lib/expedition.js`, `lib/invoice.js` | Writes the XLSX expedition sheet and invoices. |
| `dotenv` | `app/index.js`, `cli/build-day.js` | Loads `app/.env` at process start (only at the two entrypoints, not inside `lib/`). |

Dev deps (also in `app/package.json`): `mocha` (runner), `chai` (assertions), `sinon` (stubs/fakes). The `lib/` modules take their collaborators by injection so tests run without `whatsapp-web.js`, cron, or real files.

When you add or bump a dependency, edit **`app/package.json`** (not the root) and update this table.

## Architecture

`app/index.js` is the only WhatsApp-aware entrypoint. It wires the `whatsapp-web.js` `Client` (with `LocalAuth`, session persisted to `.wwebjs_auth` at the repo root by default) to the processing pipeline, starts the scheduler, and serializes all messages through a single promise `queue` so carts are written one at a time, never concurrently.

The `lib/` modules are pure and have no `whatsapp-web.js` dependency, which is what makes them unit-testable in isolation. The pipeline has two halves:

**Intake (live, per message):**

- **`lib/config.js`** — `loadConfig(env)` reads `CSV_DELIMITER`, `TIMEZONE`, `OUTPUT_DIR`, `PROCESSED_MESSAGES_PATH`, `CLIENTS_PATH`, `GENERATE_TIME`, `COMPANY_NAME`, `INVOICE_CURRENCY`, `DEFAULT_UNIT`, `WWEBJS_AUTH_PATH` with defaults; blank/whitespace values fall back to defaults. **Relative paths are resolved against `app/`** so they point at the same place whether launched via `npm start` (cwd=`app`) or `node app/index.js` (cwd=repo root).
- **`lib/orderProcessor.js`** — the core of intake. `shouldProcessMessage` filters to `type === 'order'`, not `fromMe`, not group (`@g.us`), with a valid id. `handleMessage` skips already-processed ids, captures the sender's display name (`resolveContactName`), maps each product to a CSV row, writes all rows, then records the id. **Dedup is recorded only after a successful write** so a failed cart can be retried later.
- **`lib/csv.js`** — `CsvOrderWriter` appends to `OUTPUT_DIR/<YYYY-MM-DD>/orders.csv` (day chosen by processing time in the configured timezone), creating the dir + UTF-8 **BOM** header row on first write. `withRetries` retries failed writes 3 times at 0/500/1000ms. Also exports `readOrders` / `parseCsv` (RFC-style quoting) used by the day build.
- **`lib/processedMessages.js`** — `Set`-backed store persisted as a JSON array. On corrupt/invalid JSON it renames the file to `.bak` and continues with an empty set rather than crashing.

**Close-of-day (scheduled or manual `build-day`):**

- **`lib/scheduler.js`** — `startScheduler` converts `GENERATE_TIME` (`HH:mm`) to a cron expression and, each day, calls `buildDay` for the **previous** day in the configured timezone. A failed build is logged and never stops order intake.
- **`lib/dayBuilder.js`** — `buildDay(dayKey)` reads that day's `orders.csv`, groups rows by phone (first-appearance order drives the daily №N numbering), resolves each client name, then writes invoices and the expedition sheet. Deterministic and **idempotent** — it wipes the day's `invoices/` first, so re-running reflects exactly the current CSV. All collaborators are injectable.
- **`lib/clients.js`** — loads the `clients.json` "phone → name" directory (missing/invalid file → empty, never throws). `resolveName` prefers the directory, then the captured pushname, then the bare phone.
- **`lib/expedition.js`** — `aggregate` sums quantities per product name (sorted, `ru` collation); `render` writes the expedition XLSX via `exceljs`.
- **`lib/invoice.js`** — `buildInvoiceData` builds one client's invoice model (qty summed per product, price kept as-is, line sum = qty × price, total + "сумма прописью"); `render` writes the invoice XLSX.
- **`lib/numberToWords.js`** — `amountToWords` renders an amount as a Russian invoice "сумма прописью" in тенге/тиын.
- **`lib/format.js`** — `toNumber` (strict numeric parse, no reformatting), `formatAmount` (`7000 → "7 000,00"`), `sanitizeFilename` (Windows/POSIX-safe invoice file names).
- **`lib/time.js`** — timezone-aware formatting via `Intl.DateTimeFormat` (default `Asia/Almaty`): `formatDateTime` (`YYYY-MM-DD HH:mm:ss`, the **processing time**, never the WhatsApp order creation time), `dayKey` / `previousDayKey`, and the `formatRuLongDate` / `formatDdMmYyyy` used in document titles and file names.

`cli/build-day.js` is the manual entrypoint: `npm run build-day -- YYYY-MM-DD` loads config and runs `buildDay` for that date.

## Behavioral invariants (don't break these)

- CSV column order is fixed (see `CSV_HEADERS` in `lib/csv.js`); each product = one row; multiple products from one cart share the same date/phone/message-id.
- Price is written **as-is** from WhatsApp — never divide by 100, round, or reformat at write time. Line total is `Number(quantity) * Number(price)`, left empty if either is missing or non-numeric. (Display formatting only happens later, in `format.js`, for the XLSX documents.)
- Phone is the chat id with the `@...` suffix stripped (e.g. `77001234567`).
- A write failure must log and continue without marking the message processed; it must not stop processing of later messages.
- Day documents are **deterministic and idempotent**: `buildDay` must be safe to re-run and must reflect exactly the current CSV (it clears `invoices/` before regenerating). Order intake must never be blocked by a failed build.

## Notes

- `lib/` is plain CommonJS, no build step, no linter configured. Entrypoints (`app/index.js`, `cli/build-day.js`) load `dotenv`; `lib/` modules never read env directly — they take a `config` object.
- The day output tree (`OUTPUT_DIR`, default `app/data/days/<date>/` with `orders.csv`, `expedition.xlsx`, `invoices/`), `processed-messages.json`, `*.bak`, and `.wwebjs_auth/` are gitignored runtime artifacts. `app/clients.json` is committed config.
- `whatsapp-web.js` is unofficial; the app is intentionally low-volume and not built for mass messaging or high-load production.
- Operator-facing docs (setup, env table, QR, pm2) live in `app/README.md`; keep that file in sync when env vars or commands change.
