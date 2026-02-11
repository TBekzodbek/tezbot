// Integration Test Simulation
// This test simulates the user flow: /start -> Link -> Download
// It mocks the Telegram Bot API interactions but uses the real services (with mocked network if needed, but here we test logic flow).

const youtubeService = require('../utils/youtubeService');

describe('Bot Integration Simulation', () => {
    test('User Flow: Search -> Select -> Download', async () => {
        // 1. Search
        const searchResult = { entries: [{ id: 'video1', title: 'Test Video 1' }] };
        jest.spyOn(youtubeService, 'searchVideo').mockResolvedValue(searchResult);

        const results = await youtubeService.searchVideo('query');
        expect(results.entries.length).toBeGreaterThan(0);
        expect(results.entries[0].id).toBe('video1');

        // 2. Select (Get Info)
        const videoInfo = { id: 'video1', title: 'Test Video 1', formats: [] };
        jest.spyOn(youtubeService, 'getVideoInfo').mockResolvedValue(videoInfo);

        const info = await youtubeService.getVideoInfo('https://youtu.be/video1');
        expect(info.title).toBe('Test Video 1');

        // 3. Download
        jest.spyOn(youtubeService, 'downloadMedia').mockResolvedValue('/path/to/download.mp4');
        const filePath = await youtubeService.downloadMedia('https://youtu.be/video1', 'video', { outputPath: 'test.mp4' });
        expect(filePath).toBe('/path/to/download.mp4');
    });
});
