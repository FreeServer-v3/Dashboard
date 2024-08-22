const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const db = require('../lib/database');

/**
 * 驗證 API 金鑰
 * @param {string} apiKey - API 金鑰
 * @returns {boolean} 返回驗證結果
 */
async function validateApiKey(apiKey) {
    const key = await db.getApiKey(apiKey);
    if (!key) return false;
    await db.setLastUsedApiKey(key.key);
    return true;
}

/**
 * 獲取 Pterodactyl 伺服器信息
 * @param {Object} user - 用戶對象
 * @param {Object} settings - 系統設置
 * @returns {Object|null} 返回伺服器信息或 null
 */
async function getPterodactylServerInfo(user, settings) {
    const response = await fetch(`${settings.pterodactyl_url}/api/application/users/${user.pterodactyl_id}?include=servers`, {
        method: 'get',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${settings.pterodactyl_key}`
        }
    });
    if (response.statusText === 'Not Found') return null;
    return await response.json();
}

router.use('*', async (req, res, next) => {
    try {
        const pathname = req._parsedUrl.pathname;

        if (!req.session.account) {
            if (req.headers.api) {
                const isValidApiKey = await validateApiKey(req.headers.api);
                if (!isValidApiKey) return res.json({ error: "Invalid API key" });
            } else {
                if (pathname.includes('/auth/')) {
                    return next();
                } else {
                    return res.redirect('/auth/login');
                }
            }
        }

        if (pathname.startsWith('/dashboard/admin')) {
            const user = await db.getUser(req.session.account.email);
            const settings = await db.getSettings();
            if (!user || !user.pterodactyl_id) return res.redirect('/auth/login');

            const panelinfo = await getPterodactylServerInfo(user, settings);
            if (!panelinfo) return res.json({ error: 'Pterodactyl user not found' });

            if (!panelinfo.attributes.root_admin) return res.redirect('/dashboard');
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.use('/api', require('./api/index.js'));

module.exports = router;
