'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const ExcelJS = require('exceljs');
const { aggregate, render } = require('../lib/expedition');

function row(name, quantity) {
    return { 'Название товара': name, Количество: quantity };
}

describe('expedition', () => {
    it('sums same products by quantity and sorts by name', () => {
        const items = aggregate([
            row('Яблоки', '3'),
            row('Бананы', '2'),
            row('Яблоки', '5'),
            row('Морковь', ''),
        ]);

        expect(items.map((i) => i.name)).to.deep.equal(['Бананы', 'Морковь', 'Яблоки']);
        const apples = items.find((i) => i.name === 'Яблоки');
        expect(apples.quantity).to.equal(8);
        expect(apples.unit).to.equal('');
        const carrot = items.find((i) => i.name === 'Морковь');
        expect(carrot.quantity).to.equal('');
    });

    it('renders an xlsx with title, date and items', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-exp-'));
        const outPath = path.join(dir, 'expedition.xlsx');
        await render('2026-06-12', aggregate([row('Яблоки', '8')]), outPath);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(outPath);
        const sheet = workbook.worksheets[0];
        expect(sheet.getCell('A1').value).to.equal('Экспедиционный лист');
        expect(String(sheet.getCell('A2').value)).to.include('12 июня 2026');
        expect(sheet.getCell('A5').value).to.equal('№');
        expect(sheet.getCell('B6').value).to.equal('Яблоки');
        expect(sheet.getCell('C6').value).to.equal(8);
    });
});
