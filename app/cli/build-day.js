'use strict';

require('dotenv').config();

const { loadConfig } = require('../lib/config');
const { buildDay } = require('../lib/dayBuilder');

async function main() {
    const dayKey = process.argv[2];
    if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
        console.error('Использование: npm run build-day -- YYYY-MM-DD');
        process.exitCode = 1;
        return;
    }

    const config = loadConfig(process.env);
    await buildDay(dayKey, { config, logger: console });
}

main().catch((error) => {
    console.error('Ошибка build-day:', error);
    process.exitCode = 1;
});
