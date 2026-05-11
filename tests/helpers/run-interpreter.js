const { IFSCeePreprocessor } = require('../../ifscee/preprocessor.js');
const { IFSCeeLexer } = require('../../ifscee/lexer.js');
const { IFSCeeParser } = require('../../ifscee/parser.js');
const { IFSCeeInterpreter } = require('../../ifscee/interpreter.js');

function normalizeOutput(html) {
    return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '');
}

function runC(source) {
    const processed = new IFSCeePreprocessor(source).process();
    const tokens = new IFSCeeLexer(processed).tokenize();
    const ast = new IFSCeeParser(tokens).parse();
    const gen = new IFSCeeInterpreter(ast).interpret();

    let stdout = '';
    let exitCode = 0;
    let steps = 0;
    const MAX_STEPS = 500000;

    try {
        let step = gen.next();
        while (!step.done) {
            const v = step.value;
            if (v && v.type === 'TERMINAL_PRINT') stdout += v.output;
            else if (v && v.type === 'PROGRAM_END') exitCode = v.exitCode;
            if (++steps > MAX_STEPS) throw new Error(`Interpreter exceeded ${MAX_STEPS} steps`);
            step = gen.next();
        }
    } catch (e) {
        if (!/^__EXIT_/.test(e.message)) throw e;
    }

    return { stdout: normalizeOutput(stdout), exitCode };
}

module.exports = { runC, normalizeOutput };
