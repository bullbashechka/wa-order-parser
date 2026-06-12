'use strict';

const { expect } = require('chai');
const { toNumber, formatAmount, sanitizeFilename } = require('../lib/format');

describe('format', () => {
    it('parses only plain numeric values', () => {
        expect(toNumber('1500')).to.equal(1500);
        expect(toNumber('1500.50')).to.equal(1500.5);
        expect(toNumber('1 500')).to.equal(null);
        expect(toNumber('')).to.equal(null);
        expect(toNumber(undefined)).to.equal(null);
    });

    it('formats amounts with space thousands and comma decimals', () => {
        expect(formatAmount(7000)).to.equal('7 000,00');
        expect(formatAmount(1234567.5)).to.equal('1 234 567,50');
        expect(formatAmount(0)).to.equal('0,00');
        expect(formatAmount('')).to.equal('');
    });

    it('sanitizes file names but keeps spaces and hyphens', () => {
        expect(sanitizeFilename('ООО Ромашка/2')).to.equal('ООО Ромашка 2');
        expect(sanitizeFilename('ИП Иванов-Петров')).to.equal('ИП Иванов-Петров');
        expect(sanitizeFilename('')).to.equal('Клиент');
    });
});
