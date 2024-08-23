const yaml = require('yaml');
const { join } = require('path');
const { readFileSync } = require('fs');

module.exports = {
	/**
	 * 讀取並解析 webconfig.yml 配置文件
	 * @returns {Object} 解析後的配置對象
	 */
	loadWebconfig: function () {
		const configPath = join(__dirname, '../webconfig.yml');
		const fileContents = readFileSync(configPath, 'utf-8');
		return yaml.parse(fileContents);
	},

	/**
	 * 確認數字是否為整數
	 * @param {number} num - 要檢查的數字
	 * @returns {boolean} 如果數字為整數，返回 true，否則返回 false
	 */
	checkInt: function(num) {
		return Number.isInteger(num);
	},

	/**
	 * 格式化秒數為 hh:mm:ss
	 * @param {number} seconds - 時間的秒數
	 * @returns {string} 格式化後的時間字串
	 */
	formatTime: function(seconds) {
		const pad = (s) => (s < 10 ? '0' : '') + s;
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const remainingSeconds = Math.floor(seconds % 60);

		return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
	},

	/**
	 * 格式化位元組為適合的單位
	 * @param {number} bytes - 位元組數
	 * @param {number} [decimals=2] - 小數位數
	 * @returns {string} 格式化後的位元組字串
	 */
	formatBytes: function(bytes, decimals = 2) {
		if (bytes === 0) return '0 Bytes';

		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
	}
};
