/**
 * IFSCee - Interpreter
 * Fase 4: Interpretação da AST
 * 
 * NOTA: Esta é uma versão BÁSICA para demonstração.
 * Será expandida com:
 * - Memory management completo
 * - Call stack
 * - Built-ins (printf, malloc, etc.)
 * - Pointer support
 * - Structs e unions
 */

class TypeSystem {
    static SIZES = {
        'char': 1,
        'short': 2,
        'int': 4,
        'long': 8,
        'float': 4,
        'double': 8,
        'void': 0
    };

    static registrarStruct(nome, campos) {
        // Placeholder para registrar structs customizadas
    }

    static obterTamanho(tipo) {
        if (this.SIZES[tipo]) {
            return this.SIZES[tipo];
        }
        // Pointer padrão
        if (tipo.endsWith('*')) return 8;
        // Array
        if (tipo.includes('[')) return this.obterTamanhoArray(tipo);
        return 4; // Default
    }

    static obterTamanhoArray(tipo) {
        // Placeholder
        return 4;
    }
}

class Endereco {
    constructor(valor, tipo) {
        this.valor = valor;
        this.tipo = tipo;
    }

    toString() {
        return `0x${this.valor.toString(16)}`;
    }
}

class MemoryManager {
    constructor() {
        this.ram = new Map(); // endereco -> valor
        this.alocacoes = new Map(); // endereco -> metadados
        
        this.stackPointer = 1000;
        this.heapPointer = 5000;
        this.rodataPointer = 10000;
        
        this.ultimoSnapshot = null;
    }

    /**
     * Aloca memória na pilha
     */
    alocarStack(nome, valor, tipo) {
        const endereco = this.stackPointer;
        const tamanho = TypeSystem.obterTamanho(tipo);
        
        this.ram.set(endereco, valor);
        this.alocacoes.set(endereco, {
            regiao: 'STACK',
            nome: nome,
            tipo: tipo,
            tamanho: tamanho,
            ativo: true
        });
        
        this.stackPointer += tamanho;
        return endereco;
    }

    /**
     * Aloca memória no heap
     */
    alocarHeap(tamanho) {
        const endereco = this.heapPointer;
        
        this.alocacoes.set(endereco, {
            regiao: 'HEAP',
            nome: 'malloc',
            tipo: 'void*',
            tamanho: tamanho,
            ativo: true
        });
        
        this.heapPointer += tamanho;
        return endereco;
    }

    /**
     * Aloca string literal em RODATA
     */
    alocarStringLiteral(str) {
        const endereco = this.rodataPointer;
        const tamanho = str.length + 1; // +1 para null terminator
        
        this.ram.set(endereco, str);
        this.alocacoes.set(endereco, {
            regiao: 'RODATA',
            nome: 'string_literal',
            tipo: 'char*',
            tamanho: tamanho,
            ativo: true
        });
        
        this.rodataPointer += tamanho;
        return endereco;
    }

    /**
     * Lê valor de memória
     */
    ler(endereco) {
        if (!this.alocacoes.has(endereco)) {
            throw new Error(`Segment Fault: Acesso à memória não alocada (0x${endereco.toString(16)})`);
        }
        return this.ram.get(endereco);
    }

    /**
     * Escreve valor em memória
     */
    escrever(endereco, valor) {
        if (!this.alocacoes.has(endereco)) {
            throw new Error(`Segment Fault: Acesso à memória não alocada (0x${endereco.toString(16)})`);
        }
        this.ram.set(endereco, valor);
    }

    /**
     * Criar snapshot de memória
     */
    criarSnapshot() {
        return {
            ram: new Map(this.ram),
            alocacoes: new Map(this.alocacoes),
            stackPointer: this.stackPointer,
            heapPointer: this.heapPointer,
            rodataPointer: this.rodataPointer
        };
    }

    /**
     * Restaurar snapshot
     */
    restaurarSnapshot(snapshot) {
        this.ram = new Map(snapshot.ram);
        this.alocacoes = new Map(snapshot.alocacoes);
        this.stackPointer = snapshot.stackPointer;
        this.heapPointer = snapshot.heapPointer;
        this.rodataPointer = snapshot.rodataPointer;
    }

    /**
     * Obter estado para UI (para simulating)
     */
    obterEstado() {
        const stack = [];
        const heap = [];

        for (const [endereco, meta] of this.alocacoes.entries()) {
            if (meta.regiao === 'STACK' && meta.ativo) {
                stack.push({
                    endereco: endereco,
                    nome: meta.nome,
                    valor: this.ram.get(endereco)
                });
            } else if (meta.regiao === 'HEAP' && meta.ativo) {
                heap.push({
                    endereco: endereco,
                    nome: meta.nome,
                    valor: this.ram.get(endereco)
                });
            }
        }

        return { stack, heap };
    }
}

class Environment {
    constructor(parent = null) {
        this.parent = parent;
        this.variaveis = new Map();
        this.funcoes = new Map();
    }

    /**
     * Define uma variável
     */
    definirVariavel(nome, endereco, tipo) {
        this.variaveis.set(nome, { endereco, tipo });
    }

    /**
     * Obtém uma variável
     */
    obterVariavel(nome) {
        if (this.variaveis.has(nome)) {
            return this.variaveis.get(nome);
        }
        if (this.parent) {
            return this.parent.obterVariavel(nome);
        }
        throw new Error(`Variável não definida: ${nome}`);
    }

    /**
     * Define uma função
     */
    definirFuncao(nome, funcao) {
        this.funcoes.set(nome, funcao);
    }

    /**
     * Obtém uma função
     */
    obterFuncao(nome) {
        if (this.funcoes.has(nome)) {
            return this.funcoes.get(nome);
        }
        if (this.parent) {
            return this.parent.obterFuncao(nome);
        }
        return null;
    }
}

class IFSCeeInterpreter {
    constructor(ast) {
        this.ast = ast;
        this.memoria = new MemoryManager();
        this.ambienteGlobal = new Environment();
        this.ambienteAtual = this.ambienteGlobal;
        this.callStack = [];
        this.saida = '';
        this.parou = false;
        this.valorRetorno = null;

        this.registrarBuiltIns();
    }

    /**
     * Registra funções built-in (printf, scanf, malloc, etc.)
     */
    registrarBuiltIns() {
        // printf - VERSÃO SIMPLIFICADA
        this.ambienteGlobal.definirFuncao('printf', {
            nome: 'printf',
            isBuiltin: true,
            executar: (args, interpreter) => {
                if (args.length === 0) return 0;

                const formato = args[0];
                const valores = args.slice(1);

                let resultado = '';
                let indiceValor = 0;

                for (let i = 0; i < formato.length; i++) {
                    if (formato[i] === '%' && i + 1 < formato.length) {
                        const especificador = formato[i + 1];

                        switch (especificador) {
                            case 'd': // int
                                resultado += Math.floor(valores[indiceValor++] || 0);
                                break;
                            case 'f': // float
                                resultado += parseFloat(valores[indiceValor++] || 0).toFixed(6);
                                break;
                            case 's': // string
                                resultado += valores[indiceValor++] || '';
                                break;
                            case 'c': // char
                                resultado += String.fromCharCode(valores[indiceValor++] || 0);
                                break;
                            case '%': // %
                                resultado += '%';
                                break;
                            default:
                                resultado += '%' + especificador;
                        }

                        i++;
                    } else if (formato[i] === '\\' && i + 1 < formato.length) {
                        if (formato[i + 1] === 'n') {
                            resultado += '\n';
                            i++;
                        } else if (formato[i + 1] === 't') {
                            resultado += '\t';
                            i++;
                        }
                    } else {
                        resultado += formato[i];
                    }
                }

                interpreter.saida += resultado;
                return resultado.length;
            }
        });

        // malloc
        this.ambienteGlobal.definirFuncao('malloc', {
            nome: 'malloc',
            isBuiltin: true,
            executar: (args, interpreter) => {
                const tamanho = args[0] || 0;
                return interpreter.memoria.alocarHeap(tamanho);
            }
        });

        // free
        this.ambienteGlobal.definirFuncao('free', {
            nome: 'free',
            isBuiltin: true,
            executar: (args, interpreter) => {
                // Placeholder
                return 0;
            }
        });
    }

    /**
     * Interpreta o programa
     */
    *interpretar() {
        yield { tipo: 'INICIO', mensagem: 'Interpretação iniciada' };

        try {
            // Recolher declarações de função
            for (const node of this.ast.body) {
                if (node.type === 'FunctionDeclaration') {
                    this.ambienteGlobal.definirFuncao(node.name, node);
                }
            }

            // Buscar e executar main
            const funcaoMain = this.ambienteGlobal.obterFuncao('main');
            if (!funcaoMain) {
                throw new Error('Nenhuma função main encontrada');
            }

            yield *this.visitarChamadaFuncao({
                type: 'CallExpression',
                callee: { name: 'main' },
                arguments: []
            });

            yield { tipo: 'FIM', mensagem: 'Programa finalizado' };

        } catch (erro) {
            yield { tipo: 'ERRO', mensagem: erro.message };
        }
    }

    /**
     * Visita e interpreta um nó
     */
    *visitarExpressao(node) {
        if (!node) return undefined;

        switch (node.type) {
            case 'Literal':
                return node.value;

            case 'Identifier':
                const varInfo = this.ambienteAtual.obterVariavel(node.name);
                return this.memoria.ler(varInfo.endereco);

            case 'BinaryExpression':
                return yield *this.visitarBinaria(node);

            case 'UnaryExpression':
                return yield *this.visitarUnaria(node);

            case 'AssignmentExpression':
                return yield *this.visitarAssignment(node);

            case 'CallExpression':
                return yield *this.visitarChamadaFuncao(node);

            default:
                return undefined;
        }
    }

    /**
     * Expressão binária
     */
    *visitarBinaria(node) {
        const esquerda = yield *this.visitarExpressao(node.left);
        
        // Short-circuit para && e ||
        if (node.operator === '&&') {
            if (!esquerda) return false;
            const direita = yield *this.visitarExpressao(node.right);
            return direita;
        }

        if (node.operator === '||') {
            if (esquerda) return true;
            const direita = yield *this.visitarExpressao(node.right);
            return direita;
        }

        const direita = yield *this.visitarExpressao(node.right);

        switch (node.operator) {
            case '+': return esquerda + direita;
            case '-': return esquerda - direita;
            case '*': return esquerda * direita;
            case '/': return Math.trunc(esquerda / direita);
            case '%': return esquerda % direita;
            case '<': return esquerda < direita ? 1 : 0;
            case '>': return esquerda > direita ? 1 : 0;
            case '<=': return esquerda <= direita ? 1 : 0;
            case '>=': return esquerda >= direita ? 1 : 0;
            case '==': return esquerda === direita ? 1 : 0;
            case '!=': return esquerda !== direita ? 1 : 0;
            case '&': return esquerda & direita;
            case '|': return esquerda | direita;
            case '^': return esquerda ^ direita;
            case '[': return esquerda[direita]; // Array access
            default: throw new Error(`Operador binário desconhecido: ${node.operator}`);
        }
    }

    /**
     * Expressão unária
     */
    *visitarUnaria(node) {
        const arg = yield *this.visitarExpressao(node.argument);

        switch (node.operator) {
            case '+': return +arg;
            case '-': return -arg;
            case '!': return arg ? 0 : 1;
            case '~': return ~arg;
            default: throw new Error(`Operador unário desconhecido: ${node.operator}`);
        }
    }

    /**
     * Assignment
     */
    *visitarAssignment(node) {
        const valor = yield *this.visitarExpressao(node.right);

        if (node.left.type === 'Identifier') {
            const varInfo = this.ambienteAtual.obterVariavel(node.left.name);
            this.memoria.escrever(varInfo.endereco, valor);
            return valor;
        }

        throw new Error('Assignment inválido');
    }

    /**
     * Chamada de função
     */
    *visitarChamadaFuncao(node) {
        const nomeFuncao = node.callee.name;
        const funcao = this.ambienteGlobal.obterFuncao(nomeFuncao);

        if (!funcao) {
            throw new Error(`Função não definida: ${nomeFuncao}`);
        }

        // Built-in
        if (funcao.isBuiltin) {
            const args = [];
            for (const arg of node.arguments) {
                args.push(yield *this.visitarExpressao(arg));
            }
            return funcao.executar(args, this);
        }

        // Avaliar argumentos
        const args = [];
        for (const arg of node.arguments) {
            args.push(yield *this.visitarExpressao(arg));
        }

        // Novo ambiente para função
        const ambienteAnterior = this.ambienteAtual;
        this.ambienteAtual = new Environment(this.ambienteGlobal);

        // Bind parâmetros
        for (let i = 0; i < funcao.params.length; i++) {
            const param = funcao.params[i];
            const endereco = this.memoria.alocarStack(param.nome, args[i] || 0, param.tipo);
            this.ambienteAtual.definirVariavel(param.nome, endereco, param.tipo);
        }

        // Executar corpo
        for (const stmt of funcao.body) {
            yield *this.visitarStatement(stmt);
            if (this.parou || this.valorRetorno !== null) break;
        }

        const resultado = this.valorRetorno || 0;
        this.valorRetorno = null;

        // Restaurar ambiente
        this.ambienteAtual = ambienteAnterior;

        return resultado;
    }

    /**
     * Statement
     */
    *visitarStatement(node) {
        if (!node) return;

        switch (node.type) {
            case 'VariableDeclaration':
                yield *this.visitarVariableDeclaration(node);
                break;
            case 'BlockStatement':
                for (const stmt of node.statements) {
                    yield *this.visitarStatement(stmt);
                    if (this.parou || this.valorRetorno !== null) break;
                }
                break;
            case 'IfStatement':
                yield *this.visitarIfStatement(node);
                break;
            case 'WhileStatement':
                yield *this.visitarWhileStatement(node);
                break;
            case 'ForStatement':
                yield *this.visitarForStatement(node);
                break;
            case 'ReturnStatement':
                yield *this.visitarReturnStatement(node);
                break;
            case 'CallExpression':
                yield *this.visitarChamadaFuncao(node);
                break;
        }
    }

    /**
     * Variable Declaration
     */
    *visitarVariableDeclaration(node) {
        let valor = 0;
        if (node.initialValue) {
            valor = yield *this.visitarExpressao(node.initialValue);
        }

        const endereco = this.memoria.alocarStack(node.name, valor, node.variableType);
        this.ambienteAtual.definirVariavel(node.name, endereco, node.variableType);
    }

    /**
     * If Statement
     */
    *visitarIfStatement(node) {
        const test = yield *this.visitarExpressao(node.test);

        if (test) {
            yield *this.visitarStatement(node.consequent);
        } else if (node.alternate) {
            yield *this.visitarStatement(node.alternate);
        }
    }

    /**
     * While Statement
     */
    *visitarWhileStatement(node) {
        while (true) {
            const test = yield *this.visitarExpressao(node.test);
            if (!test) break;

            yield *this.visitarStatement(node.body);
            if (this.parou) break;
        }
    }

    /**
     * For Statement
     */
    *visitarForStatement(node) {
        yield *this.visitarStatement(node.init);

        while (true) {
            if (node.test) {
                const test = yield *this.visitarExpressao(node.test);
                if (!test) break;
            }

            yield *this.visitarStatement(node.body);
            if (this.parou) break;

            if (node.update) {
                yield *this.visitarExpressao(node.update);
            }
        }
    }

    /**
     * Return Statement
     */
    *visitarReturnStatement(node) {
        if (node.argument) {
            this.valorRetorno = yield *this.visitarExpressao(node.argument);
        } else {
            this.valorRetorno = 0;
        }
    }
}
