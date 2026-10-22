const express = require("express");
const prisma = require("../config/prismaClient");
const { stkPush } = require("../config/mpesa");
const logger = require("../src/logger");

const router = express.Router();

// Initiate payment - aligns with Frontend apiClient.initiatePayment
router.post("/payments/initiate", async (req, res) => {
  const { phone, amount, macAddress } = req.body || {};

  if (!phone || !amount || !macAddress) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  // Accept +2547XXXXXXXX or 2547XXXXXXXX
  const normalizedPhone = phone.startsWith("+") ? phone.slice(1) : phone;
  if (!/^2547\d{8}$/.test(normalizedPhone)) {
    return res.status(400).json({ success: false, error: "Invalid phone number. Use 2547XXXXXXXX format." });
  }

  const parsedAmount = Number(amount);
  if (!Number.isSafeInteger(parsedAmount) || parsedAmount < 1 || parsedAmount > 1000) {
    return res.status(400).json({ success: false, error: "Payment amount must be a whole number between 1 and 1000 KES." });
  }

  if (!/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(macAddress)) {
    return res.status(400).json({ success: false, error: "Invalid MAC address format." });
  }

  logger.info("Payment initiation requested", { phone: normalizedPhone, amount: parsedAmount });

  const transactionId = `TXN_${Date.now()}`;

  // Create payment record in database
  try {
    await prisma.payment.create({
      data: {
        phone: normalizedPhone,
        amount: parsedAmount,
        transactionId,
        macAddress,
        status: "pending"
      }
    });
  } catch (dbError) {
    logger.error("Database error creating payment", { error: dbError.message });
    return res.status(500).json({ success: false, error: "Database error" });
  }

  // Use real MPesa STK Push
  logger.info("Initiating M-Pesa STK push", { phone: normalizedPhone, amount: parsedAmount, transactionId });
  try {
    const stkResponse = await stkPush(normalizedPhone, amount, transactionId);
    if (!stkResponse) {
      // Mark payment as failed in database
      try {
        await prisma.payment.update({
          where: { transactionId },
          data: { status: "failed" }
        });
      } catch (dbError) {
        logger.error("Failed to update payment status", { error: dbError.message, transactionId });
      }
      return res.status(500).json({ success: false, error: "STK Push failed. No response from MPesa API." });
    }

    // Persist CheckoutRequestID for callback correlation
    try {
      const checkoutId = stkResponse.CheckoutRequestID || null;
      if (checkoutId) {
        await prisma.payment.update({
          where: { transactionId },
          data: { mpesaRef: checkoutId }
        });
      }
    } catch (e) {
      logger.error("Failed to persist M-Pesa checkout reference", { error: e.message, transactionId });
    }

    logger.info("M-Pesa STK push accepted", { transactionId });
    return res.json({
      success: true,
      data: {
        transactionId,
        mpesaRef: stkResponse.CheckoutRequestID || stkResponse.MerchantRequestID || null,
        status: "pending",
        expiresAt: null,
      },
      message: "STK Push sent!",
    });
  } catch (stkError) {
    logger.error("M-Pesa STK push failed", { error: stkError.message, transactionId });

    // Mark payment as failed in database
    try {
      await prisma.payment.update({
        where: { transactionId },
        data: { status: "failed" }
      });
    } catch (dbError) {
        logger.error("Failed to update payment status", { error: dbError.message, transactionId });
    }

    return res.status(500).json({ success: false, error: "STK Push failed. No response from MPesa API." });
  }
});

// Check payment status - aligns with Frontend apiClient.checkPaymentStatus
router.get("/payments/status/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      select: { status: true, mpesaRef: true, expiresAt: true }
    });
    if (!payment) {
      return res.json({ success: true, data: { status: "pending", mpesaRef: null, expiresAt: null } });
    }
    return res.json({ success: true, data: {
      status: payment.status || "pending",
      mpesaRef: payment.mpesaRef,
      expiresAt: payment.expiresAt
    }});
  } catch (error) {
    logger.error("Error fetching payment status", { error: error.message, transactionId: req.params.transactionId });
    return res.status(500).json({ success: false, error: "Failed to fetch payment status" });
  }
});

module.exports = router;
