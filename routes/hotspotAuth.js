const express = require("express");
const router = express.Router();
const prisma = require("../config/prismaClient");
const { whitelistMAC } = require("../config/mikrotik");
const logger = require("../src/logger");

// MAC-Bound Session Check: Auto-bypass for returning devices with active sessions
router.get("/check-session", async (req, res) => {
  const { mac } = req.query;

  if (!mac) {
    return res.status(400).json({ success: false, error: "MAC address is required" });
  }

  try {
    const normalizedMac = String(mac).toUpperCase();

    // Find latest completed payment/session for this MAC address that hasn't expired
    const activeSession = await prisma.payment.findFirst({
      where: {
        macAddress: normalizedMac,
        status: "completed",
        expiresAt: { gt: new Date() }
      },
      orderBy: { timePurchased: "desc" },
      select: {
        id: true,
        phone: true,
        amount: true,
        status: true,
        expiresAt: true,
        mpesaRef: true,
        macAddress: true,
        timePurchased: true
      }
    });

    if (activeSession) {
      // Determine duration label from amount for whitelist re-application
      let timeLabel = "1Hr";
      const amount = Number(activeSession.amount);
      if (amount === 30) timeLabel = "24Hrs";
      else if (amount === 20) timeLabel = "12Hrs";
      else if (amount === 15) timeLabel = "4Hrs";

      // Ensure router binding is active (re-apply whitelist rule)
      const mikrotikResponse = await whitelistMAC(normalizedMac, timeLabel);

      logger.info("MAC session check - active session found", {
        mac: normalizedMac,
        expiresAt: activeSession.expiresAt,
        mikrotikSuccess: mikrotikResponse.success
      });

      return res.json({
        success: true,
        authenticated: true,
        message: "Active session found. Device whitelisted.",
        expiresAt: activeSession.expiresAt,
        amount: activeSession.amount,
        transactionId: activeSession.transactionId,
        mpesaRef: activeSession.mpesaRef,
        mikrotik: { success: mikrotikResponse.success, message: mikrotikResponse.message }
      });
    }

    return res.json({
      success: true,
      authenticated: false,
      message: "No active session found. Payment required."
    });
  } catch (error) {
    logger.error("Session check error", { error: error.message, mac });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;
