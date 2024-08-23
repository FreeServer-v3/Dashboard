const db = require('../../lib/database');
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const events = require('../../lib/events').eventBus;
const webhook = require('../../lib/webhook');
const { checkPterodactylSettings, getPterodactylServerInfoReturnPanelInfo } = require('../../lib/Pterodactyl');
const { checkInt } = require('../../lib/functions');

router.post('/install', async (req, res) => {
    try {
        const body = JSON.parse(req.body.data);
        const settings = await db.getSettings();
        if (settings.pterodactyl_url || settings.pterodactyl_key) return res.json({ error: 'Already installed' });
        await db.setSettings(body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Installation failed' });
    }
});

router.get('/getName', async (req, res) => {
    try {
        const settings = await db.getSettings();
        res.json({ name: settings.name });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve name' });
    }
});

router.get('/getAD', async (req, res) => {
    try {
        const settings = await db.getSettings();
        if (!settings.enable_ad) return res.json({ disabled: true });
        const ads = await db.getAds();
        const randomAd = ads[Math.floor(Math.random() * ads.length)];
        res.json(randomAd);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve ads' });
    }
});

router.post('/nafs-create', async (req, res) => {
    try {
        const { amount } = req.body;

        if (!checkInt(amount)) return res.json({ success: false, text: 'Amount is not int' });

        function generateRandomString() {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12345678';
            let randomString = 'NAFS-';
            for (let i = 0; i < 8; i++) {
                randomString += chars[Math.floor(Math.random() * chars.length)];
            }
            return randomString;
        }

        let generatedCouponCode = '';
        let success = false;
        for (let i = 0; i < 5; i++) {
            generatedCouponCode = generateRandomString();
            success = await db.createCoupon(generatedCouponCode, amount);
            if (success) break;
        }

        if (!success) return res.json({ success: false, text: 'Database Error' });

        res.json({ success: true, text: 'Created successfully', code: `${generatedCouponCode}` });
        webhook.info('Coupon Created From NAF Store', `**Code:** ${generatedCouponCode}\n**Amount:** ${amount}`);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create coupon' });
    }
});

router.post('/redeem', async (req, res) => {
    try {
        const { coupon: couponCode } = req.body;
        const coupon = await db.getCoupon(couponCode);
        if (!coupon) return res.json({ success: false, text: 'Coupon not found.' });

        const user = await db.getUser(req.session.account.email);
        const newCoins = parseInt(user.coins) + parseInt(coupon.coin);

        const updateSuccess = await db.updateCoins(user.email, newCoins);
        if (!updateSuccess) return res.json({ success: false, text: 'Error occured during update user coins' });

        const deleteSuccess = await db.deleteCoupon(couponCode);
        if (!deleteSuccess) return res.json({ success: false, text: 'Error occured during delete coupon' });

        res.json({ success: true, text: 'Code redeemed', coins: coupon.coin });
        webhook.info('Coupon Redeemed', `**User:** ${user.email}\n**Code:** ${couponCode}\n**Coins:** ${coupon.coin}`);
    } catch (error) {
        res.status(500).json({ error: 'Failed to redeem coupon' });
    }
});

router.get('/me', async (req, res) => {
    try {
        if (!req.session.account) return res.json({ user: null });

        const user = await db.getUser(req.session.account.email);
        if (!user) return res.json({ user: req.session.account });

        const settings = await db.getSettings();
        const error = checkPterodactylSettings(settings);
        if (error) return res.json(error);

        const panelinfo = await getPterodactylServerInfoReturnPanelInfo(user, settings);
        if (!panelinfo) return res.json({ error: 'Pterodactyl user not found' });

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
        req.session.account.password = '';
        const renewals = await db.getUsersRenewals(user.email);
        renewals.forEach((renewal) => {
            const server = panelinfo.attributes.relationships.servers.data.find(s => s.attributes.id === parseInt(renewal.server_id));
            if (server) {
                server.renew_by = renewal.renew_by;
                server.renewal_enabled = renewal.renewal_enabled;
            }
        });

        res.json({ user: req.session.account, stats, servers: panelinfo.attributes.relationships.servers.data, ptero_user: panelinfo });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve user info' });
    }
});

router.get('/dashboard-info', async (req, res) => {
    try {
        const settings = await db.getSettings();
        const error = checkPterodactylSettings(settings);
        if (error) return res.json(error);

        res.json({ discord_invite: settings.discord_invite, pterodactyl_url: settings.pterodactyl_url });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve dashboard info' });
    }
});

router.get('/afk', async (req, res) => {
    try {
        const settings = await db.getSettings();
        const error = checkPterodactylSettings(settings);
        if (error) return res.json(error);

        res.json({ afk_coins: settings.afk_coins, afk_interval: settings.afk_interval, arcio_code: settings.arcio_code });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve AFK info' });
    }
});

router.ws('/afk', async (ws, req) => {
    try {
        const settings = await db.getSettings();

        const loop = setInterval(async function () {
            ws.send(JSON.stringify({ time: 1 }));
            const user = await db.getUser(req.session.account.email);
            const newCoins = parseInt(user.coins) + parseInt(settings.afk_coins);
            await db.updateCoins(user.email, newCoins);
            ws.send(JSON.stringify({ coins: settings.afk_coins }));
        }, settings.afk_interval * 1000);

        ws.onclose = () => clearInterval(loop);
    } catch (error) {
        ws.close();
    }
});

router.ws('/watch', async (ws, req) => {
    events.on('userUpdate', async function (data) {
        try {
            if (data !== req.session.account.email) return;

            const user = await db.getUser(data);
            const settings = await db.getSettings();
            const panelinfo = await getPterodactylServerInfoReturnPanelInfo(user, settings);
            if (!panelinfo) return ws.send(JSON.stringify({ error: 'Pterodactyl user not found' }));

            const package = await db.getPackage(user.package);
            const stats = {
                total_ram: package.ram + user.extra.ram,
                total_disk: package.disk + user.extra.disk,
                total_cpu: package.cpu + user.extra.cpu,
                used_ram: user.used_ram,
                used_cpu: user.used_cpu,
                used_disk: user.used_disk
            };

            ws.send(JSON.stringify({ user, servers: panelinfo.attributes.relationships.servers.data, stats }));
        } catch (error) {
            ws.send(JSON.stringify({ error: 'Failed to update user info' }));
        }
    });

    const loop = setInterval(() => {
        ws.send("This is a websocket message that checks if you are alive.");
    }, 1000);

    ws.onclose = () => clearInterval(loop);
});

router.post('/reset-password', async (req, res) => {
    try {
        if (!req.session.account.email) return res.json({ error: "No email found in session." });

        const settings = await db.getSettings();
        const user = await db.getUser(req.session.account.email);
        const generated_password = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const panelinfo = await getPterodactylServerInfoReturnPanelInfo(user, settings);
        if (!panelinfo) return res.json({ error: 'Pterodactyl user not found' });

        await db.updatePassword(user.email, generated_password);
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
        });

        res.json({ success: true, password: generated_password });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

router.use('/auth', require('./auth/index.js'));
router.use('/renew', require('./renew/index.js'));
router.use('/server', require('./server/index.js'));
router.use('/store', require('./store/index.js'));
router.use('/admin', require('./admin/index.js'));

module.exports = router;
