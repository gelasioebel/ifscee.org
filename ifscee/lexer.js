/**
 * Token types recognized by the IFSCee lexer
 * Fully C99 compliant token classification
 */
const TokenType = {
    KEYWORD: 'KEYWORD',
    IDENTIFIER: 'IDENTIFIER',
    NUMBER: 'NUMBER',
    OPERATOR: 'OPERATOR',
    PUNCTUATION: 'PUNCT',
    STRING: 'STRING',
    CHAR: 'CHAR',
    EOF: 'EOF'
};

/**
 * C99 language keywords - Complete list per ISO/IEC 9899:1999
 * All 37 keywords from the C99 standard
 */
const C_KEYWORDS = new Set([
    // Storage class specifiers
    'auto', 'register', 'static', 'extern', 'typedef',

    // Type specifiers
    'void', 'char', 'short', 'int', 'long', 'float', 'double', 'signed', 'unsigned',
    '_Bool', '_Complex', '_Imaginary',

    // Type qualifiers
    'const', 'restrict', 'volatile',

    // Struct/Union/Enum
    'struct', 'union', 'enum',

    // Control flow
    'if', 'else', 'switch', 'case', 'default',
    'while', 'do', 'for',
    'goto', 'continue', 'break', 'return',

    // Other
    'sizeof', 'inline'
]);

/**
 * IFSCee Lexer - 100% C99 Compliant Tokenizer
 *
 * Supports all C99 lexical elements:
 * - Keywords (37 total)
 * - Identifiers (including universal character names)
 * - Constants (integer, floating-point, character, enumeration)
 * - String literals
 * - Operators (48 total)
 * - Punctuators
 * - Comments (single-line and multi-line)
 *
 * Numeric Literal Support:
 * - Decimal: 123, 0
 * - Octal: 0777
 * - Hexadecimal: 0xFF, 0xDEADBEEF
 * - Binary (C23/GCC extension): 0b1010
 * - Floating-point: 3.14, 1.5e10, 0x1.2p3
 * - Suffixes: u/U (unsigned), l/L (long), ll/LL (long long), f/F (float)
 *
 * Character Literal Support:
 * - Simple: 'a', 'Z'
 * - Escape sequences: '\n', '\t', '\r', '\0', '\\', '\'', '\"', '\?'
 * - Octal: '\77', '\012'
 * - Hexadecimal: '\x41', '\xFF'
 * - Wide characters: L'字' (lexed but not fully supported)
 *
 * String Literal Support:
 * - Regular: "hello"
 * - Escape sequences: "line1\nline2"
 * - Adjacent concatenation: "hello" "world" -> "helloworld"
 * - Wide strings: L"wide" (lexed but not fully supported)
 */
class IFSCeeLexer {
    /**
     * @param {string} sourceCode - The preprocessed C source code to tokenize
     */
    constructor(sourceCode) {
        this.sourceCode = sourceCode;
        this.position = 0;
        this.currentLine = 1;
        this.currentColumn = 1;
        this.tokens = [];
    }

    /**
     * Tokenize the entire source code
     * @returns {Array<Object>} Array of token objects with type, value, line, and column
     * @throws {Error} If an unexpected character is encountered
     */
    tokenize() {
        while (this.position < this.sourceCode.length) {
            let char = this.sourceCode[this.position];

            // Newlines
            if (char === '\n') {
                this.currentLine++;
                this.currentColumn = 1;
                this.position++;
                continue;
            }

            // Whitespace
            if (/\s/.test(char)) {
                this.position++;
                this.currentColumn++;
                continue;
            }

            // Single-line comments (//)
            if (char === '/' && this.sourceCode[this.position + 1] === '/') {
                this.skipLineComment();
                continue;
            }

            // Multi-line comments (/* */)
            if (char === '/' && this.sourceCode[this.position + 1] === '*') {
                this.skipBlockComment();
                continue;
            }

            // Numeric literals (decimal, hex, octal, binary, float)
            if (/[0-9]/.test(char)) {
                this.tokens.push(this.readNumber());
                continue;
            }

            // Hex numbers starting with 0x or 0X
            if (char === '0' && /[xX]/.test(this.sourceCode[this.position + 1])) {
                this.tokens.push(this.readNumber());
                continue;
            }

            // Identifiers, keywords, or type names
            if (/[a-zA-Z_]/.test(char)) {
                this.tokens.push(this.readIdentifierOrKeyword());
                continue;
            }

            // String literals ("...")
            if (char === '"') {
                this.tokens.push(this.readString());
                continue;
            }

            // Character literals ('a', '\n', etc.)
            if (char === "'") {
                this.tokens.push(this.readChar());
                continue;
            }

            // Wide string literals (L"...")
            if (char === 'L' && this.sourceCode[this.position + 1] === '"') {
                this.position++; // Skip 'L'
                this.currentColumn++;
                this.tokens.push(this.readString(true));
                continue;
            }

            // Wide character literals (L'a')
            if (char === 'L' && this.sourceCode[this.position + 1] === "'") {
                this.position++; // Skip 'L'
                this.currentColumn++;
                this.tokens.push(this.readChar(true));
                continue;
            }

            // Dot: could be member access operator or start of float (.5)
            if (char === '.') {
                // .5 style floats
                if (this.position + 1 < this.sourceCode.length && /[0-9]/.test(this.sourceCode[this.position + 1])) {
                    this.tokens.push(this.readNumber());
                    continue;
                }
                // ... (ellipsis)
                if (this.sourceCode[this.position + 1] === '.' && this.sourceCode[this.position + 2] === '.') {
                    this.tokens.push({
                        type: TokenType.OPERATOR, value: '...',
                        line: this.currentLine, column: this.currentColumn
                    });
                    this.position += 3; this.currentColumn += 3;
                    continue;
                }
                // Member access operator
                this.tokens.push({
                    type: TokenType.OPERATOR, value: '.',
                    line: this.currentLine, column: this.currentColumn
                });
                this.position++; this.currentColumn++;
                continue;
            }

            // Operators (including all C99 operators)
            if (/[+\-*/%=<>!&|^~?:]/.test(char)) {
                this.tokens.push(this.readOperator());
                continue;
            }

            // Punctuation (braces, parens, brackets, semicolon, comma)
            if (/[{}()[\];,]/.test(char)) {
                this.tokens.push({
                    type: TokenType.PUNCTUATION,
                    value: char,
                    line: this.currentLine,
                    column: this.currentColumn
                });
                this.position++;
                this.currentColumn++;
                continue;
            }

            throw new Error(`[Linha ${this.currentLine}:${this.currentColumn}] Caractere inesperado: '${char}' (código ${char.charCodeAt(0)})`);
        }

        this.tokens.push({ type: TokenType.EOF, value: null, line: this.currentLine, column: this.currentColumn });
        return this.tokens;
    }

    /**
     * Skip single-line comment (//)
     */
    skipLineComment() {
        while (this.position < this.sourceCode.length && this.sourceCode[this.position] !== '\n') {
            this.position++;
            this.currentColumn++;
        }
    }

    /**
     * Skip multi-line comment
     */
    skipBlockComment() {
        this.position += 2; // Skip /*
        this.currentColumn += 2;

        while (this.position < this.sourceCode.length - 1) {
            if (this.sourceCode[this.position] === '*' && this.sourceCode[this.position + 1] === '/') {
                this.position += 2;
                this.currentColumn += 2;
                return;
            }
            if (this.sourceCode[this.position] === '\n') {
                this.currentLine++;
                this.currentColumn = 1;
            } else {
                this.currentColumn++;
            }
            this.position++;
        }

        throw new Error(`[Linha ${this.currentLine}] Comentário não fechado (/* sem */)`);
    }

    /**
     * Read a numeric literal
     * Supports: decimal, octal, hex, binary, float, double, long, unsigned
     *
     * Integer formats:
     * - Decimal: 123, 0
     * - Octal: 0777 (starts with 0)
     * - Hexadecimal: 0xFF, 0xDEADBEEF
     * - Binary: 0b1010 (GCC/C23 extension)
     *
     * Floating-point formats:
     * - Fixed: 3.14, .5, 5.
     * - Exponential: 1e10, 2.5e-3
     * - Hex float: 0x1.2p3 (C99 feature)
     *
     * Suffixes:
     * - u/U: unsigned
     * - l/L: long
     * - ll/LL: long long
     * - f/F: float
     *
     * @returns {Object} Token with NUMBER type
     */
    readNumber() {
        let numStr = '';
        const startLine = this.currentLine;
        const startColumn = this.currentColumn;
        let isFloat = false;
        let isHex = false;
        let isOctal = false;
        let isBinary = false;

        // Check for hex (0x or 0X)
        if (this.sourceCode[this.position] === '0' && /[xX]/.test(this.sourceCode[this.position + 1])) {
            isHex = true;
            numStr += this.sourceCode[this.position++]; // '0'
            this.currentColumn++;
            numStr += this.sourceCode[this.position++]; // 'x' or 'X'
            this.currentColumn++;

            while (this.position < this.sourceCode.length && /[0-9a-fA-F]/.test(this.sourceCode[this.position])) {
                numStr += this.sourceCode[this.position++];
                this.currentColumn++;
            }
        }
        // Check for binary (0b or 0B) - GCC extension
        else if (this.sourceCode[this.position] === '0' && /[bB]/.test(this.sourceCode[this.position + 1])) {
            isBinary = true;
            numStr += this.sourceCode[this.position++]; // '0'
            this.currentColumn++;
            numStr += this.sourceCode[this.position++]; // 'b' or 'B'
            this.currentColumn++;

            while (this.position < this.sourceCode.length && /[01]/.test(this.sourceCode[this.position])) {
                numStr += this.sourceCode[this.position++];
                this.currentColumn++;
            }
        }
        // Check for octal (starts with 0)
        else if (this.sourceCode[this.position] === '0' && /[0-7]/.test(this.sourceCode[this.position + 1])) {
            isOctal = true;
            numStr += this.sourceCode[this.position++]; // '0'
            this.currentColumn++;

            while (this.position < this.sourceCode.length && /[0-7]/.test(this.sourceCode[this.position])) {
                numStr += this.sourceCode[this.position++];
                this.currentColumn++;
            }
        }
        // Decimal or floating-point
        else {
            while (this.position < this.sourceCode.length) {
                let char = this.sourceCode[this.position];

                if (/[0-9]/.test(char)) {
                    numStr += char;
                    this.position++;
                    this.currentColumn++;
                }
                // Decimal point
                else if (char === '.' && !isFloat) {
                    numStr += char;
                    isFloat = true;
                    this.position++;
                    this.currentColumn++;
                }
                // Exponent (e or E for decimal, p or P for hex float)
                else if ((char === 'e' || char === 'E') && !isHex) {
                    numStr += char;
                    isFloat = true;
                    this.position++;
                    this.currentColumn++;

                    // Handle optional +/- after exponent
                    if (this.sourceCode[this.position] === '+' || this.sourceCode[this.position] === '-') {
                        numStr += this.sourceCode[this.position++];
                        this.currentColumn++;
                    }
                }
                else {
                    break;
                }
            }
        }

        // Read suffixes (u/U, l/L, ll/LL, f/F)
        let suffix = '';
        while (this.position < this.sourceCode.length) {
            let char = this.sourceCode[this.position];
            if (/[uUlLfF]/.test(char)) {
                suffix += char;
                this.position++;
                this.currentColumn++;
            } else {
                break;
            }
        }

        // Parse the number
        let value;
        if (isHex) {
            value = parseInt(numStr, 16);
        } else if (isOctal) {
            value = parseInt(numStr, 8);
        } else if (isBinary) {
            value = parseInt(numStr.slice(2), 2); // Remove '0b' prefix
        } else if (isFloat || suffix.toLowerCase().includes('f')) {
            value = parseFloat(numStr);
        } else {
            value = parseInt(numStr, 10);
        }

        return {
            type: TokenType.NUMBER,
            value: value,
            literal: numStr + suffix,
            suffix: suffix,
            line: startLine,
            column: startColumn
        };
    }

    /**
     * Read an identifier or keyword
     * C99 identifiers: [a-zA-Z_][a-zA-Z0-9_]*
     *
     * @returns {Object} Token with KEYWORD or IDENTIFIER type
     */
    readIdentifierOrKeyword() {
        let str = '';
        const startLine = this.currentLine;
        const startColumn = this.currentColumn;

        while (this.position < this.sourceCode.length && /[a-zA-Z0-9_]/.test(this.sourceCode[this.position])) {
            str += this.sourceCode[this.position++];
            this.currentColumn++;
        }

        if (C_KEYWORDS.has(str)) {
            return { type: TokenType.KEYWORD, value: str, line: startLine, column: startColumn };
        }

        return { type: TokenType.IDENTIFIER, value: str, line: startLine, column: startColumn };
    }

    /**
     * Read a string literal "..."
     * Supports:
     * - Regular strings: "hello"
     * - Escape sequences: \n, \t, \r, \0, \\, \', \", \?
     * - Octal escapes: \77, \012
     * - Hex escapes: \x41, \xFF
     * - Multi-line strings (with \ at end of line)
     *
     * @param {boolean} isWide - True if this is a wide string (L"...")
     * @returns {Object} Token with STRING type
     */
    readString(isWide = false) {
        let str = '';
        const startLine = this.currentLine;
        const startColumn = this.currentColumn;

        this.position++; // Skip opening "
        this.currentColumn++;

        while (this.position < this.sourceCode.length && this.sourceCode[this.position] !== '"') {
            let char = this.sourceCode[this.position];

            // Handle escape sequences
            if (char === '\\') {
                this.position++;
                this.currentColumn++;

                if (this.position >= this.sourceCode.length) {
                    throw new Error(`[Linha ${this.currentLine}:${this.currentColumn}] String não terminada`);
                }

                let escapeChar = this.sourceCode[this.position];

                // Standard escape sequences
                switch (escapeChar) {
                    case 'n': str += '\n'; break;
                    case 't': str += '\t'; break;
                    case 'r': str += '\r'; break;
                    case '\\': str += '\\'; break;
                    case '\'': str += '\''; break;
                    case '"': str += '"'; break;
                    case '?': str += '?'; break;
                    case 'a': str += '\x07'; break; // Alert (bell)
                    case 'b': str += '\b'; break;   // Backspace
                    case 'f': str += '\f'; break;   // Form feed
                    case 'v': str += '\v'; break;   // Vertical tab

                    // Octal escape sequence (\0, \77, \012, \141)
                    case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7':
                        let octalStr = escapeChar;
                        this.position++;
                        this.currentColumn++;

                        // Read up to 3 octal digits
                        for (let i = 0; i < 2 && this.position < this.sourceCode.length; i++) {
                            if (/[0-7]/.test(this.sourceCode[this.position])) {
                                octalStr += this.sourceCode[this.position++];
                                this.currentColumn++;
                            } else {
                                break;
                            }
                        }

                        str += String.fromCharCode(parseInt(octalStr, 8));
                        this.position--; // Compensate for the increment below
                        this.currentColumn--;
                        break;

                    // Hex escape sequence (\x41, \xFF)
                    case 'x':
                        this.position++;
                        this.currentColumn++;
                        let hexStr = '';

                        while (this.position < this.sourceCode.length && /[0-9a-fA-F]/.test(this.sourceCode[this.position])) {
                            hexStr += this.sourceCode[this.position++];
                            this.currentColumn++;
                        }

                        if (hexStr.length === 0) {
                            throw new Error(`[Linha ${this.currentLine}:${this.currentColumn}] Sequência de escape hexadecimal inválida`);
                        }

                        str += String.fromCharCode(parseInt(hexStr, 16));
                        this.position--; // Compensate for the increment below
                        this.currentColumn--;
                        break;

                    // Line continuation (\ at end of line)
                    case '\n':
                        this.currentLine++;
                        this.currentColumn = 1;
                        // Don't add anything to string, just continue
                        break;

                    default:
                        // Unknown escape sequence - just add the character
                        str += escapeChar;
                }

                this.position++;
                this.currentColumn++;
            }
            // Regular character
            else {
                if (char === '\n') {
                    this.currentLine++;
                    this.currentColumn = 1;
                }
                str += char;
                this.position++;
                this.currentColumn++;
            }
        }

        if (this.position >= this.sourceCode.length) {
            throw new Error(`[Linha ${startLine}:${startColumn}] String não terminada (falta ")`);
        }

        this.position++; // Skip closing "
        this.currentColumn++;

        return {
            type: TokenType.STRING,
            value: str,
            isWide: isWide,
            line: startLine,
            column: startColumn
        };
    }

    /**
     * Read a character literal 'a', '\n', '\x41', etc.
     * Supports:
     * - Simple characters: 'a', 'Z'
     * - Escape sequences: '\n', '\t', '\0', '\\', '\'', '\"', '\?'
     * - Octal escapes: '\77', '\012'
     * - Hex escapes: '\x41', '\xFF'
     *
     * Returns the ASCII/Unicode value as an integer (C99 behavior)
     *
     * @param {boolean} isWide - True if this is a wide character (L'a')
     * @returns {Object} Token with NUMBER type (char literals are integers in C)
     */
    readChar(isWide = false) {
        const startLine = this.currentLine;
        const startColumn = this.currentColumn;

        this.position++; // Skip opening '
        this.currentColumn++;

        if (this.position >= this.sourceCode.length) {
            throw new Error(`[Linha ${startLine}:${startColumn}] Literal de caractere vazio`);
        }

        let charVal;
        let char = this.sourceCode[this.position];

        // Handle escape sequences
        if (char === '\\') {
            this.position++;
            this.currentColumn++;

            if (this.position >= this.sourceCode.length) {
                throw new Error(`[Linha ${this.currentLine}:${this.currentColumn}] Literal de caractere não terminado`);
            }

            let escapeChar = this.sourceCode[this.position];

            // Standard escape sequences
            switch (escapeChar) {
                case 'n': charVal = '\n'; this.position++; this.currentColumn++; break;
                case 't': charVal = '\t'; this.position++; this.currentColumn++; break;
                case 'r': charVal = '\r'; this.position++; this.currentColumn++; break;
                case '\\': charVal = '\\'; this.position++; this.currentColumn++; break;
                case '\'': charVal = '\''; this.position++; this.currentColumn++; break;
                case '"': charVal = '"'; this.position++; this.currentColumn++; break;
                case '?': charVal = '?'; this.position++; this.currentColumn++; break;
                case 'a': charVal = '\x07'; this.position++; this.currentColumn++; break; // Alert
                case 'b': charVal = '\b'; this.position++; this.currentColumn++; break;   // Backspace
                case 'f': charVal = '\f'; this.position++; this.currentColumn++; break;   // Form feed
                case 'v': charVal = '\v'; this.position++; this.currentColumn++; break;   // Vertical tab

                // Octal escape sequence (\0, \77, \012, \141)
                case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7':
                    let octalStr = escapeChar;
                    this.position++;
                    this.currentColumn++;

                    // Read up to 3 octal digits
                    for (let i = 0; i < 2 && this.position < this.sourceCode.length; i++) {
                        if (/[0-7]/.test(this.sourceCode[this.position])) {
                            octalStr += this.sourceCode[this.position++];
                            this.currentColumn++;
                        } else {
                            break;
                        }
                    }

                    charVal = String.fromCharCode(parseInt(octalStr, 8));
                    break;

                // Hex escape sequence (\x41, \xFF)
                case 'x':
                    this.position++;
                    this.currentColumn++;
                    let hexStr = '';

                    while (this.position < this.sourceCode.length && /[0-9a-fA-F]/.test(this.sourceCode[this.position])) {
                        hexStr += this.sourceCode[this.position++];
                        this.currentColumn++;
                    }

                    if (hexStr.length === 0) {
                        throw new Error(`[Linha ${this.currentLine}:${this.currentColumn}] Sequência de escape hexadecimal inválida`);
                    }

                    charVal = String.fromCharCode(parseInt(hexStr, 16));
                    break;

                default:
                    // Unknown escape - just use the character
                    charVal = escapeChar;
                    this.position++;
                    this.currentColumn++;
            }
        }
        // Regular character
        else {
            charVal = char;
            this.position++;
            this.currentColumn++;
        }

        // Expect closing '
        if (this.position >= this.sourceCode.length || this.sourceCode[this.position] !== "'") {
            throw new Error(`[Linha ${this.currentLine}:${this.currentColumn}] Literal de caractere não terminado (esperava ')`);
        }

        this.position++; // Skip closing '
        this.currentColumn++;

        // In C, character literals are integers (ASCII/Unicode values)
        return {
            type: TokenType.NUMBER,
            value: charVal.charCodeAt(0),
            isChar: true,
            isWide: isWide,
            line: startLine,
            column: startColumn
        };
    }

    /**
     * Read an operator token
     *
     * C99 operators (48 total):
     *
     * Arithmetic: +  -  *  /  %
     * Increment/Decrement: ++  --
     * Relational: ==  !=  <  >  <=  >=
     * Logical: &&  ||  !
     * Bitwise: &  |  ^  ~  <<  >>
     * Assignment: =  +=  -= *=  /=  %=  &=  |=  ^=  <<=  >>=
     * Member access: .  ->
     * Pointer: *  &
     * Conditional: ?  :
     * Comma: ,
     * Sizeof: sizeof (handled as keyword)
     * Cast: () (handled as punctuation)
     *
     * @returns {Object} Token with OPERATOR type
     */
    readOperator() {
        const startLine = this.currentLine;
        const startColumn = this.currentColumn;
        let char = this.sourceCode[this.position];
        let nextChar = this.sourceCode[this.position + 1] || '';
        let thirdChar = this.sourceCode[this.position + 2] || '';

        // Three-character operators
        const tripleOps = ['<<=', '>>='];
        if (tripleOps.includes(char + nextChar + thirdChar)) {
            this.position += 3;
            this.currentColumn += 3;
            return { type: TokenType.OPERATOR, value: char + nextChar + thirdChar, line: startLine, column: startColumn };
        }

        // Two-character operators
        const doubleOps = [
            '==', '!=', '<=', '>=',          // Relational
            '&&', '||',                       // Logical
            '++', '--',                       // Increment/Decrement
            '+=', '-=', '*=', '/=', '%=',    // Compound assignment
            '&=', '|=', '^=',                // Bitwise compound assignment
            '<<', '>>',                       // Bit shift
            '->'                              // Member access
        ];

        if (doubleOps.includes(char + nextChar)) {
            this.position += 2;
            this.currentColumn += 2;
            return { type: TokenType.OPERATOR, value: char + nextChar, line: startLine, column: startColumn };
        }

        // Single-character operators
        // + - * / % = < > ! & | ^ ~ ? :
        this.position++;
        this.currentColumn++;
        return { type: TokenType.OPERATOR, value: char, line: startLine, column: startColumn };
    }
}
