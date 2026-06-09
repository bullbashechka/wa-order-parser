'use strict';

const fs = require('fs/promises');
const path = require('path');

const CSV_HEADERS = [
    'Дата и время',
    'Телефон',
    'ID сообщения',
    'Название товара',
    'Количество',
    'Цена',
    'Валюта',
    'Сумма позиции',
];

function stringifyCsvValue(value, delimiter) {
    const text = value === undefined || value === null ? '' : String(value);
    const shouldQuote =
        text.includes(delimiter) ||
        text.includes('"') ||
        text.includes('\n') ||
        text.includes('\r');

    if (!shouldQuote) return text;
    return `"${text.replace(/"/g, '""')}"`;
}

function stringifyCsvRow(values, delimiter) {
    return values.map((value) => stringifyCsvValue(value, delimiter)).join(delimiter);
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch (error) {
        if (error && error.code === 'ENOENT') return false;
        throw error;
    }
}

async function delay(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

class CsvOrderWriter {
    constructor({ csvPath, csvDelimiter }) {
        this.csvPath = csvPath;
        this.csvDelimiter = csvDelimiter;
    }

    async appendRows(rows) {
        return this.withRetries(async () => {
            await this.ensureFile();
            const content = rows
                .map((row) => stringifyCsvRow(row, this.csvDelimiter))
                .join('\n');
            if (content) {
                await fs.appendFile(this.csvPath, `${content}\n`, 'utf8');
            }
        });
    }

    async ensureFile() {
        const directory = path.dirname(this.csvPath);
        if (directory && directory !== '.') {
            await fs.mkdir(directory, { recursive: true });
        }

        const exists = await fileExists(this.csvPath);
        if (!exists || (await fs.stat(this.csvPath)).size === 0) {
            const header = stringifyCsvRow(CSV_HEADERS, this.csvDelimiter);
            await fs.writeFile(this.csvPath, `\ufeff${header}\n`, 'utf8');
        }
    }

    async withRetries(operation) {
        const waits = [0, 500, 1000];
        let lastError;

        for (const waitMs of waits) {
            if (waitMs > 0) await delay(waitMs);
            try {
                await operation();
                return;
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError;
    }
}

module.exports = {
    CSV_HEADERS,
    CsvOrderWriter,
    stringifyCsvRow,
    stringifyCsvValue,
};
