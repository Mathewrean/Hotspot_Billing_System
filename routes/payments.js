const express = require("express");
const router = express.Router();
const prisma = require("../config/prismaClient");
const { stkPush } = require("../config/mpesa");
const logger = require("../src/logger");

// ✅ Handle MPesa STK Push Request
router.post("/stkpush", async (req, res) => {
    const { phone, amount } = req.body;

    try {
        const transactionId = `TXN_${Date.now()}`;
        const response = await stkPush(phone, amount, transactionId);
        if (!response) throw new Error("M-Pesa STK push was not accepted");
        res.json({ success: true, message: "STK Push sent", transactionId, mpesaRef: response.CheckoutRequestID || null });
    } catch (error) {
        logger.error("STK Push Error", { error: error.message });
        res.status(500).json({ success: false, message: "Failed to send STK Push" });
    }
});

// ✅ Check Payment Status (for Real-Time Updates)
router.get("/status/:transactionId", async (req, res) => {
    const { transactionId } = req.params;
    try {
        const payment = await prisma.payment.findUnique({
            where: { transactionId },
            select: { status: true }
        });
        if (!payment) {
            return res.json({ status: "Pending" });
        }
        res.json({ status: payment.status });
    } catch (err) {
        logger.error("Error fetching payment status", { error: err.message, transactionId });
        res.json({ status: "Pending" });
    }
});

module.exports = router;
