const youtubeService = require('../utils/youtubeService');
const youtubedl = require('youtube-dl-exec');
const NodeCache = require('node-cache');

jest.mock('youtube-dl-exec');
jest.mock('fs-extra', () => ({
    existsSync: jest.fn().mockReturnValue(true), // Mock file existence
    ensureDirSync: jest.fn(),
    remove: jest.fn().mockResolvedValue(true)
}));

describe('YouTube Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear cache manually if needed, or rely on fresh require
    });

    test('searchVideo calls youtube-dl and caches result', async () => {
        const mockOutput = { entries: [{ id: '123', title: 'Test Video' }] };
        youtubedl.mockResolvedValue(mockOutput);

        // First Call
        const result1 = await youtubeService.searchVideo('test', 1);
        expect(result1).toEqual(mockOutput);
        expect(youtubedl).toHaveBeenCalledTimes(1);

        // Second Call (Should be cached)
        const result2 = await youtubeService.searchVideo('test', 1);
        expect(result2).toEqual(mockOutput);
        expect(youtubedl).toHaveBeenCalledTimes(1); // Call count stays 1
    });

    test('getVideoInfo retrieves and caches video info', async () => {
        const mockInfo = { id: '123', title: 'Info Test' };
        youtubedl.mockResolvedValue(mockInfo);

        const result = await youtubeService.getVideoInfo('http://test.com');
        expect(result).toEqual(mockInfo);
        expect(youtubedl).toHaveBeenCalled();
    });

    test('downloadMedia constructs correct flags for audio', async () => {
        youtubedl.mockResolvedValue('Destination: output.mp3');

        await youtubeService.downloadMedia('http://test.com', 'audio', { outputPath: 'output.%(ext)s' });

        expect(youtubedl).toHaveBeenCalledWith(
            'http://test.com',
            expect.objectContaining({
                extractAudio: true,
                audioFormat: 'mp3',
                noColors: true,
                concurrentFragments: 16
            }),
            expect.any(Object)
        );
    });
});
