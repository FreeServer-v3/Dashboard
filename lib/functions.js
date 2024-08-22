const yaml = require('yaml');
const { join } = require('path');
const { readFileSync } = require('fs');

/**
 * 讀取並解析 webconfig.yml 配置文件
 * @returns {Object} 解析後的配置對象
 */
function loadWebconfig() {
	const configPath = join(__dirname, '../webconfig.yml');
	const fileContents = readFileSync(configPath, 'utf-8');
	return yaml.parse(fileContents);
}

module.exports = {
	loadWebconfig
};
