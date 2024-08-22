module.exports = {
    /**
     * 檢查 Pterodactyl 配置是否完整
     * @param {Object} settings - 從數據庫獲取的設置對象
     * @returns {Object|null} 如果配置不完整，返回錯誤信息，否則返回 null
     */
    checkPterodactylSettings: function (settings) {
        if (!settings.pterodactyl_url) {
            return { error: 'Pterodactyl URL not set' };
        }
        if (!settings.pterodactyl_key) {
            return { error: 'Pterodactyl Key not set' };
        }
        return null;
    },

    /**
     * 獲取 Pterodactyl 用戶信息
     * @param {string} pterodactyl_id - Pterodactyl 用戶 ID
     * @param {Object} settings - 配置物件
     * @returns {Object|null} 用戶信息物件或 null
     */
    getPterodactylUserInfo: async function (pterodactyl_id, settings) {
        const response = await fetch(`${settings.pterodactyl_url}/api/application/users/${pterodactyl_id}?include=servers`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${settings.pterodactyl_key}`
            }
        });
        if (response.statusText === 'Not Found') {
            return null;
        }
        return await response.json();
    },

    /**
     * 從 Pterodactyl 獲取伺服器信息
     * @param {Object} user - 用戶物件
     * @param {Object} settings - 配置物件
     * @returns {Object|null} 如果找到伺服器信息則返回該信息，否則返回 null
     */
    getPterodactylServerInfo: async function (user, settings) {
        const response = await fetch(`${settings.pterodactyl_url}/api/application/users/${user.pterodactyl_id}?include=servers`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${settings.pterodactyl_key}`
            }
        });

        if (response.statusText === 'Not Found') return null;

        const data = await response.json();
        return data.attributes.relationships.servers.data;
    },

    /**
     * 獲取 Pterodactyl 伺服器信息
     * @param {Object} user - 用戶對象
     * @param {Object} settings - 系統設置
     * @returns {Object|null} 返回伺服器信息或 null
     */
    getPterodactylServerInfoReturnPanelInfo: async function (user, settings) {
        const response = await fetch(`${settings.pterodactyl_url}/api/application/users/${user.pterodactyl_id}?include=servers`, {
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${settings.pterodactyl_key}`
            }
        });
        if (response.statusText === 'Not Found') return null;
        return await response.json();
    }
}