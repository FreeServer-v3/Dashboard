// ========== 必要的模組引入 ==========
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const fetch = require('node-fetch');

// ========== 自訂模組引入 ==========
const { loadWebconfig } = require('./lib/functions');
const log = require('./lib/logger');
const db = require('./lib/database');
const webhook = require('./lib/webhook');

// ========== 配置和應用基本設置 ==========
const app = express();
require('express-ws')(app);
const webconfig = loadWebconfig();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.enable('trust proxy');

// ========== 設定CORS ==========
app.use(
	cors({
		origin: webconfig.dashboard_url,
		credentials: true,
		optionsSuccessStatus: 200 // 一些舊版瀏覽器會對204狀態碼出錯
	})
);

// ========== 設定Session存儲於MongoDB ==========
const store = new MongoDBStore({
	uri: webconfig.connection_uri,
	databaseName: webconfig.database,
	collection: 'sessions'
});

store.on('error', function (error) {
	log.error(error);
});

app.use(
	session({
		secret: webconfig.secret,
		resave: false,
		saveUninitialized: true,
		cookie: {
			secure: webconfig.ssl
		},
		store: store
	})
);

// ========== 可重用的函式 ========== // 這邊可以抽出來變獨立檔案給其他地方引用
/**
 * 發送API請求
 */
const sendApiRequest = async (url, method, headers, body = null) => {
	const options = {
		method,
		headers
	};
	if (body) {
		options.body = JSON.stringify(body);
	}
	const response = await fetch(url, options);
	return response;
};

/**
 * 取得用戶信息
 */
const getUserInfo = async (userEmail) => {
	const user = await db.getUser(userEmail);
	if (!user) throw new Error('User not found');
	const settings = await db.getSettings();
	return { user, settings };
};

/**
 * 取得用戶伺服器列表
 */
const getUserServers = async function (user) {
	const { user: getUser, settings } = await getUserInfo(user);
	const panelinfo_raw = await sendApiRequest(
		`${settings.pterodactyl_url}/api/application/users/${getUser.pterodactyl_id}?include=servers`,
		'get',
		{
			'Content-Type': 'application/json',
			Authorization: `Bearer ${settings.pterodactyl_key}`
		}
	);

	if (panelinfo_raw.statusText === 'Not Found') return false;
	const panelinfo = await panelinfo_raw.json();
	return { servers: panelinfo.attributes.relationships.servers.data };
};

/**
 * 設置或更新伺服器資源配置
 */
const updateServerResources = async (server_id, settings) => {
	await sendApiRequest(
		`${settings.pterodactyl_url}/api/application/servers/${server_id}/build`,
		'patch',
		{
			'Content-Type': 'application/json',
			Authorization: `Bearer ${settings.pterodactyl_key}`
		},
		{
			allocation: 1,
			cpu: 1,
			memory: 1,
			disk: 1,
			swap: 1,
			io: 1,
			feature_limits: {
				databases: 1,
				allocations: 1,
				backups: 1
			}
		}
	);
};

// ========== 定期檢查函數 ==========
/**
 * 定期檢查用戶資源並計費
 */
const checkSpecsPaid = async function () {
	const cycles = await db.getCycles();
	const now = Date.now();
	const settings = await db.getSettings();

	const priceCPU = parseInt(settings.cpu_price);
	const priceRam = parseInt(settings.ram_price);
	const priceDisk = parseInt(settings.disk_price);

	for (const cycle of cycles) {
		if (cycle.next_expire >= now) continue;

		const getUser = await db.getUser(cycle.user);
		const userCoins = getUser.coins;
		let cycleMultiplier;

		switch (cycle.cycle) {
			case 'daily':
				cycleMultiplier = parseInt(settings.day_multiplier) / 25;
				break;
			case 'weekly':
				cycleMultiplier = parseInt(settings.week_multiplier) / 4;
				break;
			case 'monthly':
				cycleMultiplier = 1;
				break;
			default:
				cycleMultiplier = 1;
		}

		const newCPU = getUser.extra.cpu / 100;
		const newRam = getUser.extra.ram / 1024;
		const newDisk = getUser.extra.disk / 1024;
		const subtotal = Math.ceil((newCPU * priceCPU + newRam * priceRam + newDisk * priceDisk) * cycleMultiplier);

		if (subtotal === 0) continue;

		if (subtotal <= userCoins) {
			await db.updateCoins(cycle.user, userCoins - subtotal);
			webhook.info('Specs Paid', `**User:** ${cycle.user}\n**Cycle:** ${cycle.cycle}\n**Coins:** ${subtotal}`);
			await db.setNextCycleExpire(cycle.user, false);
		} else {
			const servers = (await getUserServers(cycle.user)).servers;
			for (const server of servers) {
				await updateServerResources(server.attributes.id, settings);
			}
			await db.updateExtraCpu(cycle.user, 0);
			await db.updateExtraRam(cycle.user, 0);
			await db.updateExtraDisk(cycle.user, 0);
			await db.clearUsed(cycle.user, servers.length);
		}
	}
};

/**
 * 定期檢查伺服器續訂狀況
 */
const checkRenewals = async function () {
	const renewals = await db.getRenewals();
	const now = Date.now();

	for (const renewal of renewals) {
		if (!renewal.renewal_enabled || renewal.renew_by >= now) continue;

		const fiveday = new Date(renewal.renew_by);
		fiveday.setTime(fiveday.getTime() + 3 * 24 * 60 * 60 * 1000);

		const { user, settings } = await getUserInfo(renewal.email);
		const panelinfo_raw = await sendApiRequest(
			`${settings.pterodactyl_url}/api/application/users/${user.pterodactyl_id}?include=servers`,
			'get',
			{
				'Content-Type': 'application/json',
				Authorization: `Bearer ${settings.pterodactyl_key}`
			}
		);

		const panelinfo = await panelinfo_raw.json();
		const servers = panelinfo.attributes.relationships.servers.data;
		const server = servers.find((server) => server.attributes.id === renewal.server_id);

		if (fiveday.getTime() < now) {
			// 刪除伺服器
			await sendApiRequest(
				`${settings.pterodactyl_url}/api/application/servers/${renewal.server_id}`,
				'delete',
				{
					'Content-Type': 'application/json',
					Authorization: `Bearer ${settings.pterodactyl_key}`
				}
			);

			const newCpu = parseInt(user.used_cpu) - parseInt(server.attributes.limits.cpu);
			const newRam = parseInt(user.used_ram) - parseInt(server.attributes.limits.memory);
			const newDisk = parseInt(user.used_disk) - parseInt(server.attributes.limits.disk);
			await db.removeRenewal(renewal.server_id);
			await db.setUsed(renewal.email, parseInt(newCpu), parseInt(newRam), parseInt(newDisk));

			webhook.info('Server Deleted BY renewal', `**User:** ${user.username}\n**Server Name:** ${server.attributes.name}\n**Server ID:** ${renewal.server_id}`);
		} else {
			// 暫停伺服器
			await sendApiRequest(
				`${settings.pterodactyl_url}/api/application/servers/${renewal.server_id}/suspend`,
				'post',
				{
					'Content-Type': 'application/json',
					Authorization: `Bearer ${settings.pterodactyl_key}`
				}
			);
		}
	}
};

// ========== 定期任務 ==========
setInterval(checkSpecsPaid, 30000);
setInterval(checkRenewals, 30000);

// ========== 路由處理 ==========
/**
 * 用戶認證與安裝路由
 */
app.post('/install', async (req, res) => {
	const obj = JSON.parse(JSON.stringify(req.body));
	const body = JSON.parse(obj.data);
	const settings = await db.getSettings();
	if (settings.pterodactyl_url || settings.pterodactyl_key) return res.json({ error: 'Already installed' });
	await db.setSettings(body);
	res.json({ success: true });
});

app.get('/', async (req, res) => {
	if (!req.session.account || !req.session.account.email) return res.redirect('/auth/login');
	res.redirect('/dashboard');
});

app.get('/auth/logout', async (req, res) => {
	req.session.destroy();
	res.redirect('/auth/login');
});

/**
 * Discord認證流程
 */
app.get('/auth/discord', async (req, res) => {
	const settings = await db.getSettings();
	if (!settings.application_url) return res.send("Application URL not set in database. Please set now.");
	res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${settings.discord_id}&redirect_uri=${encodeURIComponent(`${settings.application_url}/auth/discord/callback`)}&response_type=code&scope=identify%20email%20guilds%20guilds.join`);
});

app.get('/auth/discord/callback', async (req, res) => {
	if (!req.query.code) return res.send("Discord did not return an authorization code. Cannot continue.");

	const settings = await db.getSettings();
	const oauth2Token = await sendApiRequest(
		'https://discord.com/api/oauth2/token',
		'post',
		{ 'Content-Type': 'application/x-www-form-urlencoded' },
		{
			client_id: settings.discord_id,
			client_secret: settings.discord_secret,
			grant_type: 'authorization_code',
			code: encodeURIComponent(req.query.code),
			redirect_uri: encodeURIComponent(`${settings.application_url}/auth/discord/callback`)
		}
	);

	if (!oauth2Token.ok) return res.send("Discord sent an invalid authorization code. Cannot continue.");
	const tokenInfo = JSON.parse(await oauth2Token.text());
	const scopes = tokenInfo.scope;

	if (!scopes.includes('identify') || !scopes.includes('guilds.join') || !scopes.includes('email') || !scopes.includes('guilds')) return res.redirect('/auth/login');

	const userinfo_raw = await sendApiRequest(
		'https://discord.com/api/users/@me',
		'get',
		{
			Authorization: `Bearer ${tokenInfo.access_token}`
		}
	);

	const userinfo = await userinfo_raw.json();
	if (!userinfo.verified) return res.send("Discord account is not verified.");

	const guildinfo_raw = await sendApiRequest(
		'https://discord.com/api/users/@me/guilds',
		'get',
		{
			Authorization: `Bearer ${tokenInfo.access_token}`
		}
	);

	const guilds = await guildinfo_raw.json();
	if (!Array.isArray(guilds)) return res.send("An error occurred when fetching guilds.");

	userinfo.access_token = tokenInfo.access_token;
	userinfo.guilds = guilds;

	const check_if_banned = (await sendApiRequest(
		`https://discord.com/api/guilds/${settings.discord_guild}/bans/${userinfo.id}`,
		'get',
		{
			'Content-Type': 'application/json',
			Authorization: `Bot ${settings.discord_token}`
		}
	)).status;

	if (check_if_banned === 200) {
		return res.send("Cannot register, you are banned from the host's discord.");
	} else if (check_if_banned === 404) {
		await sendApiRequest(
			`https://discord.com/api/guilds/${settings.discord_guild}/members/${userinfo.id}`,
			'put',
			{
				'Content-Type': 'application/json',
				Authorization: `Bot ${settings.discord_token}`
			},
			{
				access_token: tokenInfo.access_token
			}
		);
	} else {
		log.error(`[AUTO JOIN SERVER] Unexpected status code: ${check_if_banned}.`);
	}

	await sendApiRequest(
		`https://discord.com/api/guilds/${settings.discord_guild}/members/${userinfo.id}/roles/${settings.registered_role}`,
		'put',
		{
			'Content-Type': 'application/json',
			Authorization: `Bot ${settings.discord_token}`
		}
	);

	const userindb = await db.getUser(userinfo.email);
	if (!userindb) {
		const generated_password = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
		const created = await db.createUser(userinfo.id, userinfo.email, generated_password, "");
		if (created !== true) return res.json({ error: created });
		const user = await db.getUser(userinfo.email);
		user._id = user._id.toString();

		const data = await sendApiRequest(
			settings.pterodactyl_url + '/api/application/users',
			'post',
			{
				'Content-Type': 'application/json',
				Authorization: `Bearer ${settings.pterodactyl_key}`
			},
			{
				username: userinfo.id,
				email: user.email,
				first_name: userinfo.discriminator,
				last_name: userinfo.username,
				password: generated_password
			}
		);

		if (data.status === 201) {
			const account = await data.json();
			db.setUserPteroID(user.username, account.attributes.id);
		} else if (data.status === 403) {
			log.error('The API key is invalid or has insufficient permissions.');
			return res.json({ error: 'Failed to create user on panel. Please contact an administrator.' });
		}

		req.session.account = user;
		req.session.save();
		res.redirect(`/dashboard?generatedpassword=${generated_password}`);
		webhook.info(`Registered`, `**Username:** ${user.username}\n**Email:** ${user.email}`);
	} else {
		req.session.account = userindb;
		req.session.save();
		res.redirect(`/dashboard`);
		webhook.info(`Login`, `**Username:** ${userindb.username}\n**Email:** ${userindb.email}`);
	}
});

// ========== 頁面路由 ==========
/**
 * 安裝頁面路由
 */
app.use('*', async (req, res, next) => {
	const pathname = req._parsedUrl.pathname;
	const settings = await db.getSettings();
	if (!settings.pterodactyl_url || !settings.pterodactyl_key) {
		if (!pathname.includes('/api/')) {
			return res.sendFile('./install.html', { root: path.join(__dirname, './') });
		}
	}
	next();
});

/**
 * 靜態文件和其他路由處理
 */
app.use(express.static(path.resolve(__dirname, './frontend/dist')));
app.use(require('./router/index.js'));

app.get('*', async (req, res) => {
	const pathname = req._parsedUrl.pathname;
	if (!pathname.includes('/auth/')) {
		if (!req.session.account || !req.session.account.email) {
			if (req.headers.api) {
				const key = await db.getApiKey();
				if (!key) return res.json({ error: "Invalid API key" });
				await db.setLastUsedApiKey(key.key);
			} else {
				return res.redirect('/auth/login');
			}
		}
		const user = await db.getUser(req.session.account.email);
		if (!user) return res.redirect('/auth/login');
	}
	res.sendFile(path.resolve(__dirname, './frontend/dist', 'index.html'));
});

// ========== 伺服器啟動 ==========
app.listen(webconfig.port, () => {
	log.web(`Server started on port ${webconfig.port}`);
	webhook.success(`Dashboard`, `Dashactyl has started on port ${webconfig.port}. URL: ${webconfig.dashboard_url}`);
});
