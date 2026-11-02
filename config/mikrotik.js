require("dotenv").config();
const { RouterOSAPI } = require("node-routeros");

// Patch Channel.processPacket to skip MikroTik "!empty" replies
// (sent when a command succeeds with no data, e.g. /print with no matches)
// Without this, !empty throws UNKNOWNREPLY and the write promise never settles.
try {
  const ChannelModule = require("node-routeros/dist/Channel");
  const Channel = ChannelModule.Channel || ChannelModule.default;
  if (Channel && Channel.prototype) {
    const _processPacket = Channel.prototype.processPacket;
    Channel.prototype.processPacket = function (packet) {
      if (packet && packet.length > 0 && packet[0] === "!empty") {
        return; // skip !empty, wait for !done to resolve the promise
      }
      return _processPacket.call(this, packet);
    };
  }
} catch (_) {}

async function safeWrite(client, ...args) {
  try {
    return await client.write(...args);
  } catch (error) {
    if (error && error.errno === "UNKNOWNREPLY") return [];
    throw error;
  }
}

const MIKROTIK_ENABLED = String(process.env.MIKROTIK_ENABLED || "false").toLowerCase() === "true";

function getClient() {
  if (!MIKROTIK_ENABLED) return null;
  const host = process.env.MIKROTIK_HOST;
  const user = process.env.MIKROTIK_USER;
  const password = process.env.MIKROTIK_PASSWORD;
  const port = Number(process.env.MIKROTIK_PORT || 8728);
  if (!host || !user || !password) return null;
  try {
    return new RouterOSAPI({ host, user, password, port, timeout: 5000 });
  } catch (e) {
    console.error(`[MIKROTIK-FALLBACK] RouterOSAPI failed: ${e.message}. Falling back to dev mode (no router board connected).`);
    return null;
  }
}

async function whitelistMAC(macAddress, timeLabel) {
  if (!macAddress) return { success: false, message: "No MAC provided" };

  const client = getClient();
  if (!client) {
    return { success: true, message: `Dev mode: whitelisted ${macAddress} for ${timeLabel}` };
  }

  try {
    await client.connect();

    await safeWrite(client,"/ip/hotspot/ip-binding/add", [
      "=mac-address=" + macAddress,
      "=type=bypassed",
      "=comment=FastNet " + timeLabel,
    ]);

    await client.close();
    return { success: true, message: `Whitelisted ${macAddress} for ${timeLabel}` };
  } catch (error) {
    console.error("MikroTik whitelist error:", error);
    try { await client.close(); } catch (_) {}
    return { success: false, message: error.message || String(error) };
  }
}

async function disconnectByMac(macAddress) {
  const client = getClient();
  if (!client) return { success: true, message: `Dev mode: disconnected ${macAddress}` };

  try {
    await client.connect();
    const active = await safeWrite(client,"/ip/hotspot/active/print");
    const entry = (active || []).find((a) => (a["mac-address"] || "").toLowerCase() === macAddress.toLowerCase());

    if (entry && entry[".id"]) {
      await safeWrite(client,"/ip/hotspot/active/remove", ["=.id=" + entry[".id"]]);
    }

    await client.close();
    return { success: true, message: `Disconnected ${macAddress}` };
  } catch (error) {
    console.error("MikroTik disconnect error:", error);
    try { await client.close(); } catch (_) {}
    return { success: false, message: error.message || String(error) };
  }
}

async function disconnectAllUsers() {
  const client = getClient();
  if (!client) return { success: true, message: "Dev mode: disconnected all users" };

  try {
    await client.connect();
    const active = await safeWrite(client,"/ip/hotspot/active/print");

    for (const a of active) {
      if (a[".id"]) {
        await safeWrite(client,"/ip/hotspot/active/remove", ["=.id=" + a[".id"]]);
      }
    }

    await client.close();
    return { success: true, message: `Disconnected ${active.length} users` };
  } catch (error) {
    console.error("MikroTik disconnect all error:", error);
    try { await client.close(); } catch (_) {}
    return { success: false, message: error.message || String(error) };
  }
}

async function getActiveDevices() {
  const client = getClient();
  if (!client) return { success: true, data: [] };

  try {
    await client.connect();
    const active = await safeWrite(client,"/ip/hotspot/active/print");
    await client.close();

    const devices = (active || []).map((a) => ({
      macAddress: a["mac-address"],
      ipAddress: a.address,
      user: a.user,
      uptime: a.uptime,
    }));

    return { success: true, data: devices };
  } catch (error) {
    console.error("MikroTik get active devices error:", error);
    try { await client.close(); } catch (_) {}
    return { success: false, error: error.message || String(error) };
  }
}

async function getStatus() {
  const client = getClient();
  if (!client) return { success: true, data: { status: "ok", uptime: 0, connectedUsers: 0 } };

  try {
    await client.connect();
    const active = await safeWrite(client,"/ip/hotspot/active/print");
    await client.close();

    return {
      success: true,
      data: {
        status: "ok",
        uptime: 0,
        connectedUsers: (active || []).length
      }
    };
  } catch (error) {
    console.error("MikroTik get status error:", error);
    try { await client.close(); } catch (_) {}
    return { success: false, error: error.message || String(error) };
  }
}

async function getDeviceInfoByIP(ipAddress) {
  const client = getClient();
  if (!client) {
    // Dev mode fallback: derive a deterministic MAC from IP hash
    let hash = 0;
    const ip = String(ipAddress || "127.0.0.1");
    for (let i = 0; i < ip.length; i++) {
      hash = (hash * 31 + ip.charCodeAt(i)) >>> 0;
    }
    const hex = hash.toString(16).padStart(12, "0").slice(0, 12);
    const derivedMac = `${hex.slice(0,2)}:${hex.slice(2,4)}:${hex.slice(4,6)}:${hex.slice(6,8)}:${hex.slice(8,10)}:${hex.slice(10,12)}`;
    console.log(`[DEVICE-INFO] Dev mode: derived MAC ${derivedMac} for IP ${ipAddress}`);
    return {
      success: true,
      data: {
        macAddress: derivedMac,
        ipAddress: ip,
        deviceId: `DEV_${hex.slice(0, 6)}`
      }
    };
  }

  try {
    await client.connect();

    // First: try MikroTik ARP table (most reliable for real device MAC)
    const arpEntries = await safeWrite(client, "/ip/arp/print");
    if (arpEntries && arpEntries.length > 0) {
      const arpMatch = arpEntries.find((a) => a.address === ipAddress);
      if (arpMatch && arpMatch["mac-address"]) {
        const realMac = arpMatch["mac-address"];
        console.log(`[DEVICE-INFO] ARP table: found MAC ${realMac} for IP ${ipAddress}`);
        await client.close();
        return {
          success: true,
          data: {
            macAddress: realMac,
            ipAddress: ipAddress,
            deviceId: `DEV_${realMac.replace(/:/g, "").slice(0, 6)}`
          }
        };
      }
    }

    // Second: try /ip/hotspot/active/print (device might already be in active sessions)
    const active = await safeWrite(client, "/ip/hotspot/active/print");
    if (active && active.length > 0) {
      const device = active.find((a) => a.address === ipAddress);
      if (device && device["mac-address"]) {
        const realMac = device["mac-address"];
        console.log(`[DEVICE-INFO] Hotspot active: found MAC ${realMac} for IP ${ipAddress}`);
        await client.close();
        return {
          success: true,
          data: {
            macAddress: realMac,
            ipAddress: device.address,
            deviceId: device["user"] || `DEV_${device[".id"]}`
          }
        };
      }
    }

    // No real MAC found — return unknown rather than a hardcoded placeholder
    console.log(`[DEVICE-INFO] No real MAC found for IP ${ipAddress}, returning MAC_NOT_FOUND`);
    await client.close();
    return {
      success: true,
      data: { macAddress: "MAC_NOT_FOUND", ipAddress, deviceId: "DEV_UNKNOWN" }
    };
  } catch (error) {
    console.error("MikroTik getDeviceInfoByIP error:", error);
    try { await client.close(); } catch (_) {}
    return {
      success: true,
      data: { macAddress: "MAC_NOT_FOUND", ipAddress, deviceId: "DEV_UNKNOWN" }
    };
  }
}

module.exports = {
  RouterOSAPI,
  whitelistMAC,
  disconnectByMac,
  disconnectAllUsers,
  getActiveDevices,
  getStatus,
  getDeviceInfoByIP
};
