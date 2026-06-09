'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const {
    OrderProcessor,
    calculateLineTotal,
    cleanPhone,
    productToRow,
} = require('../lib/orderProcessor');

function createProcessor(overrides = {}) {
    return new OrderProcessor({
        csvWriter: overrides.csvWriter || { appendRows: sinon.stub().resolves() },
        processedMessages:
            overrides.processedMessages ||
            {
                has: sinon.stub().returns(false),
                add: sinon.stub().resolves(),
            },
        timezone: 'Asia/Almaty',
        logger: overrides.logger || { log: sinon.stub(), error: sinon.stub() },
    });
}

describe('order processor', () => {
    it('calculates line totals only when quantity and price are numeric', () => {
        expect(calculateLineTotal(2, '1500')).to.equal(3000);
        expect(calculateLineTotal('', '1500')).to.equal('');
        expect(calculateLineTotal(2, '1 500')).to.equal('');
    });

    it('cleans WhatsApp suffix from phone IDs', () => {
        expect(cleanPhone('77001234567@c.us')).to.equal('77001234567');
    });

    it('maps a product to a CSV row without changing raw price', () => {
        expect(
            productToRow({
                processedAt: '2026-06-09 12:00:00',
                phone: '77001234567',
                messageId: 'msg-1',
                product: {
                    name: '  Product name  ',
                    quantity: 2,
                    price: '1500',
                    currency: 'KZT',
                },
            }),
        ).to.deep.equal([
            '2026-06-09 12:00:00',
            '77001234567',
            'msg-1',
            'Product name',
            2,
            '1500',
            'KZT',
            3000,
        ]);
    });

    it('ignores non-order, own and group messages', async () => {
        const csvWriter = { appendRows: sinon.stub().resolves() };
        const processor = createProcessor({ csvWriter });

        await processor.handleMessage({ type: 'chat' });
        await processor.handleMessage({
            type: 'order',
            fromMe: true,
            from: '77001234567@c.us',
            id: { _serialized: 'own' },
        });
        await processor.handleMessage({
            type: 'order',
            fromMe: false,
            from: '123@g.us',
            id: { _serialized: 'group' },
        });

        expect(csvWriter.appendRows.called).to.equal(false);
    });

    it('writes products and marks message as processed after success', async () => {
        const csvWriter = { appendRows: sinon.stub().resolves() };
        const processedMessages = {
            has: sinon.stub().returns(false),
            add: sinon.stub().resolves(),
        };
        const processor = createProcessor({ csvWriter, processedMessages });
        const message = {
            type: 'order',
            fromMe: false,
            from: '77001234567@c.us',
            id: { _serialized: 'msg-1' },
            getOrder: sinon.stub().resolves({
                products: [
                    {
                        name: ' Product ',
                        quantity: 2,
                        price: '1500',
                        currency: 'KZT',
                    },
                ],
            }),
        };

        const result = await processor.handleMessage(message);

        expect(result).to.equal(true);
        expect(csvWriter.appendRows.calledOnce).to.equal(true);
        expect(processedMessages.add.calledOnceWithExactly('msg-1')).to.equal(
            true,
        );
    });

    it('does not mark message as processed after CSV write failure', async () => {
        const csvWriter = { appendRows: sinon.stub().rejects(new Error('EACCES')) };
        const processedMessages = {
            has: sinon.stub().returns(false),
            add: sinon.stub().resolves(),
        };
        const processor = createProcessor({ csvWriter, processedMessages });

        const result = await processor.handleMessage({
            type: 'order',
            fromMe: false,
            from: '77001234567@c.us',
            id: { _serialized: 'msg-1' },
            getOrder: sinon.stub().resolves({
                products: [{ name: 'Product', quantity: 1, price: '100' }],
            }),
        });

        expect(result).to.equal(false);
        expect(processedMessages.add.called).to.equal(false);
    });

    it('skips already processed messages', async () => {
        const csvWriter = { appendRows: sinon.stub().resolves() };
        const processedMessages = {
            has: sinon.stub().returns(true),
            add: sinon.stub().resolves(),
        };
        const processor = createProcessor({ csvWriter, processedMessages });

        await processor.handleMessage({
            type: 'order',
            fromMe: false,
            from: '77001234567@c.us',
            id: { _serialized: 'msg-1' },
        });

        expect(csvWriter.appendRows.called).to.equal(false);
        expect(processedMessages.add.called).to.equal(false);
    });
});
