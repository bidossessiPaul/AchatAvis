
import { WARNING_REASONS, SUSPENSION_REASONS } from './src/constants/suspensionReasons';

console.log('--- ADMIN ROUTE DEBUG ---');
console.log('WARNING_REASONS:', JSON.stringify(WARNING_REASONS));
console.log('SUSPENSION_REASONS:', JSON.stringify(SUSPENSION_REASONS));

// Simulated getSuspensionReasons
const mockRes = {
    json: (data: any) => console.log('RESPONSE DATA:', JSON.stringify(data))
};

mockRes.json({
    warnings: WARNING_REASONS,
    suspensions: SUSPENSION_REASONS
});
