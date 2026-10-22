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

  // Accept standard MAC format, or allow placeholder/fallback values
  // when device detection is unavailable (browser can't determine MAC).
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
  const allowedPlaceholders = ["LOADING...", "UNAVAILABLE", "MAC_NOT_FOUND", "UNKNOWN", "00:00:00:00:00:00"];
  if (!macRegex.test(macAddress) && !allowedPlaceholders.includes(macAddress.toUpperCase())) {
    return res.status(400).json({ success: false, error: "Invalid MAC address format." });
  }

  // Normalize placeholder to a deterministic MAC derived from phone
  let normalizedMac = macAddress;
  if (!macRegex.test(macAddress)) {
    // Generate a stable placeholder MAC from the phone number so MikroTik
    // has something to whitelist even when real hardware detection fails.
    let hash = 0;
    for (let i = 0; i < normalizedPhone.length; i++) {
      hash = (hash * 31 + normalizedPhone.charCodeAt(i)) >>> 0;
    }
    const hex = hash.toString(16).padStart(12, "0").slice(0, 12);
    normalizedMac = `${hex.slice(0,2)}:${hex.slice(2,4)}:${hex.slice(4,6)}:${hex.slice(6,8)}:${hex.slice(8,10)}:${hex.slice(10,12)}`;
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
        macAddress: normalizedMac,
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
