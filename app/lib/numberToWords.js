'use strict';

const ONES_MASCULINE = [
    '',
    'один',
    'два',
    'три',
    'четыре',
    'пять',
    'шесть',
    'семь',
    'восемь',
    'девять',
];
const ONES_FEMININE = [
    '',
    'одна',
    'две',
    'три',
    'четыре',
    'пять',
    'шесть',
    'семь',
    'восемь',
    'девять',
];
const TEENS = [
    'десять',
    'одиннадцать',
    'двенадцать',
    'тринадцать',
    'четырнадцать',
    'пятнадцать',
    'шестнадцать',
    'семнадцать',
    'восемнадцать',
    'девятнадцать',
];
const TENS = [
    '',
    '',
    'двадцать',
    'тридцать',
    'сорок',
    'пятьдесят',
    'шестьдесят',
    'семьдесят',
    'восемьдесят',
    'девяносто',
];
const HUNDREDS = [
    '',
    'сто',
    'двести',
    'триста',
    'четыреста',
    'пятьсот',
    'шестьсот',
    'семьсот',
    'восемьсот',
    'девятьсот',
];

// Russian plural selection: forms = [one, few, many].
function pluralForm(n, forms) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
    return forms[2];
}

function tripletWords(num, feminine) {
    const words = [];
    const hundreds = Math.floor(num / 100);
    const tens = Math.floor((num % 100) / 10);
    const ones = num % 10;

    if (hundreds) words.push(HUNDREDS[hundreds]);

    if (tens === 1) {
        words.push(TEENS[ones]);
    } else {
        if (tens) words.push(TENS[tens]);
        if (ones) words.push((feminine ? ONES_FEMININE : ONES_MASCULINE)[ones]);
    }

    return words;
}

function integerToWords(value) {
    if (value === 0) return 'ноль';

    const triplets = [];
    let remaining = value;
    while (remaining > 0) {
        triplets.push(remaining % 1000);
        remaining = Math.floor(remaining / 1000);
    }

    const parts = [];
    for (let index = triplets.length - 1; index >= 0; index -= 1) {
        const triplet = triplets[index];
        if (triplet === 0) continue;

        const feminine = index === 1; // thousands group is feminine
        parts.push(...tripletWords(triplet, feminine));

        if (index === 1) {
            parts.push(pluralForm(triplet, ['тысяча', 'тысячи', 'тысяч']));
        } else if (index === 2) {
            parts.push(pluralForm(triplet, ['миллион', 'миллиона', 'миллионов']));
        } else if (index === 3) {
            parts.push(
                pluralForm(triplet, ['миллиард', 'миллиарда', 'миллиардов']),
            );
        }
    }

    return parts.join(' ');
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// Renders an amount as a Russian invoice "сумма прописью" in tenge/tiyn, e.g.
// 7000 -> "Семь тысяч тенге 00 тиын". Non-positive / non-finite -> '' (used when
// an invoice has no prices). Тенге and тиын are indeclinable here.
function amountToWords(amount) {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return '';

    const totalTiyn = Math.round(num * 100);
    const tenge = Math.floor(totalTiyn / 100);
    const tiyn = totalTiyn % 100;

    const tengeWords = capitalize(integerToWords(tenge));
    return `${tengeWords} тенге ${String(tiyn).padStart(2, '0')} тиын`;
}

module.exports = {
    amountToWords,
    integerToWords,
};
