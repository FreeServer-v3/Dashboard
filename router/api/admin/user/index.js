const db = require('../../../../lib/database');
const express = require('express');
const router = express.Router();

/**
 * 獲取用戶並返回信息
 * @param {Object} user - 用戶物件
 * @param {Object} res - Express 響應物件
 */
function respondWithUser(user, res) {
    if (!user) {
        return res.json({ error: "That user does not exist." });
    }
    user.password = null;
    res.json({ success: true, info: user });
}

/**
 * 從請求中獲取用戶 ID 並轉為字串
 * @param {Object} req - Express 請求物件
 * @returns {string} 用戶 ID 字串
 */
function getUserIdFromRequest(req) {
    return req.body.id.toString();
}

router.post('/get', async (req, res) => {
    try {
        const user = await db.getUser(req.body.email);
        respondWithUser(user, res);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve user" });
    }
});

router.post('/getFromID', async (req, res) => {
    try {
        const id = getUserIdFromRequest(req);
        const user = await db.getUserFromID(id);
        respondWithUser(user, res);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve user by ID" });
    }
});

router.post('/setUserCoinByID', async (req, res) => {
    try {
        const id = getUserIdFromRequest(req);
        const coins = parseInt(req.body.coins);

        const getUserEmail = await db.getUserFromID(id);
        if (!getUserEmail) {
            return res.json({ error: "No User Found" });
        }

        const userEmail = getUserEmail.email;
        const setUserCoin = await db.updateCoins(userEmail, coins);

        if (!setUserCoin) {
            return res.json({ error: "Something went wrong" });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to set user coins by ID" });
    }
});

module.exports = router;
