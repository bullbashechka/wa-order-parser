'use strict';

const path = require('path');

// Repo root (one level above app/), used to default the WhatsApp session path so
// the existing root .wwebjs_auth session keeps working after the move into app/.
const APP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..');

const DEFAULT_CONFIG = {
    csvDelimiter: ';',
    timezone: 'Asia/Almaty',
    outputDir: 'data/days',
    processedMessagesPath: 'data/processed-messages.json',
    clientsPath: 'clients.json',
    generateTime: '06:00',
    companyName: 'Моя организация',
    invoiceCurrency: 'KZT',
    defaultUnit: 'упак',
    authPath: path.join(REPO_ROOT, '.wwebjs_auth'),
};

function valueOrDefault(value, fallback) {
    return typeof value === 'string' && value.trim() !== ''
        ? value.trim()
        : fallback;
}

// Relative paths are resolved against the app folder so they point at the same
// location whether the app is launched via `npm start` (cwd=app) or
// `node app/index.js` (cwd=repo root).
function resolveFromApp(value) {
    return path.isAbsolute(value) ? value : path.join(APP_ROOT, value);
}

function loadConfig(env = process.env) {
    return {
        csvDelimiter: valueOrDefault(env.CSV_DELIMITER, DEFAULT_CONFIG.csvDelimiter),
        timezone: valueOrDefault(env.TIMEZONE, DEFAULT_CONFIG.timezone),
        outputDir: resolveFromApp(
            valueOrDefault(env.OUTPUT_DIR, DEFAULT_CONFIG.outputDir),
        ),
        processedMessagesPath: resolveFromApp(
            valueOrDefault(
                env.PROCESSED_MESSAGES_PATH,
                DEFAULT_CONFIG.processedMessagesPath,
            ),
        ),
        clientsPath: resolveFromApp(
            valueOrDefault(env.CLIENTS_PATH, DEFAULT_CONFIG.clientsPath),
        ),
        generateTime: valueOrDefault(env.GENERATE_TIME, DEFAULT_CONFIG.generateTime),
        companyName: valueOrDefault(env.COMPANY_NAME, DEFAULT_CONFIG.companyName),
        invoiceCurrency: valueOrDefault(
            env.INVOICE_CURRENCY,
            DEFAULT_CONFIG.invoiceCurrency,
        ),
        defaultUnit: valueOrDefault(env.DEFAULT_UNIT, DEFAULT_CONFIG.defaultUnit),
        authPath: resolveFromApp(
            valueOrDefault(env.WWEBJS_AUTH_PATH, DEFAULT_CONFIG.authPath),
        ),
    };
}

module.exports = {
    DEFAULT_CONFIG,
    loadConfig,
};
