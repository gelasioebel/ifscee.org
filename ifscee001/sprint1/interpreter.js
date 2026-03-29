/**
 * Type System - Handles C type information and conversions
 * Manages type sizes, floating point detection, const checking, and type casting
 */
class TypeSystem {
    /**
     * Get the size in bytes for a given C type
     * @param {string} typeStr - The type string (e.g., "int", "char*", "double")
     * @returns {number} Size in bytes
     */
    static getSize(typeStr) {
        if (!typeStr) return 4; // Proteção contra tipos indefinidos (ex: raw bytes)
        if (typeStr.includes('*')) return 8;
        if (typeStr.includes('double') || typeStr.includes('long long')) return 8;
        if (typeStr.includes('int') || typeStr.includes('float') || typeStr.includes('long')) return 4;
        if (typeStr.includes('short')) return 2;
        if (typeStr.includes('char') || typeStr.includes('_Bool')) return 1;
        return 4;
    }
    static isFloat(typeStr) {
        return typeStr ? (typeStr.includes('float') || typeStr.includes('double')) : false;
    }
    static isConst(typeStr) {
        return typeStr ? typeStr.includes('const') : false;
    }
    static cast(value, typeStr) {
        if (value === null || value === undefined) return null;
        if (!typeStr) return value; // Se for memória crua sem tipo, apenas aceita o valor
        if (typeStr.includes('_Bool')) return (value !== 0 && value !== false) ? 1 : 0;
        if (!this.isFloat(typeStr) && !typeStr.includes('*')) return Math.trunc(value);
        return value;
    }
}

/**
 * Memory Manager - Simulates RAM with Stack, Heap, and Read-Only Data segments
 * Manages memory allocation, deallocation, and access control
 */
class MemoryManager {
    /**
     * Initialize memory segments with distinct address ranges
     * Stack: 1000+, Heap: 5000+, RODATA: 10000+
     */
    constructor() {
        this.ram = new Map();
        this.stackPointer = 1000; this.heapPointer = 5000; this.rodataPointer = 10000;
        this.allocations = new Map();
    }
    allocateStack(name, rawValue, typeStr) {
        const byteSize = TypeSystem.getSize(typeStr);
        const address = this.stackPointer; this.stackPointer += byteSize;
        const castedValue = TypeSystem.cast(rawValue, typeStr);
        this.ram.set(address, castedValue);
        this.allocations.set(address, { region: 'STACK', name, type: typeStr, byteSize, active: true, isConst: TypeSystem.isConst(typeStr) });
        return address;
    }
    freeStackRange(start, end) {
        for (let a = start; a < end; a++) {
            this.ram.delete(a);
            if (this.allocations.has(a)) this.allocations.get(a).active = false;
        }
        this.stackPointer = start;
    }
    allocateArray(name, dimensions, totalLength, typeStr) {
        const start = this.stackPointer; const byteSize = TypeSystem.getSize(typeStr);
        for(let i = 0; i < totalLength; i++) this.ram.set(start + (i * byteSize), null);
        this.stackPointer += (totalLength * byteSize);
        this.allocations.set(start, { region: 'STACK', name, type: typeStr, isArray: true, dimensions, totalLength, byteSize, active: true, isConst: TypeSystem.isConst(typeStr) });
        return start;
    }
    allocateHeap(size) {
        const start = this.heapPointer;
        for (let i = 0; i < size; i++) this.ram.set(this.heapPointer++, null);

        // A CORREÇÃO: Adicionando "type: 'void*'" para o motor não se perder na tipagem!
        this.allocations.set(start, {
            region: 'HEAP', name: `malloc(${size})`, type: 'void*',
            isArray: true, dimensions: [size], totalLength: size,
            byteSize: 1, active: true
        });
        return start;
    }
    freeHeapRange(address) {
        const meta = this.allocations.get(address);
        if (meta && meta.region === 'HEAP') { meta.active = false; for(let i = 0; i < meta.totalLength; i++) this.ram.delete(address + i); }
    }
    allocateStringLiteral(strValue) {
        const start = this.rodataPointer;
        for (let i = 0; i < strValue.length; i++) this.ram.set(this.rodataPointer++, strValue[i]);
        this.ram.set(this.rodataPointer++, '\0'); // Null terminator (actual null character, not string "\\0")
        this.allocations.set(start, { region: 'RODATA', name: `"${strValue}"`, type: 'char', isArray: true, dimensions: [strValue.length + 1], totalLength: strValue.length + 1, byteSize: 1, active: true });
        return start;
    }
    read(address) {
        if (!this.ram.has(address)) {
            const meta = this.getAllocationInfo(address);
            throw new Error(`⚠️ SEGMENTATION FAULT: Tentativa de leitura no endereço ${address} (0x${address.toString(16).toUpperCase()})\n${meta}`);
        }
        return this.ram.get(address);
    }
    write(address, value) {
        if (!this.ram.has(address)) {
            const meta = this.getAllocationInfo(address);
            throw new Error(`⚠️ SEGMENTATION FAULT: Tentativa de escrita no endereço ${address} (0x${address.toString(16).toUpperCase()})\n${meta}`);
        }
        this.ram.set(address, value);
    }
    getAllocationInfo(address) {
        let nearest = null;
        let minDistance = Infinity;
        for (const [addr, meta] of this.allocations) {
            if (meta.active) {
                const distance = Math.abs(address - addr);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = { addr, meta };
                }
            }
        }
        if (nearest) {
            const offset = address - nearest.addr;
            return `Endereço mais próximo: ${nearest.meta.name} em ${nearest.addr} (distância: ${offset >= 0 ? '+' : ''}${offset} bytes)`;
        }
        return 'Nenhuma alocação próxima encontrada.';
    }

    /**
     * Create a deep snapshot of the current memory state
     * @returns {Object} Snapshot containing all memory state
     */
    createSnapshot() {
        return {
            ram: new Map(this.ram),
            stackPointer: this.stackPointer,
            heapPointer: this.heapPointer,
            rodataPointer: this.rodataPointer,
            allocations: new Map(
                Array.from(this.allocations.entries()).map(([addr, meta]) => [
                    addr,
                    { ...meta, dimensions: meta.dimensions ? [...meta.dimensions] : undefined }
                ])
            )
        };
    }

    /**
     * Restore memory state from a snapshot
     * @param {Object} snapshot - The snapshot to restore
     */
    restoreSnapshot(snapshot) {
        this.ram = new Map(snapshot.ram);
        this.stackPointer = snapshot.stackPointer;
        this.heapPointer = snapshot.heapPointer;
        this.rodataPointer = snapshot.rodataPointer;
        this.allocations = new Map(
            Array.from(snapshot.allocations.entries()).map(([addr, meta]) => [
                addr,
                { ...meta, dimensions: meta.dimensions ? [...meta.dimensions] : undefined }
            ])
        );
    }
}

/**
 * Environment (Symbol Table / Stack Frame) - Manages variable scope
 * Each function call or block creates a new environment linked to its parent
 */
class Environment {
    /**
     * @param {MemoryManager} memory - Reference to the shared memory manager
     * @param {Environment|null} parent - Parent scope (null for global scope)
     */
    constructor(memory, parent = null) {
        this.memory = memory; this.symbols = new Map(); this.parent = parent;
        this.basePointer = this.memory.stackPointer;
    }
    define(name, value, type = 'int') { this.symbols.set(name, this.memory.allocateStack(name, value, type)); }
    get(name) {
        const symbolData = this.resolveAddress(name);
        if (typeof symbolData === 'object') return symbolData;
        const meta = this.memory.allocations.get(symbolData);
        if (meta && meta.isArray) return symbolData;
        return this.memory.read(symbolData);
    }
    resolveAddress(name) {
        if (this.symbols.has(name)) return this.symbols.get(name);
        if (this.parent !== null) return this.parent.resolveAddress(name);

        // Sugestões de variáveis similares
        const allVars = this.getAllVariableNames();
        const similar = allVars.filter(v => this.levenshtein(v, name) <= 2).slice(0, 3);
        const suggestion = similar.length > 0 ? `\n💡 Você quis dizer: ${similar.join(', ')}?` : '';
        throw new Error(`⚠️ VARIÁVEL NÃO DECLARADA: '${name}' não foi declarada neste escopo.${suggestion}`);
    }
    getAllVariableNames() {
        const names = Array.from(this.symbols.keys());
        if (this.parent !== null) names.push(...this.parent.getAllVariableNames());
        return names;
    }
    levenshtein(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
                else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
        return matrix[b.length][a.length];
    }
    destroy() { this.memory.freeStackRange(this.basePointer, this.memory.stackPointer); }
}

/**
 * IFSCee Interpreter - Executes the Abstract Syntax Tree (AST) step-by-step
 * Uses a generator to yield execution states for visualization
 */
class IFSCeeInterpreter {
    /**
     * @param {Object} ast - The Abstract Syntax Tree from the parser
     */
    constructor(ast) {
        this.ast = ast; this.memory = new MemoryManager();
        this.globalScope = new Environment(this.memory);
        this.lastLine = null;
        this.callStack = []; // Track function call stack for better debugging
        this.maxCallStackDepth = 1000; // Prevent infinite recursion
        this.registerBuiltIns();
    }

    /**
     * Register built-in functions (printf, malloc, free, etc.)
     */
    registerBuiltIns() {
        this.globalScope.symbols.set('malloc', { type: 'BuiltIn', execute: function*(args, i) { return i.memory.allocateHeap(args[0]); } });
        this.globalScope.symbols.set('free', { type: 'BuiltIn', execute: function*(args, i) { i.memory.freeHeapRange(args[0]); return null; } });

        // --- O VERDADEIRO printf DO C! ---
        this.globalScope.symbols.set('printf', { type: 'BuiltIn', execute: function*(args, i) {
                if (args.length === 0) return 0;

                // Função auxiliar para ler strings puras da RAM varrendo até achar o '\0'
                const readStringFromRAM = (address) => {
                    let str = '';
                    let currentAddr = address;
                    while (true) {
                        const char = i.memory.read(currentAddr++);
                        if (char === '\0' || char === null || char === undefined) break;
                        str += char;
                    }
                    return str;
                };

                // O primeiro argumento é sempre a string de formatação (que está gravada na RODATA)
                let formatString = typeof args[0] === 'number' ? readStringFromRAM(args[0]) : String(args[0]);
                let output = '';
                let argIndex = 1; // Começa a procurar as variáveis a partir do 2º argumento

                for (let j = 0; j < formatString.length; j++) {
                    const char = formatString[j];

                    // Interceta os especificadores de formato (%)
                    if (char === '%' && j + 1 < formatString.length) {
                        const specifier = formatString[j + 1];
                        const value = args[argIndex] !== undefined ? args[argIndex] : 0;

                        switch (specifier) {
                            case 'd':
                            case 'i':
                                output += Math.trunc(value); // Inteiro
                                argIndex++; break;
                            case 'f':
                                output += Number(value).toFixed(2); // Float com 2 casas
                                argIndex++; break;
                            case 'c':
                                output += typeof value === 'number' ? String.fromCharCode(value) : value; // Char
                                argIndex++; break;
                            case 's':
                                output += typeof value === 'number' ? readStringFromRAM(value) : value; // String
                                argIndex++; break;
                            case 'p':
                                output += '0x' + Number(value).toString(16).toUpperCase(); // Ponteiro (Hexadecimal)
                                argIndex++; break;
                            case '%':
                                output += '%'; // Escapa o %
                                break;
                            default:
                                output += '%' + specifier; // Não reconhecido, imprime puro
                        }
                        j++; // Pula a letra especificadora
                    }
                    // Handle escape sequences (already processed by lexer)
                    else if (char === '\n') {
                        output += '<br>';
                    }
                    else if (char === '\t') {
                        output += '&nbsp;&nbsp;&nbsp;&nbsp;'; // 4 spaces for tab
                    }
                    else if (char === '\r') {
                        // Carriage return - ignore in HTML
                    }
                    else if (char === '\0') {
                        break; // Null terminator - stop printing
                    }
                    else {
                        output += char;
                    }
                }

                // Envia o texto formatado para o Terminal visual
                yield { type: 'TERMINAL_PRINT', output };
                return output.length;
            }});
    }

    getFlatOffset(dimensions, indices, line) {
        if (indices.length > dimensions.length) {
            throw new Error(`[Linha ${line}] ⚠️ ERRO DE INDEXAÇÃO: Tentando acessar ${indices.length} dimensões, mas o array tem apenas ${dimensions.length} dimensão(ões).\n💡 Dica: Verifique os colchetes [] no acesso ao array.`);
        }
        let flatOffset = 0;
        for (let i = 0; i < indices.length; i++) {
            if (indices[i] < 0 || indices[i] >= dimensions[i]) {
                throw new Error(`[Linha ${line}] ⚠️ ARRAY OUT OF BOUNDS: Índice [${indices[i]}] inválido na dimensão ${i}.\n` +
                    `Limites válidos: 0 a ${dimensions[i] - 1}\n` +
                    `💡 Dica: Arrays em C começam no índice 0. Um array[${dimensions[i]}] tem índices de 0 a ${dimensions[i] - 1}.`);
            }
            let chunk = indices[i];
            for (let j = i + 1; j < dimensions.length; j++) chunk *= dimensions[j];
            flatOffset += chunk;
        }
        return flatOffset;
    }

    *interpret() { try { yield* this.visit(this.ast, this.globalScope); } catch (e) { yield { type: 'ERROR', message: e.message, previousLine: this.lastLine }; } }

    *visit(node, env) {
        const stepNodes = ['VariableDeclaration', 'ArrayDeclaration', 'AssignmentExpression', 'ReturnStatement', 'CallExpression', 'IfStatement', 'WhileStatement', 'ForStatement', 'DoWhileStatement', 'BreakStatement', 'ContinueStatement'];
        if (stepNodes.includes(node.type)) {
            // Create snapshot BEFORE executing the step
            const memorySnapshot = this.memory.createSnapshot();
            yield { type: 'STEP', nextLine: node.line, previousLine: this.lastLine, memory: this.memory, memorySnapshot };
            this.lastLine = node.line;
        }

        switch (node.type) {
            case 'Program': return yield* this.visitProgram(node, env);
            case 'FunctionDeclaration': return yield* this.visitFunctionDeclaration(node, env);
            case 'VariableDeclaration': return yield* this.visitVariableDeclaration(node, env);
            case 'ArrayDeclaration': return yield* this.visitArrayDeclaration(node, env);
            case 'AssignmentExpression': return yield* this.visitAssignment(node, env);
            case 'UnaryExpression': return yield* this.visitUnary(node, env);
            case 'IndexExpression': return yield* this.visitIndex(node, env);
            case 'CallExpression': return yield* this.visitCall(node, env);
            case 'BinaryExpression': return yield* this.visitBinary(node, env);
            case 'ReturnStatement': return yield* this.visitReturn(node, env);
            case 'IfStatement': return yield* this.visitIf(node, env);
            case 'WhileStatement': return yield* this.visitWhile(node, env);
            case 'DoWhileStatement': return yield* this.visitDoWhile(node, env);
            case 'ForStatement': return yield* this.visitFor(node, env);
            case 'BreakStatement': return { type: 'BREAK' };
            case 'ContinueStatement': return { type: 'CONTINUE' };
            case 'Literal': return this.visitLiteral(node);
            case 'Identifier': return env.get(node.name);
            default: throw new Error(`Nó AST não implementado: ${node.type}`);
        }
    }

    *visitProgram(node, env) {
        for (const s of node.body) if (s.type === 'FunctionDeclaration') yield* this.visit(s, env);
        let main;
        try {
            main = env.get('main');
        } catch (e) {
            throw new Error("⚠️ ERRO FATAL: Função 'main' não encontrada.\n" +
                "💡 Dica: Todo programa C deve ter uma função 'int main() { ... }' como ponto de entrada.");
        }
        if (!main || main.type !== 'FunctionDeclaration') {
            throw new Error("⚠️ ERRO FATAL: 'main' não é uma função válida.\n" +
                "💡 Dica: Declare main corretamente: int main() { ... }");
        }
        const r = yield* this.visitBlock(main.body, new Environment(this.memory, env));
        const exitCode = (r && r.type === 'RETURN') ? r.value : 0;
        yield { type: 'PROGRAM_END', exitCode: exitCode, previousLine: this.lastLine, memory: this.memory };
        return exitCode;
    }

    *visitFunctionDeclaration(node, env) { env.symbols.set(node.name, node); return null; }

    *visitBlock(statements, env) {
        for (const s of statements) {
            const r = yield* this.visit(s, env);
            if (r && (r.type === 'RETURN' || r.type === 'BREAK' || r.type === 'CONTINUE')) return r;
        }
        return null;
    }

    *visitVariableDeclaration(node, env) {
        let val = null; if (node.initExpression) val = yield* this.visit(node.initExpression, env);
        env.define(node.name, val, node.varType);
        const memorySnapshot = this.memory.createSnapshot();
        yield { type: 'MEM_UPDATE', memory: this.memory, memorySnapshot }; return null;
    }

    *visitArrayDeclaration(node, env) {
        const dimensions = []; let totalLength = 1;
        for (let expr of node.sizeExpressions) {
            const size = yield* this.visit(expr, env);
            if(size <= 0) {
                throw new Error(`[Linha ${node.line}] ⚠️ TAMANHO DE ARRAY INVÁLIDO: O tamanho deve ser um número inteiro positivo.\n` +
                    `Valor recebido: ${size}\n` +
                    `💡 Dica: Em C, arrays devem ter tamanho conhecido em tempo de compilação e maior que zero.`);
            }
            dimensions.push(size); totalLength *= size;
        }
        env.symbols.set(node.name, this.memory.allocateArray(node.name, dimensions, totalLength, node.varType));
        const memorySnapshot = this.memory.createSnapshot();
        yield { type: 'MEM_UPDATE', memory: this.memory, memorySnapshot }; return null;
    }

    *visitAssignment(node, env) {
        const rightVal = yield* this.visit(node.right, env);
        let addr, meta;

        if (node.left.type === 'Identifier') {
            addr = env.resolveAddress(node.left.name);
            meta = this.memory.allocations.get(addr);
        } else if (node.left.type === 'UnaryExpression' && node.left.operator === '*') {
            addr = yield* this.visit(node.left.argument, env);
        } else if (node.left.type === 'IndexExpression') {
            const base = yield* this.visit(node.left.arrayObject, env);
            const indices = []; for(let expr of node.left.indexExpressions) indices.push(yield* this.visit(expr, env));
            meta = this.memory.allocations.get(base);
            let flatOffset = meta && meta.isArray ? this.getFlatOffset(meta.dimensions, indices, node.line) : indices[0];
            const bSize = meta ? meta.byteSize : 4;
            addr = base + (flatOffset * bSize);
        } else throw new Error(`[Linha ${node.line}] L-value inválido.`);

        if (meta && meta.isConst) {
            throw new Error(`[Linha ${node.line}] ⚠️ ERRO DE CONSTANTE: Tentativa de modificar variável 'const'.\n` +
                `Variável: ${meta.name}\n` +
                `💡 Dica: Variáveis declaradas com 'const' não podem ser alteradas após a inicialização.`);
        }

        let finalVal = rightVal;
        if (node.operator !== '=') {
            const currentVal = this.memory.read(addr);
            switch(node.operator) {
                case '+=': finalVal = currentVal + rightVal; break;
                case '-=': finalVal = currentVal - rightVal; break;
                case '*=': finalVal = currentVal * rightVal; break;
                case '/=': finalVal = Math.floor(currentVal / rightVal); break;
                case '%=': finalVal = currentVal % rightVal; break;
            }
        }
        const castedVal = meta ? TypeSystem.cast(finalVal, meta.type) : finalVal;
        this.memory.write(addr, castedVal);
        const memorySnapshot = this.memory.createSnapshot();
        yield { type: 'MEM_UPDATE', memory: this.memory, memorySnapshot }; return castedVal;
    }

    *visitUnary(node, env) {
        if (node.operator === 'sizeof') {
            if (node.argument.type === 'TypeName') return TypeSystem.getSize(node.argument.value);
            else if (node.argument.type === 'Identifier') {
                const addr = env.resolveAddress(node.argument.name); const meta = this.memory.allocations.get(addr);
                return meta ? (meta.isArray ? meta.totalLength * meta.byteSize : meta.byteSize) : 4;
            }
        }
        if (node.operator === '&') return env.resolveAddress(node.argument.name);
        if (node.operator === '*') {
            const addr = yield* this.visit(node.argument, env);
            if (!addr || addr === 0) {
                throw new Error(`[Linha ${node.line}] ⚠️ NULL POINTER DEREFERENCE: Tentativa de desreferenciar ponteiro nulo.\n` +
                    `💡 Dica: Sempre verifique se um ponteiro foi inicializado (malloc) antes de usá-lo.`);
            }
            return this.memory.read(addr);
        }
        if (node.operator === '!') {
            const val = yield* this.visit(node.argument, env); return (val === 0 || val === false) ? 1 : 0;
        }
        if (node.operator === '++' || node.operator === '--') {
            const addr = env.resolveAddress(node.argument.name); let val = this.memory.read(addr);
            val = node.operator === '++' ? val + 1 : val - 1; this.memory.write(addr, val);
            const memorySnapshot = this.memory.createSnapshot();
            yield { type: 'MEM_UPDATE', memory: this.memory, memorySnapshot }; return val;
        }
    }

    *visitIndex(node, env) {
        const base = yield* this.visit(node.arrayObject, env);
        const meta = this.memory.allocations.get(base);
        const indices = []; for(let expr of node.indexExpressions) indices.push(yield* this.visit(expr, env));

        if(meta && meta.isArray) {
            const flatOffset = this.getFlatOffset(meta.dimensions, indices, node.line);
            const addr = base + (flatOffset * meta.byteSize);
            if (indices.length < meta.dimensions.length) return addr;
            return this.memory.read(addr);
        } else {
            if (indices.length > 1) throw new Error(`Indexação múltipla em ponteiro simples não suportada.`);
            const bSize = meta ? meta.byteSize : 4; return this.memory.read(base + (indices[0] * bSize));
        }
    }

    *visitCall(node, env) {
        const name = node.callee.name;
        const args = []; for(const a of node.arguments) args.push(yield* this.visit(a, env));

        let func;
        try {
            func = env.get(name);
        } catch (e) {
            throw new Error(`[Linha ${node.line}] ⚠️ FUNÇÃO NÃO DECLARADA: '${name}' não foi definida.\n💡 Dica: Verifique se a função foi declarada antes de ser chamada.`);
        }

        if (func.type === 'BuiltIn') return yield* func.execute(args, this);

        if (func.type === 'FunctionDeclaration') {
            // Check for stack overflow (infinite recursion)
            if (this.callStack.length >= this.maxCallStackDepth) {
                const trace = this.callStack.slice(-5).map(f => `  → ${f.name}()`).join('\n');
                throw new Error(`[Linha ${node.line}] ⚠️ STACK OVERFLOW: Recursão profunda demais (${this.callStack.length} chamadas).\n` +
                    `Últimas 5 chamadas:\n${trace}\n💡 Dica: Verifique se sua função recursiva tem uma condição de parada adequada.`);
            }

            // Push to call stack
            this.callStack.push({ name, line: node.line, args });

            const funcEnv = new Environment(this.memory, this.globalScope);

            // Map arguments to parameters
            for (let i = 0; i < func.params.length; i++) {
                funcEnv.define(func.params[i].name, args[i] || null, func.params[i].type);
            }

            // Execute function body
            const result = yield* this.visitBlock(func.body, funcEnv);

            // Clean up
            funcEnv.destroy();
            this.callStack.pop();

            if (result && result.type === 'RETURN') return result.value;
            return null;
        }

        throw new Error(`[Linha ${node.line}] ⚠️ ERRO: '${name}' não é uma função válida.`);
    }

    *visitBinary(node, env) {
        if (node.operator === '&&') {
            const l = yield* this.visit(node.left, env); if (l === 0 || l === false) return 0;
            const r = yield* this.visit(node.right, env); return (r !== 0 && r !== false) ? 1 : 0;
        }
        if (node.operator === '||') {
            const l = yield* this.visit(node.left, env); if (l !== 0 && l !== false) return 1;
            const r = yield* this.visit(node.right, env); return (r !== 0 && r !== false) ? 1 : 0;
        }

        const l = yield* this.visit(node.left, env); const r = yield* this.visit(node.right, env);
        switch(node.operator) {
            case '+': return l + r;
            case '-': return l - r;
            case '*': return l * r;
            case '/': return Math.floor(l / r);
            case '%': return l % r; // Modulo operator
            case '==': return l === r ? 1 : 0;
            case '!=': return l !== r ? 1 : 0;
            case '<': return l < r ? 1 : 0;
            case '>': return l > r ? 1 : 0;
            case '<=': return l <= r ? 1 : 0;
            case '>=': return l >= r ? 1 : 0;
        }
    }

    *visitReturn(node, env) { const ret = yield* this.visit(node.argument, env); return { type: 'RETURN', value: ret }; }

    *visitIf(node, env) {
        const cond = yield* this.visit(node.condition, env);
        if (cond !== 0 && cond !== false) {
            const bEnv = new Environment(this.memory, env); const r = yield* this.visitBlock(node.consequent, bEnv); bEnv.destroy();
            if (r) return r;
        } else if (node.alternate) {
            const bEnv = new Environment(this.memory, env); const r = yield* this.visitBlock(node.alternate, bEnv); bEnv.destroy();
            if (r) return r;
        }
        return null;
    }

    *visitWhile(node, env) {
        while (true) {
            yield { type: 'STEP', nextLine: node.line, previousLine: this.lastLine, memory: this.memory }; this.lastLine = node.line;
            const cond = yield* this.visit(node.condition, env); if (!cond) break;
            const bEnv = new Environment(this.memory, env); const r = yield* this.visitBlock(node.body, bEnv); bEnv.destroy();
            if (r && r.type === 'RETURN') return r; if (r && r.type === 'BREAK') break; if (r && r.type === 'CONTINUE') continue;
        }
        return null;
    }

    *visitDoWhile(node, env) {
        do {
            const bEnv = new Environment(this.memory, env); const r = yield* this.visitBlock(node.body, bEnv); bEnv.destroy();
            if (r && r.type === 'RETURN') return r; if (r && r.type === 'BREAK') break; if (r && r.type === 'CONTINUE') continue;
            yield { type: 'STEP', nextLine: node.line, previousLine: this.lastLine, memory: this.memory }; this.lastLine = node.line;
        } while (yield* this.visit(node.condition, env));
        return null;
    }

    *visitFor(node, env) {
        const forEnv = new Environment(this.memory, env);
        if (node.init) yield* this.visit(node.init, forEnv);
        while (true) {
            yield { type: 'STEP', nextLine: node.line, previousLine: this.lastLine, memory: this.memory }; this.lastLine = node.line;
            if (node.condition) { const cond = yield* this.visit(node.condition, forEnv); if (!cond) break; }
            const bodyEnv = new Environment(this.memory, forEnv); const r = yield* this.visitBlock(node.body, bodyEnv); bodyEnv.destroy();
            if (r && r.type === 'RETURN') { forEnv.destroy(); return r; }
            if (r && r.type === 'BREAK') break;
            if (node.increment) yield* this.visit(node.increment, forEnv);
        }
        forEnv.destroy(); return null;
    }

    visitLiteral(node) {
        if(node.rawType === 'STRING') return this.memory.allocateStringLiteral(node.value); return node.value;
    }
}