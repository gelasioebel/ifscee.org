/**
 * IFSCee - Parser
 * Fase 3: Parsing Recursive Descent com precedência de operadores
 * Gera Abstract Syntax Tree (AST)
 */

// ============ CLASSES DE NÓS AST ============

class ASTNode {
    constructor(tipo) {
        this.type = tipo;
        this.line = 0;
    }
}

class ProgramNode extends ASTNode {
    constructor() {
        super('Program');
        this.body = [];
    }
}

class FunctionDeclarationNode extends ASTNode {
    constructor(returnType, name, params, body) {
        super('FunctionDeclaration');
        this.returnType = returnType;
        this.name = name;
        this.params = params;
        this.body = body;
    }
}

class VariableDeclarationNode extends ASTNode {
    constructor(type, name, initialValue = null) {
        super('VariableDeclaration');
        this.variableType = type;
        this.name = name;
        this.initialValue = initialValue;
    }
}

class BlockStatementNode extends ASTNode {
    constructor(statements) {
        super('BlockStatement');
        this.statements = statements;
    }
}

class ReturnStatementNode extends ASTNode {
    constructor(argument) {
        super('ReturnStatement');
        this.argument = argument;
    }
}

class IfStatementNode extends ASTNode {
    constructor(test, consequent, alternate = null) {
        super('IfStatement');
        this.test = test;
        this.consequent = consequent;
        this.alternate = alternate;
    }
}

class WhileStatementNode extends ASTNode {
    constructor(test, body) {
        super('WhileStatement');
        this.test = test;
        this.body = body;
    }
}

class ForStatementNode extends ASTNode {
    constructor(init, test, update, body) {
        super('ForStatement');
        this.init = init;
        this.test = test;
        this.update = update;
        this.body = body;
    }
}

class CallExpressionNode extends ASTNode {
    constructor(callee, args) {
        super('CallExpression');
        this.callee = callee;
        this.arguments = args;
    }
}

class BinaryExpressionNode extends ASTNode {
    constructor(operator, left, right) {
        super('BinaryExpression');
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}

class UnaryExpressionNode extends ASTNode {
    constructor(operator, argument, prefix = true) {
        super('UnaryExpression');
        this.operator = operator;
        this.argument = argument;
        this.prefix = prefix;
    }
}

class AssignmentExpressionNode extends ASTNode {
    constructor(operator, left, right) {
        super('AssignmentExpression');
        this.operator = operator;
        this.left = left;
        this.right = right;
    }
}

class IdentifierNode extends ASTNode {
    constructor(name) {
        super('Identifier');
        this.name = name;
    }
}

class LiteralNode extends ASTNode {
    constructor(value, raw) {
        super('Literal');
        this.value = value;
        this.raw = raw;
    }
}

// ============ PARSER ============

class IFSCeeParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.posicao = 0;
        this.programa = new ProgramNode();

        // Precedência de operadores (menor para maior)
        this.precedencia = {
            '||': 1,
            '&&': 2,
            '|': 3,
            '^': 4,
            '&': 5,
            '==': 6, '!=': 6,
            '<': 7, '>': 7, '<=': 7, '>=': 7,
            '<<': 8, '>>': 8,
            '+': 9, '-': 9,
            '*': 10, '/': 10, '%': 10,
        };
    }

    /**
     * Parse principal
     */
    parsear() {
        while (!this.ehFim()) {
            const stmt = this.parseTopLevel();
            if (stmt) {
                this.programa.body.push(stmt);
            }
        }
        return this.programa;
    }

    /**
     * Parse de declarações top-level
     */
    parseTopLevel() {
        // Pular EOF
        if (this.pegarTipo() === 'EOF') {
            return null;
        }

        // Verificar se é uma função
        if (this.ehTipoDado()) {
            const tipo = this.pegarValor();
            this.avançar();

            const nome = this.pegarValor();
            this.avançar();

            if (this.pegarValor() === '(') {
                return this.parseFunctionDeclaration(tipo, nome);
            } else {
                // Variável global ou statement
                return this.parseVariableDeclaration(tipo);
            }
        }

        return this.parseStatement();
    }

    /**
     * Parse de declaração de função
     */
    parseFunctionDeclaration(returnType, name) {
        this.avançar(); // (
        const params = this.parseParameterList();
        this.avançar(); // )
        this.avançar(); // {

        const body = this.parseBlockStatement();
        return new FunctionDeclarationNode(returnType, name, params, body.statements);
    }

    /**
     * Parse de parâmetros
     */
    parseParameterList() {
        const params = [];

        while (this.pegarValor() !== ')') {
            if (this.ehTipoDado()) {
                const tipo = this.pegarValor();
                this.avançar();
                const nome = this.pegarValor();
                this.avançar();
                params.push({ tipo, nome });
            }

            if (this.pegarValor() === ',') {
                this.avançar();
            }
        }

        return params;
    }

    /**
     * Parse de statement
     */
    parseStatement() {
        switch (this.pegarValor()) {
            case '{':
                return this.parseBlockStatement();
            case 'if':
                return this.parseIfStatement();
            case 'while':
                return this.parseWhileStatement();
            case 'for':
                return this.parseForStatement();
            case 'return':
                return this.parseReturnStatement();
            default:
                // Expression statement
                const expr = this.parseExpression();
                if (this.pegarValor() === ';') this.avançar();
                return expr;
        }
    }

    /**
     * Parse de bloco
     */
    parseBlockStatement() {
        this.avançar(); // {
        const statements = [];

        while (this.pegarValor() !== '}' && !this.ehFim()) {
            // Declaração de variável
            if (this.ehTipoDado()) {
                const tipo = this.pegarValor();
                this.avançar();
                statements.push(this.parseVariableDeclaration(tipo));
            } else {
                statements.push(this.parseStatement());
            }
        }

        if (this.pegarValor() === '}') this.avançar();
        return new BlockStatementNode(statements);
    }

    /**
     * Parse de declaração de variável
     */
    parseVariableDeclaration(tipo) {
        const nome = this.pegarValor();
        this.avançar();

        let valor = null;
        if (this.pegarValor() === '=') {
            this.avançar();
            valor = this.parseExpression();
        }

        if (this.pegarValor() === ';') this.avançar();
        return new VariableDeclarationNode(tipo, nome, valor);
    }

    /**
     * Parse de if statement
     */
    parseIfStatement() {
        this.avançar(); // if
        this.avançar(); // (
        const test = this.parseExpression();
        this.avançar(); // )

        const consequent = this.parseStatement();

        let alternate = null;
        if (this.pegarValor() === 'else') {
            this.avançar();
            alternate = this.parseStatement();
        }

        return new IfStatementNode(test, consequent, alternate);
    }

    /**
     * Parse de while statement
     */
    parseWhileStatement() {
        this.avançar(); // while
        this.avançar(); // (
        const test = this.parseExpression();
        this.avançar(); // )

        const body = this.parseStatement();
        return new WhileStatementNode(test, body);
    }

    /**
     * Parse de for statement
     */
    parseForStatement() {
        this.avançar(); // for
        this.avançar(); // (

        let init = null;
        if (this.ehTipoDado()) {
            const tipo = this.pegarValor();
            this.avançar();
            init = new VariableDeclarationNode(tipo, this.pegarValor(), null);
            this.avançar();
            if (this.pegarValor() === '=') {
                this.avançar();
                init.initialValue = this.parseExpression();
            }
        } else {
            init = this.parseExpression();
        }

        this.avançar(); // ;

        let test = null;
        if (this.pegarValor() !== ';') {
            test = this.parseExpression();
        }
        this.avançar(); // ;

        let update = null;
        if (this.pegarValor() !== ')') {
            update = this.parseExpression();
        }
        this.avançar(); // )

        const body = this.parseStatement();
        return new ForStatementNode(init, test, update, body);
    }

    /**
     * Parse de return statement
     */
    parseReturnStatement() {
        this.avançar(); // return

        let argument = null;
        if (this.pegarValor() !== ';') {
            argument = this.parseExpression();
        }

        if (this.pegarValor() === ';') this.avançar();
        return new ReturnStatementNode(argument);
    }

    /**
     * Parse de expressão (precedência de operadores)
     */
    parseExpression() {
        return this.parseAssignment();
    }

    /**
     * Parse de assignment
     */
    parseAssignment() {
        let left = this.parseLogicalOr();

        if (this.ehOperadorAssignment()) {
            const op = this.pegarValor();
            this.avançar();
            const right = this.parseAssignment();
            return new AssignmentExpressionNode(op, left, right);
        }

        return left;
    }

    /**
     * Parse de OR lógico (||)
     */
    parseLogicalOr() {
        let left = this.parseLogicalAnd();

        while (this.pegarValor() === '||') {
            const op = this.pegarValor();
            this.avançar();
            const right = this.parseLogicalAnd();
            left = new BinaryExpressionNode(op, left, right);
        }

        return left;
    }

    /**
     * Parse de AND lógico (&&)
     */
    parseLogicalAnd() {
        let left = this.parseEquality();

        while (this.pegarValor() === '&&') {
            const op = this.pegarValor();
            this.avançar();
            const right = this.parseEquality();
            left = new BinaryExpressionNode(op, left, right);
        }

        return left;
    }

    /**
     * Parse de equality (==, !=)
     */
    parseEquality() {
        let left = this.parseRelational();

        while (this.pegarValor() === '==' || this.pegarValor() === '!=') {
            const op = this.pegarValor();
            this.avançar();
            const right = this.parseRelational();
            left = new BinaryExpressionNode(op, left, right);
        }

        return left;
    }

    /**
     * Parse de relacional (<, >, <=, >=)
     */
    parseRelational() {
        let left = this.parseAdditive();

        while (['<', '>', '<=', '>='].includes(this.pegarValor())) {
            const op = this.pegarValor();
            this.avançar();
            const right = this.parseAdditive();
            left = new BinaryExpressionNode(op, left, right);
        }

        return left;
    }

    /**
     * Parse de adição e subtração
     */
    parseAdditive() {
        let left = this.parseMultiplicative();

        while (this.pegarValor() === '+' || this.pegarValor() === '-') {
            const op = this.pegarValor();
            this.avançar();
            const right = this.parseMultiplicative();
            left = new BinaryExpressionNode(op, left, right);
        }

        return left;
    }

    /**
     * Parse de multiplicação, divisão, módulo
     */
    parseMultiplicative() {
        let left = this.parseUnary();

        while (this.pegarValor() === '*' || this.pegarValor() === '/' || this.pegarValor() === '%') {
            const op = this.pegarValor();
            this.avançar();
            const right = this.parseUnary();
            left = new BinaryExpressionNode(op, left, right);
        }

        return left;
    }

    /**
     * Parse de operadores unários
     */
    parseUnary() {
        if (['+', '-', '!', '~', '*', '&'].includes(this.pegarValor())) {
            const op = this.pegarValor();
            this.avançar();
            const arg = this.parseUnary();
            return new UnaryExpressionNode(op, arg, true);
        }

        return this.parsePostfix();
    }

    /**
     * Parse de operadores posfix (chamadas, acesso)
     */
    parsePostfix() {
        let expr = this.parsePrimary();

        while (true) {
            if (this.pegarValor() === '(') {
                // Chamada de função
                this.avançar();
                const args = [];
                while (this.pegarValor() !== ')') {
                    args.push(this.parseExpression());
                    if (this.pegarValor() === ',') this.avançar();
                }
                this.avançar(); // )
                expr = new CallExpressionNode(expr, args);
            } else if (this.pegarValor() === '[') {
                // Acesso a array
                this.avançar();
                const index = this.parseExpression();
                this.avançar(); // ]
                expr = new BinaryExpressionNode('[', expr, index);
            } else if (this.pegarValor() === '++' || this.pegarValor() === '--') {
                // Pós-incremento
                const op = this.pegarValor();
                this.avançar();
                expr = new UnaryExpressionNode(op, expr, false);
            } else {
                break;
            }
        }

        return expr;
    }

    /**
     * Parse de expressões primárias
     */
    parsePrimary() {
        // Parênteses
        if (this.pegarValor() === '(') {
            this.avançar();
            const expr = this.parseExpression();
            this.avançar(); // )
            return expr;
        }

        // Literais
        if (this.pegarTipo() === 'NUMBER') {
            const valor = this.pegarValor();
            this.avançar();
            return new LiteralNode(valor, valor.toString());
        }

        if (this.pegarTipo() === 'STRING') {
            const valor = this.pegarValor();
            this.avançar();
            return new LiteralNode(valor, `"${valor}"`);
        }

        if (this.pegarTipo() === 'CHAR') {
            const valor = this.pegarValor();
            this.avançar();
            return new LiteralNode(valor, `'${valor}'`);
        }

        // Identificadores
        if (this.pegarTipo() === 'IDENTIFIER') {
            const nome = this.pegarValor();
            this.avançar();
            return new IdentifierNode(nome);
        }

        throw new Error(`Token inesperado: ${this.pegarValor()}`);
    }

    // ============ UTILITÁRIOS ============

    pegarToken() {
        return this.tokens[this.posicao] || null;
    }

    pegarTipo() {
        return this.pegarToken()?.type || 'EOF';
    }

    pegarValor() {
        return this.pegarToken()?.value || '';
    }

    avançar() {
        this.posicao++;
    }

    ehFim() {
        return this.pegarTipo() === 'EOF';
    }

    ehTipoDado() {
        const tipos = ['int', 'float', 'double', 'char', 'void', 'unsigned', 'signed', 'long', 'short'];
        return tipos.includes(this.pegarValor());
    }

    ehOperadorAssignment() {
        const ops = ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='];
        return ops.includes(this.pegarValor());
    }
}
