'use strict';

require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const { loadConfig } = require('./lib/config');
const { CsvOrderWriter } = require('./lib/csv');
const { ProcessedMessagesStore } = require('./lib/processedMessages');
const { OrderProcessor } = require('./lib/orderProcessor');
const { startScheduler } = require('./lib/scheduler');

async function main() {
    const config = loadConfig(process.env);
    const csvWriter = new CsvOrderWriter(config);
    const processedMessages = new ProcessedMessagesStore(
        config.processedMessagesPath,
    );
    await processedMessages.load();

    const orderProcessor = new OrderProcessor({
        csvWriter,
        processedMessages,
        timezone: config.timezone,
        logger: console,
    });

    startScheduler({ config, logger: console });

    const client = new Client({
        authStrategy: new LocalAuth({ dataPath: config.authPath }),
    });

    let queue = Promise.resolve();

    client.on('qr', (qr) => {
        console.log('Scan this QR code in WhatsApp linked devices:');
        try {
            require('qrcode-terminal').generate(qr, { small: true });
        } catch (error) {
            console.error(
                'Cannot render QR code. Run npm install to install qrcode-terminal.',
            );
        }
    });

    client.on('ready', () => {
        console.log('WhatsApp client is ready.');
    });

    client.on('auth_failure', (message) => {
        console.error('WhatsApp authentication failed:', message);
    });

    client.on('disconnected', (reason) => {
        console.error('WhatsApp client disconnected:', reason);
    });

    client.on('message', (message) => {
        queue = queue
            .then(() => orderProcessor.handleMessage(message))
            .catch((error) => {
                console.error('Unexpected order processing error:', error);
            });
    });

    await client.initialize();
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Application startup failed:', error);
        process.exitCode = 1;
    });
}

module.exports = { main };
