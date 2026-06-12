'use strict';

const { formatDateTime } = require('./time');

function getMessageId(message) {
    return message && message.id && message.id._serialized
        ? message.id._serialized
        : undefined;
}

function isGroupChatId(chatId) {
    return typeof chatId === 'string' && chatId.endsWith('@g.us');
}

function cleanPhone(chatId) {
    if (typeof chatId !== 'string') return '';
    return chatId.replace(/@.+$/, '');
}

function isPresent(value) {
    return value !== undefined && value !== null && value !== '';
}

function calculateLineTotal(quantity, price) {
    if (!isPresent(quantity) || !isPresent(price)) return '';

    const quantityNumber = Number(quantity);
    const priceNumber = Number(price);

    if (!Number.isFinite(quantityNumber) || !Number.isFinite(priceNumber)) {
        return '';
    }

    return quantityNumber * priceNumber;
}

// Best-effort sender display name captured at receive time. Stored raw in the CSV
// so day documents can be built later without reconnecting to WhatsApp.
async function resolveContactName(message) {
    if (message && typeof message.getContact === 'function') {
        try {
            const contact = await message.getContact();
            if (contact) {
                const name =
                    contact.pushname || contact.name || contact.shortName || '';
                if (name) return String(name).trim();
            }
        } catch (error) {
            // fall through to notifyName / empty
        }
    }

    const notifyName = message && message._data && message._data.notifyName;
    return notifyName ? String(notifyName).trim() : '';
}

function productToRow({ processedAt, phone, clientName, messageId, product }) {
    const quantity = isPresent(product.quantity) ? product.quantity : '';
    const price = isPresent(product.price) ? product.price : '';
    const currency = isPresent(product.currency) ? product.currency : '';

    return [
        processedAt,
        phone,
        isPresent(clientName) ? String(clientName) : '',
        messageId,
        isPresent(product.name) ? String(product.name).trim() : '',
        quantity,
        price,
        currency,
        calculateLineTotal(quantity, price),
    ];
}

class OrderProcessor {
    constructor({ csvWriter, processedMessages, timezone, logger = console }) {
        this.csvWriter = csvWriter;
        this.processedMessages = processedMessages;
        this.timezone = timezone;
        this.logger = logger;
    }

    async handleMessage(message) {
        if (!this.shouldProcessMessage(message)) return false;

        const messageId = getMessageId(message);
        if (this.processedMessages.has(messageId)) {
            this.logger.log(`Skipping already processed order: ${messageId}`);
            return false;
        }

        try {
            const order = await message.getOrder();
            const products = Array.isArray(order && order.products)
                ? order.products
                : [];

            if (products.length === 0) {
                this.logger.error(`Order has no products: ${messageId}`);
                return false;
            }

            const processedAt = formatDateTime(new Date(), this.timezone);
            const phone = cleanPhone(message.from);
            const clientName = await resolveContactName(message);
            const rows = products.map((product) =>
                productToRow({ processedAt, phone, clientName, messageId, product }),
            );

            await this.csvWriter.appendRows(rows);
            await this.processedMessages.add(messageId);
            this.logger.log(
                `Order saved to CSV: ${phone}, products: ${rows.length}`,
            );
            return true;
        } catch (error) {
            this.logger.error(`Failed to save order ${messageId}:`, error);
            return false;
        }
    }

    shouldProcessMessage(message) {
        if (!message) return false;
        if (message.type !== 'order') return false;
        if (message.fromMe) return false;
        if (isGroupChatId(message.from)) return false;
        return Boolean(getMessageId(message));
    }
}

module.exports = {
    OrderProcessor,
    calculateLineTotal,
    cleanPhone,
    getMessageId,
    isGroupChatId,
    productToRow,
    resolveContactName,
};
