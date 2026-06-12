'use strict';

const RU_MONTHS_GENITIVE = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
];

function zonedParts(date, timezone, options) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        ...options,
    });

    return Object.fromEntries(
        formatter
            .formatToParts(date)
            .filter((part) => part.type !== 'literal')
            .map((part) => [part.type, part.value]),
    );
}

function formatDateTime(date = new Date(), timezone = 'Asia/Almaty') {
    const parts = zonedParts(date, timezone, {
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

// Calendar day (YYYY-MM-DD) of a moment, in the given timezone.
function dayKey(date = new Date(), timezone = 'Asia/Almaty') {
    const parts = zonedParts(date, timezone, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    return `${parts.year}-${parts.month}-${parts.day}`;
}

// Calendar day (YYYY-MM-DD) immediately before `date`, in the given timezone.
function previousDayKey(date = new Date(), timezone = 'Asia/Almaty') {
    const [year, month, day] = dayKey(date, timezone).split('-').map(Number);
    // Use UTC noon so day arithmetic never lands on a DST gap.
    const dt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    dt.setUTCDate(dt.getUTCDate() - 1);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

function parseDayKey(key) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key).trim());
    if (!match) {
        throw new Error(`Invalid day key (expected YYYY-MM-DD): ${key}`);
    }
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

// "2026-06-12" -> "12 июня 2026 г."
function formatRuLongDate(dayKeyString) {
    const { year, month, day } = parseDayKey(dayKeyString);
    return `${day} ${RU_MONTHS_GENITIVE[month - 1]} ${year} г.`;
}

// "2026-06-12" -> "12.06.2026"
function formatDdMmYyyy(dayKeyString) {
    const { year, month, day } = parseDayKey(dayKeyString);
    return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
}

module.exports = {
    formatDateTime,
    dayKey,
    previousDayKey,
    formatRuLongDate,
    formatDdMmYyyy,
    RU_MONTHS_GENITIVE,
};
