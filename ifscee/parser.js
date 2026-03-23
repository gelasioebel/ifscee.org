// ═══════════════════════════════════════════════════════════════════════
// AST Node Definitions
// ═══════════════════════════════════════════════════════════════════════

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

// ─── Novos nós para Structs ──────────────────────────────────────────
class StructDefinitionNode {
    constructor(name, fields, line) {
        this.type = 'StructDefinition';
        this.structName = name;       // Nome da struct (ou null se anônima)
        this.fields = fields;         // [{name, fieldType, ehArray, arraySizes}]
        this.line = line;
    }
}

class StructDeclarationNode {
    constructor(structName, varName, initExpr, typeStr, line) {
        this.type = 'StructDeclaration';
        this.structName = structName;  // Nome do tipo struct
        this.varName = varName;        // Nome da variável
        this.initExpression = initExpr; // Inicializador (StructInitializer ou null)
        this.varType = typeStr;        // String completa do tipo (ex: "struct Point *")
        this.line = line;
    }
}

class MemberExpressionNode {
    constructor(object, field, ehSeta, line) {
        this.type = 'MemberExpression';
        this.object = object;          // Expressão do objeto (ex: Identifier 'p')
        this.field = field;            // Nome do campo (string)
        this.ehSeta = ehSeta;          // true se '->', false se '.'
        this.line = line;
    }
}

class StructInitializerNode {
    constructor(values, line) {
        this.type = 'StructInitializer';
        this.values = values;          // [{designator: string|null, value: Expr}]
        this.line = line;
    }
}

class TypedefNode {
    constructor(originalType, newName, ehStruct, structDef, line) {
        this.type = 'TypedefDeclaration';
        this.originalType = originalType;
        this.newName = newName;
        this.ehStruct = ehStruct;
        this.structDef = structDef;    // StructDefinitionNode se inline
        this.line = line;
    }
}

// ─── Novos nós para Switch/Case ──────────────────────────────────────
class SwitchStatementNode {
    constructor(discriminant, cases, line) {
        this.type = 'SwitchStatement';
        this.discriminant = discriminant;
        this.cases = cases;            // [{test: Expr|null (null=default), consequent: Stmt[]}]
        this.line = line;
    }
}

// ─── Nó para operador ternário ───────────────────────────────────────
class TernaryExpressionNode {
    constructor(condition, consequent, alternate, line) {
        this.type = 'TernaryExpression';
        this.condition = condition;
        this.consequent = consequent;
        this.alternate = alternate;
        this.line = line;
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Parser
// ═══════════════════════════════════════════════════════════════════════

class IFSCeeParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
        this.typedefs = new Map(); // nome -> tipo original
    }

    peek() { return this.tokens[this.position]; }
    peekAhead(n) { return this.tokens[this.position + n] || { type: 'EOF', value: null }; }

    consume(expectedType, expectedValue = null) {
        const token = this.tokens[this.position];
        if (token.type === 'EOF') throw new Error(`Fim de arquivo inesperado.`);
        if (token.type !== expectedType || (expectedValue !== null && token.value !== expectedValue)) {
            throw new Error(`[Linha ${token.line}] Esperado ${expectedValue || expectedType}, encontrado '${token.value}'.`);
        }
        this.position++; return token;
    }

    isTypeKeyword(token) {
        const typeKeys = ['int', 'char', 'void', 'float', 'double', 'short', 'long',
            'unsigned', 'signed', '_Bool', 'const', 'volatile', 'static', 'extern', 'struct'];
        if (token && token.type === 'KEYWORD' && typeKeys.includes(token.value)) return true;
        // Verifica se eh um typedef registrado
        if (token && token.type === 'IDENTIFIER' && this.typedefs.has(token.value)) return true;
        return false;
    }

    parseTypeStr() {
        let modifiers = [];

        // Checa se eh um typedef
        if (this.peek().type === 'IDENTIFIER' && this.typedefs.has(this.peek().value)) {
            const typedefName = this.consume('IDENTIFIER').value;
            const resolved = this.typedefs.get(typedefName);
            modifiers.push(resolved);
            while (this.peek().value === '*') { modifiers.push('*'); this.consume('OPERATOR', '*'); }
            return modifiers.join(' ');
        }

        // Checa se eh struct
        if (this.peek().type === 'KEYWORD' && this.peek().value === 'struct') {
            this.consume('KEYWORD', 'struct');
            const structName = this.consume('IDENTIFIER').value;
            modifiers.push('struct ' + structName);
            while (this.peek().value === '*') { modifiers.push('*'); this.consume('OPERATOR', '*'); }
            return modifiers.join(' ');
        }

        while (this.isTypeKeyword(this.peek())) modifiers.push(this.consume('KEYWORD').value);
        while (this.peek().value === '*') { modifiers.push('*'); this.consume('OPERATOR', '*'); }
        return modifiers.join(' ');
    }

    parse() {
        const program = new ProgramNode();
        while (this.peek().type !== 'EOF') {
            const decl = this.parseTopLevel();
            if (decl) program.body.push(decl);
        }
        return program;
    }

    parseTopLevel() {
        const token = this.peek();

        // typedef
        if (token.type === 'KEYWORD' && token.value === 'typedef') {
            return this.parseTypedef();
        }

        // struct definition at top level (sem variável)
        if (token.type === 'KEYWORD' && token.value === 'struct') {
            // Lookahead: struct Name { ... }; vs struct Name funcName(...)
            const nextTok = this.peekAhead(1);
            if (nextTok.type === 'IDENTIFIER') {
                const afterName = this.peekAhead(2);
                if (afterName.value === '{') {
                    // struct Name { ... }; ou struct Name { ... } varName;
                    return this.parseStructAtTopLevel();
                }
            } else if (nextTok.value === '{') {
                // struct { ... } varName;
                return this.parseStructAtTopLevel();
            }
            // Senão: struct retorno para função, ou declaração de var struct
            return this.parseFunctionOrStructVar();
        }

        return this.parseFunctionDeclaration();
    }

    parseStructAtTopLevel() {
        const structDef = this.parseStructDefinition();

        // Verifica se tem variável após a definição
        if (this.peek().type === 'IDENTIFIER') {
            const varName = this.consume('IDENTIFIER').value;
            let initExpr = null;
            if (this.peek().value === '=') {
                this.consume('OPERATOR', '=');
                initExpr = this.parseStructInitializerOrExpr();
            }
            this.consume('PUNCT', ';');
            return new StructDeclarationNode(
                structDef.structName, varName, initExpr,
                'struct ' + structDef.structName, structDef.line
            );
        }

        this.consume('PUNCT', ';');
        return structDef;
    }

    parseFunctionOrStructVar() {
        const typeStr = this.parseTypeStr();
        const nameToken = this.consume('IDENTIFIER');

        // Eh função?
        if (this.peek().value === '(') {
            return this.parseFunctionBody(typeStr, nameToken);
        }

        // Senão eh variável struct no escopo global (raro mas possível)
        let initExpr = null;
        if (this.peek().value === '=') {
            this.consume('OPERATOR', '=');
            initExpr = this.parseStructInitializerOrExpr();
        }
        this.consume('PUNCT', ';');

        if (typeStr.startsWith('struct ')) {
            const structName = typeStr.replace('struct ', '').replace(/\s*\*/g, '');
            return new StructDeclarationNode(
                structName, nameToken.value, initExpr,
                typeStr, nameToken.line
            );
        }
        return new VariableDeclarationNode(typeStr, nameToken.value, initExpr, nameToken.line);
    }

    parseStructDefinition() {
        const line = this.peek().line;
        this.consume('KEYWORD', 'struct');

        let structName = null;
        if (this.peek().type === 'IDENTIFIER' && this.peekAhead(1).value === '{') {
            structName = this.consume('IDENTIFIER').value;
        } else if (this.peek().type === 'IDENTIFIER') {
            structName = this.consume('IDENTIFIER').value;
        }

        this.consume('PUNCT', '{');
        const fields = [];

        while (this.peek().value !== '}' && this.peek().type !== 'EOF') {
            const fieldType = this.parseTypeStr();
            const fieldName = this.consume('IDENTIFIER').value;

            let ehArray = false;
            const arraySizes = [];
            while (this.peek().value === '[') {
                this.consume('PUNCT', '[');
                arraySizes.push(this.parseExpression());
                this.consume('PUNCT', ']');
                ehArray = true;
            }

            fields.push({ name: fieldName, fieldType, ehArray, arraySizes });
            this.consume('PUNCT', ';');
        }

        this.consume('PUNCT', '}');
        return new StructDefinitionNode(structName, fields, line);
    }

    parseTypedef() {
        const line = this.peek().line;
        this.consume('KEYWORD', 'typedef');

        // typedef struct { ... } NomeNovo;
        if (this.peek().type === 'KEYWORD' && this.peek().value === 'struct') {
            const structDef = this.parseStructDefinition();
            // Ponteiro? ex: typedef struct Node* NodePtr;
            let ptrSuffix = '';
            while (this.peek().value === '*') {
                ptrSuffix += ' *';
                this.consume('OPERATOR', '*');
            }
            const newName = this.consume('IDENTIFIER').value;
            this.consume('PUNCT', ';');

            // Se a struct tem nome, usa o nome dela; senão gera um do typedef
            const realName = structDef.structName || newName;
            structDef.structName = realName;

            // Registra o typedef para o parser saber que eh um tipo
            this.typedefs.set(newName, 'struct ' + realName + ptrSuffix);

            return new TypedefNode('struct ' + realName + ptrSuffix, newName, true, structDef, line);
        }

        // typedef int size_t; ou typedef unsigned long size_t;
        const originalType = this.parseTypeStr();
        const newName = this.consume('IDENTIFIER').value;
        this.consume('PUNCT', ';');

        this.typedefs.set(newName, originalType);
        return new TypedefNode(originalType, newName, false, null, line);
    }

    parseFunctionDeclaration() {
        const typeStr = this.parseTypeStr();
        const nameToken = this.consume('IDENTIFIER');
        return this.parseFunctionBody(typeStr, nameToken);
    }

    parseFunctionBody(typeStr, nameToken) {
        this.consume('PUNCT', '(');
        const params = [];

        while (this.peek().value !== ')' && this.peek().type !== 'EOF') {
            const pTypeStr = this.parseTypeStr();
            const pNameToken = this.consume('IDENTIFIER');

            let isArray = false;
            while (this.peek().value === '[') {
                this.consume('PUNCT', '[');
                if (this.peek().value !== ']') this.parseExpression();
                this.consume('PUNCT', ']');
                isArray = true;
            }

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

        // typedef dentro de bloco
        if (token.type === 'KEYWORD' && token.value === 'typedef') {
            return this.parseTypedef();
        }

        // struct definition ou declaração de variável struct
        if (token.type === 'KEYWORD' && token.value === 'struct') {
            return this.parseStructStatement();
        }

        // Tipo normal (int, char, float, etc) ou typedef registrado
        if (this.isTypeKeyword(token)) {
            const typeStr = this.parseTypeStr();

            // Array?
            if (this.tokens[this.position + 1] && this.tokens[this.position + 1].value === '[') {
                return this.parseArrayDeclaration(typeStr);
            }

            // Struct var via typedef? (ex: Point p;)
            if (typeStr.startsWith('struct ') && !typeStr.includes('*')) {
                return this.parseStructVarDeclaration(typeStr);
            }

            return this.parseVariableDeclaration(typeStr);
        }

        if (token.type === 'KEYWORD') {
            switch (token.value) {
                case 'if': return this.parseIfStatement();
                case 'while': return this.parseWhileStatement();
                case 'for': return this.parseForStatement();
                case 'do': return this.parseDoWhileStatement();
                case 'switch': return this.parseSwitchStatement();
                case 'break': this.consume('KEYWORD'); this.consume('PUNCT', ';'); return new BreakStatementNode(token.line);
                case 'continue': this.consume('KEYWORD'); this.consume('PUNCT', ';'); return new ContinueStatementNode(token.line);
                case 'return': return this.parseReturnStatement();
            }
        }
        const expr = this.parseExpression(); this.consume('PUNCT', ';'); return expr;
    }

    parseStructStatement() {
        const line = this.peek().line;
        // Lookahead para decidir se eh definição ou declaração
        const tok1 = this.peekAhead(1); // nome ou {
        const tok2 = this.peekAhead(2); // { ou nome

        // struct Name { ... }; → definição
        if (tok1.type === 'IDENTIFIER' && tok2.value === '{') {
            const structDef = this.parseStructDefinition();

            // Tem variável após? struct Point { int x; } p;
            if (this.peek().type === 'IDENTIFIER') {
                return this.parseStructVarAfterDef(structDef);
            }

            this.consume('PUNCT', ';');
            return structDef;
        }

        // struct { ... } varName; → anônima
        if (tok1.value === '{') {
            const structDef = this.parseStructDefinition();
            if (this.peek().type === 'IDENTIFIER') {
                return this.parseStructVarAfterDef(structDef);
            }
            this.consume('PUNCT', ';');
            return structDef;
        }

        // struct Name varName; ou struct Name *ptr;
        const typeStr = this.parseTypeStr();
        return this.parseStructVarDeclaration(typeStr);
    }

    parseStructVarAfterDef(structDef) {
        const varName = this.consume('IDENTIFIER').value;
        let initExpr = null;
        if (this.peek().value === '=') {
            this.consume('OPERATOR', '=');
            initExpr = this.parseStructInitializerOrExpr();
        }
        this.consume('PUNCT', ';');

        // Retorna array com definição + declaração
        return {
            type: 'StructDefAndDecl',
            definition: structDef,
            declaration: new StructDeclarationNode(
                structDef.structName, varName, initExpr,
                'struct ' + (structDef.structName || '__anon'), structDef.line
            ),
            line: structDef.line
        };
    }

    parseStructVarDeclaration(typeStr) {
        const nameToken = this.consume('IDENTIFIER');
        let initExpr = null;

        // Array de structs: struct Point arr[10];
        if (this.peek().value === '[') {
            const sizeExprs = [];
            while (this.peek().value === '[') {
                this.consume('PUNCT', '['); sizeExprs.push(this.parseExpression()); this.consume('PUNCT', ']');
            }
            this.consume('PUNCT', ';');
            return new ArrayDeclarationNode(typeStr, nameToken.value, sizeExprs, nameToken.line);
        }

        if (this.peek().value === '=') {
            this.consume('OPERATOR', '=');
            initExpr = this.parseStructInitializerOrExpr();
        }
        this.consume('PUNCT', ';');

        const structName = typeStr.replace('struct ', '').replace(/\s*\*/g, '').trim();
        return new StructDeclarationNode(
            structName, nameToken.value, initExpr,
            typeStr, nameToken.line
        );
    }

    parseStructInitializerOrExpr() {
        // { .x = 1, .y = 2 } ou { 1, 2 } ou expressão normal
        if (this.peek().value === '{') {
            return this.parseStructInitializer();
        }
        return this.parseExpression();
    }

    parseStructInitializer() {
        const line = this.peek().line;
        this.consume('PUNCT', '{');
        const values = [];

        while (this.peek().value !== '}' && this.peek().type !== 'EOF') {
            let designator = null;

            // Designated initializer: .campo = valor
            if (this.peek().value === '.') {
                this.consume('OPERATOR', '.');
                designator = this.consume('IDENTIFIER').value;
                this.consume('OPERATOR', '=');
            }

            const value = this.parseExpression();
            values.push({ designator, value });

            if (this.peek().value === ',') this.consume('PUNCT', ',');
        }

        this.consume('PUNCT', '}');
        return new StructInitializerNode(values, line);
    }

    parseSwitchStatement() {
        const line = this.peek().line;
        this.consume('KEYWORD', 'switch');
        this.consume('PUNCT', '(');
        const discriminant = this.parseExpression();
        this.consume('PUNCT', ')');
        this.consume('PUNCT', '{');

        const cases = [];

        while (this.peek().value !== '}' && this.peek().type !== 'EOF') {
            if (this.peek().value === 'case') {
                this.consume('KEYWORD', 'case');
                const test = this.parseExpression();
                this.consume('OPERATOR', ':');
                const consequent = [];
                while (this.peek().value !== 'case' && this.peek().value !== 'default' &&
                       this.peek().value !== '}' && this.peek().type !== 'EOF') {
                    consequent.push(this.parseStatement());
                }
                cases.push({ test, consequent });
            } else if (this.peek().value === 'default') {
                this.consume('KEYWORD', 'default');
                this.consume('OPERATOR', ':');
                const consequent = [];
                while (this.peek().value !== 'case' && this.peek().value !== '}' && this.peek().type !== 'EOF') {
                    consequent.push(this.parseStatement());
                }
                cases.push({ test: null, consequent });
            } else {
                throw new Error(`[Linha ${this.peek().line}] Esperado 'case' ou 'default' dentro do switch.`);
            }
        }

        this.consume('PUNCT', '}');
        return new SwitchStatementNode(discriminant, cases, line);
    }

    parseVariableDeclaration(typeStr) {
        const nameToken = this.consume('IDENTIFIER');
        let initExpr = null;
        if (this.peek().value === '=') {
            this.consume('OPERATOR', '=');
            initExpr = this.parseExpression();
        }
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
        if (this.peek().value === ';') {
            this.consume('PUNCT', ';');
            return new ReturnStatementNode(new LiteralNode(0, 'NUMBER', rToken.line), rToken.line);
        }
        const expr = this.parseExpression(); this.consume('PUNCT', ';');
        return new ReturnStatementNode(expr, rToken.line);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Expression Parsing (com precedência)
    // ═══════════════════════════════════════════════════════════════════

    parseExpression() {
        let leftNode = this.parseTernary();
        const assignOps = ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='];
        if (this.peek().type === 'OPERATOR' && assignOps.includes(this.peek().value)) {
            const op = this.consume('OPERATOR');
            return new AssignmentExpressionNode(leftNode, op.value, this.parseExpression(), leftNode.line);
        }
        return leftNode;
    }

    parseTernary() {
        let cond = this.parseLogicalOr();
        if (this.peek().value === '?') {
            this.consume('OPERATOR', '?');
            const consequent = this.parseExpression();
            this.consume('OPERATOR', ':');
            const alternate = this.parseTernary();
            return new TernaryExpressionNode(cond, consequent, alternate, cond.line);
        }
        return cond;
    }

    parseLogicalOr() {
        let left = this.parseLogicalAnd();
        while (this.peek().value === '||') {
            const op = this.consume('OPERATOR'); left = new BinaryExpressionNode(left, op.value, this.parseLogicalAnd(), op.line);
        }
        return left;
    }

    parseLogicalAnd() {
        let left = this.parseBitwiseOr();
        while (this.peek().value === '&&') {
            const op = this.consume('OPERATOR'); left = new BinaryExpressionNode(left, op.value, this.parseBitwiseOr(), op.line);
        }
        return left;
    }

    parseBitwiseOr() {
        let left = this.parseBitwiseXor();
        while (this.peek().value === '|') {
            const op = this.consume('OPERATOR'); left = new BinaryExpressionNode(left, op.value, this.parseBitwiseXor(), op.line);
        }
        return left;
    }

    parseBitwiseXor() {
        let left = this.parseBitwiseAnd();
        while (this.peek().value === '^') {
            const op = this.consume('OPERATOR'); left = new BinaryExpressionNode(left, op.value, this.parseBitwiseAnd(), op.line);
        }
        return left;
    }

    parseBitwiseAnd() {
        let left = this.parseEquality();
        while (this.peek().value === '&' && this.peekAhead(1).value !== '&') {
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
        let left = this.parseShift();
        while (['<', '>', '<=', '>='].includes(this.peek().value)) {
            const op = this.consume('OPERATOR'); left = new BinaryExpressionNode(left, op.value, this.parseShift(), op.line);
        }
        return left;
    }

    parseShift() {
        let left = this.parseAdditive();
        while (['<<', '>>'].includes(this.peek().value)) {
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

        if (token.type === 'KEYWORD' && token.value === 'sizeof') {
            const op = this.consume('KEYWORD');
            if (this.peek().value === '(') {
                this.consume('PUNCT', '(');
                let arg = this.isTypeKeyword(this.peek()) ? new TypeNameNode(this.parseTypeStr()) : this.parseExpression();
                this.consume('PUNCT', ')');
                return new UnaryExpressionNode(op.value, arg, op.line);
            } else {
                return new UnaryExpressionNode(op.value, this.parseUnary(), op.line);
            }
        }

        if (token.type === 'OPERATOR' && ['&', '*', '!', '~', '++', '--'].includes(token.value)) {
            const op = this.consume('OPERATOR');
            // & seguido de identifier pode ser address-of
            // * seguido de expr pode ser deref
            return new UnaryExpressionNode(op.value, this.parseUnary(), op.line);
        }

        // Unário + e -
        if (token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
            const op = this.consume('OPERATOR');
            const operand = this.parseUnary();
            if (op.value === '-') {
                // Otimização: se o operando eh literal numérico, inverte direto
                if (operand.type === 'Literal' && operand.rawType === 'NUMBER') {
                    return new LiteralNode(-operand.value, 'NUMBER', op.line);
                }
                return new BinaryExpressionNode(new LiteralNode(0, 'NUMBER', op.line), '-', operand, op.line);
            }
            return operand; // unário + não muda nada
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
            } else if (this.peek().value === '.') {
                this.consume('OPERATOR', '.');
                const field = this.consume('IDENTIFIER').value;
                left = new MemberExpressionNode(left, field, false, left.line);
            } else if (this.peek().value === '->') {
                this.consume('OPERATOR', '->');
                const field = this.consume('IDENTIFIER').value;
                left = new MemberExpressionNode(left, field, true, left.line);
            } else if (this.peek().type === 'OPERATOR' && ['++', '--'].includes(this.peek().value)) {
                const op = this.consume('OPERATOR'); left = new UnaryExpressionNode(op.value, left, op.line);
            } else { break; }
        }
        return left;
    }

    parsePrimary() {
        const token = this.peek();

        // NULL literal
        if (token.type === 'IDENTIFIER' && token.value === 'NULL') {
            this.consume('IDENTIFIER');
            return new LiteralNode(0, 'NUMBER', token.line);
        }

        // true / false
        if (token.type === 'IDENTIFIER' && token.value === 'true') {
            this.consume('IDENTIFIER');
            return new LiteralNode(1, 'NUMBER', token.line);
        }
        if (token.type === 'IDENTIFIER' && token.value === 'false') {
            this.consume('IDENTIFIER');
            return new LiteralNode(0, 'NUMBER', token.line);
        }

        // Parênteses: cast ou agrupamento
        if (token.value === '(') {
            this.consume('PUNCT', '(');

            if (this.isTypeKeyword(this.peek())) {
                const typeStr = this.parseTypeStr();
                this.consume('PUNCT', ')');

                // Compound literal: (Type){...}
                if (this.peek().value === '{') {
                    const init = this.parseStructInitializer();
                    return { type: 'CompoundLiteral', castType: typeStr, initializer: init, line: token.line };
                }

                // Cast normal
                return this.parseUnary();
            }

            const expr = this.parseExpression();
            this.consume('PUNCT', ')');
            return expr;
        }

        const consumedToken = this.consume(token.type);
        if (consumedToken.type === 'NUMBER') return new LiteralNode(consumedToken.value, 'NUMBER', consumedToken.line);
        if (consumedToken.type === 'STRING') return new LiteralNode(consumedToken.value, 'STRING', consumedToken.line);
        if (consumedToken.type === 'CHAR') return new LiteralNode(consumedToken.value, 'NUMBER', consumedToken.line);
        if (consumedToken.type === 'IDENTIFIER') return new IdentifierNode(consumedToken.value, consumedToken.line);

        throw new Error(`[Linha ${consumedToken.line}] Expressão inválida iniciada com '${consumedToken.value}'.`);
    }
}
