const chalk = require('chalk');
const { loadWebconfig } = require('./functions');
const webconfig = loadWebconfig();

/**
 * 生成當前日期和時間的日誌標記
 * @returns {string} 格式化的日期時間字串
 */
function getDateLog() {
	const date_ob = new Date();
	const date = ('0' + date_ob.getDate()).slice(-2);
	const month = ('0' + (date_ob.getMonth() + 1)).slice(-2);
	const year = date_ob.getFullYear();
	const hours = ('0' + date_ob.getHours()).slice(-2);
	const minutes = ('0' + date_ob.getMinutes()).slice(-2);
	const seconds = ('0' + date_ob.getSeconds()).slice(-2);

	return `[${year}-${month}-${date} ${hours}:${minutes}:${seconds}]`;
}

/**
 * 印出日誌信息
 * @param {string} level - 日誌級別
 * @param {string} data - 日誌內容
 * @param {function} colorFunc - chalk 顏色函數
 */
function logMessage(level, data, colorFunc) {
	const dateLog = getDateLog();
	console.log(colorFunc(`${dateLog} [${level}] ${data}`));
}

// 定義各類型的日誌函式
exports.info = (data) => logMessage('INFO', data, chalk.cyan);
exports.discord = (data) => logMessage('DISCORD BOT', data, chalk.blue);
exports.lavalink = (data) => logMessage('LAVALINK', data, chalk.red);
exports.debug = (data) => {
	if (webconfig.debug === false) return;

	if (webconfig.debug === true) {
		logMessage('DEBUG', data, chalk.blue);
	} else {
		exports.error('The debug level was set to neither true or false! Please set this in webconfig.yml.').then(() => {
			process.exit(1);
		});
	}
};
exports.web = (data) => logMessage('WEBSITE', data, chalk.blue);
exports.router = (data) => logMessage('ROUTER', data, chalk.blue);
exports.API = (data) => logMessage('API', data, chalk.green);
exports.database = (data) => logMessage('DATABASE', data, chalk.magenta);
exports.warn = (data) => logMessage('WARN', data, chalk.yellow);
exports.error = (data) => logMessage('ERROR', data, chalk.red);
exports.critical = (data) => logMessage('CRITICAL', data, chalk.bold.bgRed);
exports.success = (data) => logMessage('SUCCESS', data, chalk.green);
