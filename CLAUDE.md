# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`wa-order-parser` connects to WhatsApp Business via WhatsApp Web (`whatsapp-web.js`), listens for incoming cart/`order` messages, and appends each cart product as a row in `orders.csv`. It does not auto-reply, does not read chat history, and only processes events received while the process is running.

`PRD.md` is the authoritative spec (in Russian). When behavior is ambiguous, follow `PRD.md` — it defines exact CSV format, dedup, retry, timezone, and filtering rules that the code and tests are built against.

## Commands

```bash
npm start            # run the app (node index.js)
npm test             # run all mocha tests in tests/*.test.js
npx mocha tests/csv.test.js          # run a single test file
npx mocha tests/csv.test.js -g "name" # run tests matching a grep pattern
```

Background run uses `pm2 start index.js --name wa-order-parser`.

## Architecture

`index.js` is the only WhatsApp-aware entrypoint. It wires the `whatsapp-web.js` `Client` (with `LocalAuth`, session persisted to `.wwebjs_auth`) to the processing pipeline and serializes all messages through a single promise `queue` so carts are written one at a time, never concurrently.

The `lib/` modules are pure and have no `whatsapp-web.js` dependency, which is what makes them unit-testable in isolation:

- **`lib/config.js`** — reads `CSV_PATH`, `CSV_DELIMITER`, `TIMEZONE`, `PROCESSED_MESSAGES_PATH` from env with defaults; blank/whitespace values fall back to defaults.
- **`lib/orderProcessor.js`** — the core. `shouldProcessMessage` filters to `type === 'order'`, not `fromMe`, not group (`@g.us`), with a valid id. `handleMessage` skips already-processed ids, maps each product to a CSV row, writes all rows, then records the id. **Dedup is recorded only after a successful write** so a failed cart can be retried later.
- **`lib/csv.js`** — `CsvOrderWriter` writes UTF-8 **with BOM** (`﻿`) and `;` delimiter so Excel opens Cyrillic correctly. Creates the file + header row on first write (or if empty). `withRetries` retries failed writes 3 times at 0/500/1000ms.
- **`lib/processedMessages.js`** — `Set`-backed store persisted as a JSON array. On corrupt/invalid JSON it renames the file to `.bak` and continues with an empty set rather than crashing.
- **`lib/time.js`** — formats `YYYY-MM-DD HH:mm:ss` via `Intl.DateTimeFormat` in the configured timezone (default `Asia/Almaty`). This is the **processing time**, never the WhatsApp order creation time.

## Behavioral invariants (don't break these)

- CSV column order is fixed (see `CSV_HEADERS` in `lib/csv.js`); each product = one row; multiple products from one cart share the same date/phone/message-id.
- Price is written **as-is** from WhatsApp — never divide by 100, round, or reformat. Line total is `Number(quantity) * Number(price)`, left empty if either is missing or non-numeric.
- Phone is the chat id with the `@...` suffix stripped (e.g. `77001234567`).
- A write failure must log and continue without marking the message processed; it must not stop processing of later messages.

## Notes

- `lib/` is plain CommonJS, no build step, no linter configured in `package.json`. Node 18+ required (relies on `fs/promises`, `Intl` timezone formatting).
- `orders.csv`, `processed-messages.json`, `*.bak`, and `.wwebjs_auth/` are gitignored runtime artifacts.
- `whatsapp-web.js` is unofficial; the app is intentionally low-volume and not built for mass messaging or high-load production.
