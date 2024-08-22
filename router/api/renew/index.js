const db = require('../../../lib/database');
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

/**
 * 獲取 Pterodactyl 用戶信息
 * @param {string} pterodactyl_id - Pterodactyl 用戶 ID
 * @param {Object} settings - 配置物件
 * @returns {Object|null} 用戶信息物件或 null
 */
async function getPterodactylUserInfo(pterodactyl_id, settings) {
    const response = await fetch(`${settings.pterodactyl_url}/api/application/users/${pterodactyl_id}?include=servers`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.pterodactyl_key}`
        }
    });
    if (response.statusText === 'Not Found') {
        return null;
    }
    return await response.json();
}

/**
 * 解凍伺服器
 * @param {number} server_id - 伺服器 ID
 * @param {Object} settings - 配置物件
 */
async function unsuspendServer(server_id, settings) {
    await fetch(`${settings.pterodactyl_url}/api/application/servers/${server_id}/unsuspend`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.pterodactyl_key}`
        }
    });
}

router.get('/get/:id', async (req, res) => {
    try {
        const params_id = parseInt(req.params.id);
        const renewal = await db.getRenewal(params_id);
        if (!renewal) {
            return res.json({ error: '你不能編輯這台伺服器!' });
        }
        res.json({ renewal });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve renewal information' });
    }
});

router.post('/:id', async (req, res) => {
    try {
        const user = await db.getUser(req.session.account.email);
        const settings = await db.getSettings();
        const panelInfo = await getPterodactylUserInfo(user.pterodactyl_id, settings);

        if (!panelInfo) {
            return res.json({ error: 'Pterodactyl user not found' });
        }

        const params_id = parseInt(req.params.id);
        const servers = panelInfo.attributes.relationships.servers.data;
        const server = servers.find((server) => server.attributes.id === params_id);

        if (!server) {
            return res.json({ error: 'Server not found' });
        }

        if (server.attributes.suspended) {
            await unsuspendServer(server.attributes.id, settings);
        }

        const packageInfo = await db.getPackage(user.package);

        if (user.coins < packageInfo.renewal_price) {
            return res.json({ error: 'Not enough coins to renew the server.' });
        }

        const new_time = Date.now() + parseInt(packageInfo.renewal_time);
        await db.updateRenewal(server.attributes.id, new_time);

        const new_coins = user.coins - packageInfo.renewal_price;
        await db.updateCoins(user.email, new_coins);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to renew the server' });
    }
});

module.exports = router;
