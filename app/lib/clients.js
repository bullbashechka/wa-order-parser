'use strict';

const fs = require('fs/promises');

function normalizePhone(phone) {
    return String(phone === undefined || phone === null ? '' : phone).replace(
        /\D/g,
        '',
    );
}

// Loads a "phone -> name" directory from JSON. Missing file or invalid JSON yields
// an empty directory rather than throwing — absence must not stop document builds.
async function loadClients(filePath, logger = console) {
    let content;
    try {
        content = await fs.readFile(filePath, 'utf8');
    } catch (error) {
        if (error && error.code === 'ENOENT') return {};
        logger.error('Failed to read clients file:', error.message);
        return {};
    }

    try {
        const parsed = JSON.parse(content);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }

        const directory = {};
        for (const [phone, name] of Object.entries(parsed)) {
            if (typeof name === 'string' && name.trim() !== '') {
                directory[normalizePhone(phone)] = name.trim();
            }
        }
        return directory;
    } catch (error) {
        logger.error('Failed to parse clients file:', error.message);
        return {};
    }
}

// Resolves the customer name: directory -> captured pushname (csvName) -> phone.
function resolveName(phone, csvName, clients) {
    const key = normalizePhone(phone);
    if (clients && clients[key]) return clients[key];

    const fromCsv = csvName === undefined || csvName === null ? '' : String(csvName).trim();
    if (fromCsv) return fromCsv;

    return String(phone === undefined || phone === null ? '' : phone).trim();
}

module.exports = {
    loadClients,
    resolveName,
    normalizePhone,
};
