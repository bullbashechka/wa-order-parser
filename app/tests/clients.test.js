'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const { loadClients, resolveName } = require('../lib/clients');

const silentLogger = { log() {}, error() {} };

async function writeTemp(name, content) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-clients-'));
    const filePath = path.join(dir, name);
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
}

describe('clients', () => {
    it('loads a phone->name directory and normalizes phone keys', async () => {
        const filePath = await writeTemp(
            'clients.json',
            JSON.stringify({ '+7 700 123 45 67': 'ИП Иванов', '77019876543': 'ТОО Ромашка' }),
        );
        const directory = await loadClients(filePath, silentLogger);
        expect(directory['77001234567']).to.equal('ИП Иванов');
        expect(directory['77019876543']).to.equal('ТОО Ромашка');
    });

    it('returns empty directory for missing or invalid file', async () => {
        expect(await loadClients(path.join(os.tmpdir(), 'nope.json'), silentLogger)).to.deep.equal({});
        const broken = await writeTemp('broken.json', '{not json');
        expect(await loadClients(broken, silentLogger)).to.deep.equal({});
    });

    it('resolves name: directory -> csv pushname -> phone', () => {
        const directory = { '77001234567': 'ИП Иванов' };
        expect(resolveName('77001234567', 'Пётр', directory)).to.equal('ИП Иванов');
        expect(resolveName('77009999999', 'Пётр', directory)).to.equal('Пётр');
        expect(resolveName('77009999999', '', directory)).to.equal('77009999999');
    });
});
