const log = require('../../lib/logger');
const db = require('../../lib/database');
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const events = require('../../lib/events').eventBus;
const webhook = require('../../lib/webhook');

router.post('/install', async (req, res) => {
	const obj = JSON.parse(JSON.stringify(req.body));
	const body = JSON.parse(obj.data);
	const settings = await db.getSettings();
	if (settings.pterodactyl_url || settings.pterodactyl_key) return res.json({ error: 'Already installed' });
	await db.setSettings(body);
	res.json({ success: true });
});

router.get('/getName', async (req, res) => {
	const settings = await db.getSettings();
	res.json({ name: settings.name });
});

router.get('/getAD', async (req, res) => {
	const settings = await db.getSettings();
	if (!settings.enable_ad) {
		return res.json({ disabled: true })
	}
	const ads = await db.getAds();
	let randomIndex = Math.floor(Math.random() * ads.length);
	let randomAd = ads[randomIndex];
	return res.json(randomAd)
})


router.post('/nafs-create', async (req, res) => {
	const body = JSON.parse(JSON.stringify(req.body));
	const amount = body.amount;
	const rand = body.rand;

	function checkInt(num){
		return (typeof num === 'number' && Number.isInteger(num))
	}

	if (!checkInt(amount)) {
		return res.json({success: false, text: 'Amount is not int'})
	}

	function getRandomCharacter() {
		const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12345678';
		const randomIndex = Math.floor(Math.random() * chars.length);
		return chars[randomIndex];
	}
	
	function generateRandomString() {
		let randomString = 'NAFS-';
		for (let i = 0; i < 8; i++) {
			randomString += getRandomCharacter();
		}
		return randomString;
	}

	let checkSetCoupon = false;
	let generatedCouponCode = '';
	let loopcount = 0;
	while (!checkSetCoupon) {
		generatedCouponCode = generateRandomString();
		checkSetCoupon = db.createCoupon(generatedCouponCode, amount);
		loopcount ++
		if (loopcount > 5) {
			return res.json({
				success: false, text: 'Database Error'
			})
		}
	}
	
	res.json({ success: true, text: 'Created successfully', code:`${generatedCouponCode}`});
	webhook.info(`Coupon Created From NAF Store`, `**Code:** ${generatedCouponCode}\n**Amount:** ${amount}`);
});

router.post('/redeem', async (req, res) => {
	const body = JSON.parse(JSON.stringify(req.body));
	const couponCode = body.coupon;
	const checkCoins = await db.getCoupon(couponCode);
	if (!checkCoins){
		return res.json({ success: false, text: 'Coupon not found.' })
	}
	const userCoins = JSON.parse(JSON.stringify(await db.getUser(req.session.account.email))).coins;
	const coinsAddCoupon = parseInt(userCoins) + JSON.parse(JSON.stringify(checkCoins)).coin;
	const checkUpdateSuccess = await db.updateCoins(email=req.session.account.email, coins=parseInt(coinsAddCoupon));
	if (!checkUpdateSuccess) {
		return res.json({ success: false, text: 'Error occured during update user coins' });
	}
	const checkDeleteSuccess = await db.deleteCoupon(couponCode);
	if (!checkDeleteSuccess) {
		return res.json({ success: false, text: 'Error occured during delete coupon' });
	}
	res.json({ success: true, text: 'Code redeemed', coins: JSON.parse(JSON.stringify(checkCoins)).coin});
	webhook.info(`Coupon Redeemed`, `**User:** ${req.session.account.email}\n**Code:** ${couponCode}\n**Coins:** ${JSON.parse(JSON.stringify(checkCoins)).coin}`);
});

router.get('/me', async (req, res) => {
	if (!req.session.account) return res.json({ user: req.session.account });
	const user = await db.getUser(req.session.account.email);
	if (!user) return res.json({ user: req.session.account });
	const settings = await db.getSettings();
	if (!settings.pterodactyl_url) return res.json({ error: 'Pterodactyl URL not set' });
	if (!settings.pterodactyl_key) return res.json({ error: 'Pterodactyl Key not set' });
	const panelinfo_raw = await fetch(`${settings.pterodactyl_url}/api/application/users/${user.pterodactyl_id}?include=servers`, {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${settings.pterodactyl_key}`
		}
	});
	if ((await panelinfo_raw.statusText) === 'Not Found') return res.json({ error: 'Pterodactyl user not found' });
	const panelinfo = await panelinfo_raw.json();
	const package = await db.getPackage(user.package);
	const stats = {
		total_ram: package.ram + user.extra.ram,
		total_disk: package.disk + user.extra.disk,
		total_cpu: package.cpu + user.extra.cpu,
		used_ram: user.used_ram,
		used_cpu: user.used_cpu,
		used_disk: user.used_disk
	};
	req.session.account = user;
	let session = req.session.account;
	session.password = '';
	const renewals = await db.getUsersRenewals(req.session.account.email);
	renewals.forEach(async (renewal) => {
		const renewal_serverId = parseInt(renewal.server_id);
		const server = panelinfo.attributes.relationships.servers.data.findIndex((server) => server.attributes.id === renewal_serverId);
		panelinfo.attributes.relationships.servers.data[server].renew_by = renewal.renew_by;
		panelinfo.attributes.relationships.servers.data[server].renewal_enabled = renewal.renewal_enabled;
	});
	res.json({ user: session, stats: stats, servers: panelinfo.attributes.relationships.servers.data, ptero_user: panelinfo });
});

router.get('/dashboard-info', async (req, res) => {
	const settings = await db.getSettings();
	if (!settings.pterodactyl_url) return res.json({ error: 'Pterodactyl URL not set' });
	if (!settings.pterodactyl_key) return res.json({ error: 'Pterodactyl Key not set' });
	res.json({ discord_invite: settings.discord_invite, pterodactyl_url: settings.pterodactyl_url });
});

router.get('/afk', async (req, res) => {
	const settings = await db.getSettings();
	if (!settings.pterodactyl_url) return res.json({ error: 'Pterodactyl URL not set' });
	if (!settings.pterodactyl_key) return res.json({ error: 'Pterodactyl Key not set' });
	res.json({ afk_coins: settings.afk_coins, afk_interval: settings.afk_interval, arcio_code: settings.arcio_code });
});

router.ws('/afk', async (ws, req) => {
	const settings = await db.getSettings();
	const timeLoop = setInterval(async function () {
		ws.send(JSON.stringify({ time: 1 }));
	}, 1000)
	const loop = setInterval(async function () {
		const user = await db.getUser(req.session.account.email);
		const new_coins = parseInt(user.coins) + parseInt(settings.afk_coins);
		await db.updateCoins(user.email, parseInt(new_coins));
		ws.send(JSON.stringify({ coins: settings.afk_coins }));
	}, settings.afk_interval * 1000);

	const loop2 = setInterval(async function () {
		ws.send("stay alive pretty please thanks");
	}, 1000);

	ws.onclose = async () => {
		clearInterval(loop);
		clearInterval(loop2);
		clearInterval(timeLoop);
	};
});

router.ws('/watch', async (ws, req) => {
	events.on('userUpdate', async function (data) {
		if (data != req.session.account.email) return;
		const user = await db.getUser(data);
		const settings = await db.getSettings();
		const panelinfo_raw = await fetch(`${settings.pterodactyl_url}/api/application/users/${user.pterodactyl_id}?include=servers`, {
			method: 'get',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${settings.pterodactyl_key}`
			}
		});
		if ((await panelinfo_raw.statusText) === 'Not Found') return ws.send(JSON.stringify({ error: 'Pterodactyl user not found' }));
		const panelinfo = await panelinfo_raw.json();
		const package = await db.getPackage(user.package);
		const stats = {
			total_ram: package.ram + user.extra.ram,
			total_disk: package.disk + user.extra.disk,
			total_cpu: package.cpu + user.extra.cpu,
			used_ram: user.used_ram,
			used_cpu: user.used_cpu,
			used_disk: user.used_disk
		};
		ws.send(JSON.stringify({ user: user, servers: panelinfo.attributes.relationships.servers.data, stats: stats }));
	});

	const loop = setInterval(async function () {
		ws.send("This is a websocket message that check if you are alive. If you see this, are you gay?");
	}, 1000);

	ws.onclose = async () => {
		clearInterval(loop);
	};
});

router.post('/reset-password', async (req, res) => {
	if (!req.session.account.email) return res.json({ error: "No email found in session." })
	const settings = await db.getSettings()
	const user = await db.getUser(req.session.account.email)
	const generated_password = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
	const panelinfo_raw = await fetch(`${settings.pterodactyl_url}/api/application/users/${user.pterodactyl_id}`, {
		method: 'get',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${settings.pterodactyl_key}`
		}
	});
	if ((await panelinfo_raw.statusText) === 'Not Found') return res.json({ error: 'Pterodactyl user not found' });
	const panelinfo = await panelinfo_raw.json();
	await db.updatePassword(req.session.account.email, generated_password)
	await fetch(`${settings.pterodactyl_url}/api/application/users/${user.pterodactyl_id}`, {
		method: 'patch',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${settings.pterodactyl_key}`
		},
		body: JSON.stringify({
			username: panelinfo.attributes.username,
			email: panelinfo.attributes.email,
			first_name: panelinfo.attributes.first_name,
			last_name: panelinfo.attributes.last_name,
			password: generated_password
		})
	})
	return res.json({ success: true, password: generated_password })
})

router.use('/auth', require('./auth/index.js'));
router.use('/renew', require('./renew/index.js'));
router.use('/server', require('./server/index.js'));
router.use('/store', require('./store/index.js'));
router.use('/admin', require('./admin/index.js'));

module.exports = router;
