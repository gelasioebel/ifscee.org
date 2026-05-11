import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runC } = require('./helpers/run-interpreter.js');
const { runGcc } = require('./helpers/run-gcc.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures', 'c');
const fixtures = readdirSync(FIXTURES_DIR)
    .filter(f => f.endsWith('.c'))
    .sort();

describe('interpreter matches gcc output', () => {
    for (const file of fixtures) {
        test(file, () => {
            const sourcePath = join(FIXTURES_DIR, file);
            const source = readFileSync(sourcePath, 'utf8');

            const { stdout: expected } = runGcc(sourcePath);
            const { stdout: actual } = runC(source);

            expect(actual).toBe(expected);
        });
    }
});
