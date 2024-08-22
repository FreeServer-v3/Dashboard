const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const db = require('../lib/database');
const { getPterodactylServerInfoReturnPanelInfo } = require('../lib/Pterodactyl');

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

            const panelinfo = await getPterodactylServerInfoReturnPanelInfo(user, settings);
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
