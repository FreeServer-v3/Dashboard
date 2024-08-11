const db = require('../../../lib/database');
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const webhook = require('../../../lib/webhook');

let tmp = {};

router.post('/create', async (req, res) => {
	if (
		tmp[req.session.account.pterodactyl_id] &&
		Date.now() - tmp[req.session.account.pterodactyl_id] <  7500
	) {
		return res.json({ error: "剛才已創建過，請稍後再試。" })
	}
	tmp[req.session.account.pterodactyl_id] = Date.now();
	const user = await db.getUser(req.session.account.email);
	const package = await db.getPackage(user.package);
	const available_cpu = package.cpu + user.extra.cpu - user.used_cpu;
	const available_ram = package.ram + user.extra.ram - user.used_ram;
	const available_disk = package.disk + user.extra.disk - user.used_disk;
	if (available_cpu < req.body.cpu || available_ram < req.body.ram || available_disk < req.body.disk) return res.json({ error: '你擁有的資源不足，請購買更多資源或降低其他伺服器用量。[F_EC2]' });

	if (parseInt(req.body.cpu) < 10 || parseInt(req.body.ram) < 128 || parseInt(req.body.disk) < 128) return res.json({ error: 'CPU 最小數值為 10%，記憶體與儲存空間至少需要 128MiB，請檢查是否數值過小。[F_EC3]' });
	if (parseInt(req.body.cpu) > 1600 || parseInt(req.body.ram) > 32768 || parseInt(req.body.disk) > 262144) return res.json({ error: '單台伺服器最大配置為: CPU 1600%, 記憶體 32GiB, 硬碟 256GiB。如果您有更大的需求，請使用 Discord 的管理員信箱功能聯繫我們。[F_EC10]' });

	if (Number.isInteger(parseInt(req.body.cpu)) === false || Number.isInteger(parseInt(req.body.ram)) === false || Number.isInteger(parseInt(req.body.disk)) === false) return res.json({ error: '你輸入的好像不是數字? [F_EC4]' });

	const settings = await db.getSettings();

	const egg = await db.getEgg(req.body.egg);

	if (!egg) return res.json({ error: "找不到創建類型。[F_EC5]" })

	const location = await db.getLocation(req.body.location);

	if (!location) return res.json({ error: "所選之節點無效，或已被移除。[F_EC6]" })

	if (location.enabled === false) return res.json({ error: "這個節點暫時無法創建伺服器。請嘗試其他的節點。[F_EC7]" })

	let environment

	try {
		environment = JSON.parse(egg.environment);
	} catch {
		return res.json({ error: "發生錯誤，請聯絡管理員。[F_EC1]" })
	}

	const serverinfo_req = await fetch(`${settings.pterodactyl_url}/api/application/servers`, {
		method: 'post',
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
			environment: environment,
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
		return res.json({ error: "你切錯帳號了 [F_EC8]" })
	}

	if (serverinfo_req.statusText !== 'Created') {
		const status = await serverinfo_req.text();
		console.log(status)
		return res.send({ error: '創建時發生了點問題，請聯絡管理員。[F_EC11]' });
	}

	const added = await db.addUsed(user.email, req.body.cpu, req.body.ram, req.body.disk);

	if (added != true) return res.json({ error: '資料庫錯誤，請聯絡管理員。[F_EC9]'});

	const serverInfo = await serverinfo_req.json();

	await db.addRenewal(user.email, serverInfo.attributes.id);

	res.send({ success: true });
	webhook.info(`Server Created`, `**User:** ${user.username} (${user.email})\n**Server:** ${serverInfo.attributes.name}\n**CPU:** ${req.body.cpu}\n**RAM:** ${req.body.ram}\n**Disk:** ${req.body.disk}`);
});

router.get('/get/:id', async (req, res) => {
	const params_id = parseInt(req.params.id);
	const user = await db.getUser(req.session.account.email);
	const settings = await db.getSettings();
	const panelinfo_raw = await fetch(`${settings.pterodactyl_url}/api/application/users/${user.pterodactyl_id}?include=servers`, {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${settings.pterodactyl_key}`
		}
	});
	if ((await panelinfo_raw.statusText) === 'Not Found') return res.send({ error: 'Pterodactyl user not found' });
	const panelinfo = await panelinfo_raw.json();
	const servers = panelinfo.attributes.relationships.servers.data;
	const server = servers.find((server) => server.attributes.id === params_id);
	if (!server) return res.send({ error: 'Server not found' });
	res.send({ server: server });
});

router.patch('/edit/:id', async (req, res) => {
	const params_id = parseInt(req.params.id);
	const user = await db.getUser(req.session.account.email);
	const package = await db.getPackage(user.package);
	const available_cpu = package.cpu + user.extra.cpu
	const available_ram = package.ram + user.extra.ram
	const available_disk = package.disk + user.extra.disk

	const body = JSON.parse(JSON.stringify(req.body));
	const updateRam = body.ram;
	const updateDisk = body.disk;
	const updateCPU = body.cpu;
	if (parseInt(updateCPU) < 10 || parseInt(updateRam) < 128 || parseInt(updateDisk) < 128) return res.json({ error: 'CPU 最小數值為 10%，記憶體與儲存空間至少需要 128MiB，請檢查是否數值過小。[F_EC3]' });

	const settings = await db.getSettings();
	const panelinfo_raw = await fetch(`${settings.pterodactyl_url}/api/application/users/${user.pterodactyl_id}?include=servers`, {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${settings.pterodactyl_key}`
		}
	});
	if ((await panelinfo_raw.statusText) === 'Not Found') return res.send({ error: 'Pterodactyl user not found' });
	const panelinfo = await panelinfo_raw.json();
	const servers = panelinfo.attributes.relationships.servers.data;
	const server = servers.find((server) => server.attributes.id === params_id);
	if (!server) return res.send({ error: 'Server not found' });

	const newCpu = parseInt(user.used_cpu) - parseInt(server.attributes.limits.cpu) + parseInt(updateCPU);
	const newRam = parseInt(user.used_ram) - parseInt(server.attributes.limits.memory) + parseInt(updateRam);
	const newDisk = parseInt(user.used_disk) - parseInt(server.attributes.limits.disk) + parseInt(updateDisk);
	if (available_cpu < newCpu || available_ram < newRam || available_disk < newDisk) return res.json({ error: '你擁有的資源不足，請購買更多資源或降低其他伺服器用量。[F_EC2]' });
	if (parseInt(updateCPU) > 1600 || parseInt(updateRam) > 32768 || parseInt(updateDisk) > 262144) return res.json({ error: '單台伺服器最大配置為: CPU 1600%, 記憶體 32GiB, 硬碟 256GiB。如果您有更大的需求，請使用 Discord 的管理員信箱功能聯繫我們。[F_EC10]' });

	const editresults = await fetch(`${settings.pterodactyl_url}/api/application/servers/${req.params.id}/build`, {
		method: 'patch',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${settings.pterodactyl_key}`
		},
		body: JSON.stringify({
			allocation: parseInt(server.attributes.allocation),
			cpu: parseInt(updateCPU),
			memory: parseInt(updateRam),
			disk: parseInt(updateDisk),
			swap: parseInt(server.attributes.limits.swap),
			io: parseInt(server.attributes.limits.io),
			feature_limits: {
			  databases: parseInt(server.attributes.feature_limits.databases),
			  allocations: parseInt(server.attributes.feature_limits.allocations),
			  backups: parseInt(server.attributes.feature_limits.backups)
			}
		})
	});

	if (!editresults.ok) return res.send({ error: `無法編輯伺服器。[F_EE1]` });

	await db.setUsed(req.session.account.email, parseInt(newCpu), parseInt(newRam), parseInt(newDisk));
	res.send({ success: true });
	webhook.info(`Server edited`, `**User:** ${user.username}\n**Server Name:** ${server.attributes.name}\n**Server ID:** ${req.params.id}\nNew Specs: ${updateCPU}% CPU, ${updateRam}MiB Ram, ${updateDisk}MiB Disk`);
})

// --TODO--
router.post('/forcereinstall/:id', async (req, res) => {
	const user = await db.getUser(req.session.account.email);
	const settings = await db.getSettings();
	const panelinfo_raw = await fetch(``)
})

router.delete('/delete/:id', async (req, res) => {
	const params_id = parseInt(req.params.id);
	const user = await db.getUser(req.session.account.email);
	const settings = await db.getSettings();
	const panelinfo_raw = await fetch(`${settings.pterodactyl_url}/api/application/users/${user.pterodactyl_id}?include=servers`, {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${settings.pterodactyl_key}`
		}
	});
	if ((await panelinfo_raw.statusText) === 'Not Found') return res.send({ error: 'Pterodactyl user not found' });
	const panelinfo = await panelinfo_raw.json();
	const servers = panelinfo.attributes.relationships.servers.data;
	const server = servers.find((server) => server.attributes.id === params_id);
	if (!server) return res.send({ error: 'Server not found' });
	const deletionresults = await fetch(`${settings.pterodactyl_url}/api/application/servers/${req.params.id}`, {
		method: 'delete',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${settings.pterodactyl_key}`
		}
	});
	if (!deletionresults.ok) return res.send({ error: 'Failed to delete server' });
	const newCpu = parseInt(user.used_cpu) - parseInt(server.attributes.limits.cpu);
	const newRam = parseInt(user.used_ram) - parseInt(server.attributes.limits.memory);
	const newDisk = parseInt(user.used_disk) - parseInt(server.attributes.limits.disk);
	await db.removeRenewal(req.params.id); // 這邊傳入了字串，可能會有問題，要看removeRenewal是怎麼實現

	await db.setUsed(req.session.account.email, parseInt(newCpu), parseInt(newRam), parseInt(newDisk));
	res.send({ success: true });
	webhook.info(`Server Deleted`, `**User:** ${user.username}\n**Server Name:** ${server.attributes.name}\n**Server ID:** ${req.params.id}`);
});

module.exports = router;
