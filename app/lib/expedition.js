'use strict';

const fs = require('fs/promises');
const path = require('path');
const ExcelJS = require('exceljs');
const { toNumber } = require('./format');
const { formatRuLongDate } = require('./time');

const THIN_BORDER = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
};

// Aggregates day rows into expedition items: same product name summed by quantity,
// sorted by name. Unit is always empty (WhatsApp provides no unit of measure).
function aggregate(rows) {
    const map = new Map();

    for (const row of rows) {
        const name = String(row['Название товара'] || '').trim();
        if (!name) continue;

        const quantity = toNumber(row['Количество']);
        const entry = map.get(name) || { name, quantity: 0, hasQuantity: false };
        if (quantity !== null) {
            entry.quantity += quantity;
            entry.hasQuantity = true;
        }
        map.set(name, entry);
    }

    return [...map.values()]
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map((entry) => ({
            name: entry.name,
            quantity: entry.hasQuantity ? entry.quantity : '',
            unit: '',
        }));
}

async function render(dayKey, items, outPath) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Экспедиционный лист');
    sheet.columns = [
        { width: 6 },
        { width: 50 },
        { width: 12 },
        { width: 12 },
    ];

    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'Экспедиционный лист';
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:D2');
    sheet.getCell('A2').value = `Дата: ${formatRuLongDate(dayKey)}`;

    sheet.mergeCells('A3:D3');
    sheet.getCell('A3').value = `Всего позиций: ${items.length}`;

    const headerRowIndex = 5;
    const headerRow = sheet.getRow(headerRowIndex);
    headerRow.values = ['№', 'Товар', 'Кол-во', 'Ед. изм.'];
    headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.border = THIN_BORDER;
        cell.alignment = { horizontal: 'center' };
    });

    items.forEach((item, index) => {
        const row = sheet.getRow(headerRowIndex + 1 + index);
        row.values = [index + 1, item.name, item.quantity, item.unit];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber <= 4) cell.border = THIN_BORDER;
        });
    });

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await workbook.xlsx.writeFile(outPath);
    return outPath;
}

module.exports = {
    aggregate,
    render,
};
