'use strict';

const fs = require('fs/promises');
const path = require('path');
const { formatDdMmYyyy } = require('./time');
const { sanitizeFilename } = require('./format');

// Groups a day's rows by phone, preserving first-appearance order (drives the
// daily №N numbering, with CSV row order as the deterministic tiebreak).
function groupByPhone(rows) {
    const groups = new Map();
    for (const row of rows) {
        const phone = String(row['Телефон'] || '').trim();
        if (!groups.has(phone)) {
            groups.set(phone, { phone, csvName: '', rows: [] });
        }
        const group = groups.get(phone);
        group.rows.push(row);
        const csvName = String(row['Имя клиента'] || '').trim();
        if (!group.csvName && csvName) group.csvName = csvName;
    }
    return [...groups.values()];
}

// Closes a day: reads its orders.csv and (re)builds expedition sheet + invoices.
// Deterministic and idempotent — safe to re-run. Dependencies are injectable for
// testing.
async function buildDay(dayKey, options = {}) {
    const {
        config,
        logger = console,
        readOrders = require('./csv').readOrders,
        loadClients = require('./clients').loadClients,
        resolveName = require('./clients').resolveName,
        buildInvoiceData = require('./invoice').buildInvoiceData,
        renderInvoice = require('./invoice').render,
        aggregateExpedition = require('./expedition').aggregate,
        renderExpedition = require('./expedition').render,
    } = options;

    const dayDir = path.join(config.outputDir, dayKey);
    const ordersPath = path.join(dayDir, 'orders.csv');
    const rows = await readOrders(ordersPath, config.csvDelimiter);

    if (rows.length === 0) {
        logger.log(`Нет заказов за ${dayKey}: документы не формируются.`);
        return { dayKey, orders: 0, invoices: 0, created: false };
    }

    const groups = groupByPhone(rows);
    const clientsDirectory = await loadClients(config.clientsPath, logger);
    const invoicesDir = path.join(dayDir, 'invoices');

    // Clear stale invoices so a regeneration reflects exactly the current CSV.
    await fs.rm(invoicesDir, { recursive: true, force: true });

    let invoicesCreated = 0;
    let number = 0;
    for (const group of groups) {
        number += 1;
        const clientName = resolveName(group.phone, group.csvName, clientsDirectory);
        try {
            const data = buildInvoiceData({
                number,
                clientName,
                dayKey,
                rows: group.rows,
                config,
            });
            const fileName = `Заказ №${number} от ${formatDdMmYyyy(dayKey)} — ${sanitizeFilename(clientName)}.xlsx`;
            await renderInvoice(data, path.join(invoicesDir, fileName));
            invoicesCreated += 1;
        } catch (error) {
            logger.error(
                `Ошибка формирования накладной №${number} (${clientName}):`,
                error.message,
            );
        }
    }

    try {
        const items = aggregateExpedition(rows);
        await renderExpedition(dayKey, items, path.join(dayDir, 'expedition.xlsx'));
    } catch (error) {
        logger.error(
            `Ошибка формирования экспедиционного листа за ${dayKey}:`,
            error.message,
        );
    }

    logger.log(
        `Сформированы документы за ${dayKey}: накладных ${invoicesCreated}, папка ${dayDir}`,
    );
    return {
        dayKey,
        orders: rows.length,
        invoices: invoicesCreated,
        created: true,
        dir: dayDir,
    };
}

module.exports = {
    buildDay,
    groupByPhone,
};
