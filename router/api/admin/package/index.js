const db = require('../../../../lib/database');
const express = require('express');
const router = express.Router();
const webhook = require('../../../../lib/webhook');

/**
 * 檢查 Pterodactyl 配置是否完整
 * @param {Object} settings - 從數據庫獲取的設置對象
 * @returns {Object|null} 如果配置不完整，返回錯誤信息，否則返回 null
 */
function checkPterodactylSettings(settings) {
    if (!settings.pterodactyl_url) {
        return { error: 'Pterodactyl URL not set' };
    }
    if (!settings.pterodactyl_key) {
        return { error: 'Pterodactyl Key not set' };
    }
    return null;
}

/**
 * 發送 Webhook 信息
 * @param {Object} packageData - 套餐的相關數據
 */
async function sendPackageWebhook(packageData) {
    const {
        name, ram, disk, cpu, price,
        renewal_enabled, renewal_time, renewal_price
    } = packageData;

    await webhook.info(
        'Package added',
        `**Name:** ${name}\n**Ram:** ${ram}\n**Disk:** ${disk}\n**CPU:** ${cpu}\n**Price:** ${price}\n**Renewal Enabled:** ${renewal_enabled}\n**Renewal Time:** ${renewal_time}\n**Renewal Price:** ${renewal_price}\n**Default:** false`
    );
}

router.post('/add', async (req, res) => {
    try {
        const settings = await db.getSettings();
        const error = checkPterodactylSettings(settings);
        if (error) return res.json(error);

        const existingPackage = await db.getPackage(req.body.name);
        if (existingPackage) return res.json({ error: 'A package with that name already exists.' });

        await db.addPackage(req.body);
        res.json({ success: true });

        await sendPackageWebhook(req.body);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add package' });
    }
});

module.exports = router;
