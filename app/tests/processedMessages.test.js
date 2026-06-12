'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const sinon = require('sinon');
const { ProcessedMessagesStore } = require('../lib/processedMessages');

async function makeTempDir() {
    return fs.mkdtemp(path.join(os.tmpdir(), 'wa-order-parser-'));
}

describe('processed messages store', () => {
    let consoleError;

    beforeEach(() => {
        consoleError = sinon.stub(console, 'error');
    });

    afterEach(() => {
        consoleError.restore();
    });

    it('starts empty when the file does not exist', async () => {
        const dir = await makeTempDir();
        const store = new ProcessedMessagesStore(path.join(dir, 'processed.json'));

        await store.load();

        expect(store.has('msg-1')).to.equal(false);
    });

    it('loads and saves message IDs', async () => {
        const dir = await makeTempDir();
        const filePath = path.join(dir, 'processed.json');
        await fs.writeFile(filePath, '["msg-1"]\n', 'utf8');
        const store = new ProcessedMessagesStore(filePath);

        await store.load();
        await store.add('msg-2');

        const saved = JSON.parse(await fs.readFile(filePath, 'utf8'));
        expect(store.has('msg-1')).to.equal(true);
        expect(saved).to.deep.equal(['msg-1', 'msg-2']);
    });

    it('backs up corrupted JSON and continues empty', async () => {
        const dir = await makeTempDir();
        const filePath = path.join(dir, 'processed.json');
        await fs.writeFile(filePath, '{broken', 'utf8');
        const store = new ProcessedMessagesStore(filePath);

        await store.load();

        expect(store.has('msg-1')).to.equal(false);
        expect(await fs.readFile(`${filePath}.bak`, 'utf8')).to.equal('{broken');
    });

    it('backs up files with unsupported data shape', async () => {
        const dir = await makeTempDir();
        const filePath = path.join(dir, 'processed.json');
        await fs.writeFile(filePath, '{"msg":"1"}', 'utf8');
        const store = new ProcessedMessagesStore(filePath);

        await store.load();

        expect(store.has('msg-1')).to.equal(false);
        expect(await fs.readFile(`${filePath}.bak`, 'utf8')).to.equal(
            '{"msg":"1"}',
        );
    });
});
