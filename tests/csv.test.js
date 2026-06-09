'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const { CsvOrderWriter, stringifyCsvRow } = require('../lib/csv');

async function makeTempDir() {
    return fs.mkdtemp(path.join(os.tmpdir(), 'wa-order-parser-'));
}

describe('csv', () => {
    it('creates UTF-8 BOM file with headers and appends rows', async () => {
        const dir = await makeTempDir();
        const csvPath = path.join(dir, 'orders.csv');
        const writer = new CsvOrderWriter({ csvPath, csvDelimiter: ';' });

        await writer.appendRows([
            [
                '2026-06-09 12:00:00',
                '77001234567',
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
                'msg-2',
                'Другой товар',
                '',
                '',
                '',
                '',
            ],
        ]);

        const content = await fs.readFile(csvPath, 'utf8');

        expect(content.startsWith('\ufeff')).to.equal(true);
        expect(content.match(/Дата и время/g)).to.have.length(1);
        expect(content).to.include('Товар;2;1500;KZT;3000');
        expect(content).to.include('Другой товар;;;;');
    });

    it('escapes delimiters, quotes and newlines', () => {
        expect(
            stringifyCsvRow(['A;B', 'A "quote"', 'A\nB', 'plain'], ';'),
        ).to.equal('"A;B";"A ""quote""";"A\nB";plain');
    });
});
