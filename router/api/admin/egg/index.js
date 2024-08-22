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
 * @param {Object} eggData - Egg 的相關數據
 */
async function sendEggWebhook(eggData) {
    const { name, egg_id, egg_docker_image, egg_startup, egg_databases, egg_backups, egg_environment } = eggData;
    await webhook.info(
        `Egg added`,
        `**Name:** ${name}\n**ID:** ${egg_id}\n**Docker Image:** ${egg_docker_image}\n**Startup:** ${egg_startup}\n**Databases:** ${egg_databases}\n**Backups:** ${egg_backups}\n**Environment:** ${egg_environment}`
    );
}

router.get('/get/all', async (req, res) => {
    try {
        const eggs = await db.getEggs();
        res.json(eggs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve eggs' });
    }
});

router.post('/add', async (req, res) => {
    try {
        const settings = await db.getSettings();
        const error = checkPterodactylSettings(settings);
        if (error) return res.json(error);

        const egg = await db.getEgg(req.body.name);
        if (egg) return res.json({ error: 'An egg with that name already exists.' });

        await db.addEgg(req.body);
        res.json({ success: true });

        await sendEggWebhook(req.body);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add egg' });
    }
});

module.exports = router;
