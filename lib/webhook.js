const fetch = require('node-fetch');
const log = require('./logger');
const db = require('./database');

/**
 * 發送 Discord Webhook
 * @param {string} title - 消息的標題
 * @param {string} text - 消息的描述
 * @param {number} color - 消息的顏色（以十六進制表示）
 */
async function sendWebhook(title, text, color) {
    const settings = await db.getSettings();
    if (!settings) return; // 如果設置有問題
    if (!settings.discord_webhook) return;

    try {
        await fetch(settings.discord_webhook, {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [
                    {
                        title: title,
                        description: text,
                        color: color,
                    }
                ]
            })
        });
    } catch (e) {
        log.error("There was an error sending to the webhook: " + e);
    }
}

module.exports = {
    info: async function (title, text) {
        await sendWebhook(title, text, 0); // 使用顏色代碼 0
    },
    success: async function (title, text) {
        await sendWebhook(title, text, 4321431); // 使用顏色代碼 4321431
    },
};
