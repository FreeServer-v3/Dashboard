const express = require('express');
const router = express.Router();
const packageInfo = require('../../../package.json');
const os = require('os');
const osu = require('node-os-utils');

/**
 * 格式化秒數為 hh:mm:ss
 * @param {number} seconds - 時間的秒數
 * @returns {string} 格式化後的時間字串
 */
function formatTime(seconds) {
    const pad = (s) => (s < 10 ? '0' : '') + s;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
}

/**
 * 格式化位元組為適合的單位
 * @param {number} bytes - 位元組數
 * @param {number} [decimals=2] - 小數位數
 * @returns {string} 格式化後的位元組字串
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

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
