const db = require('../../../../lib/database');
const express = require('express');
const router = express.Router();
const webhook = require('../../../../lib/webhook');
const { checkPterodactylSettings } = require('../../../../lib/Pterodactyl');

/**
 * 發送 Webhook 信息
 * @param {string} title - Webhook 標題
 * @param {string} message - Webhook 消息
 */
async function sendWebhookNotification(title, message) {
    await webhook.info(title, message);
}

router.get('/get/all', async (req, res) => {
    try {
        const locations = await db.getLocations();
        res.json(locations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve locations' });
    }
});

router.post('/add', async (req, res) => {
    try {
        const settings = await db.getSettings();
        const error = checkPterodactylSettings(settings);
        if (error) return res.json(error);

        const location = await db.getLocation(req.body.name);
        if (location) return res.json({ error: 'A location with that name already exists.' });

        await db.addLocation(req.body);
        res.json({ success: true });
        await sendWebhookNotification('Location added', `**Name:** ${req.body.name}`);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add location' });
    }
});

router.post('/update/status', async (req, res) => {
    try {
        const settings = await db.getSettings();
        const error = checkPterodactylSettings(settings);
        if (error) return res.json(error);

        const location = await db.getLocationByID(req.body.location);
        if (!location) return res.json({ error: 'That location does not exist.' });

        await db.updateLocationStatus(req.body);
        res.json({ success: true });
        await sendWebhookNotification('Location status updated', `**Name:** ${location.name}\n**Status:** ${req.body.status}`);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update location status' });
    }
});

module.exports = router;
