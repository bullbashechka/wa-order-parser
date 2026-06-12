'use strict';

const { expect } = require('chai');
const {
    dayKey,
    previousDayKey,
    formatRuLongDate,
    formatDdMmYyyy,
} = require('../lib/time');

describe('time', () => {
    it('computes the calendar day key in the given timezone', () => {
        expect(dayKey(new Date('2026-06-12T23:30:00Z'), 'UTC')).to.equal('2026-06-12');
        // Almaty is ahead of UTC, so a late-evening UTC instant is next day there.
        expect(dayKey(new Date('2026-06-12T19:30:00Z'), 'Asia/Almaty')).to.equal(
            '2026-06-13',
        );
    });

    it('computes the previous calendar day key', () => {
        expect(previousDayKey(new Date('2026-06-12T10:00:00Z'), 'UTC')).to.equal(
            '2026-06-11',
        );
        // month/year rollover
        expect(previousDayKey(new Date('2026-01-01T10:00:00Z'), 'UTC')).to.equal(
            '2025-12-31',
        );
    });

    it('formats Russian long and short dates from a day key', () => {
        expect(formatRuLongDate('2026-06-12')).to.equal('12 июня 2026 г.');
        expect(formatRuLongDate('2026-01-03')).to.equal('3 января 2026 г.');
        expect(formatDdMmYyyy('2026-06-12')).to.equal('12.06.2026');
    });
});
