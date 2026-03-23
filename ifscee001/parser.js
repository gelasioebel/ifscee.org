class ProgramNode { constructor() { this.type = 'Program'; this.body = []; this.line = 1; } }
class FunctionDeclarationNode { constructor(rt, n, p, b, l) { this.type = 'FunctionDeclaration'; this.returnType = rt; this.name = n; this.params = p; this.body = b; this.line = l; } }
class VariableDeclarationNode { constructor(vt, n, ie, l) { this.type = 'VariableDeclaration'; this.varType = vt; this.name = n; this.initExpression = ie; this.line = l; } }
class ArrayDeclarationNode { constructor(vt, n, sizeExprs, l) { this.type = 'ArrayDeclaration'; this.varType = vt; this.name = n; this.sizeExpressions = sizeExprs; this.line = l; } }
class ReturnStatementNode { constructor(a, l) { this.type = 'ReturnStatement'; this.argument = a; this.line = l; } }
class BinaryExpressionNode { constructor(l, o, r, line) { this.type = 'BinaryExpression'; this.left = l; this.operator = o; this.right = r; this.line = line; } }
class UnaryExpressionNode { constructor(o, a, l) { this.type = 'UnaryExpression'; this.operator = o; this.argument = a; this.line = l; } }
class AssignmentExpressionNode { constructor(l, o, r, line) { this.type = 'AssignmentExpression'; this.left = l; this.operator = o; this.right = r; this.line = line; } }
class IndexExpressionNode { constructor(ao, indexExprs, l) { this.type = 'IndexExpression'; this.arrayObject = ao; this.indexExpressions = indexExprs; this.line = l; } }
class LiteralNode { constructor(v, rt, l) { this.type = 'Literal'; this.value = v; this.rawType = rt; this.line = l; } }
class IdentifierNode { constructor(n, l) { this.type = 'Identifier'; this.name = n; this.line = l; } }
class CallExpressionNode { constructor(c, a, l) { this.type = 'CallExpression'; this.callee = c; this.arguments = a; this.line = l; } }
class IfStatementNode { constructor(cond, cons, alt, l) { this.type = 'IfStatement'; this.condition = cond; this.consequent = cons; this.alternate = alt; this.line = l; } }
class WhileStatementNode { constructor(cond, body, l) { this.type = 'WhileStatement'; this.condition = cond; this.body = body; this.line = l; } }
class DoWhileStatementNode { constructor(body, cond, l) { this.type = 'DoWhileStatement'; this.body = body; this.condition = cond; this.line = l; } }
class ForStatementNode { constructor(init, cond, inc, body, l) { this.type = 'ForStatement'; this.init = init; this.condition = cond; this.increment = inc; this.body = body; this.line = l; } }
class BreakStatementNode { constructor(l) { this.type = 'BreakStatement'; this.line = l; } }
class ContinueStatementNode { constructor(l) { this.type = 'ContinueStatement'; this.line = l; } }
class TypeNameNode { constructor(n) { this.type = 'TypeName'; this.value = n; } }

class IFSCeeParser {
    constructor(tokens) { this.tokens = tokens; this.position = 0; }
    peek() { return this.tokens[this.position]; }
    consume(expectedType, expectedValue = null) {
        const token = this.tokens[this.position];
        if (token.type === 'EOF') throw new Error(`Fim de arquivo inesperado.`);
        if (token.type !== expectedType || (expectedValue !== null && token.value !== expectedValue)) {
            throw new Error(`[Linha ${token.line}] Esperado ${expectedValue || expectedType}, encontrado '${token.value}'.`);
        }
        this.position++; return token;
    }

    isTypeKeyword(token) {
        const typeKeys = ['int', 'char', 'void', 'float', 'double', 'short', 'long', 'unsigned', 'signed', '_Bool', 'const', 'volatile', 'static', 'extern'];
        return token && token.type === 'KEYWORD' && typeKeys.includes(token.value);
    }

    parseTypeStr() {
        let modifiers = [];
        while (this.isTypeKeyword(this.peek())) modifiers.push(this.consume('KEYWORD').value);
        while (this.peek().value === '*') { modifiers.push('*'); this.consume('OPERATOR', '*'); }
        return modifiers.join(' ');
    }

    parse() {
        const program = new ProgramNode();
        while (this.peek().type !== 'EOF') program.body.push(this.parseFunctionDeclaration());
        return program;
    }

    parseFunctionDeclaration() {
        const typeStr = this.parseTypeStr();
        const nameToken = this.consume('IDENTIFIER');
        this.consume('PUNCT', '(');
        const params = [];

        while (this.peek().value !== ')' && this.peek().type !== 'EOF') {
            const pTypeStr = this.parseTypeStr();
            const pNameToken = this.consume('IDENTIFIER');

            // Suporte para arrays passados como parâmetros (ex: char *argv[])
            let isArray = false;
            while (this.peek().value === '[') {
                this.consume('PUNCT', '[');
                if (this.peek().value !== ']') this.parseExpression();
                this.consume('PUNCT', ']');
                isArray = true;
            }

            // Arrays em assinaturas de funções decaem para ponteiros (*)
            params.push({ type: pTypeStr + (isArray ? '*' : ''), name: pNameToken.value });
            if (this.peek().value === ',') this.consume('PUNCT', ',');
        }
        this.consume('PUNCT', ')');
        const body = this.parseBlockStatement();
        return new FunctionDeclarationNode(typeStr, nameToken.value, params, body, nameToken.line);
    }

    parseBlockStatement() {
        this.consume('PUNCT', '{'); const statements = [];
        while (this.peek().value !== '}' && this.peek().type !== 'EOF') statements.push(this.parseStatement());
        this.consume('PUNCT', '}'); return statements;
    }

    parseStatement() {
        const token = this.peek();

        if (this.isTypeKeyword(token)) {
            const typeStr = this.parseTypeStr();

            // A CORREÇÃO: O lookahead precisa do "+ 1" para pular o IDENTIFIER e ver o '[' !
            if (this.tokens[this.position + 1] && this.tokens[this.position + 1].value === '[') {
                return this.parseArrayDeclaration(typeStr);
            }

            return this.parseVariableDeclaration(typeStr);
        }

        if (token.type === 'KEYWORD') {
            switch(token.value) {
                case 'if': return this.parseIfStatement();
                case 'while': return this.parseWhileStatement();
                case 'for': return this.parseForStatement();
                case 'do': return this.parseDoWhileStatement();
                case 'break': this.consume('KEYWORD'); this.consume('PUNCT', ';'); return new BreakStatementNode(token.line);
                case 'continue': this.consume('KEYWORD'); this.consume('PUNCT', ';'); return new ContinueStatementNode(token.line);
                case 'return': return this.parseReturnStatement();
            }
        }
        const expr = this.parseExpression(); this.consume('PUNCT', ';'); return expr;
    }

    parseVariableDeclaration(typeStr) {
        const nameToken = this.consume('IDENTIFIER');
        let initExpr = null; if (this.peek().value === '=') { this.consume('OPERATOR', '='); initExpr = this.parseExpression(); }
        this.consume('PUNCT', ';');
        return new VariableDeclarationNode(typeStr, nameToken.value, initExpr, nameToken.line);
    }

    parseArrayDeclaration(typeStr) {
        const nameToken = this.consume('IDENTIFIER');
        const sizeExprs = [];
        while (this.peek().value === '[') {
            this.consume('PUNCT', '['); sizeExprs.push(this.parseExpression()); this.consume('PUNCT', ']');
        }
        this.consume('PUNCT', ';');
        return new ArrayDeclarationNode(typeStr, nameToken.value, sizeExprs, nameToken.line);
    }

    parseIfStatement() {
        const ifToken = this.consume('KEYWORD', 'if');
        this.consume('PUNCT', '('); const cond = this.parseExpression(); this.consume('PUNCT', ')');
        const cons = this.peek().value === '{' ? this.parseBlockStatement() : [this.parseStatement()];
        let alt = null;
        if (this.peek().type === 'KEYWORD' && this.peek().value === 'else') {
            this.consume('KEYWORD', 'else'); alt = this.peek().value === '{' ? this.parseBlockStatement() : [this.parseStatement()];
        }
        return new IfStatementNode(cond, cons, alt, ifToken.line);
    }

    parseWhileStatement() {
        const wToken = this.consume('KEYWORD', 'while');
        this.consume('PUNCT', '('); const cond = this.parseExpression(); this.consume('PUNCT', ')');
        const body = this.peek().value === '{' ? this.parseBlockStatement() : [this.parseStatement()];
        return new WhileStatementNode(cond, body, wToken.line);
    }

    parseDoWhileStatement() {
        const doToken = this.consume('KEYWORD', 'do');
        const body = this.peek().value === '{' ? this.parseBlockStatement() : [this.parseStatement()];
        this.consume('KEYWORD', 'while'); this.consume('PUNCT', '('); const cond = this.parseExpression(); this.consume('PUNCT', ')'); this.consume('PUNCT', ';');
        return new DoWhileStatementNode(body, cond, doToken.line);
    }

    parseForStatement() {
        const forToken = this.consume('KEYWORD', 'for');
        this.consume('PUNCT', '(');
        let init = null; if (this.peek().value !== ';') init = this.parseStatement(); else this.consume('PUNCT', ';');
        let cond = null; if (this.peek().value !== ';') cond = this.parseExpression(); this.consume('PUNCT', ';');
        let inc = null; if (this.peek().value !== ')') inc = this.parseExpression(); this.consume('PUNCT', ')');
        const body = this.peek().value === '{' ? this.parseBlockStatement() : [this.parseStatement()];
        return new ForStatementNode(init, cond, inc, body, forToken.line);
    }

    parseReturnStatement() {
        const rToken = this.consume('KEYWORD', 'return');
        const expr = this.parseExpression(); this.consume('PUNCT', ';');
        return new ReturnStatementNode(expr, rToken.line);
    }

    parseExpression() {
        let leftNode = this.parseLogicalOr();
        const assignOps = ['=', '+=', '-=', '*=', '/=', '%='];
        if (this.peek().type === 'OPERATOR' && assignOps.includes(this.peek().value)) {
            const op = this.consume('OPERATOR');
            return new AssignmentExpressionNode(leftNode, op.value, this.parseExpression(), leftNode.line);
        }
        return leftNode;
    }

    parseLogicalOr() {
        let left = this.parseLogicalAnd();
        while (this.peek().value === '||') {
            const op = this.consume('OPERATOR'); left = new BinaryExpressionNode(left, op.value, this.parseLogicalAnd(), op.line);
        }
        return left;
    }

    parseLogicalAnd() {
        let left = this.parseEquality();
        while (this.peek().value === '&&') {
            const op = this.consume('OPERATOR'); left = new BinaryExpressionNode(left, op.value, this.parseEquality(), op.line);
        }
        return left;
    }

    parseEquality() {
        let left = this.parseRelational();
        while (['==', '!='].includes(this.peek().value)) {
            const op = this.consume('OPERATOR'); left = new BinaryExpressionNode(left, op.value, this.parseRelational(), op.line);
        }
        return left;
    }

    parseRelational() {
        let left = this.parseAdditive();
        while (['<', '>', '<=', '>='].includes(this.peek().value)) {
            const op = this.consume('OPERATOR'); left = new BinaryExpressionNode(left, op.value, this.parseAdditive(), op.line);
        }
        return left;
    }

    parseAdditive() {
        let left = this.parseMultiplicative();
        while (['+', '-'].includes(this.peek().value)) {
            const op = this.consume('OPERATOR'); left = new BinaryExpressionNode(left, op.value, this.parseMultiplicative(), op.line);
        }
        return left;
    }

    parseMultiplicative() {
        let left = this.parseUnary();
        while (['*', '/', '%'].includes(this.peek().value)) {
            const op = this.consume('OPERATOR'); left = new BinaryExpressionNode(left, op.value, this.parseUnary(), op.line);
        }
        return left;
    }

    parseUnary() {
        const token = this.peek();

        // Suporte ao sizeof COM ou SEM parênteses (ex: sizeof(int) ou sizeof *ptr)
        if (token.type === 'KEYWORD' && token.value === 'sizeof') {
            const op = this.consume('KEYWORD');

            if (this.peek().value === '(') {
                this.consume('PUNCT', '(');
                let arg = this.isTypeKeyword(this.peek()) ? new TypeNameNode(this.parseTypeStr()) : this.parseExpression();
                this.consume('PUNCT', ')');
                return new UnaryExpressionNode(op.value, arg, op.line);
            } else {
                // sizeof sem parênteses avalia diretamente a próxima expressão unária
                return new UnaryExpressionNode(op.value, this.parseUnary(), op.line);
            }
        }

        if (token.type === 'OPERATOR' && ['&', '*', '!', '++', '--'].includes(token.value)) {
            const op = this.consume('OPERATOR');
            return new UnaryExpressionNode(op.value, this.parseUnary(), op.line);
        }

        return this.parsePostfix();
    }

    parsePostfix() {
        let left = this.parsePrimary();
        while (true) {
            if (this.peek().value === '[') {
                const indices = [];
                while (this.peek().value === '[') {
                    this.consume('PUNCT', '['); indices.push(this.parseExpression()); this.consume('PUNCT', ']');
                }
                left = new IndexExpressionNode(left, indices, left.line);
            } else if (this.peek().value === '(') {
                this.consume('PUNCT', '('); const args = [];
                while (this.peek().value !== ')' && this.peek().type !== 'EOF') {
                    args.push(this.parseExpression()); if (this.peek().value === ',') this.consume('PUNCT', ',');
                }
                this.consume('PUNCT', ')'); left = new CallExpressionNode(left, args, left.line);
            } else if (this.peek().type === 'OPERATOR' && ['++', '--'].includes(this.peek().value)) {
                const op = this.consume('OPERATOR'); left = new UnaryExpressionNode(op.value, left, op.line);
            } else { break; }
        }
        return left;
    }

    parsePrimary() {
        const token = this.peek();

        // Permite agrupamentos matemáticos e TYPE CASTING!
        if (token.value === '(') {
            this.consume('PUNCT', '(');

            // Se for um Cast (ex: (int *) malloc)
            if (this.isTypeKeyword(this.peek())) {
                const typeStr = this.parseTypeStr();
                this.consume('PUNCT', ')');
                // Na nossa POC, o cast visual é ignorado e avaliamos apenas a expressão
                return this.parseUnary();
            }

            // Expressão matemática normal (a + b)
            const expr = this.parseExpression();
            this.consume('PUNCT', ')');
            return expr;
        }

        const consumedToken = this.consume(token.type);
        if (consumedToken.type === 'NUMBER') return new LiteralNode(consumedToken.value, 'NUMBER', consumedToken.line);
        if (consumedToken.type === 'STRING') return new LiteralNode(consumedToken.value, 'STRING', consumedToken.line);
        if (consumedToken.type === 'IDENTIFIER') return new IdentifierNode(consumedToken.value, consumedToken.line);

        throw new Error(`[Linha ${consumedToken.line}] Expressão inválida iniciada com '${consumedToken.value}'.`);
    }
}