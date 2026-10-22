require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const next = require("next");
const socketIo = require("socket.io");
const prisma = require("./config/prismaClient");
const logger = require("./src/logger");
const {
  disconnectAllUsers,
  disconnectByMac,
  getActiveDevices,
  getStatus,
  getDeviceInfoByIP,
} = require("./config/mikrotik");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const loanRoutes = require("./routes/loanRoutes");
const mpesaRoutes = require("./routes/mpesaRoutes");
const mpesaCallback = require("./routes/mpesaCallback");
const supportRoutes = require("./routes/support");
const transactionRoutes = require("./routes/transactions");

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev, dir: "./frontend" });
const handle = nextApp.getRequestHandler();
const PORT = Number(process.env.PORT || 5000);
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

function requireAdmin(req, res, nextMiddleware) {
  const token = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ success: false, error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required" });
    }
    req.admin = decoded;
    return nextMiddleware();
  } catch (error) {
    return res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}

// Legacy dashboard aliases retained for clients that have not yet migrated to
// the /api/admin endpoints. Prisma field names match schema.prisma exactly.
app.get("/admin/payments", requireAdmin, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { timePurchased: "desc" },
      select: { phone: true, amount: true, timePurchased: true, status: true },
    });
    return res.json({ success: true, data: payments });
  } catch (error) {
    logger.error("Database error in admin payments", { error: error.message });
    return res.status(500).json({ success: false, error: "Database error" });
  }
});

app.get("/admin/summary", requireAdmin, async (req, res) => {
  try {
    const [totalUsers, revenue, pendingPayments] = await Promise.all([
      prisma.authUser.count(),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "completed" } }),
      prisma.payment.count({ where: { status: "pending" } }),
    ]);
    return res.json({
      success: true,
      data: { totalUsers, totalRevenue: revenue._sum.amount || 0, activeSessions: 0, pendingPayments },
    });
  } catch (error) {
    logger.error("Database error in admin summary", { error: error.message });
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.get("/api/users", requireAdmin, async (req, res) => {
  try {
    const { search = "", status = "all", page = 1, limit = 10 } = req.query;
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
    const where = {};
    if (search) where.phone = { contains: String(search), mode: "insensitive" };
    if (status !== "all") where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip: (pageNumber - 1) * pageSize, take: pageSize, orderBy: { lastSeen: "desc" } }),
      prisma.user.count({ where }),
    ]);
    return res.json({ success: true, data: { users, total, page: pageNumber, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
  } catch (error) {
    logger.error("Database error fetching users", { error: error.message });
    return res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

app.post("/api/users/:id/disconnect", requireAdmin, async (req, res) => {
  const paymentId = Number(req.params.id);
  if (!Number.isSafeInteger(paymentId) || paymentId < 1) {
    return res.status(400).json({ success: false, error: "Invalid payment ID" });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { macAddress: true },
    });
    if (!payment?.macAddress) return res.json({ success: true, message: "No active device found" });
    const result = await disconnectByMac(payment.macAddress);
    return res.json({ success: result.success, message: result.message });
  } catch (error) {
    logger.error("Error disconnecting user", { error: error.message, paymentId });
    return res.status(500).json({ success: false, error: "Failed to disconnect user" });
  }
});

app.get("/network/devices", requireAdmin, async (req, res) => {
  const result = await getActiveDevices();
  return result.success
    ? res.json({ success: true, data: result.data })
    : res.status(500).json({ success: false, error: result.error });
});

app.post("/network/disconnect-all", requireAdmin, async (req, res) => {
  const result = await disconnectAllUsers();
  return res.json({ success: result.success, message: result.message });
});

app.get("/network/status", requireAdmin, async (req, res) => {
  const result = await getStatus();
  return result.success
    ? res.json({ success: true, data: result.data })
    : res.status(500).json({ success: false, error: result.error });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use(["/loans", "/api/loans"], loanRoutes);
app.use("/api", mpesaRoutes);
app.use("/api", mpesaCallback);
app.use("/api/support", supportRoutes);
app.use("/api/transactions", transactionRoutes);

app.get("/api/device/info", async (req, res) => {
  try {
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) || req.socket.remoteAddress || "127.0.0.1";
    const ipAddress = clientIp.replace(/^::ffff:/, "");
    const result = await getDeviceInfoByIP(ipAddress);
    if (result.success) return res.json({ success: true, data: result.data });

    return res.json({
      success: true,
      data: { macAddress: "00:11:22:33:44:55", ipAddress, deviceId: "DEV001" },
    });
  } catch (error) {
    logger.error("Error retrieving device information", { error: error.message });
    return res.status(500).json({ success: false, error: "Failed to retrieve device information" });
  }
});

app.get("/welcome", (req, res) => res.json({ message: "Welcome to the FastNet WiFi Billing API" }));

async function start() {
  await nextApp.prepare();
  app.all("/{*splat}", (req, res) => handle(req, res));

  const server = http.createServer(app);
  const io = socketIo(server, { cors: { origin: true, methods: ["GET", "POST"] } });
  global.io = io;
  global.emitLoanEvent = (event, data, userId = null) => {
    if (userId) io.to(`loan_${userId}`).emit(event, data);
    io.to("admin_loans").emit(event, data);
  };
  global.emitSupportEvent = (event, data, phone = null) => {
    if (phone) io.to(`support_${phone}`).emit(event, data);
  };

  io.on("connection", (socket) => {
    socket.on("join_loan_room", (userId) => socket.join(`loan_${userId}`));
    socket.on("leave_loan_room", (userId) => socket.leave(`loan_${userId}`));
    socket.on("join_admin_loans", () => socket.join("admin_loans"));
    socket.on("join_support", (phone) => socket.join(`support_${phone}`));
  });

  server.listen(PORT, "0.0.0.0", () => logger.info(`FastNet listening on port ${PORT}`));
}

start().catch((error) => {
  logger.error("Unable to start FastNet", { error: error.message, stack: error.stack });
  process.exit(1);
});
