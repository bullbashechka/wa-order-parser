'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const {
    CsvOrderWriter,
    readOrders,
    stringifyCsvRow,
} = require('../lib/csv');

async function makeTempDir() {
    return fs.mkdtemp(path.join(os.tmpdir(), 'wa-order-parser-'));
}

describe('csv', () => {
    it('creates UTF-8 BOM file with headers in a day folder and appends rows', async () => {
        const outputDir = await makeTempDir();
        const writer = new CsvOrderWriter({
            outputDir,
            csvDelimiter: ';',
            timezone: 'UTC',
        });

        await writer.appendRows([
            [
                '2026-06-09 12:00:00',
                '77001234567',
                'Иван',
                'msg-1',
                'Товар',
                2,
                '1500',
                'KZT',
                3000,
            ],
        ]);
        await writer.appendRows([
            [
                '2026-06-09 12:01:00',
                '77001234567',
                'Иван',
                'msg-2',
                'Другой товар',
                '',
                '',
                '',
                '',
            ],
        ]);

        const ordersPath = writer.ordersPath();
        expect(ordersPath.endsWith(path.join('orders.csv'))).to.equal(true);
        expect(path.basename(path.dirname(ordersPath))).to.match(/^\d{4}-\d{2}-\d{2}$/);

        const content = await fs.readFile(ordersPath, 'utf8');
        expect(content.charCodeAt(0)).to.equal(0xfeff);
        expect(content.match(/Имя клиента/g)).to.have.length(1);
        expect(content.match(/Дата и время/g)).to.have.length(1);
        expect(content).to.include('77001234567;Иван;msg-1;Товар;2;1500;KZT;3000');
        expect(content).to.include('Другой товар;;;;');
    });

    it('escapes delimiters, quotes and newlines', () => {
        expect(
            stringifyCsvRow(['A;B', 'A "quote"', 'A\nB', 'plain'], ';'),
        ).to.equal('"A;B";"A ""quote""";"A\nB";plain');
    });

    it('reads orders back into header-keyed records, handling quotes/BOM', async () => {
        const outputDir = await makeTempDir();
        const writer = new CsvOrderWriter({
            outputDir,
            csvDelimiter: ';',
            timezone: 'UTC',
        });

        await writer.appendRows([
            [
                '2026-06-09 12:00:00',
                '77001234567',
                'Имя; с разделителем',
                'msg-1',
                'Товар',
                2,
                '1500',
                'KZT',
                3000,
            ],
        ]);

        const records = await readOrders(writer.ordersPath(), ';');
        expect(records).to.have.length(1);
        expect(records[0]['Имя клиента']).to.equal('Имя; с разделителем');
        expect(records[0]['Телефон']).to.equal('77001234567');
        expect(records[0]['Название товара']).to.equal('Товар');
        expect(records[0]['Сумма позиции']).to.equal('3000');
    });

    it('returns [] for a missing orders file', async () => {
        const records = await readOrders(
            path.join(os.tmpdir(), 'does-not-exist-orders.csv'),
            ';',
        );
        expect(records).to.deep.equal([]);
    });
});
