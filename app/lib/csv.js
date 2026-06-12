'use strict';

const fs = require('fs/promises');
const path = require('path');
const { dayKey } = require('./time');

const CSV_HEADERS = [
    'Дата и время',
    'Телефон',
    'Имя клиента',
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

// CSV parser that honours RFC-style quoting (fields may contain the delimiter,
// quotes, and newlines). Returns an array of rows, each an array of fields.
function parseCsv(content, delimiter) {
    let text = content;
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

    const rows = [];
    let field = '';
    let row = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
        } else if (ch === delimiter) {
            row.push(field);
            field = '';
        } else if (ch === '\r') {
            // ignore; handled by \n
        } else if (ch === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += ch;
        }
    }

    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
}

// Reads a day's orders.csv into an array of objects keyed by CSV_HEADERS.
// Missing file -> []. The header row is dropped.
async function readOrders(filePath, delimiter = ';') {
    let content;
    try {
        content = await fs.readFile(filePath, 'utf8');
    } catch (error) {
        if (error && error.code === 'ENOENT') return [];
        throw error;
    }

    const rows = parseCsv(content, delimiter);
    if (rows.length <= 1) return [];

    return rows
        .slice(1)
        .filter((cells) => cells.some((cell) => cell !== ''))
        .map((cells) => {
            const record = {};
            CSV_HEADERS.forEach((header, index) => {
                record[header] = cells[index] !== undefined ? cells[index] : '';
            });
            return record;
        });
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
    constructor({ outputDir, csvDelimiter, timezone = 'Asia/Almaty' }) {
        this.outputDir = outputDir;
        this.csvDelimiter = csvDelimiter;
        this.timezone = timezone;
    }

    dayDir(date = new Date()) {
        return path.join(this.outputDir, dayKey(date, this.timezone));
    }

    ordersPath(date = new Date()) {
        return path.join(this.dayDir(date), 'orders.csv');
    }

    async appendRows(rows) {
        return this.withRetries(async () => {
            const target = this.ordersPath();
            await this.ensureFile(target);
            const content = rows
                .map((row) => stringifyCsvRow(row, this.csvDelimiter))
                .join('\n');
            if (content) {
                await fs.appendFile(target, `${content}\n`, 'utf8');
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
            await fs.writeFile(filePath, `﻿${header}\n`, 'utf8');
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
    parseCsv,
    readOrders,
    stringifyCsvRow,
    stringifyCsvValue,
};
