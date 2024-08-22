const db = require('../../../../lib/database');
const express = require('express');
const router = express.Router();
const events = require('../../../../lib/events').eventBus;

/**
 * 發送 API 金鑰更新事件
 */
async function emitApiKeysUpdate() {
    const keys = await db.listApiKeys();
    events.emit('apiKeysUpdate', keys);
}

/**
 * WebSocket 保持連接函式
 * @param {WebSocket} ws - WebSocket 連接對象
 */
function keepWebSocketAlive(ws) {
    const loop = setInterval(() => {
        ws.send("stay alive pretty please thanks");
    }, 1000);

    ws.on('close', () => {
        clearInterval(loop);
    });
}

router.get('/get/all', async (req, res) => {
    try {
        const keys = await db.listApiKeys();
        res.json({ keys });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve API keys' });
    }
});

router.get('/get/:key', async (req, res) => {
    try {
        const key = await db.getApiKey(req.params.key);
        res.json({ key });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve API key' });
    }
});

router.delete('/delete/:key', async (req, res) => {
    try {
        await db.deleteApiKey(req.params.key);
        res.json({ success: true });
        await emitApiKeysUpdate();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete API key' });
    }
});

router.post('/add', async (req, res) => {
    try {
        const key = await db.createApiKey(req.body.description);
        res.json({ success: true, key });
        await emitApiKeysUpdate();
    } catch (error) {
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

router.ws('/', (ws) => {
    events.on('apiKeysUpdate', (data) => {
        ws.send(JSON.stringify({ keys: data }));
    });

    keepWebSocketAlive(ws);
});

module.exports = router;
