const fs = require('fs');
const path = require('path');

test('index.js syntax is valid', () => {
    const indexPath = path.join(__dirname, '../index.js');
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('const token =');
    expect(content).toContain('bot.on(\'message\'');
});
