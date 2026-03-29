// interpretadorC.js
/**
 * Interpretador para código C
 * Executa AST gerada pelo analisador sintático
 */
class InterpretadorC {
    /**
     * Cria uma instância do interpretador
     * @param {GerenciadorMemoria} gerenciadorMemoria - Gerenciador de memória
     * @param {SimuladorIO} simuladorIO - Simulador de entrada/saída
     * @param {RegistroExecucao} registroExecucao - Registro de execução
     */
    constructor(gerenciadorMemoria, simuladorIO, registroExecucao) {
        // Componentes principais
        this.gerenciadorMemoria = gerenciadorMemoria;
        this.simuladorIO = simuladorIO;
        this.registroExecucao = registroExecucao;

        // Estado de execução
        this.ast = null;
        this.posicaoExecucao = { linha: 0, coluna: 0 };
        this.noAtual = null;
        this.emPausa = true;
        this.finalizado = false;

        // Controle de escopo
        this.escopoGlobal = "global";
        this.escopoAtual = this.escopoGlobal;

        // Controle de execução
        this.pilhaExecucao = [];
        this.contadorPassos = 0;
        this.valoresRetorno = new Map();
        this.ultimoResultado = null;

        // Flag para operação passo a passo
        this.passoAPasso = false;

        // Funções padrão da biblioteca C
        this.funcoesBiblioteca = new Map();

        // Configurações
        this.configuracoes = {
            limiteMaximoPassos: 10000, // Evita loops infinitos
            modoDebug: true
        };
    }

    /**
     * Inicializa o interpretador com uma AST
     * @param {NoAST} ast - Árvore sintática abstrata a executar
     */
    inicializa(ast) {
        // Valida a AST
        if (!ast) {
            throw new Error("AST inválida ou vazia");
        }

        // Reinicia o estado
        this.ast = ast;
        this.posicaoExecucao = { linha: 0, coluna: 0 };
        this.noAtual = null;
        this.emPausa = true;
        this.finalizado = false;
        this.pilhaExecucao = [];
        this.contadorPassos = 0;
        this.valoresRetorno = new Map();
        this.ultimoResultado = null;
        this.escopoAtual = this.escopoGlobal;

        // Processa declarações globais
        this._processaDeclaracoesGlobais();

        this._log("Interpretador inicializado com sucesso");
    }

    /**
     * Inicializa as funções padrão da biblioteca C
     * @private
     */
    _inicializaFuncoesBiblioteca() {
        // stdio.h
        this.funcoesBiblioteca.set("printf", (args) => this._funcPrintf(args));
        this.funcoesBiblioteca.set("scanf", (args) => this._funcScanf(args));
        this.funcoesBiblioteca.set("puts", (args) => this._funcPuts(args));
        this.funcoesBiblioteca.set("putchar", (args) => this._funcPutchar(args));
        this.funcoesBiblioteca.set("getchar", (args) => this._funcGetchar(args));
        this.funcoesBiblioteca.set("gets", (args) => this._funcGets(args));

        // stdlib.h
        this.funcoesBiblioteca.set("malloc", (args) => this._funcMalloc(args));
        this.funcoesBiblioteca.set("calloc", (args) => this._funcCalloc(args));
        this.funcoesBiblioteca.set("realloc", (args) => this._funcRealloc(args));
        this.funcoesBiblioteca.set("free", (args) => this._funcFree(args));
        this.funcoesBiblioteca.set("exit", (args) => this._funcExit(args));
        this.funcoesBiblioteca.set("rand", (args) => this._funcRand(args));
        this.funcoesBiblioteca.set("srand", (args) => this._funcSrand(args));

        // string.h
        this.funcoesBiblioteca.set("strlen", (args) => this._funcStrlen(args));
        this.funcoesBiblioteca.set("strcpy", (args) => this._funcStrcpy(args));
        this.funcoesBiblioteca.set("strcat", (args) => this._funcStrcat(args));
        this.funcoesBiblioteca.set("strcmp", (args) => this._funcStrcmp(args));
        this.funcoesBiblioteca.set("strncpy", (args) => this._funcStrncpy(args));
        this.funcoesBiblioteca.set("strncat", (args) => this._funcStrncat(args));
        this.funcoesBiblioteca.set("strncmp", (args) => this._funcStrncmp(args));

        // math.h
        this.funcoesBiblioteca.set("pow", (args) => this._funcPow(args));
        this.funcoesBiblioteca.set("sqrt", (args) => this._funcSqrt(args));
        this.funcoesBiblioteca.set("floor", (args) => this._funcFloor(args));
        this.funcoesBiblioteca.set("ceil", (args) => this._funcCeil(args));
        this.funcoesBiblioteca.set("fabs", (args) => this._funcFabs(args));

        this._log(`Inicializadas ${this.funcoesBiblioteca.size} funções da biblioteca padrão`);
    }

    /**
     * Executa a árvore sintática completa
     * @return {Object} Resultado da execução
     */
    executar() {
        // Verifica se já foi inicializado
        if (!this.ast) {
            throw new Error("O interpretador não foi inicializado com uma AST");
        }

        // Se já finalizou, reinicia
        if (this.finalizado) {
            this.reiniciar();
        }

        // Sai do modo pausa
        this.emPausa = false;
        this.passoAPasso = false;

        // Encontra a função main
        if (this.pilhaExecucao.length === 0) {
            this._iniciaExecucaoMain();
        }

        // Executa até finalizar ou pausar
        let resultado = null;
        try {
            while (!this.finalizado && !this.emPausa) {
                resultado = this.proximoPasso();

                // Verifica se atingiu limite de passos (evita loops infinitos)
                if (this.contadorPassos > this.configuracoes.limiteMaximoPassos) {
                    throw new Error(`Limite máximo de passos atingido (${this.configuracoes.limiteMaximoPassos}). Possível loop infinito.`);
                }
            }

            // Retorna o resultado final
            return {
                finalizado: this.finalizado,
                resultado: this.ultimoResultado,
                passos: this.contadorPassos
            };
        } catch (erro) {
            // Em caso de erro, adiciona informações de contexto
            if (this.noAtual) {
                erro.linha = this.noAtual.linha;
                erro.coluna = this.noAtual.coluna;
            }

            this._log(`Erro durante execução: ${erro.message}`, "erro");
            throw erro;
        }
    }

    /**
     * Executa o código passo a passo
     * @return {Object} Estado após o primeiro passo
     */
    executarPassoAPasso() {
        // Verifica se já foi inicializado
        if (!this.ast) {
            throw new Error("O interpretador não foi inicializado com uma AST");
        }

        // Se já finalizou, reinicia
        if (this.finalizado) {
            this.reiniciar();
        }

        // Define modo passo a passo e sai do modo pausa
        this.passoAPasso = true;
        this.emPausa = false;

        // Encontra a função main se ainda não iniciou
        if (this.pilhaExecucao.length === 0) {
            this._iniciaExecucaoMain();
        }

        // Executa o primeiro passo
        return this.proximoPasso();
    }

    /**
     * Executa o próximo passo da interpretação
     * @return {Object} Estado após o passo
     */
    proximoPasso() {
        // Verifica se já finalizou
        if (this.finalizado) {
            return { finalizado: true, resultado: this.ultimoResultado };
        }

        // Verifica se está em pausa
        if (this.emPausa && !this.passoAPasso) {
            return { pausado: true };
        }

        try {
            // Incrementa contador de passos
            this.contadorPassos++;

            // Se a pilha de execução estiver vazia, terminou
            if (this.pilhaExecucao.length === 0) {
                this.finalizado = true;
                return { finalizado: true, resultado: this.ultimoResultado };
            }

            // Pega o próximo nó a executar
            this.noAtual = this.pilhaExecucao.pop();

            // Atualiza posição de execução
            this.posicaoExecucao = {
                linha: this.noAtual.linha,
                coluna: this.noAtual.coluna
            };

            // Registra o estado antes da execução
            this._registraEstado();

            // Avalia o nó
            const resultado = this._avaliaNo(this.noAtual);
            this.ultimoResultado = resultado;

            // Se está no modo passo a passo, pausa após um passo
            if (this.passoAPasso) {
                this.emPausa = true;
            }

            // Retorna o resultado do passo
            return {
                finalizado: this.finalizado,
                pausado: this.emPausa,
                resultado,
                linha: this.posicaoExecucao.linha,
                coluna: this.posicaoExecucao.coluna,
                passo: this.contadorPassos
            };
        } catch (erro) {
            // Em caso de erro, adiciona informações de contexto
            if (this.noAtual) {
                erro.linha = this.noAtual.linha;
                erro.coluna = this.noAtual.coluna;
            }

            this._log(`Erro durante execução do passo: ${erro.message}`, "erro");
            throw erro;
        }
    }

    /**
     * Navega para o passo anterior (via registro de execução)
     * @return {Object} Estado anterior
     */
    passoAnterior() {
        // Solicita o estado anterior ao registro de execução
        const estadoAnterior = this.registroExecucao.retrocede();

        if (estadoAnterior) {
            // Atualiza o estado atual
            this.posicaoExecucao = {
                linha: estadoAnterior.linha || 0,
                coluna: estadoAnterior.coluna || 0
            };

            this.emPausa = true;

            return {
                pausado: true,
                linha: this.posicaoExecucao.linha,
                coluna: this.posicaoExecucao.coluna
            };
        }

        return { erro: "Não há estados anteriores" };
    }

    /**
     * Pausa a execução
     */
    pausar() {
        this.emPausa = true;
        this._log("Execução pausada");
    }

    /**
     * Reinicia o interpretador
     */
    reiniciar() {
        // Reinicia o estado
        this.posicaoExecucao = { linha: 0, coluna: 0 };
        this.noAtual = null;
        this.emPausa = true;
        this.finalizado = false;
        this.pilhaExecucao = [];
        this.contadorPassos = 0;
        this.valoresRetorno = new Map();
        this.ultimoResultado = null;
        this.escopoAtual = this.escopoGlobal;

        // Processa declarações globais
        this._processaDeclaracoesGlobais();

        this._log("Interpretador reiniciado");
    }

    // =============================================================
    // Métodos de avaliação de nós da AST
    // =============================================================

    /**
     * Avalia um nó da AST
     * @param {NoAST} no - Nó a ser avaliado
     * @return {any} Resultado da avaliação
     * @private
     */
    _avaliaNo(no) {
        // Verifica se o nó é válido
        if (!no) {
            return null;
        }

        // Processa de acordo com o tipo de nó
        switch (no.tipo) {
            // Unidade de tradução (raiz da AST)
            case 'TRANSLATION_UNIT':
                return this._processaUnidadeTraducao(no);

            // Declarações
            case 'VAR_DECL':
            case 'FUNCTION_DECL':
            case 'TYPEDEF_DECL':
            case 'MULTI_VAR_DECL':
                return this._processaDeclaracao(no);

            // Definição de função
            case 'FUNCTION_DEF':
                return this._processaDefinicaoFuncao(no);

            // Instruções
            case 'EXPR_STMT':
            case 'IF_STMT':
            case 'SWITCH_STMT':
            case 'WHILE_STMT':
            case 'DO_WHILE_STMT':
            case 'FOR_STMT':
            case 'BREAK_STMT':
            case 'CONTINUE_STMT':
            case 'RETURN_STMT':
            case 'GOTO_STMT':
            case 'LABELED_STMT':
            case 'CASE_STMT':
            case 'DEFAULT_STMT':
            case 'EMPTY_STMT':
                return this._processaInstrucao(no);

            // Bloco composto
            case 'COMPOUND_STMT':
                return this._executaBlocoComposto(no);

            // Expressões
            case 'IDENTIFIER_EXPR':
                return this._avaliaIdentificador(no);

            case 'INT_LITERAL':
                return parseInt(no.valor);

            case 'FLOAT_LITERAL':
                return parseFloat(no.valor);

            case 'CHAR_LITERAL':
                return no.valor.charCodeAt(0);

            case 'STRING_LITERAL':
                return this._processaStringLiteral(no.valor);

            case 'ADDITIVE_EXPR':
            case 'MULTIPLICATIVE_EXPR':
            case 'RELATIONAL_EXPR':
            case 'EQUALITY_EXPR':
            case 'LOGICAL_AND_EXPR':
            case 'LOGICAL_OR_EXPR':
            case 'BITWISE_AND_EXPR':
            case 'BITWISE_OR_EXPR':
            case 'BITWISE_XOR_EXPR':
            case 'SHIFT_EXPR':
                return this._avaliaExpressaoBinaria(no);

            case 'UNARY_EXPR':
            case 'PREFIX_EXPR':
            case 'POSTFIX_EXPR':
                return this._avaliaExpressaoUnaria(no);

            case 'ASSIGN_EXPR':
                return this._avaliaExpressaoAtribuicao(no);

            case 'CALL_EXPR':
                return this._processaChamadaFuncao(no);

            case 'ARRAY_SUBSCRIPT_EXPR':
                return this._avaliaAcessoArray(no);

            case 'MEMBER_EXPR':
            case 'ARROW_EXPR':
                return this._avaliaAcessoMembro(no);

            case 'COMMA_EXPR':
                return this._avaliaExpressaoVirgula(no);

            case 'CONDITIONAL_EXPR':
                return this._avaliaExpressaoCondicional(no);

            case 'CAST_EXPR':
                return this._avaliaExpressaoCast(no);

            // Nós que não precisam ser avaliados diretamente
            case 'TYPE_SPECIFIER':
            case 'FUNCTION_SPECIFIER':
            case 'STORAGE_CLASS':
            case 'TYPE_QUALIFIER':
            case 'PARAMETER':
            case 'PARAMETER_LIST':
                return null;

            // Outros nós não reconhecidos
            default:
                this._log(`Tipo de nó não implementado: ${no.tipo}`, "aviso");
                return null;
        }
    }

    /**
     * Processa a unidade de tradução (raiz da AST)
     * @param {NoAST} no - Nó de unidade de tradução
     * @private
     */
    _processaUnidadeTraducao(no) {
        // Processa cada filho (declarações de nível global)
        for (const filho of no.filhos) {
            this._avaliaNo(filho);
        }
    }

    /**
     * Processa declarações globais na inicialização
     * @private
     */
    _processaDeclaracoesGlobais() {
        if (!this.ast) return;

        // Processa cada filho da unidade de tradução para encontrar declarações globais
        for (const filho of this.ast.filhos) {
            // Processa apenas declarações, não definições de função
            if (filho.tipo === 'VAR_DECL' || filho.tipo === 'FUNCTION_DECL' ||
                filho.tipo === 'TYPEDEF_DECL' || filho.tipo === 'MULTI_VAR_DECL') {
                this._processaDeclaracao(filho);
            }
        }
    }

    /**
     * Processa uma declaração (variável, função, etc.)
     * @param {NoAST} no - Nó de declaração
     * @return {any} Resultado da declaração
     * @private
     */
    _processaDeclaracao(no) {
        switch (no.tipo) {
            case 'VAR_DECL':
                return this._processaDeclaracaoVariavel(no);

            case 'MULTI_VAR_DECL':
                // Processa cada declaração de variável no grupo
                for (const filho of no.filhos) {
                    if (filho.tipo === 'VAR_DECL') {
                        this._processaDeclaracaoVariavel(filho);
                    }
                }
                return null;

            case 'FUNCTION_DECL':
                // Declaração de função (protótipo)
                // Não faz nada na execução
                return null;

            case 'TYPEDEF_DECL':
                // Declaração de typedef
                // Não faz nada na execução
                return null;

            default:
                this._log(`Tipo de declaração não implementado: ${no.tipo}`, "aviso");
                return null;
        }
    }

    /**
     * Processa uma declaração de variável
     * @param {NoAST} no - Nó de declaração de variável
     * @return {any} Valor da variável declarada
     * @private
     */
    _processaDeclaracaoVariavel(no) {
        const nome = no.valor;
        const tipo = no.pegaPropriedade('tipo') || 'int';
        const ehPonteiro = no.pegaPropriedade('ponteiros') > 0;
        const ehArray = no.pegaPropriedade('ehArray') || false;
        const dimensoes = no.pegaPropriedade('dimensoes') || [];

        // Verifica se é uma variável estática
        const ehEstatica = no.filhos.some(
            filho => filho.tipo === 'STORAGE_CLASS' && filho.valor === 'static'
        );

        // Verifica se é uma variável extern
        const ehExterna = no.filhos.some(
            filho => filho.tipo === 'STORAGE_CLASS' && filho.valor === 'extern'
        );

        // Valor inicial (padrão é null/0)
        let valorInicial = null;

        // Verifica se tem inicializador
        const inicializador = no.filhos.find(filho =>
            filho.tipo !== 'TYPE_SPECIFIER' &&
            filho.tipo !== 'STORAGE_CLASS' &&
            filho.tipo !== 'TYPE_QUALIFIER' &&
            filho.tipo !== 'FUNCTION_SPECIFIER'
        );

        if (inicializador) {
            valorInicial = this._avaliaNo(inicializador);
        }

        // Declara a variável no gerenciador de memória
        let infoVariavel;

        if (this.escopoAtual === this.escopoGlobal) {
            // Variável global
            infoVariavel = this.gerenciadorMemoria.declaraVariavelGlobal(nome, {
                tipo,
                valorInicial,
                ehPonteiro,
                ehArray,
                dimensoes,
                ehExterna
            });
        } else if (ehEstatica) {
            // Variável estática
            infoVariavel = this.gerenciadorMemoria.declaraVariavelEstatica(nome, this.escopoAtual, {
                tipo,
                valorInicial,
                ehPonteiro,
                ehArray,
                dimensoes
            });
        } else {
            // Variável local
            infoVariavel = this.gerenciadorMemoria.declaraVariavel(nome, {
                tipo,
                valorInicial,
                ehPonteiro,
                ehArray,
                dimensoes,
                ehEstatica,
                ehExterna
            });
        }

        return infoVariavel ? infoVariavel.valor : null;
    }

    /**
     * Processa uma definição de função
     * @param {NoAST} no - Nó de definição de função
     * @private
     */
    _processaDefinicaoFuncao(no) {
        // Ignora definições de função - serão processadas quando chamadas
        return null;
    }

    /**
     * Inicia a execução da função main
     * @private
     */
    _iniciaExecucaoMain() {
        // Encontra a função main na AST
        const funcaoMain = this.ast.filhos.find(filho =>
            filho.tipo === 'FUNCTION_DEF' && filho.valor === 'main'
        );

        if (!funcaoMain) {
            throw new Error("Função main não encontrada");
        }

        // Encontra o corpo da função (bloco composto)
        const corpoMain = funcaoMain.filhos.find(filho => filho.tipo === 'COMPOUND_STMT');

        if (!corpoMain) {
            throw new Error("Corpo da função main não encontrado");
        }

        // Cria um novo frame
        this.gerenciadorMemoria.criaNovoFrame('main', this.escopoGlobal);

        // Atualiza o escopo atual
        this.escopoAtual = 'main';

        // Adiciona o corpo da função à pilha de execução
        this.pilhaExecucao.push(corpoMain);

        this._log("Iniciando execução da função main");
    }

    /**
     * Processa uma instrução
     * @param {NoAST} no - Nó de instrução
     * @return {any} Resultado da instrução
     * @private
     */
    _processaInstrucao(no) {
        switch (no.tipo) {
            case 'EXPR_STMT':
                // Instrução de expressão
                return this._processaExpressaoStmt(no);

            case 'IF_STMT':
                // Instrução if
                return this._executaIfStmt(no);

            case 'SWITCH_STMT':
                // Instrução switch
                return this._executaSwitchStmt(no);

            case 'WHILE_STMT':
                // Instrução while
                return this._executaWhileStmt(no);

            case 'DO_WHILE_STMT':
                // Instrução do-while
                return this._executaDoWhileStmt(no);

            case 'FOR_STMT':
                // Instrução for
                return this._executaForStmt(no);

            case 'BREAK_STMT':
                // Instrução break
                return { tipo: 'break' };

            case 'CONTINUE_STMT':
                // Instrução continue
                return { tipo: 'continue' };

            case 'RETURN_STMT':
                // Instrução return
                return this._executaReturnStmt(no);

            case 'EMPTY_STMT':
                // Instrução vazia (;)
                return null;

            default:
                this._log(`Tipo de instrução não implementado: ${no.tipo}`, "aviso");
                return null;
        }
    }

    /**
     * Processa uma instrução de expressão
     * @param {NoAST} no - Nó de instrução de expressão
     * @return {any} Resultado da expressão
     * @private
     */
    _processaExpressaoStmt(no) {
        // Avalia a expressão
        if (no.filhos.length > 0) {
            return this._avaliaNo(no.filhos[0]);
        }
        return null;
    }

    /**
     * Executa uma instrução if
     * @param {NoAST} no - Nó de instrução if
     * @return {any} Resultado da execução
     * @private
     */
    _executaIfStmt(no) {
        // Estrutura esperada:
        // Filho 0: Condição
        // Filho 1: Bloco then
        // Filho 2: Bloco else (opcional)

        if (no.filhos.length < 2) {
            throw new Error("Instrução if incompleta");
        }

        // Avalia a condição
        const condicao = this._avaliaNo(no.filhos[0]);

        if (condicao) {
            // Condição verdadeira - executa o bloco then
            return this._avaliaNo(no.filhos[1]);
        } else if (no.filhos.length > 2) {
            // Condição falsa e tem bloco else - executa o bloco else
            return this._avaliaNo(no.filhos[2]);
        }

        return null;
    }

    /**
     * Executa uma instrução switch
     * @param {NoAST} no - Nó de instrução switch
     * @return {any} Resultado da execução
     * @private
     */
    _executaSwitchStmt(no) {
        // Estrutura esperada:
        // Filho 0: Expressão de controle
        // Filho 1: Bloco de case/default

        if (no.filhos.length < 2) {
            throw new Error("Instrução switch incompleta");
        }

        // Avalia a expressão de controle
        const valorControle = this._avaliaNo(no.filhos[0]);

        // Obtém o bloco de case/default
        const blocoSwitch = no.filhos[1];

        // Flag para indicar se encontrou um case correspondente
        let caseCombinado = false;

        // Flag para controle de fall-through
        let executarInstrucoes = false;

        // Localização do default
        let blocoDefault = null;

        // Processa cada instrução no bloco
        for (const instrucao of blocoSwitch.filhos) {
            if (instrucao.tipo === 'CASE_STMT') {
                // Avalia o valor do case
                const valorCase = this._avaliaNo(instrucao.filhos[0]);

                // Verifica se o valor corresponde
                if (valorControle === valorCase) {
                    caseCombinado = true;
                    executarInstrucoes = true;
                }

                // Executa a instrução do case se necessário
                if (executarInstrucoes && instrucao.filhos.length > 1) {
                    const resultado = this._avaliaNo(instrucao.filhos[1]);

                    // Verifica se é break
                    if (resultado && resultado.tipo === 'break') {
                        return null; // Sai do switch
                    }
                }
            } else if (instrucao.tipo === 'DEFAULT_STMT') {
                // Guarda a referência ao default para usar depois
                blocoDefault = instrucao;
            } else if (executarInstrucoes) {
                // Executa instrução normal após ter encontrado um case correspondente
                const resultado = this._avaliaNo(instrucao);

                // Verifica se é break
                if (resultado && resultado.tipo === 'break') {
                    return null; // Sai do switch
                }
            }
        }

        // Se não encontrou case correspondente, mas tem default
        if (!caseCombinado && blocoDefault) {
            // Executa a instrução do default
            if (blocoDefault.filhos.length > 0) {
                return this._avaliaNo(blocoDefault.filhos[0]);
            }
        }

        return null;
    }

    /**
     * Executa uma instrução while
     * @param {NoAST} no - Nó de instrução while
     * @return {any} Resultado da execução
     * @private
     */
    _executaWhileStmt(no) {
        // Estrutura esperada:
        // Filho 0: Condição
        // Filho 1: Corpo do loop

        if (no.filhos.length < 2) {
            throw new Error("Instrução while incompleta");
        }

        // Executa o loop while
        while (true) {
            // Avalia a condição
            const condicao = this._avaliaNo(no.filhos[0]);

            // Sai do loop se a condição for falsa
            if (!condicao) {
                break;
            }

            // Executa o corpo do loop
            const resultado = this._avaliaNo(no.filhos[1]);

            // Verifica se houve break ou return
            if (resultado && (resultado.tipo === 'break' || resultado.tipo === 'return')) {
                return resultado.tipo === 'return' ? resultado : null;
            }

            // Verifica se houve continue - continua para a próxima iteração
            if (resultado && resultado.tipo === 'continue') {
                continue;
            }

            // Pausa após cada iteração se estiver em modo passo a passo
            if (this.passoAPasso) {
                this.pilhaExecucao.push(no);
                break;
            }
        }

        return null;
    }

    /**
     * Executa uma instrução do-while
     * @param {NoAST} no - Nó de instrução do-while
     * @return {any} Resultado da execução
     * @private
     */
    _executaDoWhileStmt(no) {
        // Estrutura esperada:
        // Filho 0: Corpo do loop
        // Filho 1: Condição

        if (no.filhos.length < 2) {
            throw new Error("Instrução do-while incompleta");
        }

        // Executa o loop do-while
        do {
            // Executa o corpo do loop
            const resultado = this._avaliaNo(no.filhos[0]);

            // Verifica se houve break ou return
            if (resultado && (resultado.tipo === 'break' || resultado.tipo === 'return')) {
                return resultado.tipo === 'return' ? resultado : null;
            }

            // Verifica se houve continue - pula para a avaliação da condição
            if (resultado && resultado.tipo === 'continue') {
                // Continue no do-while apenas pula para a condição
            }

            // Avalia a condição
            const condicao = this._avaliaNo(no.filhos[1]);

            // Sai do loop se a condição for falsa
            if (!condicao) {
                break;
            }

            // Pausa após cada iteração se estiver em modo passo a passo
            if (this.passoAPasso) {
                this.pilhaExecucao.push(no);
                break;
            }
        } while (true);

        return null;
    }

    /**
     * Executa uma instrução for
     * @param {NoAST} no - Nó de instrução for
     * @return {any} Resultado da execução
     * @private
     */
    _executaForStmt(no) {
        // Estrutura esperada:
        // Filho 0: Inicialização
        // Filho 1: Condição
        // Filho 2: Incremento
        // Filho 3: Corpo do loop

        if (no.filhos.length < 4) {
            throw new Error("Instrução for incompleta");
        }

        // Verifica se a inicialização contém uma declaração (C99+)
        const temDeclaracao = no.pegaPropriedade('temDeclaracao') || false;

        // Se tem declaração, cria um escopo para o for
        const escopoOriginal = this.escopoAtual;
        if (temDeclaracao) {
            const escopoFor = `${this.escopoAtual}.for_${no.linha}_${no.coluna}`;
            this.gerenciadorMemoria.criaNovoFrame(escopoFor, this.escopoAtual);
            this.escopoAtual = escopoFor;
        }

        try {
            // Executa a inicialização
            this._avaliaNo(no.filhos[0]);

            // Executa o loop for
            while (true) {
                // Avalia a condição (se for vazia, considera true)
                let condicao = true;
                if (no.filhos[1].tipo !== 'EMPTY_EXPR') {
                    condicao = this._avaliaNo(no.filhos[1]);
                }

                // Sai do loop se a condição for falsa
                if (!condicao) {
                    break;
                }

                // Executa o corpo do loop
                const resultado = this._avaliaNo(no.filhos[3]);

                // Verifica se houve break ou return
                if (resultado && (resultado.tipo === 'break' || resultado.tipo === 'return')) {
                    return resultado.tipo === 'return' ? resultado : null;
                }

                // Executa o incremento (mesmo que tenha continue)
                if (resultado && resultado.tipo === 'continue') {
                    // No caso de continue, executa o incremento e continua para a próxima iteração
                }

                // Executa o incremento
                this._avaliaNo(no.filhos[2]);

                // Pausa após cada iteração se estiver em modo passo a passo
                if (this.passoAPasso) {
                    this.pilhaExecucao.push(no);
                    break;
                }
            }

            return null;
        } finally {
            // Restaura o escopo original se necessário
            if (temDeclaracao) {
                this.gerenciadorMemoria.removeFrame();
                this.escopoAtual = escopoOriginal;
            }
        }
    }

    /**
     * Executa uma instrução return
     * @param {NoAST} no - Nó de instrução return
     * @return {Object} Objeto com tipo 'return' e valor
     * @private
     */
    _executaReturnStmt(no) {
        // Avalia o valor de retorno (se existir)
        let valorRetorno = null;
        if (no.filhos.length > 0) {
            valorRetorno = this._avaliaNo(no.filhos[0]);
        }

        // Finaliza o frame atual
        this.gerenciadorMemoria.removeFrame(valorRetorno);

        // Restaura o escopo para o anterior
        this.escopoAtual = this.gerenciadorMemoria.frameAtual.nome;

        // Retorna o controle para a função chamadora
        return { tipo: 'return', valor: valorRetorno };
    }

    /**
     * Executa um bloco composto (delimitado por chaves)
     * @param {NoAST} no - Nó de bloco composto
     * @return {any} Resultado da última instrução do bloco
     * @private
     */
    _executaBlocoComposto(no) {
        // Cria um novo escopo para o bloco
        const escopoOriginal = this.escopoAtual;
        const escopoBloco = `${this.escopoAtual}.bloco_${no.linha}_${no.coluna}`;

        // Cria um novo frame apenas se não for o corpo da função
        // (já criamos um frame para a função)
        let criadoNovoFrame = false;
        if (!this._ehCorpoDeFuncao(no)) {
            this.gerenciadorMemoria.criaNovoFrame(escopoBloco, this.escopoAtual);
            this.escopoAtual = escopoBloco;
            criadoNovoFrame = true;
        }

        try {
            // Processa cada instrução no bloco
            let ultimoResultado = null;

            for (const instrucao of no.filhos) {
                // Avalia a instrução
                const resultado = this._avaliaNo(instrucao);
                ultimoResultado = resultado;

                // Verifica se é um controle de fluxo (break, continue, return)
                if (resultado && ['break', 'continue', 'return'].includes(resultado.tipo)) {
                    return resultado;
                }
            }

            return ultimoResultado;
        } finally {
            // Restaura o escopo original
            if (criadoNovoFrame) {
                this.gerenciadorMemoria.removeFrame();
                this.escopoAtual = escopoOriginal;
            }
        }
    }

    /**
     * Verifica se um nó é o corpo de uma função
     * @param {NoAST} no - Nó a verificar
     * @return {boolean} True se for corpo de função
     * @private
     */
    _ehCorpoDeFuncao(no) {
        return no.pai && no.pai.tipo === 'FUNCTION_DEF';
    }

    /**
     * Avalia uma expressão
     * @param {NoAST} no - Nó de expressão
     * @return {any} Resultado da expressão
     * @private
     */
    _avaliaExpressao(no) {
        return this._avaliaNo(no);
    }

    /**
     * Avalia uma expressão binária
     * @param {NoAST} no - Nó de expressão binária
     * @return {any} Resultado da expressão
     * @private
     */
    _avaliaExpressaoBinaria(no) {
        // Precisa ter dois filhos (operandos)
        if (no.filhos.length !== 2) {
            throw new Error(`Expressão binária ${no.tipo} incompleta`);
        }

        // Avalia os operandos
        const esquerda = this._avaliaNo(no.filhos[0]);
        const direita = this._avaliaNo(no.filhos[1]);

        // Processa de acordo com o tipo de expressão
        switch (no.tipo) {
            case 'ADDITIVE_EXPR':
                // Operadores + e -
                if (no.valor === '+') return esquerda + direita;
                if (no.valor === '-') return esquerda - direita;
                break;

            case 'MULTIPLICATIVE_EXPR':
                // Operadores *, / e %
                if (no.valor === '*') return esquerda * direita;
                if (no.valor === '/') {
                    if (direita === 0) throw new Error("Divisão por zero");
                    return Math.floor(esquerda / direita); // Divisão inteira em C
                }
                if (no.valor === '%') {
                    if (direita === 0) throw new Error("Módulo por zero");
                    return esquerda % direita;
                }
                break;

            case 'RELATIONAL_EXPR':
                // Operadores <, >, <= e >=
                if (no.valor === '<') return esquerda < direita;
                if (no.valor === '>') return esquerda > direita;
                if (no.valor === '<=') return esquerda <= direita;
                if (no.valor === '>=') return esquerda >= direita;
                break;

            case 'EQUALITY_EXPR':
                // Operadores == e !=
                if (no.valor === '==') return esquerda === direita;
                if (no.valor === '!=') return esquerda !== direita;
                break;

            case 'LOGICAL_AND_EXPR':
                // Operador && (avaliação em curto-circuito)
                return esquerda && direita;

            case 'LOGICAL_OR_EXPR':
                // Operador || (avaliação em curto-circuito)
                return esquerda || direita;

            case 'BITWISE_AND_EXPR':
                // Operador &
                return esquerda & direita;

            case 'BITWISE_OR_EXPR':
                // Operador |
                return esquerda | direita;

            case 'BITWISE_XOR_EXPR':
                // Operador ^
                return esquerda ^ direita;

            case 'SHIFT_EXPR':
                // Operadores << e >>
                if (no.valor === '<<') return esquerda << direita;
                if (no.valor === '>>') return esquerda >> direita;
                break;
        }

        this._log(`Operador ${no.valor} não implementado em ${no.tipo}`, "aviso");
        return 0;
    }

    /**
     * Avalia uma expressão unária
     * @param {NoAST} no - Nó de expressão unária
     * @return {any} Resultado da expressão
     * @private
     */
    _avaliaExpressaoUnaria(no) {
        // Precisa ter um filho (operando)
        if (no.filhos.length !== 1) {
            throw new Error(`Expressão unária ${no.tipo} incompleta`);
        }

        // Para expressões de prefixo/posfixo, precisamos do lvalue
        if (no.tipo === 'PREFIX_EXPR' || no.tipo === 'POSTFIX_EXPR') {
            const filho = no.filhos[0];

            // Obtém o nome da variável
            let nomeVar;
            if (filho.tipo === 'IDENTIFIER_EXPR') {
                nomeVar = filho.valor;
            } else {
                throw new Error(`Operador ${no.valor} só pode ser aplicado a variáveis`);
            }

            // Obtém a variável
            const variavel = this.gerenciadorMemoria.pegaVariavel(nomeVar);
            if (!variavel) {
                throw new Error(`Variável '${nomeVar}' não encontrada`);
            }

            // Aplica o operador
            const valorAtual = variavel.valor;

            if (no.tipo === 'PREFIX_EXPR') {
                // Operadores de prefixo (++x, --x)
                if (no.valor === '++') {
                    const novoValor = valorAtual + 1;
                    this.gerenciadorMemoria.atualizaVariavel(nomeVar, novoValor);
                    return novoValor;
                }
                if (no.valor === '--') {
                    const novoValor = valorAtual - 1;
                    this.gerenciadorMemoria.atualizaVariavel(nomeVar, novoValor);
                    return novoValor;
                }
            } else if (no.tipo === 'POSTFIX_EXPR') {
                // Operadores de posfixo (x++, x--)
                if (no.valor === '++') {
                    const novoValor = valorAtual + 1;
                    this.gerenciadorMemoria.atualizaVariavel(nomeVar, novoValor);
                    return valorAtual;
                }
                if (no.valor === '--') {
                    const novoValor = valorAtual - 1;
                    this.gerenciadorMemoria.atualizaVariavel(nomeVar, novoValor);
                    return valorAtual;
                }
            }
        }

        // Para outros operadores unários
        const operando = this._avaliaNo(no.filhos[0]);

        if (no.tipo === 'UNARY_EXPR') {
            // Operadores unários
            if (no.valor === '+') return +operando;
            if (no.valor === '-') return -operando;
            if (no.valor === '!') return !operando;
            if (no.valor === '~') return ~operando;
            if (no.valor === '*') {
                // Operador de deferência
                return this._dereferenciaEndereco(operando);
            }
            if (no.valor === '&') {
                // Operador de endereço
                return this._obtemEnderecoVariavel(no.filhos[0]);
            }
        }

        this._log(`Operador unário ${no.valor} não implementado em ${no.tipo}`, "aviso");
        return 0;
    }

    /**
     * Avalia um identificador (variável)
     * @param {NoAST} no - Nó de identificador
     * @return {any} Valor da variável
     * @private
     */
    _avaliaIdentificador(no) {
        const nomeVar = no.valor;

        // Verifica se é uma variável
        const variavel = this.gerenciadorMemoria.pegaVariavel(nomeVar);
        if (variavel) {
            return variavel.valor;
        }

        // Se não for variável, pode ser uma função
        // (mas isso será tratado no processamento de chamadas de função)

        throw new Error(`Identificador '${nomeVar}' não encontrado`);
    }

    /**
     * Avalia uma expressão de atribuição
     * @param {NoAST} no - Nó de expressão de atribuição
     * @return {any} Valor atribuído
     * @private
     */
    _avaliaExpressaoAtribuicao(no) {
        // Precisa ter dois filhos (alvo e valor)
        if (no.filhos.length !== 2) {
            throw new Error(`Expressão de atribuição incompleta`);
        }

        // Processa o lado esquerdo (lvalue)
        const alvo = no.filhos[0];

        // Avalia o lado direito (rvalue)
        const valorDireita = this._avaliaNo(no.filhos[1]);

        // Atribuição para variável simples
        if (alvo.tipo === 'IDENTIFIER_EXPR') {
            const nomeVar = alvo.valor;

            // Atribuição simples ou composta
            if (no.valor === '=') {
                // Atribuição simples: a = b
                this.gerenciadorMemoria.atualizaVariavel(nomeVar, valorDireita);
                return valorDireita;
            } else {
                // Atribuição composta: a += b, a -= b, etc.
                const valorAtual = this._avaliaNo(alvo);
                let novoValor;

                switch (no.valor) {
                    case '+=': novoValor = valorAtual + valorDireita; break;
                    case '-=': novoValor = valorAtual - valorDireita; break;
                    case '*=': novoValor = valorAtual * valorDireita; break;
                    case '/=':
                        if (valorDireita === 0) throw new Error("Divisão por zero");
                        novoValor = valorAtual / valorDireita;
                        break;
                    case '%=':
                        if (valorDireita === 0) throw new Error("Módulo por zero");
                        novoValor = valorAtual % valorDireita;
                        break;
                    case '&=': novoValor = valorAtual & valorDireita; break;
                    case '|=': novoValor = valorAtual | valorDireita; break;
                    case '^=': novoValor = valorAtual ^ valorDireita; break;
                    case '<<=': novoValor = valorAtual << valorDireita; break;
                    case '>>=': novoValor = valorAtual >> valorDireita; break;
                    default:
                        throw new Error(`Operador de atribuição ${no.valor} não implementado`);
                }

                this.gerenciadorMemoria.atualizaVariavel(nomeVar, novoValor);
                return novoValor;
            }
        }
        // Atribuição para elemento de array
        else if (alvo.tipo === 'ARRAY_SUBSCRIPT_EXPR') {
            // TODO: Implementar atribuição para elementos de array
            throw new Error("Atribuição para elementos de array não implementada");
        }
        // Atribuição para deferência de ponteiro
        else if (alvo.tipo === 'UNARY_EXPR' && alvo.valor === '*') {
            // TODO: Implementar atribuição para ponteiros
            throw new Error("Atribuição para ponteiros não implementada");
        }
        // Atribuição para membro de struct/union
        else if (alvo.tipo === 'MEMBER_EXPR' || alvo.tipo === 'ARROW_EXPR') {
            // TODO: Implementar atribuição para membros de struct/union
            throw new Error("Atribuição para membros de struct/union não implementada");
        }

        throw new Error(`Alvo de atribuição inválido: ${alvo.tipo}`);
    }

    /**
     * Avalia um acesso a array
     * @param {NoAST} no - Nó de acesso a array
     * @return {any} Valor do elemento do array
     * @private
     */
    _avaliaAcessoArray(no) {
        // Precisa ter dois filhos (array e índice)
        if (no.filhos.length !== 2) {
            throw new Error(`Acesso a array incompleto`);
        }

        // Avalia o array
        const array = this._avaliaNo(no.filhos[0]);
        if (!Array.isArray(array)) {
            throw new Error("Tentativa de acessar índice em não-array");
        }

        // Avalia o índice
        const indice = this._avaliaNo(no.filhos[1]);

        // Verifica se o índice é válido
        if (indice < 0 || indice >= array.length) {
            throw new Error(`Acesso fora dos limites: índice ${indice} em array de tamanho ${array.length}`);
        }

        // Retorna o elemento do array
        return array[indice];
    }

    /**
     * Avalia um acesso a membro de struct/union
     * @param {NoAST} no - Nó de acesso a membro
     * @return {any} Valor do membro
     * @private
     */
    _avaliaAcessoMembro(no) {
        // Precisa ter um filho (struct/union)
        if (no.filhos.length !== 1) {
            throw new Error(`Acesso a membro incompleto`);
        }

        // Avalia a struct/union
        const estrutura = this._avaliaNo(no.filhos[0]);
        if (typeof estrutura !== 'object' || estrutura === null) {
            throw new Error("Tentativa de acessar membro em não-objeto");
        }

        // Nome do membro
        const nomeMembro = no.valor;

        // Acesso por ponto (struct.membro)
        if (no.tipo === 'MEMBER_EXPR') {
            if (!Object.prototype.hasOwnProperty.call(estrutura, nomeMembro)) {
                throw new Error(`Membro '${nomeMembro}' não encontrado`);
            }

            return estrutura[nomeMembro];
        }
        // Acesso por seta (ptr->membro)
        else if (no.tipo === 'ARROW_EXPR') {
            // Primeiro derefencia o ponteiro, depois acessa o membro
            const ptrDereferenciado = this._dereferenciaEndereco(estrutura);

            if (!Object.prototype.hasOwnProperty.call(ptrDereferenciado, nomeMembro)) {
                throw new Error(`Membro '${nomeMembro}' não encontrado`);
            }

            return ptrDereferenciado[nomeMembro];
        }

        throw new Error(`Tipo de acesso a membro não suportado: ${no.tipo}`);
    }

    /**
     * Avalia uma expressão com vírgula
     * @param {NoAST} no - Nó de expressão com vírgula
     * @return {any} Valor da última expressão
     * @private
     */
    _avaliaExpressaoVirgula(no) {
        // Avalia cada expressão, retorna o valor da última
        let resultado = null;

        for (const filho of no.filhos) {
            resultado = this._avaliaNo(filho);
        }

        return resultado;
    }

    /**
     * Avalia uma expressão condicional (operador ternário)
     * @param {NoAST} no - Nó de expressão condicional
     * @return {any} Resultado da expressão
     * @private
     */
    _avaliaExpressaoCondicional(no) {
        // Precisa ter três filhos (condição, expressão then, expressão else)
        if (no.filhos.length !== 3) {
            throw new Error(`Expressão condicional incompleta`);
        }

        // Avalia a condição
        const condicao = this._avaliaNo(no.filhos[0]);

        // Avalia a expressão então ou senão, de acordo com a condição
        if (condicao) {
            return this._avaliaNo(no.filhos[1]);
        } else {
            return this._avaliaNo(no.filhos[2]);
        }
    }

    /**
     * Avalia uma expressão de cast
     * @param {NoAST} no - Nó de expressão de cast
     * @return {any} Resultado do cast
     * @private
     */
    _avaliaExpressaoCast(no) {
        // O último filho é a expressão a ser convertida
        if (no.filhos.length === 0) {
            throw new Error(`Expressão de cast incompleta`);
        }

        const expressao = no.filhos[no.filhos.length - 1];
        const valor = this._avaliaNo(expressao);

        // Determina o tipo de destino
        const tipoDestino = this._obtemTipoDoNo(no);

        // Realiza o cast
        return this._converteValor(valor, tipoDestino);
    }

    /**
     * Processa uma chamada de função
     * @param {NoAST} no - Nó de chamada de função
     * @return {any} Resultado da chamada
     * @private
     */
    _processaChamadaFuncao(no) {
        // Estrutura esperada:
        // Filho 0: Identificador da função
        // Filhos 1+: Argumentos

        if (no.filhos.length < 1) {
            throw new Error("Chamada de função incompleta");
        }

        // Identifica a função
        const funcaoNo = no.filhos[0];

        if (funcaoNo.tipo !== 'IDENTIFIER_EXPR') {
            throw new Error("Chamada para não-identificador não suportada");
        }

        const nomeFuncao = funcaoNo.valor;

        // Avalia os argumentos
        const argumentos = [];
        for (let i = 1; i < no.filhos.length; i++) {
            argumentos.push(this._avaliaNo(no.filhos[i]));
        }

        // Verifica se é uma função da biblioteca
        if (this.funcoesBiblioteca.has(nomeFuncao)) {
            return this.funcoesBiblioteca.get(nomeFuncao)(argumentos);
        }

        // Busca uma função definida pelo usuário
        const funcaoDef = this._encontraFuncao(nomeFuncao);

        if (!funcaoDef) {
            throw new Error(`Função '${nomeFuncao}' não encontrada`);
        }

        return this._executaFuncao(funcaoDef, argumentos);
    }

    /**
     * Encontra a definição de uma função na AST
     * @param {string} nomeFuncao - Nome da função
     * @return {NoAST|null} Nó de definição da função ou null
     * @private
     */
    _encontraFuncao(nomeFuncao) {
        // Procura na AST
        for (const filho of this.ast.filhos) {
            if (filho.tipo === 'FUNCTION_DEF' && filho.valor === nomeFuncao) {
                return filho;
            }
        }

        return null;
    }

    /**
     * Executa uma função definida pelo usuário
     * @param {NoAST} funcaoDef - Nó de definição da função
     * @param {any[]} argumentos - Argumentos para a função
     * @return {any} Valor de retorno da função
     * @private
     */
    _executaFuncao(funcaoDef, argumentos) {
        // Salva o escopo atual
        const escopoAnterior = this.escopoAtual;

        // Cria um novo frame para a função
        this.gerenciadorMemoria.criaNovoFrame(funcaoDef.valor, this.escopoAtual);
        this.escopoAtual = funcaoDef.valor;

        try {
            // Encontra a lista de parâmetros e o corpo
            const parametrosNo = funcaoDef.filhos.find(filho => filho.tipo === 'PARAMETER_LIST');
            const corpo = funcaoDef.filhos.find(filho => filho.tipo === 'COMPOUND_STMT');

            if (!parametrosNo || !corpo) {
                throw new Error(`Definição de função '${funcaoDef.valor}' incompleta`);
            }

            // Processa os parâmetros
            const parametros = parametrosNo.filhos;

            // Verifica o número de argumentos
            if (argumentos.length > parametros.length) {
                this._log(`Aviso: ${argumentos.length} argumentos passados para função '${funcaoDef.valor}' que aceita ${parametros.length} parâmetros`, "aviso");
            }

            // Associa os argumentos aos parâmetros
            for (let i = 0; i < parametros.length; i++) {
                const param = parametros[i];

                // Ignora parâmetro varargs (...)
                if (param.pegaPropriedade('ehVariadica')) {
                    continue;
                }

                const tipo = param.pegaPropriedade('tipo') || 'int';
                const ehPonteiro = param.pegaPropriedade('ponteiros') > 0;
                const ehArray = param.pegaPropriedade('ehArray') || false;

                // Obtém o valor do argumento (ou valor padrão se falta argumento)
                const valor = i < argumentos.length ? argumentos[i] : this._valorPadrao(tipo);

                // Adiciona o parâmetro
                this.gerenciadorMemoria.adicionaParametro(param.valor, {
                    valor,
                    tipo,
                    ehPonteiro,
                    ehArray
                });
            }

            // Executa o corpo da função
            const resultado = this._executaBlocoComposto(corpo);

            // Verifica se houve um return
            if (resultado && resultado.tipo === 'return') {
                return resultado.valor;
            }

            // Se a função é void, retorna null
            return null;
        } finally {
            // Restaura o escopo anterior
            if (this.escopoAtual !== escopoAnterior) {
                this.gerenciadorMemoria.removeFrame();
                this.escopoAtual = escopoAnterior;
            }
        }
    }

    /**
     * Processa uma string literal
     * @param {string} valor - Valor da string
     * @return {number} Endereço da string na memória
     * @private
     */
    _processaStringLiteral(valor) {
        // Adiciona a string ao segmento de dados
        return this.gerenciadorMemoria.adicionaStringLiteral(valor);
    }

    /**
     * Derreferencia um endereço de memória
     * @param {number} endereco - Endereço de memória
     * @return {any} Valor no endereço
     * @private
     */
    _dereferenciaEndereco(endereco) {
        return this.gerenciadorMemoria.leMemoria(endereco);
    }

    /**
     * Obtém o endereço de uma variável
     * @param {NoAST} no - Nó de identificador
     * @return {number} Endereço da variável
     * @private
     */
    _obtemEnderecoVariavel(no) {
        if (no.tipo !== 'IDENTIFIER_EXPR') {
            throw new Error("Operador & só pode ser aplicado a variáveis");
        }

        const nomeVar = no.valor;
        const variavel = this.gerenciadorMemoria.pegaVariavel(nomeVar);

        if (!variavel) {
            throw new Error(`Variável '${nomeVar}' não encontrada`);
        }

        return variavel.endereco;
    }

    /**
     * Obtém o tipo de um nó
     * @param {NoAST} no - Nó a analisar
     * @return {string} Tipo do nó
     * @private
     */
    _obtemTipoDoNo(no) {
        // Para expressões de cast, procura especificadores de tipo
        if (no.tipo === 'CAST_EXPR') {
            const especificadores = no.filhos.filter(filho =>
                filho.tipo === 'TYPE_SPECIFIER'
            );

            if (especificadores.length > 0) {
                return especificadores.map(e => e.valor).join(' ');
            }
        }

        // Se não encontrar, retorna tipo padrão
        return 'int';
    }

    /**
     * Converte um valor para outro tipo
     * @param {any} valor - Valor a converter
     * @param {string} tipoDestino - Tipo de destino
     * @return {any} Valor convertido
     * @private
     */
    _converteValor(valor, tipoDestino) {
        if (tipoDestino.includes('int')) {
            return Math.trunc(Number(valor));
        } else if (tipoDestino.includes('float') || tipoDestino.includes('double')) {
            return Number(valor);
        } else if (tipoDestino.includes('char')) {
            return Number(valor) & 0xFF; // Limita a 1 byte
        } else if (tipoDestino.includes('void')) {
            return undefined;
        }

        // Sem conversão específica
        return valor;
    }

    /**
     * Valor padrão para um tipo
     * @param {string} tipo - Tipo
     * @return {any} Valor padrão
     * @private
     */
    _valorPadrao(tipo) {
        if (tipo.includes('int') || tipo.includes('char') || tipo.includes('short') ||
            tipo.includes('long') || tipo.includes('byte')) {
            return 0;
        } else if (tipo.includes('float') || tipo.includes('double')) {
            return 0.0;
        } else if (tipo.includes('bool') || tipo.includes('_Bool')) {
            return false;
        } else if (tipo.includes('void') || tipo.includes('pointer')) {
            return 0; // NULL
        } else {
            return null;
        }
    }

    /**
     * Registra o estado atual da execução
     * @private
     */
    _registraEstado() {
        if (!this.registroExecucao) return;

        // Cria objeto com o estado atual
        const estado = {
            linha: this.posicaoExecucao.linha,
            coluna: this.posicaoExecucao.coluna,
            escopo: this.escopoAtual,
            instrucao: this.noAtual ? this.noAtual.tipo : null,
            passo: this.contadorPassos,
            tempoExecucao: Date.now()
        };

        // Registra o estado
        this.registroExecucao.registraEstado(estado);
    }

    // =============================================================
    // Implementações de funções da biblioteca C
    // =============================================================

    /**
     * Implementação de printf
     * @param {any[]} args - Argumentos da função
     * @return {number} Número de caracteres escritos
     * @private
     */
    _funcPrintf(args) {
        if (args.length === 0) {
            throw new Error("printf: faltam argumentos");
        }

        // Primeiro argumento é o formato
        const formatoEndereco = args[0];

        // Se for um endereço, lê a string de formato da memória
        let formatoStr;
        if (typeof formatoEndereco === 'number') {
            formatoStr = this._lerStringDaMemoria(formatoEndereco);
        } else {
            formatoStr = String(formatoEndereco);
        }

        // Resto dos argumentos
        const valores = args.slice(1);

        // Chama printf no simulador de I/O
        return this.simuladorIO.printf(formatoStr, ...valores);
    }

    /**
     * Implementação de puts
     * @param {any[]} args - Argumentos da função
     * @return {number} Número de caracteres escritos ou EOF em caso de erro
     * @private
     */
    _funcPuts(args) {
        if (args.length === 0) {
            throw new Error("puts: faltam argumentos");
        }

        // Argumento é a string
        const stringEndereco = args[0];

        // Se for um endereço, lê a string da memória
        let str;
        if (typeof stringEndereco === 'number') {
            str = this._lerStringDaMemoria(stringEndereco);
        } else {
            str = String(stringEndereco);
        }

        // Chama puts no simulador de I/O
        return this.simuladorIO.puts(str);
    }

    /**
     * Implementação de putchar
     * @param {any[]} args - Argumentos da função
     * @return {number} Caractere escrito ou EOF em caso de erro
     * @private
     */
    _funcPutchar(args) {
        if (args.length === 0) {
            throw new Error("putchar: faltam argumentos");
        }

        // Argumento é o código do caractere
        const charCode = Number(args[0]);

        // Chama putchar no simulador de I/O
        return this.simuladorIO.putchar(charCode);
    }

    /**
     * Implementação de getchar
     * @param {any[]} args - Argumentos da função
     * @return {number} Código do caractere lido ou EOF
     * @private
     */
    _funcGetchar(args) {
        // Chama getchar no simulador de I/O
        return this.simuladorIO.getchar();
    }

    /**
     * Implementação de gets
     * @param {any[]} args - Argumentos da função
     * @return {number} Endereço do buffer ou NULL em caso de erro/EOF
     * @private
     */
    _funcGets(args) {
        if (args.length === 0) {
            throw new Error("gets: faltam argumentos");
        }

        // Primeiro argumento é o buffer
        const buffer = args[0];

        // Tamanho máximo (definido arbitrariamente, já que gets é inseguro)
        const tamanho = 1024;

        // Chama gets no simulador de I/O
        return this.simuladorIO.gets(buffer, tamanho);
    }

    /**
     * Implementação de scanf
     * @param {any[]} args - Argumentos da função
     * @return {number} Número de itens processados ou EOF em caso de erro
     * @private
     */
    _funcScanf(args) {
        if (args.length === 0) {
            throw new Error("scanf: faltam argumentos");
        }

        // Primeiro argumento é o formato
        const formatoEndereco = args[0];

        // Se for um endereço, lê a string de formato da memória
        let formatoStr;
        if (typeof formatoEndereco === 'number') {
            formatoStr = this._lerStringDaMemoria(formatoEndereco);
        } else {
            formatoStr = String(formatoEndereco);
        }

        // Resto dos argumentos são endereços onde armazenar os valores
        const enderecos = args.slice(1);

        // Chama scanf no simulador de I/O
        return this.simuladorIO.scanf(formatoStr, ...enderecos);
    }

    /**
     * Implementação de malloc
     * @param {any[]} args - Argumentos da função
     * @return {number} Endereço da memória alocada ou NULL
     * @private
     */
    _funcMalloc(args) {
        if (args.length === 0) {
            throw new Error("malloc: faltam argumentos");
        }

        // Argumento é o tamanho em bytes
        const tamanho = Number(args[0]);

        // Aloca memória
        return this.gerenciadorMemoria.alocaMemoria(tamanho, false, {
            origem: "malloc",
            linha: this.posicaoExecucao.linha
        });
    }

    /**
     * Implementação de calloc
     * @param {any[]} args - Argumentos da função
     * @return {number} Endereço da memória alocada ou NULL
     * @private
     */
    _funcCalloc(args) {
        if (args.length < 2) {
            throw new Error("calloc: faltam argumentos");
        }

        // Argumentos são o número de elementos e o tamanho de cada um
        const numElementos = Number(args[0]);
        const tamanhoElemento = Number(args[1]);

        // Calcula o tamanho total
        const tamanhoTotal = numElementos * tamanhoElemento;

        // Aloca memória inicializada com zeros
        return this.gerenciadorMemoria.alocaMemoria(tamanhoTotal, true, {
            origem: "calloc",
            linha: this.posicaoExecucao.linha
        });
    }

    /**
     * Implementação de realloc
     * @param {any[]} args - Argumentos da função
     * @return {number} Novo endereço da memória realocada ou NULL
     * @private
     */
    _funcRealloc(args) {
        if (args.length < 2) {
            throw new Error("realloc: faltam argumentos");
        }

        // Argumentos são o ponteiro e o novo tamanho
        const ptr = Number(args[0]);
        const novoTamanho = Number(args[1]);

        // Realoca a memória
        return this.gerenciadorMemoria.realocaMemoria(ptr, novoTamanho, {
            origem: "realloc",
            linha: this.posicaoExecucao.linha
        });
    }

    /**
     * Implementação de free
     * @param {any[]} args - Argumentos da função
     * @return {number} 0 em caso de sucesso
     * @private
     */
    _funcFree(args) {
        if (args.length === 0) {
            throw new Error("free: faltam argumentos");
        }

        // Argumento é o ponteiro
        const ptr = Number(args[0]);

        // Libera a memória
        this.gerenciadorMemoria.liberaMemoria(ptr);

        return 0;
    }

    /**
     * Implementação de exit
     * @param {any[]} args - Argumentos da função
     * @private
     */
    _funcExit(args) {
        // Argumento é o código de saída
        const codigo = args.length > 0 ? Number(args[0]) : 0;

        // Finaliza a execução
        this.finalizado = true;

        // Registra o código de saída
        this.ultimoResultado = codigo;

        this._log(`Programa finalizado com código ${codigo}`);

        // Não retorna (encerra a execução)
        throw new Error(`exit(${codigo})`);
    }

    /**
     * Implementação de rand
     * @return {number} Número aleatório entre 0 e RAND_MAX
     * @private
     */
    _funcRand() {
        // RAND_MAX em C é tipicamente 32767 (2^15 - 1)
        const RAND_MAX = 32767;
        return Math.floor(Math.random() * (RAND_MAX + 1));
    }

    /**
     * Implementação de srand
     * @param {any[]} args - Argumentos da função
     * @private
     */
    _funcSrand(args) {
        // Em JavaScript não podemos definir uma semente para Math.random()
        // Então essa função não faz nada significativo
        return null;
    }

    /**
     * Implementação de strlen
     * @param {any[]} args - Argumentos da função
     * @return {number} Comprimento da string
     * @private
     */
    _funcStrlen(args) {
        if (args.length === 0) {
            throw new Error("strlen: faltam argumentos");
        }

        // Argumento é o ponteiro para a string
        const ptr = Number(args[0]);

        // Lê a string da memória
        const str = this._lerStringDaMemoria(ptr);

        // Retorna o comprimento
        return str.length;
    }

    /**
     * Implementação de strcpy
     * @param {any[]} args - Argumentos da função
     * @return {number} Endereço da string de destino
     * @private
     */
    _funcStrcpy(args) {
        if (args.length < 2) {
            throw new Error("strcpy: faltam argumentos");
        }

        // Argumentos são os ponteiros para destino e origem
        const destino = Number(args[0]);
        const origem = Number(args[1]);

        // Lê a string de origem
        const str = this._lerStringDaMemoria(origem);

        // Escreve a string no destino
        this._escreverStringNaMemoria(destino, str);

        // Retorna o endereço de destino
        return destino;
    }

    /**
     * Implementação de strcat
     * @param {any[]} args - Argumentos da função
     * @return {number} Endereço da string de destino
     * @private
     */
    _funcStrcat(args) {
        if (args.length < 2) {
            throw new Error("strcat: faltam argumentos");
        }

        // Argumentos são os ponteiros para destino e origem
        const destino = Number(args[0]);
        const origem = Number(args[1]);

        // Lê as strings
        const strDestino = this._lerStringDaMemoria(destino);
        const strOrigem = this._lerStringDaMemoria(origem);

        // Concatena
        const resultado = strDestino + strOrigem;

        // Escreve o resultado no destino
        this._escreverStringNaMemoria(destino, resultado);

        // Retorna o endereço de destino
        return destino;
    }

    /**
     * Implementação de strcmp
     * @param {any[]} args - Argumentos da função
     * @return {number} Resultado da comparação
     * @private
     */
    _funcStrcmp(args) {
        if (args.length < 2) {
            throw new Error("strcmp: faltam argumentos");
        }

        // Argumentos são os ponteiros para as strings
        const str1Ptr = Number(args[0]);
        const str2Ptr = Number(args[1]);

        // Lê as strings
        const str1 = this._lerStringDaMemoria(str1Ptr);
        const str2 = this._lerStringDaMemoria(str2Ptr);

        // Compara
        if (str1 < str2) return -1;
        if (str1 > str2) return 1;
        return 0;
    }

    /**
     * Implementação de strncpy
     * @param {any[]} args - Argumentos da função
     * @return {number} Endereço da string de destino
     * @private
     */
    _funcStrncpy(args) {
        if (args.length < 3) {
            throw new Error("strncpy: faltam argumentos");
        }

        // Argumentos são os ponteiros para destino, origem e tamanho
        const destino = Number(args[0]);
        const origem = Number(args[1]);
        const n = Number(args[2]);

        // Lê a string de origem
        const strOrigem = this._lerStringDaMemoria(origem);

        // Limita ao tamanho especificado
        const strLimitada = strOrigem.substring(0, n);

        // Escreve a string no destino
        this._escreverStringNaMemoria(destino, strLimitada, n);

        // Retorna o endereço de destino
        return destino;
    }

    /**
     * Implementação de strncat
     * @param {any[]} args - Argumentos da função
     * @return {number} Endereço da string de destino
     * @private
     */
    _funcStrncat(args) {
        if (args.length < 3) {
            throw new Error("strncat: faltam argumentos");
        }

        // Argumentos são os ponteiros para destino, origem e tamanho
        const destino = Number(args[0]);
        const origem = Number(args[1]);
        const n = Number(args[2]);

        // Lê as strings
        const strDestino = this._lerStringDaMemoria(destino);
        const strOrigem = this._lerStringDaMemoria(origem);

        // Limita ao tamanho especificado
        const strOrigemLimitada = strOrigem.substring(0, n);

        // Concatena
        const resultado = strDestino + strOrigemLimitada;

        // Escreve o resultado no destino
        this._escreverStringNaMemoria(destino, resultado);

        // Retorna o endereço de destino
        return destino;
    }

    /**
     * Implementação de strncmp
     * @param {any[]} args - Argumentos da função
     * @return {number} Resultado da comparação
     * @private
     */
    _funcStrncmp(args) {
        if (args.length < 3) {
            throw new Error("strncmp: faltam argumentos");
        }

        // Argumentos são os ponteiros para as strings e o tamanho
        const str1Ptr = Number(args[0]);
        const str2Ptr = Number(args[1]);
        const n = Number(args[2]);

        // Lê as strings
        const str1 = this._lerStringDaMemoria(str1Ptr);
        const str2 = this._lerStringDaMemoria(str2Ptr);

        // Limita ao tamanho especificado
        const str1Limitada = str1.substring(0, n);
        const str2Limitada = str2.substring(0, n);

        // Compara
        if (str1Limitada < str2Limitada) return -1;
        if (str1Limitada > str2Limitada) return 1;
        return 0;
    }

    /**
     * Implementação de pow
     * @param {any[]} args - Argumentos da função
     * @return {number} Resultado da potência
     * @private
     */
    _funcPow(args) {
        if (args.length < 2) {
            throw new Error("pow: faltam argumentos");
        }

        const base = Number(args[0]);
        const expoente = Number(args[1]);

        return Math.pow(base, expoente);
    }

    /**
     * Implementação de sqrt
     * @param {any[]} args - Argumentos da função
     * @return {number} Raiz quadrada
     * @private
     */
    _funcSqrt(args) {
        if (args.length < 1) {
            throw new Error("sqrt: faltam argumentos");
        }

        const x = Number(args[0]);

        if (x < 0) {
            // Em C, sqrt para números negativos é indefinido
            return NaN;
        }

        return Math.sqrt(x);
    }

    /**
     * Implementação de floor
     * @param {any[]} args - Argumentos da função
     * @return {number} Maior inteiro menor ou igual a x
     * @private
     */
    _funcFloor(args) {
        if (args.length < 1) {
            throw new Error("floor: faltam argumentos");
        }

        const x = Number(args[0]);
        return Math.floor(x);
    }

    /**
     * Implementação de ceil
     * @param {any[]} args - Argumentos da função
     * @return {number} Menor inteiro maior ou igual a x
     * @private
     */
    _funcCeil(args) {
        if (args.length < 1) {
            throw new Error("ceil: faltam argumentos");
        }

        const x = Number(args[0]);
        return Math.ceil(x);
    }

    /**
     * Implementação de fabs
     * @param {any[]} args - Argumentos da função
     * @return {number} Valor absoluto
     * @private
     */
    _funcFabs(args) {
        if (args.length < 1) {
            throw new Error("fabs: faltam argumentos");
        }

        const x = Number(args[0]);
        return Math.abs(x);
    }

    /**
     * Lê uma string da memória
     * @param {number} endereco - Endereço da string
     * @return {string} String lida
     * @private
     */
    _lerStringDaMemoria(endereco) {
        if (!endereco) return "";

        let str = "";
        let i = 0;
        let char;

        // Lê caracteres até encontrar o nulo terminador
        while ((char = this.gerenciadorMemoria.leMemoria(endereco, i)) !== 0) {
            str += String.fromCharCode(char);
            i++;

            // Limite de segurança para evitar loops infinitos
            if (i > 10000) {
                break;
            }
        }

        return str;
    }

    /**
     * Escreve uma string na memória
     * @param {number} endereco - Endereço onde escrever
     * @param {string} str - String a escrever
     * @param {number} [tamanhoMaximo] - Tamanho máximo a escrever
     * @private
     */
    _escreverStringNaMemoria(endereco, str, tamanhoMaximo) {
        if (!endereco) return;

        const tamanho = tamanhoMaximo !== undefined ? tamanhoMaximo : str.length;

        // Escreve os caracteres
        for (let i = 0; i < tamanho; i++) {
            if (i < str.length) {
                this.gerenciadorMemoria.escreveMemoria(endereco, i, str.charCodeAt(i));
            } else {
                // Preenche com zeros se o tamanho for maior que a string
                this.gerenciadorMemoria.escreveMemoria(endereco, i, 0);
            }
        }

        // Adiciona o terminador nulo (se não estiver limitado)
        if (tamanhoMaximo === undefined || tamanhoMaximo > str.length) {
            this.gerenciadorMemoria.escreveMemoria(endereco, str.length, 0);
        }
    }

    /**
     * Log interno do interpretador
     * @param {string} mensagem - Mensagem a registrar
     * @param {string} [nivel="info"] - Nível do log
     * @private
     */
    _log(mensagem, nivel = "info") {
        if (this.configuracoes.modoDebug) {
            const prefixo = `[InterpretadorC:${nivel}]`;

            switch (nivel) {
                case "erro":
                    console.error(`${prefixo} ${mensagem}`);
                    break;
                case "aviso":
                    console.warn(`${prefixo} ${mensagem}`);
                    break;
                default:
                    console.log(`${prefixo} ${mensagem}`);
            }
        }
    }
}

// Exporta a classe
export default InterpretadorC
