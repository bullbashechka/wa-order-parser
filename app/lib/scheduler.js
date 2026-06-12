'use strict';

const cron = require('node-cron');
const { previousDayKey } = require('./time');
const { buildDay } = require('./dayBuilder');

// "06:00" -> "0 6 * * *"
function cronExpressionFromTime(generateTime) {
    const [hourPart, minutePart] = String(generateTime).split(':');
    const hour = Number(hourPart);
    const minute = Number(minutePart);
    if (
        !Number.isInteger(hour) ||
        !Number.isInteger(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        throw new Error(`Invalid GENERATE_TIME (expected HH:mm): ${generateTime}`);
    }
    return `${minute} ${hour} * * *`;
}

// Schedules daily document generation for the previous day. A failed run is logged
// and never stops order intake.
function startScheduler({ config, logger = console, runDay = buildDay } = {}) {
    const expression = cronExpressionFromTime(config.generateTime);
    const task = cron.schedule(
        expression,
        async () => {
            const day = previousDayKey(new Date(), config.timezone);
            logger.log(`Формирование документов за ${day}...`);
            try {
                await runDay(day, { config, logger });
            } catch (error) {
                logger.error(`Сбой формирования за ${day}:`, error.message);
            }
        },
        { timezone: config.timezone },
    );

    logger.log(
        `Планировщик: ежедневно в ${config.generateTime} (${config.timezone}).`,
    );
    return task;
}

module.exports = {
    startScheduler,
    cronExpressionFromTime,
};
