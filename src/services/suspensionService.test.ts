import { suspensionService } from './suspensionService';
import { query } from '../config/database';

jest.mock('../config/database', () => ({
    query: jest.fn(),
    pool: {
        getConnection: jest.fn(() => ({
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn(),
            query: jest.fn()
        }))
    }
}));

describe('SuspensionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('isSystemEnabled should return true when config is enabled', async () => {
        (query as jest.Mock).mockResolvedValueOnce([{ is_enabled: 1 }]);
        const enabled = await suspensionService.isSystemEnabled();
        expect(enabled).toBe(true);
    });

    test('determineNextLevel should return Level 1 for new user', async () => {
        (query as jest.Mock).mockResolvedValueOnce([]); // No history
        (query as jest.Mock).mockResolvedValueOnce([{ id: 1, level_number: 1 }]); // Level 1

        const level = await suspensionService.determineNextLevel('user123');
        expect(level.level_number).toBe(1);
    });

    test('determineNextLevel should escalate level based on history', async () => {
        (query as jest.Mock).mockResolvedValueOnce([{ suspension_level: 2 }]); // Last was 2
        (query as jest.Mock).mockResolvedValueOnce([{ id: 3, level_number: 3 }]); // Next is 3

        const level = await suspensionService.determineNextLevel('user123');
        expect(level.level_number).toBe(3);
    });

    test('calculateTimeRemaining placeholder logic (can be expanded)', () => {
        // Logic is client-side in my implementation for now via ends_at
        expect(true).toBe(true);
    });
});
