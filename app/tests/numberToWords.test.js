'use strict';

const { expect } = require('chai');
const { amountToWords } = require('../lib/numberToWords');

describe('numberToWords', () => {
    it('renders the tenge/tiyn sum in words', () => {
        expect(amountToWords(7000)).to.equal('Семь тысяч тенге 00 тиын');
        expect(amountToWords(1)).to.equal('Один тенге 00 тиын');
        expect(amountToWords(1000)).to.equal('Одна тысяча тенге 00 тиын');
        expect(amountToWords(2000)).to.equal('Две тысячи тенге 00 тиын');
        expect(amountToWords(5000)).to.equal('Пять тысяч тенге 00 тиын');
    });

    it('handles tiyn (fractional) part', () => {
        expect(amountToWords(1500.5)).to.equal('Одна тысяча пятьсот тенге 50 тиын');
        expect(amountToWords(2500.99)).to.equal('Две тысячи пятьсот тенге 99 тиын');
    });

    it('returns empty string for zero / non-positive / invalid', () => {
        expect(amountToWords(0)).to.equal('');
        expect(amountToWords('')).to.equal('');
        expect(amountToWords(-5)).to.equal('');
        expect(amountToWords(undefined)).to.equal('');
    });
});
