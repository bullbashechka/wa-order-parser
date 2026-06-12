'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const ExcelJS = require('exceljs');
const { buildInvoiceData, render } = require('../lib/invoice');

const config = {
    companyName: 'Моя организация',
    invoiceCurrency: 'KZT',
    defaultUnit: 'упак',
};

function row(name, quantity, price) {
    return { 'Название товара': name, Количество: quantity, Цена: price };
}

describe('invoice', () => {
    it('aggregates products, computes line sums and total, and sum in words', () => {
        const data = buildInvoiceData({
            number: 1,
            clientName: 'ИП Иванов',
            dayKey: '2026-06-12',
            rows: [row('Яблоки', '2', '1500'), row('Яблоки', '1', '1500'), row('Хлеб', '4', '1000')],
            config,
        });

        expect(data.title).to.equal('Заказ клиента №1 от 12 июня 2026 г.');
        expect(data.company).to.equal('Моя организация');
        expect(data.client).to.equal('ИП Иванов');
        expect(data.itemCount).to.equal(2);
        expect(data.currency).to.equal('KZT');

        const apples = data.items.find((i) => i.name === 'Яблоки');
        expect(apples.quantity).to.equal(3);
        expect(apples.sum).to.equal(4500);
        expect(data.total).to.equal(8500);
        expect(data.totalInWords).to.equal('Восемь тысяч пятьсот тенге 00 тиын');
    });

    it('builds an invoice with empty prices/total when prices are absent', () => {
        const data = buildInvoiceData({
            number: 2,
            clientName: 'ТОО Ромашка',
            dayKey: '2026-06-12',
            rows: [row('Молоко', '2', ''), row('Сок', '1', '')],
            config,
        });

        expect(data.itemCount).to.equal(2);
        expect(data.total).to.equal('');
        expect(data.totalInWords).to.equal('');
        expect(data.items[0].price).to.equal('');
        expect(data.items[0].sum).to.equal('');
    });

    it('renders an xlsx invoice matching the template structure', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-inv-'));
        const outPath = path.join(dir, 'invoice.xlsx');
        const data = buildInvoiceData({
            number: 1,
            clientName: 'ИП Иванов',
            dayKey: '2026-06-12',
            rows: [row('Яблоки', '1', '7000')],
            config,
        });
        await render(data, outPath);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(outPath);
        const sheet = workbook.worksheets[0];
        expect(sheet.getCell('A1').value).to.equal('Заказ клиента №1 от 12 июня 2026 г.');
        expect(sheet.getCell('A3').value).to.equal('Исполнитель:');
        expect(sheet.getCell('B3').value).to.equal('Моя организация');
        expect(sheet.getCell('A4').value).to.equal('Заказчик:');
        expect(sheet.getCell('B4').value).to.equal('ИП Иванов');
        expect(sheet.getCell('A6').value).to.equal('№');
        expect(sheet.getCell('C7').value).to.equal('1 упак');
        expect(sheet.getCell('E7').value).to.equal('7 000,00');
    });
});
