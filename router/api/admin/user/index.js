const db = require('../../../../lib/database');
const express = require('express');
const router = express.Router();

router.post('/get', async (req, res) => {
    const user = await db.getUser(req.body.email);
    if (!user) return res.json({ error: "That user does not exist." })
    user.password = null
    res.json({ success: true, info: user })
});

router.post('/getFromID', async (req, res) => {
    const id = req.body.id.toString();
    const user = await db.getUserFromID(id);
    if (!user) return res.json({ error: "That user does not exist." })
    user.password = null
    res.json({ success: true, info: user })
});

router.post('/setUserCoinByID', async (req, res) => {
    const id = req.body.id.toString()
    const coins = parseInt(req.body.coins)
    
    const getUserEmail = await db.getUserFromID(id);
    if (!getUserEmail) return res.json({ error: "No User Found" })
    const userEmail = getUserEmail.email

    const setUserCoin = await db.updateCoins(userEmail, coins)
    if (!setUserCoin) return res.json({ error: "Something went wrong" })
    res.json({ success: true })
})

module.exports = router;
