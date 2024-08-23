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
	}
};
