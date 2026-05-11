const { execFileSync } = require('child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

function runGcc(sourcePath, stdin = '') {
    const dir = mkdtempSync(join(tmpdir(), 'ifscee-gcc-'));
    const bin = join(dir, 'prog');
    try {
        execFileSync('gcc', ['-O0', '-std=c99', '-w', sourcePath, '-o', bin], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        const out = execFileSync(bin, [], {
            input: stdin,
            encoding: 'utf8',
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return { stdout: out };
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

module.exports = { runGcc };
