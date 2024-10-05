// ========== 模組引入 ==========
const { MongoClient } = require('mongodb');
const log = require('./logger');
const functions = require('./functions');
const bcrypt = require('bcrypt');
const fetch = require('node-fetch');
const { generateApiKey } = require('generate-api-key');
const saltRounds = 10;
const events = require('./events').eventBus;

// ========== 加載配置 ==========
const webconfig = functions.loadWebconfig();

let client;
let db;

// ========== 資料庫連接設置 ==========
if (!webconfig.connection_uri) {
	log.error('There is no connection URI set in webconfig.yml. Please set this.').then(() => {
		process.exit(1);
	});
} else {
	client = new MongoClient(webconfig.connection_uri);
	db = client.db(webconfig.database);
}

(async () => {
	await client.connect();
	log.database('Connected to the database.');

	/*
	// 初始用戶範例
	const collection = db.collection("users");
	const password = "123456";
	bcrypt.genSalt(saltRounds, function (err, salt) {
		bcrypt.hash(password, salt, async function (err, hash) {
			await collection.insertOne({
				username: "jamie",
				email: "volcanomonster07@gmail.com",
				pterodactyl_id: "",
				password: hash,
				used_ram: 0,
				used_cpu: 0,
				used_disk: 0,
				package: "default",
				extra: {
					ram: 0,
					cpu: 0,
					disk: 0
				}
			});
		});
	});
	*/

	// 初始化資料庫集合
	const COLLECTIONS = ['settings', 'users', 'sessions', 'packages', 'eggs', 'locations', 'renewals', 'api-keys'];
	for (const coll of COLLECTIONS) {
		await initializeCollection(coll);
	}
})();

// ========== 可重用的函式 ==========
/**
 * 初始化資料庫集合
 */
async function initializeCollection(collectionName) {
	const collectionExists = await db.listCollections({ name: collectionName }).hasNext();
	if (!collectionExists) {
		await db.createCollection(collectionName, async (err, doc) => {
			if (err) {
				log.error(`There was an error while creating the '${collectionName}' collection in the database. ` + 'Please make sure that the connection URI is correct and that the user ' + 'has the correct permissions to create collections.');
			} else {
				log.database(`Created the '${collectionName}' collection.`);
				await initializeCollectionData(collectionName, doc);
			}
		});
	}
}

/**
 * 初始化集合中的數據
 */
async function initializeCollectionData(collectionName, doc) {
	if (collectionName === 'settings') {
		await doc.insertOne({
			id: 1,
			name: 'Dashactyl',
			host_name: '',
			application_url: '',
			pterodactyl_url: '',
			pterodactyl_key: '',
			discord_invite: '',
			discord_id: '',
			discord_secret: '',
			discord_token: '',
			discord_webhook: '',
			discord_guild: '',
			registered_role: '',
			default_package: 'default',
			afk_interval: 0,
			afk_coins: 0,
			arcio_code: '',
			ram_price: 0,
			cpu_price: 0,
			disk_price: 0
		});
	} else if (collectionName === 'packages') {
		await doc.insertOne({
			name: 'default',
			ram: 1024,
			cpu: 100,
			disk: 1024,
			price: 100,
			renewal_enabled: false,
			renewal_time: 604800000,
			renewal_price: 100,
			default: true
		});
	}
}

/**
 * 更新用戶使用資源
 */
async function updateUserUsage(email, updateFields) {
	const collection = db.collection('users');
	await collection.updateOne({ email: email }, { $set: updateFields });
	events.emit('userUpdate', email);
}

/**
 * 查找集合中的單一文件
 */
async function findOneInCollection(collectionName, query) {
	const collection = db.collection(collectionName);
	return await collection.findOne(query);
}

/**
 * 查找集合中的多個文件
 */
async function findInCollection(collectionName, query = {}) {
	const collection = db.collection(collectionName);
	return await collection.find(query).toArray();
}

// ========== 模組導出 ==========
module.exports = {
	clearUsed: async function (email, servercount) {
		await updateUserUsage(email, {
			used_ram: servercount,
			used_cpu: servercount,
			used_disk: servercount
		});
		return true;
	},
	getCycles: async function () {
		return await findInCollection('cycle');
	},
	getUserCycle: async function (user) {
		const userCycle = await findOneInCollection('cycle', { user: user });
		return userCycle || false;
	},
	setNextCycleExpire: async function (user, isInit) {
		const userCycle = await findOneInCollection('cycle', { user: user });
		if (!userCycle) return false;

		let days = 0;
		const cycletype = userCycle.cycle;
		switch (cycletype) {
			case 'daily':
				days = 1;
				break;
			case 'weekly':
				days = 7;
				break;
			case 'monthly':
				days = 30;
				break;
		}

		let newTimeStamp = 0;
		const now = new Date();
		if (isInit) {
			const newExpiryDate = new Date(now);
			newExpiryDate.setDate(now.getDate() + days);
			newTimeStamp = newExpiryDate.getTime();
		} else {
			const olddate = new Date(userCycle.next_expire);
			const newExpiryDate = new Date(olddate);
			newExpiryDate.setDate(newExpiryDate.getDate() + days);
			newTimeStamp = newExpiryDate.getTime();
		}

		await db.collection('cycle').updateOne({ user: user }, { $set: { next_expire: newTimeStamp } });
		return true;
	},
	updateUserCycle: async function (user, cycle) {
		const userCycle = await findOneInCollection('cycle', { user: user });
		if (!userCycle) return false;

		await db.collection('cycle').updateOne({ user: user }, { $set: { cycle: cycle } });
		return true;
	},
	createUserCycle: async function (user) {
		const userCycle = await findOneInCollection('cycle', { user: user });
		if (userCycle) return false;

		await db.collection('cycle').insertOne({
			user: user,
			cycle: 'daily',
			next_expire: 0
		});
		return 'success';
	},
	getSpecsPaid: async function (user) {
		const userSpecs = await findOneInCollection('users', { email: user });
		const userCycle = await findOneInCollection('cycle', { user: user });
		const settings = await findOneInCollection('settings', { name: 'Dashactyl' });

		if (!userSpecs || !userCycle || !settings) return false;

		const usrCPU = parseInt(userSpecs.extra.cpu);
		const usrRam = parseInt(userSpecs.extra.ram);
		const usrDisk = parseInt(userSpecs.extra.disk);

		let cycleMultiplier;
		switch (userCycle.cycle) {
			case 'daily':
				cycleMultiplier = parseInt(settings.day_mutliplier);
				break;
			case 'weekly':
				cycleMultiplier = parseInt(settings.week_multiplier);
				break;
			case 'monthly':
				cycleMultiplier = 1;
				break;
		}

		const priceCPU = parseInt(settings.cpu_price);
		const priceRam = parseInt(settings.ram_price);
		const priceDisk = parseInt(settings.disk_price);

		const subtotal = Math.ceil((usrCPU * priceCPU + usrRam * priceRam + usrDisk * priceDisk) * cycleMultiplier);
		return subtotal;
	},
	getCoupon: async function (couponCode) {
		return await findOneInCollection('coupons', { code: couponCode }) || false;
	},
	createCoupon: async function (couponCode, coins) {
		const couponExists = await findOneInCollection('coupons', { code: couponCode });
		if (couponExists) return false;

		await db.collection('coupons').insertOne({
			code: couponCode,
			coin: coins
		});
		return true;
	},
	deleteCoupon: async function (couponCode) {
		const couponExists = await findOneInCollection('coupons', { code: couponCode });
		if (!couponExists) return false;

		await db.collection('coupons').deleteOne({ code: couponCode });
		return true;
	},
	getSettings: async function () {
		const settings = await findInCollection('settings');
		return settings[0];
	},
	setSettings: async function (body) {
		await db.collection('settings').updateOne(
			{ id: 1 },
			{
				$set: {
					host_name: body.host_name,
					application_url: body.application_url,
					pterodactyl_url: body.pterodactyl_url,
					pterodactyl_key: body.pterodactyl_key,
					discord_invite: body.discord_invite,
					discord_id: body.discord_id,
					discord_secret: body.discord_secret,
					discord_token: body.discord_token,
					discord_webhook: body.discord_webhook,
					discord_guild: body.discord_guild,
					registered_role: body.registered_role,
					afk_coins: body.afk_coins,
					arcio_code: body.arcio_code,
					afk_interval: body.afk_interval,
					ram_price: body.ram_price,
					cpu_price: body.cpu_price,
					disk_price: body.disk_price
				}
			}
		);
		return true;
	},
	getUser: async function (email) {
		return await findOneInCollection('users', { email: email });
	},
	getUserFromID: async function (id) {
		return await findOneInCollection('users', { username: id });
	},
	getUserUsername: async function (username) {
		return await findOneInCollection('users', { username: username });
	},
	setUserPteroID: async function (username, id) {
		await db.collection('users').updateOne({ username: username }, { $set: { pterodactyl_id: id } });
		return true;
	},
	verifyPassword: async function (email, password) {
		const user = await findOneInCollection('users', { email: email });
		if (!user) return false;

		return new Promise((resolve, reject) => {
			bcrypt.compare(password, user.password, function (err, result) {
				if (result === true) {
					resolve(true);
				} else {
					reject(false);
				}
			});
		});
	},
	matchPasswords: async function (email, password) {
		const user = await findOneInCollection('users', { email: email });
		if (!user) return false;
		return user.password === password;
	},
	createUser: async function (username, email, password, ip) {
		const settings = await this.getSettings();
		const emailExists = await findOneInCollection('users', { email: email });
		const usernameExists = await findOneInCollection('users', { username: username });

		if (emailExists) return 'That email address is already in use.';
		if (usernameExists) return 'That username is already in use.';

		return new Promise((resolve, reject) => {
			bcrypt.genSalt(saltRounds, function (err, salt) {
				bcrypt.hash(password, salt, async function (err, hash) {
					await db.collection('users').insertOne({
						username: username,
						email: email,
						pterodactyl_id: '',
						password: hash,
						used_ram: 0,
						used_cpu: 0,
						used_disk: 0,
						package: settings.default_package,
						extra: {
							ram: 0,
							cpu: 0,
							disk: 0
						},
						coins: 0,
						registered_ip: ip,
						lastlogin_ip: ip
					});
					resolve(true);
				});
			});
		});
	},
	updatePassword: async function (email, password) {
		return new Promise((resolve, reject) => {
			bcrypt.genSalt(saltRounds, function (err, salt) {
				bcrypt.hash(password, salt, async function (err, hash) {
					await db.collection('users').updateOne({ email: email }, { $set: { password: hash } });
					resolve();
				});
			});
		});
	},
	getPackage: async function (name) {
		return await findOneInCollection('packages', { name: name });
	},
	addPackage: async function (data) {
		await db.collection('packages').insertOne({
			name: data.name,
			ram: parseInt(data.ram),
			cpu: parseInt(data.cpu),
			disk: parseInt(data.disk),
			price: parseInt(data.price),
			renewal_enabled: data.renewal_enabled,
			renewal_time: parseInt(data.renewal_time),
			renewal_price: parseInt(data.renewal_price),
			default: false
		});
		return true;
	},
	addEgg: async function (data) {
		await db.collection('eggs').insertOne({
			name: data.name,
			id: data.egg_id,
			docker_image: data.egg_docker_image,
			startup: data.egg_startup,
			databases: data.egg_databases,
			backups: data.egg_backups,
			environment: data.egg_environment
		});
		return true;
	},
	getEggs: async function () {
		return await findInCollection('eggs');
	},
	getEgg: async function (name) {
		return await findOneInCollection('eggs', { name: name });
	},
	addLocation: async function (data) {
		await db.collection('locations').insertOne({
			id: data.location_id,
			name: data.name,
			enabled: data.location_enabled
		});
		return true;
	},
	updateLocationStatus: async function (data) {
		await db.collection('locations').updateOne({ id: data.location }, { $set: { enabled: data.status } });
		return true;
	},
	getLocations: async function () {
		return await findInCollection('locations');
	},
	getLocation: async function (name) {
		return await findOneInCollection('locations', { name: name });
	},
	getLocationByID: async function (id) {
		return await findOneInCollection('locations', { id: id });
	},
	addUsed: async function (email, cpu, ram, disk) {
		const user = await findOneInCollection('users', { email: email });
		if (!user) return 'User not found.';

		const newcpu = parseInt(user.used_cpu) + parseInt(cpu);
		const newram = parseInt(user.used_ram) + parseInt(ram);
		const newdisk = parseInt(user.used_disk) + parseInt(disk);

		await updateUserUsage(email, {
			used_cpu: parseInt(newcpu),
			used_ram: parseInt(newram),
			used_disk: parseInt(newdisk)
		});
		return true;
	},
	setUsed: async function (email, cpu, ram, disk) {
		const user = await findOneInCollection('users', { email: email });
		if (!user) return 'User not found.';

		await updateUserUsage(email, {
			used_cpu: parseInt(cpu),
			used_ram: parseInt(ram),
			used_disk: parseInt(disk)
		});
		return true;
	},
	updateCoins: async function (email, coins) {
		const user = await findOneInCollection('users', { email: email });
		if (!user) return 'User not found.';

		await updateUserUsage(email, { coins: coins });
		return true;
	},
	updateExtraRam: async function (email, ram) {
		await updateUserUsage(email, { 'extra.ram': parseInt(ram) });
		return true;
	},
	updateExtraCpu: async function (email, cpu) {
		await updateUserUsage(email, { 'extra.cpu': parseInt(cpu) });
		return true;
	},
	updateExtraDisk: async function (email, disk) {
		await updateUserUsage(email, { 'extra.disk': parseInt(disk) });
		return true;
	},
	addRenewal: async function (email, id) {
		const user = await this.getUser(email);
		if (!user) return 'User not found.';
		const package = await this.getPackage(user.package);
		if (!package) return 'Package not found.';

		await db.collection('renewals').insertOne({
			server_id: parseInt(id),
			email: email,
			renew_by: Date.now() + package.renewal_time,
			renew_cost: package.renewal_price,
			renewal_enabled: package.renewal_enabled
		});
		return true;
	},
	removeRenewal: async function (id) {
		await db.collection('renewals').deleteOne({ server_id: parseInt(id) });
		return true;
	},
	getRenewal: async function (id) {
		return await findOneInCollection('renewals', { server_id: parseInt(id) });
	},
	getRenewals: async function () {
		return await findInCollection('renewals');
	},
	getUsersRenewals: async function (email) {
		return await findInCollection('renewals', { email: email });
	},
	updateRenewal: async function (id, renew_by) {
		await db.collection('renewals').updateOne({ server_id: parseInt(id) }, { $set: { renew_by: parseInt(renew_by) } });
		return true;
	},
	createApiKey: async function (description) {
		const generated = generateApiKey({
			method: 'string',
			pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
			prefix: 'Dashactyl'
		});
		await db.collection('api-keys').insertOne({
			key: generated,
			description: description,
			last_used: '—',
			created: Date()
		});
		return generated;
	},
	listApiKeys: async function () {
		return await findInCollection('api-keys');
	},
	getApiKey: async function (key) {
		return await findOneInCollection('api-keys', { key: key });
	},
	deleteApiKey: async function (key) {
		await db.collection('api-keys').deleteOne({ key: key });
		return true;
	},
	setLastUsedApiKey: async function (key) {
		await db.collection('api-keys').updateOne({ key: key }, { $set: { last_used: Date() } });
		return true;
	},
	checkAltsByRegisteredIp: async function (ip) {
		const result = await findOneInCollection('users', { registered_ip: ip });
		return !!result;
	},
	checkAltsByLastLoginIp: async function (ip) {
		const result = await findOneInCollection('users', { lastlogin_ip: ip });
		return !!result;
	},
	updateLastLoginIp: async function (email, ip) {
		await updateUserUsage(email, { lastlogin_ip: ip });
		return true;
	},
	checkProxy: async function (ip) {
		/** There is definitely a better way to do this but awwww maaann */
		const res = await fetch('https://db-ip.com/' + ip);
		const restext = await res.text();
		let hosting = false;
		let proxy = false;
		if (restext.indexOf('Hosting') !== -1) hosting = true;
		if (restext.indexOf('Wireless') !== -1) hosting = true;
		if (restext.indexOf('This IP address is used by a proxy') !== -1) proxy = true;
		if (restext.indexOf('This IP address is a known source of cyber attack') !== -1) proxy = true;
		if (hosting === true || proxy === true) return true;
		return false;
	}
};
