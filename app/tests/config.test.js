'use strict';

const path = require('path');
const { expect } = require('chai');
const { loadConfig } = require('../lib/config');

const APP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..');

describe('config', () => {
    it('uses defaults when environment values are absent', () => {
        const config = loadConfig({});

        expect(config.csvDelimiter).to.equal(';');
        expect(config.timezone).to.equal('Asia/Almaty');
        expect(config.generateTime).to.equal('06:00');
        expect(config.companyName).to.equal('Моя организация');
        expect(config.invoiceCurrency).to.equal('KZT');
        expect(config.defaultUnit).to.equal('упак');

        // relative paths resolve against the app folder
        expect(config.outputDir).to.equal(path.join(APP_ROOT, 'data/days'));
        expect(config.processedMessagesPath).to.equal(
            path.join(APP_ROOT, 'data/processed-messages.json'),
        );
        expect(config.clientsPath).to.equal(path.join(APP_ROOT, 'clients.json'));
        expect(config.authPath).to.equal(path.join(REPO_ROOT, '.wwebjs_auth'));
    });

    it('trims configured values and resolves relative paths from app', () => {
        const config = loadConfig({
            CSV_DELIMITER: ',',
            TIMEZONE: ' UTC ',
            OUTPUT_DIR: ' out/days ',
            GENERATE_TIME: ' 07:30 ',
            COMPANY_NAME: ' ТОО Тест ',
            INVOICE_CURRENCY: ' KZT ',
            DEFAULT_UNIT: ' шт ',
        });

        expect(config.csvDelimiter).to.equal(',');
        expect(config.timezone).to.equal('UTC');
        expect(config.outputDir).to.equal(path.join(APP_ROOT, 'out/days'));
        expect(config.generateTime).to.equal('07:30');
        expect(config.companyName).to.equal('ТОО Тест');
        expect(config.invoiceCurrency).to.equal('KZT');
        expect(config.defaultUnit).to.equal('шт');
    });

    it('keeps absolute paths as-is', () => {
        const abs = path.resolve(REPO_ROOT, 'somewhere', 'days');
        const config = loadConfig({ OUTPUT_DIR: abs });
        expect(config.outputDir).to.equal(abs);
    });
});
