const express = require('express');
const router = express.Router();
const packageInfo = require('../../../package.json');
const os = require('os');
const osu = require('node-os-utils');
const { formatTime, formatBytes } = require('../../../lib/functions');

/**
 * 獲取 Dashactyl 應用程序的統計數據
 * @returns {Object} Dashactyl 應用程序的統計數據
 */
function getDashactylStats() {
    const usage = {
        ...process.cpuUsage(),
        time: process.uptime() * 1000, // s to ms
        percent: ((process.cpuUsage().system + process.cpuUsage().user) / (process.uptime() * 10000)).toFixed(2)
    };

    const usedRam = process.memoryUsage().heapUsed / 1024 / 1024;

    return {
        ram: Math.round(usedRam * 100) / 100,
        cpu: usage.percent,
        uptime: formatTime(process.uptime())
    };
}

/**
 * 獲取系統的統計數據
 * @returns {Object} 系統統計數據
 */
async function getSystemInfo() {
    const cpu = osu.cpu;
    const cpus = os.cpus();
    const used = os.totalmem() - os.freemem();

    return {
        cpu_model: cpus[0].model,
        platform: process.platform,
        uptime: formatTime(os.uptime()),
        usedRam: formatBytes(used),
        totalRam: formatBytes(os.totalmem()),
        cpuUsage: await cpu.usage()
    };
}

router.get('/info', async (req, res) => {
    try {
        const systemInfo = await getSystemInfo();
        const dashactylStats = getDashactylStats();
        res.json({ 
            version: packageInfo.version, 
            pid: process.pid, 
            systemInfo, 
            dashactylStats 
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve system info' });
    }
});

// 其他路由
router.use('/egg', require('./egg/index.js'));
router.use('/location', require('./location/index.js'));
router.use('/package', require('./package/index.js'));
router.use('/user', require('./user/index.js'));
router.use('/keys', require('./keys/index.js'));

module.exports = router;
