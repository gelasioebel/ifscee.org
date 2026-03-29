/**
 * IFSCee - Lexer
 * Fase 2: Tokenização conforme C99
 * Converte strings em tokens com tipo, valor, linha e coluna
 */

class Token {
    constructor(tipo, valor, linha, coluna, meta = {}) {
        this.type = tipo;
        this.value = valor;
        this.line = linha;
        this.column = coluna;
        this.meta = meta; // Dados adicionais (sufixo, escape, etc.)
    }

    toString() {
        return `Token(${this.type}, "${this.value}", ${this.line}:${this.column})`;
    }
}

class IFSCeeLexer {
    constructor(codigoFonte) {
        this.codigo = codigoFonte;
        this.posicao = 0;
        this.linha = 1;
        this.coluna = 1;
        this.tokens = [];

        // Palavras-chave C99
        this.palavrasChave = new Set([
            'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
            'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
            'inline', 'int', 'long', 'register', 'restrict', 'return', 'short',
            'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union',
            'unsigned', 'void', 'volatile', 'while'
        ]);

        // Operadores de 3 caracteres
        this.operadores3 = ['<<=', '>>=', '...'];

        // Operadores de 2 caracteres
        this.operadores2 = [
            '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '++', '--',
            '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->', '::', '.*', '->*'
        ];

        // Operadores de 1 caractere
        this.operadores1 = '+-*/%<>=!&|^~?:;,.(){}[]#@$`';
    }

    /**
     * Realiza tokenização completa
     */
    tokenizar() {
        while (this.posicao < this.codigo.length) {
            // Pular espaços em branco
            if (this.ehEspacoEmBranco(this.pegarCaracterAtual())) {
                this.avançarPosicao();
                continue;
            }

            // Pular comentários
            if (this.pegarCaracterAtual() === '/' && this.pegarProxChar() === '/') {
                this.pularComentarioLinha();
                continue;
            }

            if (this.pegarCaracterAtual() === '/' && this.pegarProxChar() === '*') {
                this.pularComentarioBloco();
                continue;
            }

            // Strings
            if (this.pegarCaracterAtual() === '"') {
                this.tokens.push(this.lerString());
                continue;
            }

            // Caracteres (char literal)
            if (this.pegarCaracterAtual() === "'") {
                this.tokens.push(this.lerChar());
                continue;
            }

            // Números
            if (this.ehDigito(this.pegarCaracterAtual()) || 
                (this.pegarCaracterAtual() === '.' && this.ehDigito(this.pegarProxChar()))) {
                this.tokens.push(this.lerNumero());
                continue;
            }

            // Identificadores e palavras-chave
            if (this.ehInicioIdentificador(this.pegarCaracterAtual())) {
                this.tokens.push(this.lerIdentificadorOuPalavraChave());
                continue;
            }

            // Operadores
            if (this.ehOperador(this.pegarCaracterAtual())) {
                this.tokens.push(this.lerOperador());
                continue;
            }

            // Caractere desconhecido
            console.warn(`Caractere desconhecido: '${this.pegarCaracterAtual()}' em ${this.linha}:${this.coluna}`);
            this.avançarPosicao();
        }

        // Token EOF
        this.tokens.push(new Token('EOF', '', this.linha, this.coluna));
        return this.tokens;
    }

    /**
     * Lê uma string com escape sequences
     */
    lerString() {
        const inicioLinha = this.linha;
        const inicioColuna = this.coluna;
        this.avançarPosicao(); // Passar aspas abertas

        let valor = '';
        while (this.posicao < this.codigo.length && this.pegarCaracterAtual() !== '"') {
            if (this.pegarCaracterAtual() === '\\') {
                this.avançarPosicao();
                valor += this.processarEscapeSequence();
            } else {
                valor += this.pegarCaracterAtual();
                this.avançarPosicao();
            }
        }

        if (this.pegarCaracterAtual() === '"') {
            this.avançarPosicao(); // Passar aspas fechadas
        }

        return new Token('STRING', valor, inicioLinha, inicioColuna);
    }

    /**
     * Lê um character literal
     */
    lerChar() {
        const inicioLinha = this.linha;
        const inicioColuna = this.coluna;
        this.avançarPosicao(); // Passar aspas abertas

        let valor = '';
        if (this.pegarCaracterAtual() === '\\') {
            this.avançarPosicao();
            valor = this.processarEscapeSequence();
        } else {
            valor = this.pegarCaracterAtual();
            this.avançarPosicao();
        }

        if (this.pegarCaracterAtual() === "'") {
            this.avançarPosicao(); // Passar aspas fechadas
        }

        return new Token('CHAR', valor, inicioLinha, inicioColuna);
    }

    /**
     * Processa escape sequences (\n, \t, \x41, etc.)
     */
    processarEscapeSequence() {
        const char = this.pegarCaracterAtual();
        this.avançarPosicao();

        switch (char) {
            case 'n': return '\n';
            case 't': return '\t';
            case 'r': return '\r';
            case 'b': return '\b';
            case 'f': return '\f';
            case 'v': return '\v';
            case '\\': return '\\';
            case '"': return '"';
            case "'": return "'";
            case '0': return '\0';
            case 'x': return this.lerHexadecimal();
            default: return char;
        }
    }

    /**
     * Lê sequência hexadecimal (\x41)
     */
    lerHexadecimal() {
        let hex = '';
        for (let i = 0; i < 2; i++) {
            if (this.ehDigitoHex(this.pegarCaracterAtual())) {
                hex += this.pegarCaracterAtual();
                this.avançarPosicao();
            }
        }
        return String.fromCharCode(parseInt(hex, 16));
    }

    /**
     * Lê um número (decimal, octal, hex, float, notação científica)
     */
    lerNumero() {
        const inicioLinha = this.linha;
        const inicioColuna = this.coluna;
        let numero = '';
        let base = 10;

        // Verificar prefixo (0x, 0b, 0)
        if (this.pegarCaracterAtual() === '0') {
            numero += this.pegarCaracterAtual();
            this.avançarPosicao();

            if (this.pegarCaracterAtual() === 'x' || this.pegarCaracterAtual() === 'X') {
                base = 16;
                numero += this.pegarCaracterAtual();
                this.avançarPosicao();
                while (this.ehDigitoHex(this.pegarCaracterAtual())) {
                    numero += this.pegarCaracterAtual();
                    this.avançarPosicao();
                }
            } else if (this.pegarCaracterAtual() === 'b' || this.pegarCaracterAtual() === 'B') {
                base = 2;
                numero += this.pegarCaracterAtual();
                this.avançarPosicao();
                while (this.pegarCaracterAtual() === '0' || this.pegarCaracterAtual() === '1') {
                    numero += this.pegarCaracterAtual();
                    this.avançarPosicao();
                }
            } else if (this.ehDigito(this.pegarCaracterAtual())) {
                base = 8; // Octal
            }
        }

        // Dígitos normais
        while (this.ehDigito(this.pegarCaracterAtual()) || (base === 16 && this.ehDigitoHex(this.pegarCaracterAtual()))) {
            numero += this.pegarCaracterAtual();
            this.avançarPosicao();
        }

        // Ponto decimal e notação científica
        if (this.pegarCaracterAtual() === '.' && base === 10) {
            numero += '.';
            this.avançarPosicao();
            while (this.ehDigito(this.pegarCaracterAtual())) {
                numero += this.pegarCaracterAtual();
                this.avançarPosicao();
            }
        }

        // Notação científica (e/E)
        if ((this.pegarCaracterAtual() === 'e' || this.pegarCaracterAtual() === 'E') && base === 10) {
            numero += this.pegarCaracterAtual();
            this.avançarPosicao();
            if (this.pegarCaracterAtual() === '+' || this.pegarCaracterAtual() === '-') {
                numero += this.pegarCaracterAtual();
                this.avançarPosicao();
            }
            while (this.ehDigito(this.pegarCaracterAtual())) {
                numero += this.pegarCaracterAtual();
                this.avançarPosicao();
            }
        }

        // Sufixos (u, l, f, etc.)
        let sufixo = '';
        while (this.pegarCaracterAtual() && /[ulfULF]/.test(this.pegarCaracterAtual())) {
            sufixo += this.pegarCaracterAtual();
            this.avançarPosicao();
        }

        const valor = isNaN(parseFloat(numero)) ? numero : parseFloat(numero);
        return new Token('NUMBER', valor, inicioLinha, inicioColuna, { sufixo });
    }

    /**
     * Lê identificador ou palavra-chave
     */
    lerIdentificadorOuPalavraChave() {
        const inicioLinha = this.linha;
        const inicioColuna = this.coluna;
        let nome = '';

        while (this.ehContinuacaoIdentificador(this.pegarCaracterAtual())) {
            nome += this.pegarCaracterAtual();
            this.avançarPosicao();
        }

        const tipo = this.palavrasChave.has(nome) ? 'KEYWORD' : 'IDENTIFIER';
        return new Token(tipo, nome, inicioLinha, inicioColuna);
    }

    /**
     * Lê operador
     */
    lerOperador() {
        const inicioLinha = this.linha;
        const inicioColuna = this.coluna;

        // Tentar 3 caracteres
        const sub3 = this.codigo.substring(this.posicao, this.posicao + 3);
        if (this.operadores3.includes(sub3)) {
            this.posicao += 3;
            this.coluna += 3;
            return new Token('OPERATOR', sub3, inicioLinha, inicioColuna);
        }

        // Tentar 2 caracteres
        const sub2 = this.codigo.substring(this.posicao, this.posicao + 2);
        if (this.operadores2.includes(sub2)) {
            this.posicao += 2;
            this.coluna += 2;
            return new Token('OPERATOR', sub2, inicioLinha, inicioColuna);
        }

        // 1 caractere
        const char = this.pegarCaracterAtual();
        const tipo = /[{}()\[\];:,.]/.test(char) ? 'PUNCT' : 'OPERATOR';
        this.avançarPosicao();
        return new Token(tipo, char, inicioLinha, inicioColuna);
    }

    /**
     * Pula comentário de linha (//)
     */
    pularComentarioLinha() {
        while (this.posicao < this.codigo.length && this.pegarCaracterAtual() !== '\n') {
            this.avançarPosicao();
        }
    }

    /**
     * Pula comentário de bloco (/* */)
     */
    pularComentarioBloco() {
        this.avançarPosicao(); // /
        this.avançarPosicao(); // *

        while (this.posicao < this.codigo.length - 1) {
            if (this.pegarCaracterAtual() === '*' && this.pegarProxChar() === '/') {
                this.avançarPosicao(); // *
                this.avançarPosicao(); // /
                break;
            }
            this.avançarPosicao();
        }
    }

    // ============ UTILITÁRIOS ============

    pegarCaracterAtual() {
        return this.codigo[this.posicao] || '';
    }

    pegarProxChar() {
        return this.codigo[this.posicao + 1] || '';
    }

    avançarPosicao() {
        if (this.pegarCaracterAtual() === '\n') {
            this.linha++;
            this.coluna = 1;
        } else {
            this.coluna++;
        }
        this.posicao++;
    }

    ehEspacoEmBranco(char) {
        return /\s/.test(char);
    }

    ehDigito(char) {
        return /\d/.test(char);
    }

    ehDigitoHex(char) {
        return /[0-9a-fA-F]/.test(char);
    }

    ehInicioIdentificador(char) {
        return /[a-zA-Z_]/.test(char);
    }

    ehContinuacaoIdentificador(char) {
        return /[a-zA-Z0-9_]/.test(char);
    }

    ehOperador(char) {
        return this.operadores1.includes(char);
    }
}
