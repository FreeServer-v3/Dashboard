const db = require('../../../lib/database');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
	const settings = await db.getSettings();
	const user = await db.getUser(req.session.account.email)
	if (!settings.pterodactyl_url) return res.json({ error: 'Pterodactyl URL not set' });
	if (!settings.pterodactyl_key) return res.json({ error: 'Pterodactyl Key not set' });
	res.json({ user_cpu: user.extra.cpu, user_ram: user.extra.ram, user_disk: user.extra.disk, ram_price: settings.ram_price, cpu_price: settings.cpu_price, disk_price: settings.disk_price, day_multiplier: settings.day_multiplier, week_multiplier: settings.week_multiplier });
});

router.get('/cycle', async (req, res) => {
	const getUserCycle = await db.getUserCycle(req.session.account.email);
	if (!getUserCycle) {
		const createUserCycle = await db.createUserCycle(req.session.account.email);
		if (!createUserCycle) {
			return res.json({ error: "error during create user cycle"})
		} else {
			return res.json({ cycle: "daily", exp: 0,new: true })
		}
	} else {
		return res.json({ cycle: getUserCycle.cycle, exp: getUserCycle.next_expire, new: false })
	}
})

// 前端更改資源後存到資料庫
router.put('/update', async (req, res) => {
	function checkInt(num){
		return (typeof num === 'number' && Number.isInteger(num) && num%1==0 && num >= 0)
	}

	const body = JSON.parse(JSON.stringify(req.body));
	const newCPU = body.cpu;
	const newRam = body.ram;
	const newDisk = body.disk;
	const newCycle = body.cycle;

	if ((!checkInt(newCPU*1)) || (!checkInt(newRam*1)) || (!checkInt(newDisk*1))){
		return res.json({ error: "你輸入的數字好像不是整數..."})
	}

	const getSettings = await db.getSettings();
	let cycleMultiplier = 0;
	if (newCycle == "daily") {
		cycleMultiplier = parseInt(getSettings.day_multiplier)/25;
	} else if (newCycle == "weekly") {
		cycleMultiplier = parseInt(getSettings.week_multiplier)/4;
	} else if (newCycle == "monthly") {
		cycleMultiplier = 1;
	}
	const priceCPU = parseInt(getSettings.cpu_price);
	const priceRam = parseInt(getSettings.ram_price);
	const priceDisk = parseInt(getSettings.disk_price);

	const subtotal = Math.ceil((newCPU*priceCPU + newRam*priceRam + newDisk*priceDisk)*cycleMultiplier);
	// if (subtotal == 0) {
	// 	return res.json({ error: "你買了...啥? 寂寞? (不可購買啥都0的，謝謝!)"})
	// }

	const checkUserCoins = await db.getUser(req.session.account.email);
	const userCoins = parseInt(checkUserCoins.coins)

	if ( userCoins < subtotal) {
		return res.json({error: `你的餘額不足，無法支付此週期 (${subtotal} FreeCoin)。`})
	}

	const updateMoney = await db.updateCoins(email=req.session.account.email, coins=(parseInt(userCoins)-subtotal))
	if (!updateMoney) {
		return res.json({error: "扣款失敗..."})
	}
	const updateExpireTime = await db.setNextCycleExpire(email=req.session.account.email, isInit=true)
	const updateCPU = await db.updateExtraCpu(email=req.session.account.email, cpu=newCPU*100);
	const updateRam = await db.updateExtraRam(email=req.session.account.email, ram=newRam*1024);
	const updateDisk = await db.updateExtraDisk(email=req.session.account.email, disk=newDisk*1024);
	const updateCycle = await db.updateUserCycle(user=req.session.account.email, cycle=newCycle);
	if ((!updateCPU) || (!updateRam) || (!updateDisk) || (!updateCycle) || (!updateExpireTime) ) {
		return res.json({error: "發生了一點問題..."})
	} else {
		return res.json({ success: "已更新。" })
	}
})

router.use('/purchase', require('./purchase/index.js'));

module.exports = router;
