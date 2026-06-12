'use strict';

const fs = require('fs/promises');
const path = require('path');
const ExcelJS = require('exceljs');
const { toNumber, formatAmount } = require('./format');
const { formatRuLongDate } = require('./time');
const { amountToWords } = require('./numberToWords');

const THIN_BORDER = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
};

// Builds the data model for a single client's invoice from that client's CSV rows.
// Same product name summed by quantity; prices kept as-is; line sum = qty * price.
function buildInvoiceData({ number, clientName, dayKey, rows, config }) {
    const map = new Map();

    for (const row of rows) {
        const name = String(row['Название товара'] || '').trim();
        if (!name) continue;

        const quantity = toNumber(row['Количество']);
        const price = toNumber(row['Цена']);
        const entry = map.get(name) || {
            name,
            quantity: 0,
            hasQuantity: false,
            price: null,
        };
        if (quantity !== null) {
            entry.quantity += quantity;
            entry.hasQuantity = true;
        }
        if (entry.price === null && price !== null) entry.price = price;
        map.set(name, entry);
    }

    let total = 0;
    let hasAnyPrice = false;
    const items = [...map.values()]
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map((entry) => {
            let sum = '';
            if (entry.hasQuantity && entry.price !== null) {
                sum = entry.quantity * entry.price;
                total += sum;
                hasAnyPrice = true;
            } else if (entry.price !== null) {
                hasAnyPrice = true;
            }
            return {
                name: entry.name,
                quantity: entry.hasQuantity ? entry.quantity : '',
                unit: config.defaultUnit,
                price: entry.price !== null ? entry.price : '',
                sum,
            };
        });

    const totalValue = hasAnyPrice ? total : '';

    return {
        number,
        title: `Заказ клиента №${number} от ${formatRuLongDate(dayKey)}`,
        company: config.companyName,
        client: clientName,
        items,
        itemCount: items.length,
        total: totalValue,
        currency: config.invoiceCurrency,
        totalInWords: hasAnyPrice ? amountToWords(total) : '',
    };
}

function quantityCell(item) {
    const unit = item.unit ? ` ${item.unit}` : '';
    if (item.quantity === '' || item.quantity === undefined) {
        return item.unit || '';
    }
    return `${item.quantity}${unit}`;
}

async function render(data, outPath) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Накладная');
    sheet.columns = [
        { width: 6 }, // №
        { width: 46 }, // Товары
        { width: 14 }, // Кол-во
        { width: 14 }, // Цена
        { width: 16 }, // Сумма
    ];

    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = data.title;
    sheet.getCell('A1').font = { bold: true, size: 14 };

    sheet.getCell('A3').value = 'Исполнитель:';
    sheet.mergeCells('B3:E3');
    sheet.getCell('B3').value = data.company;
    sheet.getCell('B3').font = { bold: true };

    sheet.getCell('A4').value = 'Заказчик:';
    sheet.mergeCells('B4:E4');
    sheet.getCell('B4').value = data.client;

    const headerRowIndex = 6;
    const headerRow = sheet.getRow(headerRowIndex);
    headerRow.values = ['№', 'Товары', 'Кол-во', 'Цена', 'Сумма'];
    headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.border = THIN_BORDER;
        cell.alignment = { horizontal: 'center' };
    });

    data.items.forEach((item, index) => {
        const row = sheet.getRow(headerRowIndex + 1 + index);
        row.values = [
            index + 1,
            item.name,
            quantityCell(item),
            formatAmount(item.price),
            formatAmount(item.sum),
        ];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            if (colNumber > 5) return;
            cell.border = THIN_BORDER;
            if (colNumber === 4 || colNumber === 5) {
                cell.alignment = { horizontal: 'right' };
            }
        });
    });

    let cursor = headerRowIndex + 1 + data.items.length + 1;

    const totalLabel = sheet.getCell(`D${cursor}`);
    totalLabel.value = 'Итого:';
    totalLabel.font = { bold: true };
    totalLabel.alignment = { horizontal: 'right' };
    const totalValueCell = sheet.getCell(`E${cursor}`);
    totalValueCell.value = formatAmount(data.total);
    totalValueCell.font = { bold: true };
    totalValueCell.alignment = { horizontal: 'right' };
    cursor += 1;

    sheet.mergeCells(`A${cursor}:E${cursor}`);
    sheet.getCell(`A${cursor}`).value =
        `Всего наименований ${data.itemCount}, на сумму ${formatAmount(data.total)} ${data.currency}`;
    cursor += 1;

    if (data.totalInWords) {
        sheet.mergeCells(`A${cursor}:E${cursor}`);
        const wordsCell = sheet.getCell(`A${cursor}`);
        wordsCell.value = data.totalInWords;
        wordsCell.font = { bold: true };
        cursor += 1;
    }

    cursor += 2;
    sheet.getCell(`A${cursor}`).value = 'Менеджер';
    sheet.getCell(`A${cursor}`).font = { bold: true };
    sheet.mergeCells(`B${cursor}:E${cursor}`);
    sheet.getCell(`B${cursor}`).border = { bottom: { style: 'thin' } };

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await workbook.xlsx.writeFile(outPath);
    return outPath;
}

module.exports = {
    buildInvoiceData,
    render,
};
