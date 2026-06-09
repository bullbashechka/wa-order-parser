'use strict';

const { expect } = require('chai');
const { loadConfig } = require('../lib/config');

describe('config', () => {
    it('uses defaults when environment values are absent', () => {
        expect(loadConfig({})).to.deep.equal({
            csvPath: 'orders.csv',
            csvDelimiter: ';',
            timezone: 'Asia/Almaty',
            processedMessagesPath: 'processed-messages.json',
        });
    });

    it('trims configured values', () => {
        expect(
            loadConfig({
                CSV_PATH: ' data/orders.csv ',
                CSV_DELIMITER: ',',
                TIMEZONE: ' UTC ',
                PROCESSED_MESSAGES_PATH: ' data/processed.json ',
            }),
        ).to.deep.equal({
            csvPath: 'data/orders.csv',
            csvDelimiter: ',',
            timezone: 'UTC',
            processedMessagesPath: 'data/processed.json',
        });
    });
});
