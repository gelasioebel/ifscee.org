/**
 * IFSCee Preprocessor - Handles C preprocessor directives
 * Processes #include, #define, #ifdef, #ifndef, #else, #endif
 * Expands macros and handles conditional compilation
 */
class IFSCeePreprocessor {
    /**
     * @param {string} sourceCode - The raw C source code to preprocess
     */
    constructor(sourceCode) {
        this.sourceCode = sourceCode;
        this.macros = new Map();
    }

    /**
     * Process all preprocessor directives and expand macros
     * @returns {string} The preprocessed source code ready for lexical analysis
     */
    process() {
        const lines = this.sourceCode.split('\n');
        const processedLines = [];
        const conditionStack = [true];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const trimmedLine = line.trim();
            const shouldKeep = conditionStack.every(cond => cond === true);

            if (trimmedLine.startsWith('#')) {
                const parts = trimmedLine.split(/\s+/);
                const directive = parts[0];

                if (directive === '#include') { processedLines.push(''); }
                else if (directive === '#define') {
                    if (shouldKeep) {
                        const match = trimmedLine.match(/#define\s+(\w+)(?:\(([^)]+)\))?\s+(.*)/);
                        if (match) {
                            this.macros.set(match[1], { params: match[2] ? match[2].split(',').map(p => p.trim()) : null, value: match[3] });
                        }
                    }
                    processedLines.push('');
                }
                else if (directive === '#ifdef') { conditionStack.push(this.macros.has(parts[1])); processedLines.push(''); }
                else if (directive === '#ifndef') { conditionStack.push(!this.macros.has(parts[1])); processedLines.push(''); }
                else if (directive === '#else') {
                    if (conditionStack.length > 1) { const lastCond = conditionStack.pop(); conditionStack.push(!lastCond); }
                    processedLines.push('');
                }
                else if (directive === '#endif') {
                    if (conditionStack.length > 1) conditionStack.pop();
                    processedLines.push('');
                }
                else { processedLines.push(''); }
            } else {
                if (shouldKeep) {
                    let expandedLine = line;
                    for (const [name, macro] of this.macros.entries()) {
                        if (!macro.params) {
                            expandedLine = expandedLine.replace(new RegExp(`\\b${name}\\b`, 'g'), macro.value);
                        } else {
                            expandedLine = expandedLine.replace(new RegExp(`\\b${name}\\(([^)]+)\\)`, 'g'), (match, argsStr) => {
                                const args = argsStr.split(',').map(a => a.trim());
                                let result = macro.value;
                                macro.params.forEach((param, index) => { result = result.replace(new RegExp(`\\b${param}\\b`, 'g'), args[index]); });
                                return result;
                            });
                        }
                    }
                    processedLines.push(expandedLine);
                } else { processedLines.push(''); }
            }
        }
        return processedLines.join('\n');
    }
}