import { suspensionService } from './src/services/suspensionService';
import { query } from './src/config/database';

async function verify() {
    console.log('🧪 Verifying Suspension and Geo-location Rules...');

    // 1. Verify Geo-location (Local IP should return null)
    const localIPs = ['::1', '127.0.0.1', '192.168.1.1'];
    for (const ip of localIPs) {
        const country = await suspensionService.detectCountryFromIP(ip);
        console.log(`📡 IP ${ip} -> Country: ${country} (Expected: null)`);
        if (country !== null) {
            console.error(`❌ Geo-location verification failed for IP ${ip}`);
        } else {
            console.log(`✅ Geo-location verification passed for IP ${ip}`);
        }
    }

    // 2. Verify Admin Protection
    // Let's find an admin user
    const admins: any = await query('SELECT id, email FROM users WHERE role = "admin" LIMIT 1');
    if (admins && admins.length > 0) {
        const adminId = admins[0].id;
        const isExempted = await suspensionService.isUserExempted(adminId);
        console.log(`🛡️ Admin ${admins[0].email} (${adminId}) isExempted: ${isExempted} (Expected: true)`);
        if (isExempted !== true) {
            console.error('❌ Admin protection verification failed');
        } else {
            console.log('✅ Admin protection verification passed');
        }
    } else {
        console.log('⚠️ No admin user found in database to verify protection.');
    }

    // 3. Verify Regular User is NOT necessarily protected
    const users: any = await query('SELECT id, email FROM users WHERE role != "admin" LIMIT 1');
    if (users && users.length > 0) {
        const userId = users[0].id;
        const isExempted = await suspensionService.isUserExempted(userId);
        console.log(`👤 User ${users[0].email} (${userId}) isExempted: ${isExempted} (Expected: depends on config, but likely false)`);
    }

    process.exit(0);
}

verify().catch(err => {
    console.error('💥 Verification failed with error:', err);
    process.exit(1);
});
