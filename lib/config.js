'use strict';

const DEFAULT_CONFIG = {
    csvPath: 'orders.csv',
    csvDelimiter: ';',
    timezone: 'Asia/Almaty',
    processedMessagesPath: 'processed-messages.json',
};

function valueOrDefault(value, fallback) {
    return typeof value === 'string' && value.trim() !== ''
        ? value.trim()
        : fallback;
}

function loadConfig(env = process.env) {
    return {
        csvPath: valueOrDefault(env.CSV_PATH, DEFAULT_CONFIG.csvPath),
        csvDelimiter: valueOrDefault(
            env.CSV_DELIMITER,
            DEFAULT_CONFIG.csvDelimiter,
        ),
        timezone: valueOrDefault(env.TIMEZONE, DEFAULT_CONFIG.timezone),
        processedMessagesPath: valueOrDefault(
            env.PROCESSED_MESSAGES_PATH,
            DEFAULT_CONFIG.processedMessagesPath,
        ),
    };
}

module.exports = {
    DEFAULT_CONFIG,
    loadConfig,
};
