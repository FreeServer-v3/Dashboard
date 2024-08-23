const db = require('../../../lib/database');
const express = require('express');
const router = express.Router();
const { checkPterodactylSettings } = require('../../../lib/Pterodactyl');
const { checkIntGTE0 } = require('../../../lib/functions');


/**
 * 獲取資源價格和用戶的資源信息
 * @param {Object} user - 用戶對象
 * @param {Object} settings - 系統設置
 * @returns {Object} 包含資源價格和用戶資源信息的對象
 */
function getResourceInfo(user, settings) {
    return {
        user_cpu: user.extra.cpu,
        user_ram: user.extra.ram,
        user_disk: user.extra.disk,
        ram_price: settings.ram_price,
        cpu_price: settings.cpu_price,
        disk_price: settings.disk_price,
        day_multiplier: settings.day_multiplier,
        week_multiplier: settings.week_multiplier
    };
}

/**
 * 計算資源的總價格
 * @param {Object} settings - 系統設置
 * @param {Object} resource - 資源請求對象
 * @returns {number} 計算後的總價格
 */
function calculateTotalPrice(settings, resource) {
    let cycleMultiplier = 0;
    if (resource.cycle === "daily") {
        cycleMultiplier = parseInt(settings.day_multiplier) / 25;
    } else if (resource.cycle === "weekly") {
        cycleMultiplier = parseInt(settings.week_multiplier) / 4;
    } else if (resource.cycle === "monthly") {
        cycleMultiplier = 1;
    }

    const priceCPU = parseInt(settings.cpu_price);
    const priceRam = parseInt(settings.ram_price);
    const priceDisk = parseInt(settings.disk_price);

    return Math.ceil((resource.cpu * priceCPU + resource.ram * priceRam + resource.disk * priceDisk) * cycleMultiplier);
}

router.get('/', async (req, res) => {
    try {
        const settings = await db.getSettings();
        const user = await db.getUser(req.session.account.email);

        const error = checkPterodactylSettings(settings);
        if (error) return res.json(error);

        const resourceInfo = getResourceInfo(user, settings);
        res.json(resourceInfo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve resource information' });
    }
});

router.get('/cycle', async (req, res) => {
    try {
        const getUserCycle = await db.getUserCycle(req.session.account.email);

        if (!getUserCycle) {
            const createUserCycle = await db.createUserCycle(req.session.account.email);
            if (!createUserCycle) {
                return res.json({ error: "Error during creating user cycle" });
            } else {
                return res.json({ cycle: "daily", exp: 0, new: true });
            }
        } else {
            return res.json({ cycle: getUserCycle.cycle, exp: getUserCycle.next_expire, new: false });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve cycle information' });
    }
});

// 前端更改資源後存到資料庫
router.put('/update', async (req, res) => {
    try {
        const body = req.body;
        const newCPU = body.cpuspec;
        const newRam = body.ramspec;
        const newDisk = body.diskspec;
        const newCycle = body.cycleT;

        if (![newCPU, newRam, newDisk].every(checkIntGTE0)) {
            return res.json({ error: "你輸入的數字好像不是整數..." });
        }

        const settings = await db.getSettings();
        const subtotal = calculateTotalPrice(settings, { cpu: newCPU, ram: newRam, disk: newDisk, cycle: newCycle });

        const user = await db.getUser(req.session.account.email);
        const userCoins = parseInt(user.coins);

        if (userCoins < subtotal) {
            return res.json({ error: `你的餘額不足，無法支付此週期 (${subtotal} FreeCoin)。` });
        }

        const updateMoney = await db.updateCoins(req.session.account.email, userCoins - subtotal);
        if (!updateMoney) {
            return res.json({ error: "扣款失敗..." });
        }

        const updateExpireTime = await db.setNextCycleExpire(req.session.account.email, true);
        const updateCPU = await db.updateExtraCpu(req.session.account.email, newCPU * 100);
        const updateRam = await db.updateExtraRam(req.session.account.email, newRam * 1024);
        const updateDisk = await db.updateExtraDisk(req.session.account.email, newDisk * 1024);
        const updateCycle = await db.updateUserCycle(req.session.account.email, newCycle);

        if ([updateExpireTime, updateCPU, updateRam, updateDisk, updateCycle].includes(false)) {
            return res.json({ error: "發生了一點問題..." });
        } else {
            return res.json({ success: "已更新。" });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update resources' });
    }
});

router.use('/purchase', require('./purchase/index.js'));

module.exports = router;
