'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const sinon = require('sinon');
const { buildDay } = require('../lib/dayBuilder');

const silentLogger = { log() {}, error() {} };

function baseConfig(outputDir) {
    return {
        outputDir,
        csvDelimiter: ';',
        clientsPath: path.join(outputDir, 'clients.json'),
        companyName: 'Моя организация',
        invoiceCurrency: 'KZT',
        defaultUnit: 'упак',
    };
}

const ROWS = [
    { Телефон: '77001', 'Имя клиента': 'A', 'Название товара': 'X', Количество: '1', Цена: '100' },
    { Телефон: '77002', 'Имя клиента': 'B', 'Название товара': 'Y', Количество: '2', Цена: '200' },
    { Телефон: '77001', 'Имя клиента': 'A', 'Название товара': 'Z', Количество: '1', Цена: '50' },
];

function deps(outputDir, overrides = {}) {
    return {
        config: baseConfig(outputDir),
        logger: silentLogger,
        readOrders: sinon.stub().resolves(ROWS),
        loadClients: sinon.stub().resolves({}),
        renderInvoice: sinon.stub().resolves(),
        renderExpedition: sinon.stub().resolves(),
        ...overrides,
    };
}

describe('dayBuilder', () => {
    it('numbers clients by first appearance and groups by phone', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-day-'));
        const options = deps(dir);
        const result = await buildDay('2026-06-12', options);

        expect(result.created).to.equal(true);
        expect(result.invoices).to.equal(2);
        expect(options.renderInvoice.callCount).to.equal(2);

        const first = options.renderInvoice.getCall(0);
        expect(first.args[0].number).to.equal(1);
        expect(first.args[0].client).to.equal('A');
        expect(first.args[1]).to.include('Заказ №1 от 12.06.2026 — A.xlsx');

        const second = options.renderInvoice.getCall(1);
        expect(second.args[0].number).to.equal(2);
        expect(second.args[1]).to.include('Заказ №2 от 12.06.2026 — B.xlsx');

        expect(options.renderExpedition.calledOnce).to.equal(true);
    });

    it('continues other invoices and expedition when one invoice fails', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-day-'));
        const renderInvoice = sinon.stub();
        renderInvoice.onFirstCall().rejects(new Error('boom'));
        renderInvoice.onSecondCall().resolves();
        const options = deps(dir, { renderInvoice });

        const result = await buildDay('2026-06-12', options);

        expect(result.invoices).to.equal(1);
        expect(options.renderExpedition.calledOnce).to.equal(true);
    });

    it('creates nothing when there are no orders for the day', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-day-'));
        const options = deps(dir, { readOrders: sinon.stub().resolves([]) });

        const result = await buildDay('2026-06-12', options);

        expect(result.created).to.equal(false);
        expect(options.renderInvoice.called).to.equal(false);
        expect(options.renderExpedition.called).to.equal(false);
    });
});
