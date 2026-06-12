'use strict';

const { expect } = require('chai');
const { cronExpressionFromTime } = require('../lib/scheduler');

describe('scheduler', () => {
    it('converts HH:mm into a daily cron expression', () => {
        expect(cronExpressionFromTime('06:00')).to.equal('0 6 * * *');
        expect(cronExpressionFromTime('07:30')).to.equal('30 7 * * *');
        expect(cronExpressionFromTime('23:59')).to.equal('59 23 * * *');
    });

    it('rejects invalid times', () => {
        expect(() => cronExpressionFromTime('24:00')).to.throw();
        expect(() => cronExpressionFromTime('6')).to.throw();
        expect(() => cronExpressionFromTime('aa:bb')).to.throw();
    });
});
