'use strict';

const fs = require('fs/promises');
const path = require('path');

class ProcessedMessagesStore {
    constructor(filePath) {
        this.filePath = filePath;
        this.ids = new Set();
    }

    async load() {
        try {
            const content = await fs.readFile(this.filePath, 'utf8');
            const parsed = JSON.parse(content);

            if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string')) {
                throw new Error('processed messages file must contain an array of strings');
            }

            this.ids = new Set(parsed);
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                this.ids = new Set();
                return;
            }

            console.error('Failed to read processed messages file:', error.message);
            await this.backupCorruptedFile();
            this.ids = new Set();
        }
    }

    has(messageId) {
        return this.ids.has(messageId);
    }

    async add(messageId) {
        this.ids.add(messageId);
        await this.save();
    }

    async save() {
        const directory = path.dirname(this.filePath);
        if (directory && directory !== '.') {
            await fs.mkdir(directory, { recursive: true });
        }

        const values = [...this.ids].sort();
        await fs.writeFile(this.filePath, `${JSON.stringify(values, null, 2)}\n`, 'utf8');
    }

    async backupCorruptedFile() {
        const backupPath = `${this.filePath}.bak`;
        try {
            await fs.rename(this.filePath, backupPath);
        } catch (error) {
            console.error('Failed to create processed messages backup:', error.message);
        }
    }
}

module.exports = {
    ProcessedMessagesStore,
};
