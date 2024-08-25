const db = require('../../../lib/database');
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const webhook = require('../../../lib/webhook');
const { getPterodactylServerInfo } = require('../../../lib/Pterodactyl');

let tmp = {};

/**
 * 檢查用戶是否有足夠的資源來創建或修改伺服器
 * @param {Object} user - 用戶對象
 * @param {Object} pkg - 用戶套餐對象
 * @param {Object} resourceRequest - 請求的資源
 * @returns {boolean} 如果資源足夠則返回 true，否則返回 false
 */
function hasEnoughResources(user, pkg, resourceRequest, beforeEdit = {
    cpu: 0,
    ram: 0,
    disk: 0
}) {
    const available_cpu = parseInt(pkg.cpu) + parseInt(user.extra.cpu) - parseInt(user.used_cpu) + parseInt(beforeEdit.cpu);
    const available_ram = parseInt(pkg.ram) + parseInt(user.extra.ram) - parseInt(user.used_ram) + parseInt(beforeEdit.ram);
    const available_disk = parseInt(pkg.disk) + parseInt(user.extra.disk) - parseInt(user.used_disk) + parseInt(beforeEdit.disk);
    return (
        available_cpu >= parseInt(resourceRequest.cpu) &&
        available_ram >= parseInt(resourceRequest.ram) &&
        available_disk >= parseInt(resourceRequest.disk)
    );
}

/**
 * 發送伺服器更新的 Webhook 通知
 * @param {Object} user - 用戶對象
 * @param {Object} server - 伺服器對象
 * @param {string} action - 操作描述
 * @param {string} additionalInfo - 附加信息
 */
async function sendServerWebhook(user, server, action, additionalInfo) {
    await webhook.info(
        `Server ${action}`,
        `**User:** ${user.username}\n**Server Name:** ${server.attributes.name}\n**Server ID:** ${server.attributes.id}\n${additionalInfo}`
    );
}

router.post('/create', async (req, res) => {
    if (
        tmp[req.session.account.pterodactyl_id] &&
        Date.now() - tmp[req.session.account.pterodactyl_id] < 7500
    ) {
        return res.json({ error: "剛才已創建過，請稍後再試。" });
    }
    tmp[req.session.account.pterodactyl_id] = Date.now();

    const user = await db.getUser(req.session.account.email);
    const pkg = await db.getPackage(user.package);

    if (!hasEnoughResources(user, pkg, req.body)) {
        return res.json({ error: '你擁有的資源不足，請購買更多資源或降低其他伺服器用量。[F_EC2]' });
    }

    const settings = await db.getSettings();
    const egg = await db.getEgg(req.body.egg);
    const location = await db.getLocation(req.body.location);

    if (!egg || !location || location.enabled === false) {
        return res.json({ error: '無效的創建請求。[F_EC5, F_EC6, F_EC7]' });
    }

    try {
        const environment = JSON.parse(egg.environment);

        const serverinfo_req = await fetch(`${settings.pterodactyl_url}/api/application/servers`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${settings.pterodactyl_key}`
            },
            body: JSON.stringify({
                name: req.body.name,
                user: user.pterodactyl_id,
                egg: egg.id,
                docker_image: egg.docker_image,
                startup: egg.startup,
                environment,
                limits: {
                    memory: req.body.ram,
                    cpu: req.body.cpu,
                    disk: req.body.disk,
                    swap: 0,
                    io: 500
                },
                feature_limits: {
                    databases: parseInt(egg.databases),
                    backups: parseInt(egg.backups)
                },
                deploy: {
                    locations: [parseFloat(location.id)],
                    dedicated_ip: false,
                    port_range: []
                }
            })
        });

        if (serverinfo_req.statusText === "Forbidden") {
            return res.json({ error: "你切錯帳號了 [F_EC8]" });
        }

        if (serverinfo_req.statusText !== 'Created') {
            const status = await serverinfo_req.text();
            console.log(status);
            return res.json({ error: '創建時發生了點問題，請聯絡管理員。[F_EC11]' });
        }

        const added = await db.addUsed(user.email, req.body.cpu, req.body.ram, req.body.disk);
        if (added !== true) {
            return res.json({ error: '資料庫錯誤，請聯絡管理員。[F_EC9]' });
        }

        const serverInfo = await serverinfo_req.json();
        await db.addRenewal(user.email, serverInfo.attributes.id);

        res.json({ success: true });
        await sendServerWebhook(user, serverInfo, 'Created', `**CPU:** ${req.body.cpu}\n**RAM:** ${req.body.ram}\n**Disk:** ${req.body.disk}`);
    } catch (error) {
        res.json({ error: "發生錯誤，請聯絡管理員。[F_EC1]" });
    }
});

router.get('/get/:id', async (req, res) => {
    try {
        const user = await db.getUser(req.session.account.email);
        const settings = await db.getSettings();
        const servers = await getPterodactylServerInfo(user, settings);

        if (!servers) return res.json({ error: 'Pterodactyl user not found' });

        const server = servers.find((server) => server.attributes.id === parseInt(req.params.id));
        if (!server) return res.json({ error: 'Server not found' });

        res.json({ server });
    } catch (error) {
        res.json({ error: "發生錯誤，請聯絡管理員。[F_GE1]" });
    }
});

router.patch('/edit/:id', async (req, res) => {
    try {
        const user = await db.getUser(req.session.account.email);
        const pkg = await db.getPackage(user.package);

        const settings = await db.getSettings();
        const servers = await getPterodactylServerInfo(user, settings);

        if (!servers) return res.json({ error: 'Pterodactyl user not found' });

        const server = servers.find((server) => server.attributes.id === parseInt(req.params.id));
        if (!server) return res.json({ error: 'Server not found' });

        const newResources = {
            cpu: parseInt(req.body.cpu),
            ram: parseInt(req.body.ram),
            disk: parseInt(req.body.disk)
        };

        if (!hasEnoughResources(user, pkg, newResources, {
            // 這裡要傳修改前的配置
            // cpu: server.attributes.limits.cpu,
            // ram: server.attributes.limits.memory,
            // disk: server.attributes.limits.disk
        })) {
            return res.json({ error: '你擁有的資源不足，請購買更多資源或降低其他伺服器用量。[F_EC2]' });
        }

        const editresults = await fetch(`${settings.pterodactyl_url}/api/application/servers/${req.params.id}/build`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${settings.pterodactyl_key}`
            },
            body: JSON.stringify({
                allocation: parseInt(server.attributes.allocation),
                cpu: newResources.cpu,
                memory: newResources.ram,
                disk: newResources.disk,
                swap: server.attributes.limits.swap,
                io: server.attributes.limits.io,
                feature_limits: {
                    databases: server.attributes.feature_limits.databases,
                    allocations: server.attributes.feature_limits.allocations,
                    backups: server.attributes.feature_limits.backups
                }
            })
        });

        if (!editresults.ok) return res.json({ error: `無法編輯伺服器。[F_EE1]` });

        const newCpu = user.used_cpu - server.attributes.limits.cpu + newResources.cpu;
        const newRam = user.used_ram - server.attributes.limits.memory + newResources.ram;
        const newDisk = user.used_disk - server.attributes.limits.disk + newResources.disk;

        await db.setUsed(req.session.account.email, newCpu, newRam, newDisk);

        res.json({ success: true });
        await sendServerWebhook(user, server, 'edited', `New Specs: ${newResources.cpu}% CPU, ${newResources.ram}MiB Ram, ${newResources.disk}MiB Disk`);
    } catch (error) {
        res.json({ error: "發生錯誤，請聯絡管理員。[F_GE2]" });
    }
});

router.delete('/delete/:id', async (req, res) => {
    try {
        const user = await db.getUser(req.session.account.email);
        const settings = await db.getSettings();
        const servers = await getPterodactylServerInfo(user, settings);

        if (!servers) return res.json({ error: 'Pterodactyl user not found' });

        const server = servers.find((server) => server.attributes.id === parseInt(req.params.id));
        if (!server) return res.json({ error: 'Server not found' });

        const deletionresults = await fetch(`${settings.pterodactyl_url}/api/application/servers/${req.params.id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${settings.pterodactyl_key}`
            }
        });

        if (!deletionresults.ok) return res.json({ error: 'Failed to delete server' });

        const newCpu = user.used_cpu - server.attributes.limits.cpu;
        const newRam = user.used_ram - server.attributes.limits.memory;
        const newDisk = user.used_disk - server.attributes.limits.disk;

        await db.removeRenewal(req.params.id);
        await db.setUsed(req.session.account.email, newCpu, newRam, newDisk);

        res.json({ success: true });
        await sendServerWebhook(user, server, 'Deleted', '');
    } catch (error) {
        res.json({ error: "發生錯誤，請聯絡管理員。[F_GE3]" });
    }
});

module.exports = router;
