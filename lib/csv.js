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
    constructor({ csvPath, csvDelimiter, timezone = 'Asia/Almaty' }) {
        this.csvPath = csvPath;
        this.csvDelimiter = csvDelimiter;
        this.timezone = timezone;
    }

    getDailyPath(date = new Date()) {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: this.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const parts = Object.fromEntries(
            formatter
                .formatToParts(date)
                .filter((p) => p.type !== 'literal')
                .map((p) => [p.type, p.value]),
        );
        const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
        const ext = path.extname(this.csvPath);
        const base = path.basename(this.csvPath, ext);
        const dir = path.dirname(this.csvPath);
        return path.join(dir, `${base}-${dateStr}${ext}`);
    }

    async appendRows(rows) {
        return this.withRetries(async () => {
            const dailyPath = this.getDailyPath();
            await this.ensureFile(dailyPath);
            const content = rows
                .map((row) => stringifyCsvRow(row, this.csvDelimiter))
                .join('\n');
            if (content) {
                await fs.appendFile(dailyPath, `${content}\n`, 'utf8');
            }
        });
    }

    async ensureFile(filePath) {
        const directory = path.dirname(filePath);
        if (directory && directory !== '.') {
            await fs.mkdir(directory, { recursive: true });
        }

        const exists = await fileExists(filePath);
        if (!exists || (await fs.stat(filePath)).size === 0) {
            const header = stringifyCsvRow(CSV_HEADERS, this.csvDelimiter);
            await fs.writeFile(filePath, `\ufeff${header}\n`, 'utf8');
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
