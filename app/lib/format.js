'use strict';

// Parses a raw price/quantity coming from WhatsApp/CSV into a finite number.
// Accepts plain numeric strings like "1500" or "1500.50"; returns null otherwise
// (e.g. "1 500", "", undefined). Never reformats or divides the value.
function toNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

// 7000 -> "7 000,00" (space thousands separator, comma decimal, 2 places).
// Empty/null/undefined -> '' (so absent prices render as blank, not "0,00").
function formatAmount(value) {
    if (value === '' || value === null || value === undefined) return '';
    const num = Number(value);
    if (!Number.isFinite(num)) return '';

    const fixed = num.toFixed(2);
    const negative = fixed.startsWith('-');
    const [intPart, decPart] = (negative ? fixed.slice(1) : fixed).split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${negative ? '-' : ''}${grouped},${decPart}`;
}

// Makes a string safe to use as a file name on Windows and POSIX. Keeps spaces
// and hyphens; replaces the reserved characters < > : " / \ | ? * with a space.
function sanitizeFilename(name) {
    const cleaned = String(name === undefined || name === null ? '' : name)
        .replace(/[<>:"/\\|?*]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned || 'Клиент';
}

module.exports = {
    toNumber,
    formatAmount,
    sanitizeFilename,
};
