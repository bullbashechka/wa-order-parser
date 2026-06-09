# Repository Guidelines

## Project Structure & Module Organization

This repository is being shaped into `wa-order-parser`, a Node.js app that listens for WhatsApp Business cart messages and writes order rows to CSV.

- `index.js` is the application entrypoint used by `npm start`.
- `lib/` contains app modules: configuration, CSV writing, order processing, processed-message storage, and time formatting.
- `tests/*.test.js` contains focused unit tests for the app modules.
- `PRD.md` is the product source of truth and implementation checklist.
- `.env.example` documents runtime configuration. Local `.env`, `.wwebjs_auth/`, CSV outputs, and processed-message files must not be committed.
- Legacy `src/`, `docs/`, `tools/`, and old WhatsApp Web library tests may exist during migration; do not add new app logic there.

## Build, Test, and Development Commands

```bash
npm install
```

Installs runtime and test dependencies. Required before QR rendering because `qrcode-terminal` is a dependency.

```bash
npm start
```

Runs `node index.js`, starts the WhatsApp Web client, and listens for new incoming `order` messages.

```bash
npm test
```

Runs Mocha tests matching `tests/*.test.js`.

```bash
node --check index.js lib/*.js tests/*.test.js
```

Performs a quick syntax check without starting WhatsApp/Puppeteer.

## Coding Style & Naming Conventions

Use CommonJS (`require`, `module.exports`) and strict mode. Keep two-space equivalent project formatting as expressed by the existing Prettier config: 4-space indentation, semicolons, and single quotes in JS. Prefer small modules with explicit exports. Use camelCase for variables/functions, PascalCase for classes, and descriptive test names.

## Testing Guidelines

Tests use Mocha, Chai, and Sinon. New tests should live in `tests/*.test.js` and cover behavior, not WhatsApp network calls. Mock WhatsApp messages and storage dependencies. At minimum, cover CSV escaping/BOM behavior, duplicate protection, order filtering, and error paths before changing parser logic.

## Commit & Pull Request Guidelines

Recent history uses concise imperative summaries, for example `Restructure into wa-order-parser application`. Keep commits focused and mention the affected behavior. Pull requests should include a short description, test results (`npm test`), configuration changes, and any manual WhatsApp verification performed. Link issues or PRD sections when relevant.

## Security & Configuration Tips

Never commit `.env`, `.wwebjs_auth/`, `orders.csv`, or `processed-messages.json`. Treat WhatsApp sessions as credentials. Do not add auto-replies, bulk messaging, or history scraping unless the PRD explicitly changes.
