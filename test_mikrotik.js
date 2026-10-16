require('dotenv').config();
const { RouterOSAPI } = require('routeros-client');

// Read credentials directly from your environment variables
const conn = new RouterOSAPI({
    host: process.env.MIKROTIK_HOST || '192.168.88.1',
    user: process.env.MIKROTIK_USER || 'admin',
    password: process.env.MIKROTIK_PASSWORD,
    port: parseInt(process.env.MIKROTIK_PORT || '8728'),
    timeout: 10
});

async function testConnection() {
    console.log(`🔌 Attempting to connect to MikroTik router at ${conn.host}:${conn.port}...`);
    
    try {
        await conn.connect();
        console.log('✅ SUCCESS: Connected to MikroTik router successfully!');

        // Run a simple command to fetch router resource details (e.g., uptime, board name)
        const resources = await conn.write('/system/resource/print');
        console.log('\n Router System Information:');
        console.log(`- Board Name: ${resources[0]['board-name']}`);
        console.log(`- RouterOS Version: ${resources[0]['version']}`);
        console.log(`- Uptime: ${resources[0]['uptime']}`);
        console.log(`- CPU Load: ${resources[0]['cpu-load']}%`);

        await conn.close(); // Fixed from disconnect() to close()
        console.log('\n🔌 Closed connection cleanly. API communication is fully operational!');
    } catch (error) {
        console.error('❌ ERROR: Failed to connect to MikroTik router.');
        console.error(error.message || error);
    }
}

testConnection();