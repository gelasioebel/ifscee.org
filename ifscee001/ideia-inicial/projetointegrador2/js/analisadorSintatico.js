// analisadorSintatico.js
import Token from './token.js';
import NoAST from './noAst.js';

/**
 * Analisador Sintático para linguagem C (C90, C17, C23)
 * Implementa um parser recursivo descendente para construir uma AST
 */
class AnalisadorSintatico {
    /**
     * @param {AnalisadorLexico} analisadorLexico - Instância do analisador léxico
     * @param {Object} opcoes - Opções de configuração
     * @param {string} opcoes.versaoC - Versão do C ('C90', 'C17', 'C23')
     * @param {boolean} opcoes.modoEstrito - Se deve gerar erros para extensões não padrão
     */
    constructor(analisadorLexico, opcoes = {}) {
        this.analisadorLexico = analisadorLexico;
        this.opcoes = {
            versaoC: opcoes.versaoC || 'C17',
            modoEstrito: opcoes.modoEstrito || false
        };

        // Estado do analisador
        this.tokens = [];
        this.indiceTokenAtual = 0;
        this.erros = [];
        this.avisos = [];

        // Estado de contexto para análise
        this.escopoAtual = null;
        this.escopos = [];
        this.dentroDeEstrutura = false;
        this.dentroDeDeclaracaoEnum = false;
        this.dentroDeExpressaoConstante = false;
        this.tiposDefinidos = new Set();

        // Inicializa tipos padrão
        this._inicializaTiposDefinidos();
    }

    /**
     * Inicializa o conjunto de tipos definidos pelo usuário e padrão
     * @private
     */
    _inicializaTiposDefinidos() {
        // Tipos padrão definidos pela biblioteca
        const tiposPadrao = [
            'size_t', 'ptrdiff_t', 'FILE', 'fpos_t', 'time_t', 'clock_t',
            'va_list', 'jmp_buf', 'wchar_t', 'wint_t', 'wctype_t', 'mbstate_t'
        ];

        // Adiciona ao conjunto de tipos
        tiposPadrao.forEach(tipo => this.tiposDefinidos.add(tipo));

        // Adiciona tipos específicos de versões do C
        if (this.opcoes.versaoC !== 'C90') {
            // Tipos C99+
            this.tiposDefinidos.add('int8_t');
            this.tiposDefinidos.add('int16_t');
            this.tiposDefinidos.add('int32_t');
            this.tiposDefinidos.add('int64_t');
            this.tiposDefinidos.add('uint8_t');
            this.tiposDefinidos.add('uint16_t');
            this.tiposDefinidos.add('uint32_t');
            this.tiposDefinidos.add('uint64_t');
            this.tiposDefinidos.add('intptr_t');
            this.tiposDefinidos.add('uintptr_t');
            this.tiposDefinidos.add('intmax_t');
            this.tiposDefinidos.add('uintmax_t');
        }
    }

    /**
     * Analisa os tokens e constrói a AST
     * @param {Token[]} tokens - Array de tokens do analisador léxico
     * @return {NoAST} Raiz da AST
     */
    analisaTokens(tokens) {
        // Inicialização do estado
        this.tokens = this._filtraTokens(tokens);
        this.indiceTokenAtual = 0;
        this.erros = [];
        this.avisos = [];
        this.escopos = [];
        this.escopoAtual = this._criaEscopo('global');

        // Cria nó raiz para a unidade de tradução
        const raiz = new NoAST('TRANSLATION_UNIT', '', 1, 1);

        // Processa declarações de nível global até o fim do arquivo
        while (!this._fimTokens()) {
            try {
                // Ignora tokens de pré-processador no nível sintático
                if (this._verificaTipo(Token.TIPOS.PREPROCESSOR)) {
                    this._avancaToken();
                    continue;
                }

                // Tenta processar uma declaração global
                const declaracao = this._processaDeclaracaoExterna();
                if (declaracao) {
                    raiz.adicionaFilho(declaracao);
                }
            } catch (erro) {
                // Adiciona o erro à lista e tenta sincronizar
                this.erros.push(erro);
                this._sincronizaDepoisErro();
            }
        }

        // Verifica erros no final da análise
        if (this.erros.length > 0) {
            console.error(`Encontrados ${this.erros.length} erros sintáticos:`);
            this.erros.forEach(erro => console.error(erro.message));
        }

        // Verifica avisos
        if (this.avisos.length > 0) {
            console.warn(`Encontrados ${this.avisos.length} avisos:`);
            this.avisos.forEach(aviso => console.warn(aviso));
        }

        return raiz;
    }

    /**
     * Filtra tokens irrelevantes para a análise sintática
     * @param {Token[]} tokens - Array de tokens original
     * @return {Token[]} Array de tokens filtrado
     * @private
     */
    _filtraTokens(tokens) {
        // Remove tokens de whitespace e comentários (se presentes)
        return tokens.filter(token =>
            token.tipo !== Token.TIPOS.WHITESPACE &&
            token.tipo !== Token.TIPOS.COMMENT
        );
    }

    /**
     * Processa uma declaração externa (nível global)
     * @return {NoAST} Nó AST da declaração
     * @private
     */
    _processaDeclaracaoExterna() {
        // Processa atributos C23, se presentes
        const atributos = this._processaAtributos();

        // Processa especificadores e qualificadores de tipo
        const especificadoresTipo = this._processaEspecificadoresTipo();

        // Declaration specifiers com função incluem pelo menos um tipo básico ou typedef
        const contemEspecificadorTipo = especificadoresTipo.some(
            spec => spec.tipo === 'TYPE_SPECIFIER' ||
                (spec.tipo === 'KEYWORD' &&
                    ['struct', 'union', 'enum', 'typedef'].includes(spec.valor))
        );

        // Vazio ou erro em especificadores
        if (especificadoresTipo.length === 0) {
            throw this._criaErroSintatico(
                "Esperado especificador de declaração",
                this._pegaTokenAtual()
            );
        }

        // Verifica se é uma definição de struct/union/enum
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ';')) {
            // Declaração vazia apenas com struct/enum/union
            this._avancaToken(); // Consome ';'
            return new NoAST('EMPTY_DECLARATION', '',
                especificadoresTipo[0].linha,
                especificadoresTipo[0].coluna,
                especificadoresTipo
            );
        }

        // Analisa declarações externas
        let declaracao;

        // Verifica se é typedef
        if (especificadoresTipo.some(spec =>
            spec.tipo === 'STORAGE_CLASS' && spec.valor === 'typedef')) {
            declaracao = this._processaTypedef(especificadoresTipo, atributos);
        }
        // Função ou variável global
        else {
            // Processa o declarador
            const declaradorInfo = this._processaDeclarador();

            // Verifica se é definição de função (se há abre chave ou lista de declarações)
            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '{')) {
                // Definição de função
                declaracao = this._processaDefinicaoFuncao(
                    especificadoresTipo,
                    declaradorInfo,
                    atributos
                );
            } else {
                // Declaração de variável global ou protótipo de função
                if (declaradorInfo.ehFuncao) {
                    // Protótipo de função
                    declaracao = this._processaPrototipoFuncao(
                        especificadoresTipo,
                        declaradorInfo,
                        atributos
                    );
                } else {
                    // Variável global
                    declaracao = this._processaDeclaracaoVariavelGlobal(
                        especificadoresTipo,
                        declaradorInfo,
                        atributos
                    );
                }
            }
        }

        return declaracao;
    }

    /**
     * Processa atributos C23 (introduzidos no C23)
     * @return {NoAST[]} Array de nós AST de atributos
     * @private
     */
    _processaAtributos() {
        const atributos = [];

        // Atributos C23 podem ser especificados com [[atributo]]
        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '[')) {
            // Verifica se é o início de um atributo C23
            const posicaoInicial = this.indiceTokenAtual;

            if (this.opcoes.versaoC !== 'C23') {
                // Avisa sobre uso de atributos C23 em versões anteriores
                this._adicionaAviso(
                    "Atributos C23 [[...]] não são suportados nesta versão do C",
                    this._pegaTokenAtual()
                );
            }

            this._avancaToken(); // Consome '['

            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '[')) {
                this._avancaToken(); // Consome o segundo '['

                // Começa o nó de atributo
                const noAtributo = new NoAST('ATTRIBUTE', '',
                    this._pegaToken(posicaoInicial).linha,
                    this._pegaToken(posicaoInicial).coluna
                );

                // Processa o nome do atributo
                if (this._verificaTipo(Token.TIPOS.IDENTIFIER)) {
                    const nomeAtributo = this._avancaToken().valor;
                    noAtributo.valor = nomeAtributo;

                    // Verifica se há argumentos para o atributo
                    if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '(')) {
                        this._avancaToken(); // Consome '('

                        // Processa argumentos do atributo
                        while (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ')')) {
                            const argumento = this._processaExpressaoAtribuicao();
                            noAtributo.adicionaFilho(argumento);

                            // Verifica se há mais argumentos
                            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ',')) {
                                this._avancaToken();
                            } else {
                                break;
                            }
                        }

                        this._consome(Token.TIPOS.PUNCTUATOR, ')');
                    }
                }

                // Consome o fechamento do atributo
                this._consome(Token.TIPOS.PUNCTUATOR, ']');
                this._consome(Token.TIPOS.PUNCTUATOR, ']');

                atributos.push(noAtributo);
            } else {
                // Não é um atributo C23, volta para a posição inicial
                this.indiceTokenAtual = posicaoInicial;
                break;
            }
        }

        return atributos;
    }

    /**
     * Processa especificadores de tipo (int, char, struct, etc.)
     * @return {NoAST[]} Array de nós AST dos especificadores
     * @private
     */
    _processaEspecificadoresTipo() {
        const especificadores = [];
        let continua = true;

        while (continua) {
            const token = this._pegaTokenAtual();

            // Classes de armazenamento
            if (this._verificaTipo(Token.TIPOS.KEYWORD, [
                'typedef', 'extern', 'static', 'auto', 'register',
                '_Thread_local', 'thread_local' // C11/C23
            ])) {
                const valor = this._avancaToken().valor;
                const no = new NoAST('STORAGE_CLASS', valor, token.linha, token.coluna);
                especificadores.push(no);
            }
            // Qualificadores de tipo
            else if (this._verificaTipo(Token.TIPOS.KEYWORD, [
                'const', 'volatile', 'restrict', '_Atomic' // C99/C11
            ])) {
                const valor = this._avancaToken().valor;
                const no = new NoAST('TYPE_QUALIFIER', valor, token.linha, token.coluna);
                especificadores.push(no);
            }
            // Especificadores de funções (C11+)
            else if (this._verificaTipo(Token.TIPOS.KEYWORD, [
                'inline', '_Noreturn', 'noreturn' // C99/C11/C23
            ])) {
                const valor = this._avancaToken().valor;
                const no = new NoAST('FUNCTION_SPECIFIER', valor, token.linha, token.coluna);
                especificadores.push(no);
            }
            // Tipos básicos
            else if (this._verificaTipo(Token.TIPOS.KEYWORD, [
                'void', 'char', 'short', 'int', 'long', 'float', 'double',
                'signed', 'unsigned', '_Bool', '_Complex', '_Imaginary', // C99
                '_BitInt', 'bool' // C23
            ])) {
                const valor = this._avancaToken().valor;
                const no = new NoAST('TYPE_SPECIFIER', valor, token.linha, token.coluna);
                especificadores.push(no);
            }
            // Tipos complexos (struct, union, enum)
            else if (this._verificaTipo(Token.TIPOS.KEYWORD, ['struct', 'union'])) {
                const tipo = this._avancaToken().valor;
                especificadores.push(this._processaStructOuUnion(tipo));
            }
            else if (this._verificaTipo(Token.TIPOS.KEYWORD, 'enum')) {
                this._avancaToken(); // Consome 'enum'
                especificadores.push(this._processaEnum());
            }
            // Tipo definido pelo usuário (typedef)
            else if (this._verificaTipo(Token.TIPOS.IDENTIFIER) &&
                this.tiposDefinidos.has(this._pegaTokenAtual().valor)) {
                const valor = this._avancaToken().valor;
                const no = new NoAST('TYPE_SPECIFIER', valor, token.linha, token.coluna);
                no.adicionaPropriedade('tipoCustom', true);
                especificadores.push(no);
            }
            // Extensões C23
            else if (this.opcoes.versaoC === 'C23' &&
                this._verificaTipo(Token.TIPOS.KEYWORD, [
                    'constexpr', 'typeof', 'typeof_unqual', 'alignas', 'alignof'
                ])) {
                const valor = this._avancaToken().valor;
                const no = new NoAST('C23_SPECIFIER', valor, token.linha, token.coluna);
                especificadores.push(no);

                // Processar argumentos para typeof e outras extensões C23
                if (valor === 'typeof' || valor === 'typeof_unqual' ||
                    valor === 'alignas' || valor === 'alignof') {
                    this._consome(Token.TIPOS.PUNCTUATOR, '(');
                    const arg = this._processaExpressaoAtribuicao();
                    this._consome(Token.TIPOS.PUNCTUATOR, ')');
                    no.adicionaFilho(arg);
                }
            }
            else {
                // Não é um especificador de tipo, termina o loop
                continua = false;
            }
        }

        return especificadores;
    }

    /**
     * Processa uma definição ou referência struct/union
     * @param {string} tipo - 'struct' ou 'union'
     * @return {NoAST} Nó AST da struct/union
     * @private
     */
    _processaStructOuUnion(tipo) {
        const token = this._pegaTokenAnterior();
        const noStruct = new NoAST(
            tipo === 'struct' ? 'STRUCT_SPECIFIER' : 'UNION_SPECIFIER',
            '',
            token.linha,
            token.coluna
        );

        // Processa o nome da struct/union (opcional)
        if (this._verificaTipo(Token.TIPOS.IDENTIFIER)) {
            const nomeStruct = this._avancaToken().valor;
            noStruct.valor = nomeStruct;
        }

        // Verifica se há definição da struct/union
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '{')) {
            this._avancaToken(); // Consome '{'
            this.dentroDeEstrutura = true;

            // Processa os membros da struct/union
            while (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, '}')) {
                if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ';')) {
                    // Declaração vazia, ignora
                    this._avancaToken();
                    continue;
                }

                // Processa um membro da struct/union
                const membro = this._processaDeclaracaoMembro();
                if (membro) {
                    noStruct.adicionaFilho(membro);
                }
            }

            this._consome(Token.TIPOS.PUNCTUATOR, '}');
            this.dentroDeEstrutura = false;
        }

        return noStruct;
    }

    /**
     * Processa uma declaração de membro de struct/union
     * @return {NoAST} Nó AST da declaração de membro
     * @private
     */
    _processaDeclaracaoMembro() {
        // Processa atributos C23, se presentes
        const atributos = this._processaAtributos();

        // Processa especificadores de tipo
        const especificadoresTipo = this._processaEspecificadoresTipo();

        if (especificadoresTipo.length === 0) {
            throw this._criaErroSintatico(
                "Esperado especificador de tipo para membro de struct/union",
                this._pegaTokenAtual()
            );
        }

        // Nó para a declaração do membro
        const noDeclaracao = new NoAST(
            'STRUCT_MEMBER_DECL',
            '',
            especificadoresTipo[0].linha,
            especificadoresTipo[0].coluna
        );

        // Adiciona os especificadores de tipo
        especificadoresTipo.forEach(spec => noDeclaracao.adicionaFilho(spec));

        // Processa os declaradores (membros)
        let primeiro = true;

        do {
            if (!primeiro) {
                this._consome(Token.TIPOS.PUNCTUATOR, ',');
            }
            primeiro = false;

            // Processa campos sem nome (campos de bits)
            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ':')) {
                // Campo sem nome (campo de bits)
                const noMembro = new NoAST('STRUCT_MEMBER', '', this._pegaTokenAtual().linha, this._pegaTokenAtual().coluna);
                this._avancaToken(); // Consome ':'

                // Processa o tamanho do campo de bits
                const tamanhoBits = this._processaExpressaoConstante();
                noMembro.adicionaPropriedade('ehCampoBits', true);
                noMembro.adicionaFilho(tamanhoBits);
                noDeclaracao.adicionaFilho(noMembro);
            }
            // Membros normais
            else {
                const declaradorInfo = this._processaDeclarador();
                const noMembro = new NoAST('STRUCT_MEMBER', declaradorInfo.nome, declaradorInfo.linha, declaradorInfo.coluna);

                // Adiciona informações do declarador
                noMembro.adicionaPropriedade('tipo', this._combinaTipoDeclarador(especificadoresTipo, declaradorInfo));

                if (declaradorInfo.arrayDimensions && declaradorInfo.arrayDimensions.length > 0) {
                    noMembro.adicionaPropriedade('ehArray', true);
                    noMembro.adicionaPropriedade('dimensoes', declaradorInfo.arrayDimensions);

                    // Adiciona expressões de tamanho de array como filhos
                    declaradorInfo.arrayDimensions.forEach(dim => {
                        if (dim.expressao) {
                            noMembro.adicionaFilho(dim.expressao);
                        }
                    });
                }

                if (declaradorInfo.ponteiros > 0) {
                    noMembro.adicionaPropriedade('ponteiros', declaradorInfo.ponteiros);
                }

                // Verifica se é um campo de bits
                if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ':')) {
                    this._avancaToken(); // Consome ':'

                    // Processa o tamanho do campo de bits
                    const tamanhoBits = this._processaExpressaoConstante();
                    noMembro.adicionaPropriedade('ehCampoBits', true);
                    noMembro.adicionaFilho(tamanhoBits);
                }

                noDeclaracao.adicionaFilho(noMembro);
            }
        } while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ','));

        this._consome(Token.TIPOS.PUNCTUATOR, ';');

        return noDeclaracao;
    }

    /**
     * Processa uma definição ou referência de enum
     * @return {NoAST} Nó AST do enum
     * @private
     */
    _processaEnum() {
        const token = this._pegaTokenAnterior();
        const noEnum = new NoAST('ENUM_SPECIFIER', '', token.linha, token.coluna);

        // Processa o nome do enum (opcional)
        if (this._verificaTipo(Token.TIPOS.IDENTIFIER)) {
            const nomeEnum = this._avancaToken().valor;
            noEnum.valor = nomeEnum;
        }

        // Verifica se há definição do enum
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '{')) {
            this._avancaToken(); // Consome '{'
            this.dentroDeDeclaracaoEnum = true;

            // Processa os enumeradores
            let primeiro = true;

            while (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, '}')) {
                if (!primeiro) {
                    this._consome(Token.TIPOS.PUNCTUATOR, ',');

                    // Em C99+, permite vírgula no final
                    if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '}')) {
                        break;
                    }
                }
                primeiro = false;

                // Processa um enumerador
                const nomeEnum = this._consome(Token.TIPOS.IDENTIFIER).valor;
                const noEnumerador = new NoAST('ENUMERATOR', nomeEnum, this._pegaTokenAnterior().linha, this._pegaTokenAnterior().coluna);

                // Verifica se há valor para o enumerador
                if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '=')) {
                    this._avancaToken(); // Consome '='

                    // Entra em modo de expressão constante
                    this.dentroDeExpressaoConstante = true;
                    const valorEnum = this._processaExpressaoConstante();
                    this.dentroDeExpressaoConstante = false;

                    noEnumerador.adicionaFilho(valorEnum);
                }

                noEnum.adicionaFilho(noEnumerador);
            }

            this._consome(Token.TIPOS.PUNCTUATOR, '}');
            this.dentroDeDeclaracaoEnum = false;
        }

        return noEnum;
    }

    /**
     * Processa um declarador (nome de variável/função com modificadores)
     * @return {Object} Informações do declarador
     * @private
     */
    _processaDeclarador() {
        let ponteiros = 0;
        let nome = '';
        let ehFuncao = false;
        let parametros = [];
        let arrayDimensions = [];
        let linha = 0, coluna = 0;

        // Processa ponteiros (* e qualificadores)
        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '*')) {
            ponteiros++;
            this._avancaToken(); // Consome '*'

            // Qualificadores após ponteiro (const, volatile, etc.)
            while (this._verificaTipo(Token.TIPOS.KEYWORD, ['const', 'volatile', 'restrict', '_Atomic'])) {
                this._avancaToken(); // Consome o qualificador (ignoramos na AST simplificada)
            }
        }

        // Declarador direto (identificador ou declarador entre parênteses)
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '(')) {
            this._avancaToken(); // Consome '('
            const declInfo = this._processaDeclarador();
            this._consome(Token.TIPOS.PUNCTUATOR, ')');

            // Usa as informações do declarador interno
            nome = declInfo.nome;
            linha = declInfo.linha;
            coluna = declInfo.coluna;

            // Combina ponteiros
            ponteiros += declInfo.ponteiros;

            // Preserva outras informações
            ehFuncao = declInfo.ehFuncao;
            parametros = declInfo.parametros || [];
            arrayDimensions = declInfo.arrayDimensions || [];
        }
        // Identificador direto
        else if (this._verificaTipo(Token.TIPOS.IDENTIFIER)) {
            const token = this._avancaToken();
            nome = token.valor;
            linha = token.linha;
            coluna = token.coluna;
        }
        // Declarador anônimo (usado em protótipos de função)
        else {
            // É permitido em alguns contextos (parâmetros abstratos)
            nome = '';
            // Posição atual para rastreamento
            const token = this._pegaTokenAtual();
            linha = token.linha;
            coluna = token.coluna;
        }

        // Sufixos do declarador ([], (), modificadores)
        let continua = true;
        while (continua) {
            // Array
            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '[')) {
                this._avancaToken(); // Consome '['

                // Dimensão de array
                const dimensaoInfo = { tamanho: -1, expressao: null }; // -1 significa tamanho não especificado

                // Qualificadores de tipo para arrays
                while (this._verificaTipo(Token.TIPOS.KEYWORD, ['static', 'const', 'volatile', 'restrict'])) {
                    this._avancaToken(); // Ignora qualificadores
                }

                // Expressão de tamanho (se presente)
                if (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ']')) {
                    this.dentroDeExpressaoConstante = true;
                    dimensaoInfo.expressao = this._processaExpressaoAtribuicao();
                    this.dentroDeExpressaoConstante = false;

                    // Verificar se a expressão é um literal de inteiro para obter o tamanho
                    if (dimensaoInfo.expressao.tipo === 'INT_LITERAL') {
                        dimensaoInfo.tamanho = parseInt(dimensaoInfo.expressao.valor, 10);
                    }
                }

                this._consome(Token.TIPOS.PUNCTUATOR, ']');
                arrayDimensions.push(dimensaoInfo);
            }
            // Função
            else if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '(')) {
                ehFuncao = true;
                this._avancaToken(); // Consome '('

                // Lista de parâmetros
                if (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ')')) {
                    parametros = this._processaListaParametros();
                }

                this._consome(Token.TIPOS.PUNCTUATOR, ')');
            }
            else {
                continua = false;
            }
        }

        return {
            nome,
            ponteiros,
            ehFuncao,
            parametros,
            arrayDimensions,
            linha,
            coluna
        };
    }

    /**
     * Processa uma lista de parâmetros de função
     * @return {NoAST[]} Array de nós AST dos parâmetros
     * @private
     */
    _processaListaParametros() {
        const parametros = [];
        let primeiro = true;

        while (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ')')) {
            if (!primeiro) {
                this._consome(Token.TIPOS.PUNCTUATOR, ',');

                // Verifica se é uma lista variádica (...) após a vírgula
                if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '...')) {
                    this._avancaToken(); // Consome '...'
                    const noVarargs = new NoAST('PARAMETER', '...', this._pegaTokenAnterior().linha, this._pegaTokenAnterior().coluna);
                    noVarargs.adicionaPropriedade('ehVariadica', true);
                    parametros.push(noVarargs);
                    break; // ... deve ser o último parâmetro
                }
            }
            primeiro = false;

            // Processa atributos C23, se presentes
            const atributos = this._processaAtributos();

            // Processa especificadores de tipo
            const especificadoresTipo = this._processaEspecificadoresTipo();

            if (especificadoresTipo.length === 0) {
                // Em C90, permite declaração implícita de int
                if (this.opcoes.versaoC === 'C90') {
                    const token = this._pegaTokenAtual();
                    const noInt = new NoAST('TYPE_SPECIFIER', 'int', token.linha, token.coluna);
                    especificadoresTipo.push(noInt);
                } else {
                    throw this._criaErroSintatico(
                        "Esperado especificador de tipo para parâmetro de função",
                        this._pegaTokenAtual()
                    );
                }
            }

            // Processa o declarador do parâmetro
            const declaradorInfo = this._processaDeclarador();

            // Cria nó para o parâmetro
            const noParametro = new NoAST('PARAMETER', declaradorInfo.nome, declaradorInfo.linha || especificadoresTipo[0].linha, declaradorInfo.coluna || especificadoresTipo[0].coluna);

            // Adiciona especificadores de tipo como filhos
            especificadoresTipo.forEach(spec => noParametro.adicionaFilho(spec));

            // Adiciona informações do declarador
            noParametro.adicionaPropriedade('tipo', this._combinaTipoDeclarador(especificadoresTipo, declaradorInfo));

            if (declaradorInfo.arrayDimensions && declaradorInfo.arrayDimensions.length > 0) {
                noParametro.adicionaPropriedade('ehArray', true);
                noParametro.adicionaPropriedade('dimensoes', declaradorInfo.arrayDimensions);

                // Adiciona expressões de tamanho de array como filhos
                declaradorInfo.arrayDimensions.forEach(dim => {
                    if (dim.expressao) {
                        noParametro.adicionaFilho(dim.expressao);
                    }
                });
            }

            if (declaradorInfo.ponteiros > 0) {
                noParametro.adicionaPropriedade('ponteiros', declaradorInfo.ponteiros);
            }

            // Se é parâmetro de função
            if (declaradorInfo.ehFuncao) {
                noParametro.adicionaPropriedade('ehFuncao', true);
                declaradorInfo.parametros.forEach(param => noParametro.adicionaFilho(param));
            }

            // Adiciona atributos C23 se houver
            atributos.forEach(attr => noParametro.adicionaFilho(attr));

            parametros.push(noParametro);
        }

        return parametros;
    }

    /**
     * Processa uma declaração typedef
     * @param {NoAST[]} especificadoresTipo - Especificadores de tipo
     * @param {NoAST[]} atributos - Atributos C23
     * @return {NoAST} Nó AST da declaração typedef
     * @private
     */
    _processaTypedef(especificadoresTipo, atributos) {
        const token = this._pegaTokenAtual();
        const noTypedef = new NoAST('TYPEDEF_DECL', '', especificadoresTipo[0].linha, especificadoresTipo[0].coluna);

        // Adiciona especificadores de tipo como filhos
        especificadoresTipo.forEach(spec => noTypedef.adicionaFilho(spec));

        // Processa os declaradores (nomes dos tipos definidos)
        let primeiro = true;

        do {
            if (!primeiro) {
                this._consome(Token.TIPOS.PUNCTUATOR, ',');
            }
            primeiro = false;

            // Processa o declarador
            const declaradorInfo = this._processaDeclarador();

            // Adiciona o nome ao conjunto de tipos definidos
            this.tiposDefinidos.add(declaradorInfo.nome);

            // Cria nó para o tipo definido
            const noTipo = new NoAST('TYPEDEF_NAME', declaradorInfo.nome, declaradorInfo.linha, declaradorInfo.coluna);

            // Adiciona informações do declarador
            noTipo.adicionaPropriedade('tipo', this._combinaTipoDeclarador(especificadoresTipo, declaradorInfo));

            if (declaradorInfo.arrayDimensions && declaradorInfo.arrayDimensions.length > 0) {
                noTipo.adicionaPropriedade('ehArray', true);
                noTipo.adicionaPropriedade('dimensoes', declaradorInfo.arrayDimensions);

                // Adiciona expressões de tamanho de array como filhos
                declaradorInfo.arrayDimensions.forEach(dim => {
                    if (dim.expressao) {
                        noTipo.adicionaFilho(dim.expressao);
                    }
                });
            }

            if (declaradorInfo.ponteiros > 0) {
                noTipo.adicionaPropriedade('ponteiros', declaradorInfo.ponteiros);
            }

            if (declaradorInfo.ehFuncao) {
                noTipo.adicionaPropriedade('ehFuncao', true);
                noTipo.adicionaPropriedade('parametros', declaradorInfo.parametros);

                // Adiciona parâmetros como filhos
                declaradorInfo.parametros.forEach(param => noTipo.adicionaFilho(param));
            }

            noTypedef.adicionaFilho(noTipo);
        } while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ','));

        this._consome(Token.TIPOS.PUNCTUATOR, ';');

        return noTypedef;
    }

    /**
     * Processa uma definição de função
     * @param {NoAST[]} especificadoresTipo - Especificadores de tipo
     * @param {Object} declaradorInfo - Informações do declarador
     * @param {NoAST[]} atributos - Atributos C23
     * @return {NoAST} Nó AST da definição de função
     * @private
     */
    _processaDefinicaoFuncao(especificadoresTipo, declaradorInfo, atributos) {
        // Cria nó para a definição de função
        const noFuncao = new NoAST('FUNCTION_DEF', declaradorInfo.nome, especificadoresTipo[0].linha, especificadoresTipo[0].coluna);

        // Adiciona especificadores de tipo como filhos (tipo de retorno e modificadores)
        especificadoresTipo.forEach(spec => noFuncao.adicionaFilho(spec));

        // Cria um escopo para os parâmetros e corpo da função
        const escopoAnterior = this.escopoAtual;
        this.escopoAtual = this._criaEscopo(declaradorInfo.nome, escopoAnterior);

        // Adiciona parâmetros à função e ao escopo
        if (declaradorInfo.parametros && declaradorInfo.parametros.length > 0) {
            const noParametros = new NoAST('PARAMETER_LIST', '', declaradorInfo.linha, declaradorInfo.coluna);

            declaradorInfo.parametros.forEach(param => {
                noParametros.adicionaFilho(param);

                // Adiciona o parâmetro ao escopo se tiver nome
                if (param.valor && param.valor !== '...') {
                    this.escopoAtual.variaveis.set(param.valor, {
                        tipo: param.pegaPropriedade('tipo') || 'int',
                        ehParametro: true
                    });
                }
            });

            noFuncao.adicionaFilho(noParametros);
        } else {
            // Função sem parâmetros
            const noParametros = new NoAST('PARAMETER_LIST', '', declaradorInfo.linha, declaradorInfo.coluna);
            noFuncao.adicionaFilho(noParametros);
        }

        // Adiciona atributos C23 se houver
        atributos.forEach(attr => noFuncao.adicionaFilho(attr));

        // Processa o corpo da função
        const corpo = this._processaBlocoComposto();
        noFuncao.adicionaFilho(corpo);

        // Restaura o escopo anterior
        this.escopoAtual = escopoAnterior;

        return noFuncao;
    }

    /**
     * Processa um protótipo de função
     * @param {NoAST[]} especificadoresTipo - Especificadores de tipo
     * @param {Object} declaradorInfo - Informações do declarador
     * @param {NoAST[]} atributos - Atributos C23
     * @return {NoAST} Nó AST do protótipo de função
     * @private
     */
    _processaPrototipoFuncao(especificadoresTipo, declaradorInfo, atributos) {
        // Cria nó para o protótipo de função
        const noPrototipo = new NoAST('FUNCTION_DECL', declaradorInfo.nome, especificadoresTipo[0].linha, especificadoresTipo[0].coluna);

        // Adiciona especificadores de tipo como filhos (tipo de retorno e modificadores)
        especificadoresTipo.forEach(spec => noPrototipo.adicionaFilho(spec));

        // Adiciona parâmetros ao protótipo
        if (declaradorInfo.parametros && declaradorInfo.parametros.length > 0) {
            const noParametros = new NoAST('PARAMETER_LIST', '', declaradorInfo.linha, declaradorInfo.coluna);

            declaradorInfo.parametros.forEach(param => {
                noParametros.adicionaFilho(param);
            });

            noPrototipo.adicionaFilho(noParametros);
        } else {
            // Função sem parâmetros
            const noParametros = new NoAST('PARAMETER_LIST', '', declaradorInfo.linha, declaradorInfo.coluna);
            noPrototipo.adicionaFilho(noParametros);
        }

        // Adiciona atributos C23 se houver
        atributos.forEach(attr => noPrototipo.adicionaFilho(attr));

        // Consome o ponto e vírgula
        this._consome(Token.TIPOS.PUNCTUATOR, ';');

        return noPrototipo;
    }

    /**
     * Processa uma declaração de variável global
     * @param {NoAST[]} especificadoresTipo - Especificadores de tipo
     * @param {Object} declaradorInfo - Informações do declarador
     * @param {NoAST[]} atributos - Atributos C23
     * @return {NoAST} Nó AST da declaração de variável
     * @private
     */
    _processaDeclaracaoVariavelGlobal(especificadoresTipo, declaradorInfo, atributos) {
        // Cria nó para a declaração de variável
        const noDeclaracao = new NoAST('VAR_DECL', declaradorInfo.nome, especificadoresTipo[0].linha, especificadoresTipo[0].coluna);

        // Adiciona especificadores de tipo como filhos
        especificadoresTipo.forEach(spec => noDeclaracao.adicionaFilho(spec));

        // Adiciona informações do declarador
        noDeclaracao.adicionaPropriedade('tipo', this._combinaTipoDeclarador(especificadoresTipo, declaradorInfo));

        if (declaradorInfo.arrayDimensions && declaradorInfo.arrayDimensions.length > 0) {
            noDeclaracao.adicionaPropriedade('ehArray', true);
            noDeclaracao.adicionaPropriedade('dimensoes', declaradorInfo.arrayDimensions);

            // Adiciona expressões de tamanho de array como filhos
            declaradorInfo.arrayDimensions.forEach(dim => {
                if (dim.expressao) {
                    noDeclaracao.adicionaFilho(dim.expressao);
                }
            });
        }

        if (declaradorInfo.ponteiros > 0) {
            noDeclaracao.adicionaPropriedade('ponteiros', declaradorInfo.ponteiros);
        }

        // Adiciona atributos C23 se houver
        atributos.forEach(attr => noDeclaracao.adicionaFilho(attr));

        // Verifica se há inicializador
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '=')) {
            this._avancaToken(); // Consome '='

            // Processa o inicializador
            const inicializador = this._processaInicializador();
            noDeclaracao.adicionaFilho(inicializador);
        }

        // Verifica se há mais declaradores (a, b, c = 10, etc.)
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ',')) {
            const noMultiDecl = new NoAST('MULTI_VAR_DECL', '', especificadoresTipo[0].linha, especificadoresTipo[0].coluna);

            // Adiciona a primeira declaração
            noMultiDecl.adicionaFilho(noDeclaracao);

            // Processa os declaradores adicionais
            do {
                this._avancaToken(); // Consome ','

                // Processa o próximo declarador
                const proxDeclaradorInfo = this._processaDeclarador();
                const proxNoDeclaracao = new NoAST('VAR_DECL', proxDeclaradorInfo.nome, proxDeclaradorInfo.linha, proxDeclaradorInfo.coluna);

                // Adiciona as mesmas informações de tipo
                especificadoresTipo.forEach(spec => proxNoDeclaracao.adicionaFilho(spec.clone()));

                // Adiciona informações do declarador
                proxNoDeclaracao.adicionaPropriedade('tipo', this._combinaTipoDeclarador(especificadoresTipo, proxDeclaradorInfo));

                if (proxDeclaradorInfo.arrayDimensions && proxDeclaradorInfo.arrayDimensions.length > 0) {
                    proxNoDeclaracao.adicionaPropriedade('ehArray', true);
                    proxNoDeclaracao.adicionaPropriedade('dimensoes', proxDeclaradorInfo.arrayDimensions);

                    // Adiciona expressões de tamanho de array como filhos
                    proxDeclaradorInfo.arrayDimensions.forEach(dim => {
                        if (dim.expressao) {
                            proxNoDeclaracao.adicionaFilho(dim.expressao);
                        }
                    });
                }

                if (proxDeclaradorInfo.ponteiros > 0) {
                    proxNoDeclaracao.adicionaPropriedade('ponteiros', proxDeclaradorInfo.ponteiros);
                }

                // Verifica se há inicializador
                if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '=')) {
                    this._avancaToken(); // Consome '='

                    // Processa o inicializador
                    const inicializador = this._processaInicializador();
                    proxNoDeclaracao.adicionaFilho(inicializador);
                }

                noMultiDecl.adicionaFilho(proxNoDeclaracao);
            } while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ','));

            // Consome o ponto e vírgula
            this._consome(Token.TIPOS.PUNCTUATOR, ';');

            return noMultiDecl;
        } else {
            // Apenas uma declaração
            this._consome(Token.TIPOS.PUNCTUATOR, ';');
            return noDeclaracao;
        }
    }

    /**
     * Processa um inicializador de variável (expressão ou lista de inicializadores)
     * @return {NoAST} Nó AST do inicializador
     * @private
     */
    _processaInicializador() {
        // Inicializador de lista ({1, 2, 3} para arrays/struct)
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '{')) {
            return this._processaInicializadorLista();
        }

        // Inicializador de expressão (a = 5)
        return this._processaExpressaoAtribuicao();
    }

    /**
     * Processa um inicializador de lista ({1, 2, 3} para arrays/struct)
     * @return {NoAST} Nó AST do inicializador de lista
     * @private
     */
    _processaInicializadorLista() {
        const token = this._pegaTokenAtual();
        const noLista = new NoAST('INITIALIZER_LIST', '', token.linha, token.coluna);

        this._avancaToken(); // Consome '{'

        // Lista vazia
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '}')) {
            this._avancaToken(); // Consome '}'
            return noLista;
        }

        // Processa os inicializadores da lista
        do {
            // Designadores C99 ([0] = 5, .x = 10)
            if ((this._verificaTipo(Token.TIPOS.PUNCTUATOR, '[') ||
                    this._verificaTipo(Token.TIPOS.PUNCTUATOR, '.')) &&
                this.opcoes.versaoC !== 'C90') {

                const designadores = this._processaDesignadores();
                const inicializador = this._processaInicializador();

                const noDesignado = new NoAST('DESIGNATED_INIT', '', designadores[0].linha, designadores[0].coluna);

                // Adiciona os designadores como filhos
                designadores.forEach(des => noDesignado.adicionaFilho(des));

                // Adiciona o inicializador
                noDesignado.adicionaFilho(inicializador);

                noLista.adicionaFilho(noDesignado);
            } else {
                // Inicializador normal
                const inicializador = this._processaInicializador();
                noLista.adicionaFilho(inicializador);
            }

            // Verifica se há mais inicializadores
            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ',')) {
                this._avancaToken(); // Consome ','

                // Em C99+, permite vírgula no final
                if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '}')) {
                    break;
                }
            } else {
                break;
            }
        } while (true);

        this._consome(Token.TIPOS.PUNCTUATOR, '}');

        return noLista;
    }

    /**
     * Processa designadores em inicializadores C99+ ([0] = 5, .x = 10)
     * @return {NoAST[]} Array de nós AST de designadores
     * @private
     */
    _processaDesignadores() {
        const designadores = [];

        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '[') ||
        this._verificaTipo(Token.TIPOS.PUNCTUATOR, '.')) {

            // Designador de array [index]
            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '[')) {
                const token = this._avancaToken(); // Consome '['

                // Expressão constante como índice
                this.dentroDeExpressaoConstante = true;
                const indice = this._processaExpressaoConstante();
                this.dentroDeExpressaoConstante = false;

                this._consome(Token.TIPOS.PUNCTUATOR, ']');

                const noDesignador = new NoAST('ARRAY_DESIGNATOR', '', token.linha, token.coluna);
                noDesignador.adicionaFilho(indice);

                designadores.push(noDesignador);
            }
            // Designador de membro .membro
            else if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '.')) {
                const token = this._avancaToken(); // Consome '.'

                // Nome do membro
                const nomeMembro = this._consome(Token.TIPOS.IDENTIFIER).valor;
                const noDesignador = new NoAST('MEMBER_DESIGNATOR', nomeMembro, token.linha, token.coluna);

                designadores.push(noDesignador);
            }
        }

        // Deve haver um '=' após os designadores
        this._consome(Token.TIPOS.PUNCTUATOR, '=');

        return designadores;
    }

    /**
     * Processa um bloco composto (delimitado por chaves)
     * @return {NoAST} Nó AST do bloco composto
     * @private
     */
    _processaBlocoComposto() {
        const token = this._pegaTokenAtual();
        const noBloco = new NoAST('COMPOUND_STMT', '', token.linha, token.coluna);

        this._consome(Token.TIPOS.PUNCTUATOR, '{');

        // Cria um novo escopo para o bloco
        const escopoAnterior = this.escopoAtual;
        this.escopoAtual = this._criaEscopo('bloco', escopoAnterior);

        // Processa declarações e instruções dentro do bloco
        while (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, '}')) {
            // Declaração (começa com especificador de tipo ou typedef)
            if (this._ehInicioDeclaracaoLocal()) {
                const declaracao = this._processaDeclaracaoLocal();
                if (declaracao) {
                    noBloco.adicionaFilho(declaracao);
                }
            }
            // Instrução
            else {
                const instrucao = this._processaInstrucao();
                if (instrucao) {
                    noBloco.adicionaFilho(instrucao);
                }
            }
        }

        this._consome(Token.TIPOS.PUNCTUATOR, '}');

        // Restaura o escopo anterior
        this.escopoAtual = escopoAnterior;

        return noBloco;
    }

    /**
     * Verifica se o token atual é o início de uma declaração local
     * @return {boolean} True se é início de declaração local
     * @private
     */
    _ehInicioDeclaracaoLocal() {
        // Palavras-chave de tipos
        if (this._verificaTipo(Token.TIPOS.KEYWORD, [
            'void', 'char', 'short', 'int', 'long', 'float', 'double',
            'signed', 'unsigned', '_Bool', '_Complex', '_Imaginary',
            'struct', 'union', 'enum', 'typedef', 'const', 'volatile',
            'restrict', '_Atomic', '_Thread_local', 'thread_local',
            'static', 'extern', 'auto', 'register', '_Alignas', 'alignas',
            '_BitInt', 'bool', 'constexpr' // C23
        ])) {
            return true;
        }

        // Identificador que é um tipo definido pelo usuário
        if (this._verificaTipo(Token.TIPOS.IDENTIFIER) &&
            this.tiposDefinidos.has(this._pegaTokenAtual().valor)) {
            return true;
        }

        // Atributos C23 seguidos por declaração
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '[') &&
            this.opcoes.versaoC === 'C23') {

            // Salva posição atual
            const posicaoAtual = this.indiceTokenAtual;

            // Tenta analisar um atributo C23
            if (this._pegaProximoToken() &&
                this._pegaProximoToken().tipo === Token.TIPOS.PUNCTUATOR &&
                this._pegaProximoToken().valor === '[') {

                // Pula os atributos
                let contaBrackets = 0;
                let i = this.indiceTokenAtual;

                while (i < this.tokens.length) {
                    const token = this.tokens[i];

                    if (token.tipo === Token.TIPOS.PUNCTUATOR) {
                        if (token.valor === '[') {
                            contaBrackets++;
                        } else if (token.valor === ']') {
                            contaBrackets--;
                            if (contaBrackets === 0) {
                                i++;
                                break;
                            }
                        }
                    }

                    i++;
                }

                // Verifica se o próximo token após os atributos é início de declaração
                if (i < this.tokens.length) {
                    const tokenAposAtributo = this.tokens[i];

                    // Restaura posição
                    this.indiceTokenAtual = posicaoAtual;

                    // Verifica se é início de declaração
                    return (
                        (tokenAposAtributo.tipo === Token.TIPOS.KEYWORD && [
                            'void', 'char', 'short', 'int', 'long', 'float', 'double',
                            'signed', 'unsigned', '_Bool', '_Complex', '_Imaginary',
                            'struct', 'union', 'enum', 'typedef', 'const', 'volatile',
                            'restrict', '_Atomic', '_Thread_local', 'thread_local',
                            'static', 'extern', 'auto', 'register', '_Alignas', 'alignas',
                            '_BitInt', 'bool', 'constexpr' // C23
                        ].includes(tokenAposAtributo.valor)) ||
                        (tokenAposAtributo.tipo === Token.TIPOS.IDENTIFIER &&
                            this.tiposDefinidos.has(tokenAposAtributo.valor))
                    );
                }
            }

            // Restaura posição
            this.indiceTokenAtual = posicaoAtual;
        }

        return false;
    }

    /**
     * Processa uma declaração local (dentro de um bloco)
     * @return {NoAST} Nó AST da declaração local
     * @private
     */
    _processaDeclaracaoLocal() {
        // Processa atributos C23, se presentes
        const atributos = this._processaAtributos();

        // Processa especificadores de tipo
        const especificadoresTipo = this._processaEspecificadoresTipo();

        if (especificadoresTipo.length === 0) {
            throw this._criaErroSintatico(
                "Esperado especificador de tipo para declaração",
                this._pegaTokenAtual()
            );
        }

        // Ponto e vírgula sem declarador (apenas struct/union/enum)
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ';')) {
            this._avancaToken(); // Consome ';'
            return new NoAST('EMPTY_DECLARATION', '',
                especificadoresTipo[0].linha,
                especificadoresTipo[0].coluna,
                especificadoresTipo
            );
        }

        // Verifica se é typedef
        if (especificadoresTipo.some(spec =>
            spec.tipo === 'STORAGE_CLASS' && spec.valor === 'typedef')) {
            return this._processaTypedef(especificadoresTipo, atributos);
        }

        // Cria nó para a declaração local
        const noDeclaracao = new NoAST('DECLARATION', '', especificadoresTipo[0].linha, especificadoresTipo[0].coluna);

        // Adiciona especificadores de tipo como filhos
        especificadoresTipo.forEach(spec => noDeclaracao.adicionaFilho(spec));

        // Processa os declaradores (declarações de variáveis)
        let primeiro = true;

        do {
            if (!primeiro) {
                this._consome(Token.TIPOS.PUNCTUATOR, ',');
            }
            primeiro = false;

            // Processa o declarador
            const declaradorInfo = this._processaDeclarador();

            // Cria nó para a variável
            const noVariavel = new NoAST('VAR_DECL', declaradorInfo.nome, declaradorInfo.linha, declaradorInfo.coluna);

            // Adiciona informações do declarador
            noVariavel.adicionaPropriedade('tipo', this._combinaTipoDeclarador(especificadoresTipo, declaradorInfo));

            if (declaradorInfo.arrayDimensions && declaradorInfo.arrayDimensions.length > 0) {
                noVariavel.adicionaPropriedade('ehArray', true);
                noVariavel.adicionaPropriedade('dimensoes', declaradorInfo.arrayDimensions);

                // Adiciona expressões de tamanho de array como filhos
                declaradorInfo.arrayDimensions.forEach(dim => {
                    if (dim.expressao) {
                        noVariavel.adicionaFilho(dim.expressao);
                    }
                });
            }

            if (declaradorInfo.ponteiros > 0) {
                noVariavel.adicionaPropriedade('ponteiros', declaradorInfo.ponteiros);
            }

            // Adiciona a variável ao escopo atual
            if (this.escopoAtual && declaradorInfo.nome) {
                this.escopoAtual.variaveis.set(declaradorInfo.nome, {
                    tipo: noVariavel.pegaPropriedade('tipo') || 'int',
                    ehArray: noVariavel.pegaPropriedade('ehArray') || false,
                    ponteiros: noVariavel.pegaPropriedade('ponteiros') || 0
                });
            }

            // Verifica se há inicializador
            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '=')) {
                this._avancaToken(); // Consome '='

                // Processa o inicializador
                const inicializador = this._processaInicializador();
                noVariavel.adicionaFilho(inicializador);
            }

            noDeclaracao.adicionaFilho(noVariavel);
        } while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ','));

        this._consome(Token.TIPOS.PUNCTUATOR, ';');

        return noDeclaracao;
    }

    /**
     * Processa uma instrução (statement)
     * @return {NoAST} Nó AST da instrução
     * @private
     */
    _processaInstrucao() {
        // Processa atributos C23, se presentes
        const atributos = this._processaAtributos();

        // Instrução rotulada (labeled statement)
        if (this._verificaTipo(Token.TIPOS.IDENTIFIER) &&
            this._verificaProximoToken(Token.TIPOS.PUNCTUATOR, ':')) {
            return this._processaInstrucaoRotulada(atributos);
        }

        // Bloco composto ({ ... })
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '{')) {
            const bloco = this._processaBlocoComposto();

            // Adiciona atributos C23 se houver
            atributos.forEach(attr => bloco.adicionaFilho(attr));

            return bloco;
        }

        // Instrução de expressão (a = 5;)
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ';')) {
            const token = this._avancaToken(); // Consome ';'
            const noVazio = new NoAST('EMPTY_STMT', '', token.linha, token.coluna);

            // Adiciona atributos C23 se houver
            atributos.forEach(attr => noVazio.adicionaFilho(attr));

            return noVazio;
        }

        // Instruções de controle de fluxo
        if (this._verificaTipo(Token.TIPOS.KEYWORD)) {
            const token = this._pegaTokenAtual();
            const palavraChave = token.valor;

            switch (palavraChave) {
                case 'if':
                    const noIf = this._processaInstrucaoIf();
                    atributos.forEach(attr => noIf.adicionaFilho(attr));
                    return noIf;

                case 'switch':
                    const noSwitch = this._processaInstrucaoSwitch();
                    atributos.forEach(attr => noSwitch.adicionaFilho(attr));
                    return noSwitch;

                case 'while':
                    const noWhile = this._processaInstrucaoWhile();
                    atributos.forEach(attr => noWhile.adicionaFilho(attr));
                    return noWhile;

                case 'do':
                    const noDoWhile = this._processaInstrucaoDoWhile();
                    atributos.forEach(attr => noDoWhile.adicionaFilho(attr));
                    return noDoWhile;

                case 'for':
                    const noFor = this._processaInstrucaoFor();
                    atributos.forEach(attr => noFor.adicionaFilho(attr));
                    return noFor;

                case 'goto':
                    const noGoto = this._processaInstrucaoGoto();
                    atributos.forEach(attr => noGoto.adicionaFilho(attr));
                    return noGoto;

                case 'continue':
                    this._avancaToken(); // Consome 'continue'
                    this._consome(Token.TIPOS.PUNCTUATOR, ';');
                    const noContinue = new NoAST('CONTINUE_STMT', '', token.linha, token.coluna);
                    atributos.forEach(attr => noContinue.adicionaFilho(attr));
                    return noContinue;

                case 'break':
                    this._avancaToken(); // Consome 'break'
                    this._consome(Token.TIPOS.PUNCTUATOR, ';');
                    const noBreak = new NoAST('BREAK_STMT', '', token.linha, token.coluna);
                    atributos.forEach(attr => noBreak.adicionaFilho(attr));
                    return noBreak;

                case 'return':
                    const noReturn = this._processaInstrucaoReturn();
                    atributos.forEach(attr => noReturn.adicionaFilho(attr));
                    return noReturn;

                case 'case':
                case 'default':
                    return this._processaInstrucaoCaseDefault();
            }
        }

        // Instrução de expressão (a = 5;)
        const expressao = this._processaExpressao();
        this._consome(Token.TIPOS.PUNCTUATOR, ';');

        const noExpr = new NoAST('EXPR_STMT', '', expressao.linha, expressao.coluna);
        noExpr.adicionaFilho(expressao);

        // Adiciona atributos C23 se houver
        atributos.forEach(attr => noExpr.adicionaFilho(attr));

        return noExpr;
    }

    /**
     * Processa uma instrução rotulada (label: stmt)
     * @param {NoAST[]} atributos - Atributos C23
     * @return {NoAST} Nó AST da instrução rotulada
     * @private
     */
    _processaInstrucaoRotulada(atributos) {
        const token = this._pegaTokenAtual();
        const rotulo = this._avancaToken().valor; // Consome o identificador (rótulo)
        this._consome(Token.TIPOS.PUNCTUATOR, ':'); // Consome ':'

        // Processa a instrução após o rótulo
        const instrucao = this._processaInstrucao();

        const noRotulo = new NoAST('LABELED_STMT', rotulo, token.linha, token.coluna);
        noRotulo.adicionaFilho(instrucao);

        // Adiciona atributos C23 se houver
        atributos.forEach(attr => noRotulo.adicionaFilho(attr));

        return noRotulo;
    }

    /**
     * Processa uma instrução if
     * @return {NoAST} Nó AST da instrução if
     * @private
     */
    _processaInstrucaoIf() {
        const token = this._avancaToken(); // Consome 'if'
        const noIf = new NoAST('IF_STMT', '', token.linha, token.coluna);

        this._consome(Token.TIPOS.PUNCTUATOR, '(');

        // Expressão de condição
        const condicao = this._processaExpressao();
        noIf.adicionaFilho(condicao);

        this._consome(Token.TIPOS.PUNCTUATOR, ')');

        // Bloco then
        const blocoThen = this._processaInstrucao();
        noIf.adicionaFilho(blocoThen);

        // Bloco else (opcional)
        if (this._verificaTipo(Token.TIPOS.KEYWORD, 'else')) {
            this._avancaToken(); // Consome 'else'
            const blocoElse = this._processaInstrucao();
            noIf.adicionaFilho(blocoElse);
        }

        return noIf;
    }

    /**
     * Processa uma instrução switch
     * @return {NoAST} Nó AST da instrução switch
     * @private
     */
    _processaInstrucaoSwitch() {
        const token = this._avancaToken(); // Consome 'switch'
        const noSwitch = new NoAST('SWITCH_STMT', '', token.linha, token.coluna);

        this._consome(Token.TIPOS.PUNCTUATOR, '(');

        // Expressão de controle
        const controle = this._processaExpressao();
        noSwitch.adicionaFilho(controle);

        this._consome(Token.TIPOS.PUNCTUATOR, ')');

        // Bloco de instruções
        const bloco = this._processaInstrucao();
        noSwitch.adicionaFilho(bloco);

        return noSwitch;
    }

    /**
     * Processa as instruções case e default dentro de um switch
     * @return {NoAST} Nó AST da instrução case ou default
     * @private
     */
    _processaInstrucaoCaseDefault() {
        const token = this._pegaTokenAtual();
        const ehCase = token.valor === 'case';

        this._avancaToken(); // Consome 'case' ou 'default'

        const noCase = new NoAST(ehCase ? 'CASE_STMT' : 'DEFAULT_STMT', '', token.linha, token.coluna);

        // Para case, processa a expressão constante
        if (ehCase) {
            this.dentroDeExpressaoConstante = true;
            const valorCase = this._processaExpressaoConstante();
            this.dentroDeExpressaoConstante = false;

            noCase.adicionaFilho(valorCase);
        }

        this._consome(Token.TIPOS.PUNCTUATOR, ':');

        // Processa a instrução após o case/default (opcional)
        if (!this._verificaTipo(Token.TIPOS.KEYWORD, 'case') &&
            !this._verificaTipo(Token.TIPOS.KEYWORD, 'default') &&
            !this._verificaTipo(Token.TIPOS.PUNCTUATOR, '}')) {

            const instrucao = this._processaInstrucao();
            noCase.adicionaFilho(instrucao);
        }

        return noCase;
    }

    /**
     * Processa uma instrução while
     * @return {NoAST} Nó AST da instrução while
     * @private
     */
    _processaInstrucaoWhile() {
        const token = this._avancaToken(); // Consome 'while'
        const noWhile = new NoAST('WHILE_STMT', '', token.linha, token.coluna);

        this._consome(Token.TIPOS.PUNCTUATOR, '(');

        // Expressão de condição
        const condicao = this._processaExpressao();
        noWhile.adicionaFilho(condicao);

        this._consome(Token.TIPOS.PUNCTUATOR, ')');

        // Corpo do loop
        const corpo = this._processaInstrucao();
        noWhile.adicionaFilho(corpo);

        return noWhile;
    }

    /**
     * Processa uma instrução do-while
     * @return {NoAST} Nó AST da instrução do-while
     * @private
     */
    _processaInstrucaoDoWhile() {
        const token = this._avancaToken(); // Consome 'do'
        const noDoWhile = new NoAST('DO_WHILE_STMT', '', token.linha, token.coluna);

        // Corpo do loop
        const corpo = this._processaInstrucao();
        noDoWhile.adicionaFilho(corpo);

        this._consome(Token.TIPOS.KEYWORD, 'while');
        this._consome(Token.TIPOS.PUNCTUATOR, '(');

        // Expressão de condição
        const condicao = this._processaExpressao();
        noDoWhile.adicionaFilho(condicao);

        this._consome(Token.TIPOS.PUNCTUATOR, ')');
        this._consome(Token.TIPOS.PUNCTUATOR, ';');

        return noDoWhile;
    }

    /**
     * Processa uma instrução for
     * @return {NoAST} Nó AST da instrução for
     * @private
     */
    _processaInstrucaoFor() {
        const token = this._avancaToken(); // Consome 'for'
        const noFor = new NoAST('FOR_STMT', '', token.linha, token.coluna);

        this._consome(Token.TIPOS.PUNCTUATOR, '(');

        // Cria um novo escopo para o for (necessário para C99+)
        const escopoAnterior = this.escopoAtual;
        const escopoFor = this._criaEscopo('for', escopoAnterior);
        this.escopoAtual = escopoFor;

        // Inicialização
        if (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ';')) {
            // Em C99+, permite declaração no for
            if (this._ehInicioDeclaracaoLocal() && this.opcoes.versaoC !== 'C90') {
                const declaracao = this._processaDeclaracaoLocal();
                noFor.adicionaPropriedade('temDeclaracao', true);
                noFor.adicionaFilho(declaracao);
            } else {
                // Expressão de inicialização
                const inicializacao = this._processaExpressao();
                this._consome(Token.TIPOS.PUNCTUATOR, ';');
                noFor.adicionaFilho(inicializacao);
            }
        } else {
            // Sem inicialização
            this._avancaToken(); // Consome ';'
            const noVazio = new NoAST('EMPTY_EXPR', '', token.linha, token.coluna);
            noFor.adicionaFilho(noVazio);
        }

        // Condição
        if (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ';')) {
            const condicao = this._processaExpressao();
            noFor.adicionaFilho(condicao);
        } else {
            // Sem condição (sempre verdadeiro)
            const noVazio = new NoAST('EMPTY_EXPR', '', token.linha, token.coluna);
            noFor.adicionaFilho(noVazio);
        }

        this._consome(Token.TIPOS.PUNCTUATOR, ';');

        // Incremento
        if (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ')')) {
            const incremento = this._processaExpressao();
            noFor.adicionaFilho(incremento);
        } else {
            // Sem incremento
            const noVazio = new NoAST('EMPTY_EXPR', '', token.linha, token.coluna);
            noFor.adicionaFilho(noVazio);
        }

        this._consome(Token.TIPOS.PUNCTUATOR, ')');

        // Corpo do loop
        const corpo = this._processaInstrucao();
        noFor.adicionaFilho(corpo);

        // Restaura o escopo anterior
        this.escopoAtual = escopoAnterior;

        return noFor;
    }

    /**
     * Processa uma instrução goto
     * @return {NoAST} Nó AST da instrução goto
     * @private
     */
    _processaInstrucaoGoto() {
        const token = this._avancaToken(); // Consome 'goto'

        // Rótulo de destino
        const rotulo = this._consome(Token.TIPOS.IDENTIFIER).valor;
        this._consome(Token.TIPOS.PUNCTUATOR, ';');

        return new NoAST('GOTO_STMT', rotulo, token.linha, token.coluna);
    }

    /**
     * Processa uma instrução return
     * @return {NoAST} Nó AST da instrução return
     * @private
     */
    _processaInstrucaoReturn() {
        const token = this._avancaToken(); // Consome 'return'
        const noReturn = new NoAST('RETURN_STMT', '', token.linha, token.coluna);

        // Valor de retorno (opcional)
        if (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ';')) {
            const valorRetorno = this._processaExpressao();
            noReturn.adicionaFilho(valorRetorno);
        }

        this._consome(Token.TIPOS.PUNCTUATOR, ';');

        return noReturn;
    }

    /**
     * Processa uma expressão
     * @return {NoAST} Nó AST da expressão
     * @private
     */
    _processaExpressao() {
        let expressao = this._processaExpressaoAtribuicao();

        // Expressões separadas por vírgula
        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ',')) {
            const token = this._avancaToken(); // Consome ','
            const direita = this._processaExpressaoAtribuicao();

            // Cria um nó para a expressão com vírgula
            const noVirgula = new NoAST('COMMA_EXPR', ',', token.linha, token.coluna);
            noVirgula.adicionaFilho(expressao);
            noVirgula.adicionaFilho(direita);

            expressao = noVirgula;
        }

        return expressao;
    }

    /**
     * Processa uma expressão de atribuição
     * @return {NoAST} Nó AST da expressão de atribuição
     * @private
     */
    _processaExpressaoAtribuicao() {
        // Salva posição atual para backtracking
        const posicaoInicial = this.indiceTokenAtual;

        try {
            // Tenta processar como expressão unária (lvalue)
            const esquerda = this._processaExpressaoUnaria();

            // Verifica se há um operador de atribuição
            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, [
                '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|='
            ])) {
                const token = this._avancaToken(); // Consome o operador
                const operador = token.valor;

                // Processa o lado direito da atribuição
                const direita = this._processaExpressaoAtribuicao();

                // Cria um nó para a atribuição
                const noAtribuicao = new NoAST('ASSIGN_EXPR', operador, token.linha, token.coluna);
                noAtribuicao.adicionaFilho(esquerda);
                noAtribuicao.adicionaFilho(direita);

                return noAtribuicao;
            }

            // Não é uma atribuição, volta à posição inicial
            this.indiceTokenAtual = posicaoInicial;
        } catch (erro) {
            // Erro ao processar como lvalue, volta à posição inicial
            this.indiceTokenAtual = posicaoInicial;
        }

        // Processa como expressão condicional
        return this._processaExpressaoCondicional();
    }

    /**
     * Processa uma expressão condicional (operador ternário)
     * @return {NoAST} Nó AST da expressão condicional
     * @private
     */
    _processaExpressaoCondicional() {
        let expressao = this._processaExpressaoLogicaOu();

        // Operador ternário (? :)
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '?')) {
            const token = this._avancaToken(); // Consome '?'

            const expressaoEntao = this._processaExpressao();
            this._consome(Token.TIPOS.PUNCTUATOR, ':');
            const expressaoSenao = this._processaExpressaoCondicional();

            // Cria um nó para a expressão condicional
            const noCondicional = new NoAST('CONDITIONAL_EXPR', '?:', token.linha, token.coluna);
            noCondicional.adicionaFilho(expressao);
            noCondicional.adicionaFilho(expressaoEntao);
            noCondicional.adicionaFilho(expressaoSenao);

            expressao = noCondicional;
        }

        return expressao;
    }

    /**
     * Processa uma expressão lógica OR (||)
     * @return {NoAST} Nó AST da expressão lógica OR
     * @private
     */
    _processaExpressaoLogicaOu() {
        let expressao = this._processaExpressaoLogicaE();

        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '||')) {
            const token = this._avancaToken(); // Consome '||'
            const direita = this._processaExpressaoLogicaE();

            // Cria um nó para a expressão lógica OR
            const noLogicaOu = new NoAST('LOGICAL_OR_EXPR', '||', token.linha, token.coluna);
            noLogicaOu.adicionaFilho(expressao);
            noLogicaOu.adicionaFilho(direita);

            expressao = noLogicaOu;
        }

        return expressao;
    }

    /**
     * Processa uma expressão lógica AND (&&)
     * @return {NoAST} Nó AST da expressão lógica AND
     * @private
     */
    _processaExpressaoLogicaE() {
        let expressao = this._processaExpressaoBitwiseOu();

        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '&&')) {
            const token = this._avancaToken(); // Consome '&&'
            const direita = this._processaExpressaoBitwiseOu();

            // Cria um nó para a expressão lógica AND
            const noLogicaE = new NoAST('LOGICAL_AND_EXPR', '&&', token.linha, token.coluna);
            noLogicaE.adicionaFilho(expressao);
            noLogicaE.adicionaFilho(direita);

            expressao = noLogicaE;
        }

        return expressao;
    }

    /**
     * Processa uma expressão bitwise OR (|)
     * @return {NoAST} Nó AST da expressão bitwise OR
     * @private
     */
    _processaExpressaoBitwiseOu() {
        let expressao = this._processaExpressaoBitwiseXor();

        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '|')) {
            const token = this._avancaToken(); // Consome '|'
            const direita = this._processaExpressaoBitwiseXor();

            // Cria um nó para a expressão bitwise OR
            const noBitwiseOu = new NoAST('BITWISE_OR_EXPR', '|', token.linha, token.coluna);
            noBitwiseOu.adicionaFilho(expressao);
            noBitwiseOu.adicionaFilho(direita);

            expressao = noBitwiseOu;
        }

        return expressao;
    }

    /**
     * Processa uma expressão bitwise XOR (^)
     * @return {NoAST} Nó AST da expressão bitwise XOR
     * @private
     */
    _processaExpressaoBitwiseXor() {
        let expressao = this._processaExpressaoBitwiseE();

        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '^')) {
            const token = this._avancaToken(); // Consome '^'
            const direita = this._processaExpressaoBitwiseE();

            // Cria um nó para a expressão bitwise XOR
            const noBitwiseXor = new NoAST('BITWISE_XOR_EXPR', '^', token.linha, token.coluna);
            noBitwiseXor.adicionaFilho(expressao);
            noBitwiseXor.adicionaFilho(direita);

            expressao = noBitwiseXor;
        }

        return expressao;
    }

    /**
     * Processa uma expressão bitwise AND (&)
     * @return {NoAST} Nó AST da expressão bitwise AND
     * @private
     */
    _processaExpressaoBitwiseE() {
        let expressao = this._processaExpressaoIgualdade();

        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '&')) {
            const token = this._avancaToken(); // Consome '&'
            const direita = this._processaExpressaoIgualdade();

            // Cria um nó para a expressão bitwise AND
            const noBitwiseE = new NoAST('BITWISE_AND_EXPR', '&', token.linha, token.coluna);
            noBitwiseE.adicionaFilho(expressao);
            noBitwiseE.adicionaFilho(direita);

            expressao = noBitwiseE;
        }

        return expressao;
    }

    /**
     * Processa uma expressão de igualdade (==, !=)
     * @return {NoAST} Nó AST da expressão de igualdade
     * @private
     */
    _processaExpressaoIgualdade() {
        let expressao = this._processaExpressaoRelacional();

        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ['==', '!='])) {
            const token = this._avancaToken(); // Consome '==' ou '!='
            const direita = this._processaExpressaoRelacional();

            // Cria um nó para a expressão de igualdade
            const noIgualdade = new NoAST('EQUALITY_EXPR', token.valor, token.linha, token.coluna);
            noIgualdade.adicionaFilho(expressao);
            noIgualdade.adicionaFilho(direita);

            expressao = noIgualdade;
        }

        // Operador de três vias <=> do C23
        if (this.opcoes.versaoC === 'C23' && this._verificaTipo(Token.TIPOS.PUNCTUATOR, ['<=>', '<==>', '===>'])) {
            const token = this._avancaToken(); // Consome o operador
            const direita = this._processaExpressaoRelacional();

            // Cria um nó para a expressão de comparação de três vias
            const noCompare = new NoAST('THREEWAY_COMPARE_EXPR', token.valor, token.linha, token.coluna);
            noCompare.adicionaFilho(expressao);
            noCompare.adicionaFilho(direita);

            expressao = noCompare;
        }

        return expressao;
    }

    /**
     *
     * Processa uma expressão relacional (<, >, <=, >=)
     * @return {NoAST} Nó AST da expressão relacional
     * @private
     */
    _processaExpressaoRelacional() {
        let expressao = this._processaExpressaoShift();

        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ['<', '>', '<=', '>='])) {
            const token = this._avancaToken(); // Consome '<', '>', '<=' ou '>='
            const direita = this._processaExpressaoShift();

            // Cria um nó para a expressão relacional
            const noRelacional = new NoAST('RELATIONAL_EXPR', token.valor, token.linha, token.coluna);
            noRelacional.adicionaFilho(expressao);
            noRelacional.adicionaFilho(direita);

            expressao = noRelacional;
        }

        return expressao;
    }

    /**
     * Processa uma expressão de deslocamento (<<, >>)
     * @return {NoAST} Nó AST da expressão de deslocamento
     * @private
     */
    _processaExpressaoShift() {
        let expressao = this._processaExpressaoAditiva();

        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ['<<', '>>'])) {
            const token = this._avancaToken(); // Consome '<<' ou '>>'
            const direita = this._processaExpressaoAditiva();

            // Cria um nó para a expressão de deslocamento
            const noShift = new NoAST('SHIFT_EXPR', token.valor, token.linha, token.coluna);
            noShift.adicionaFilho(expressao);
            noShift.adicionaFilho(direita);

            expressao = noShift;
        }

        return expressao;
    }

    /**
     * Processa uma expressão aditiva (+, -)
     * @return {NoAST} Nó AST da expressão aditiva
     * @private
     */
    _processaExpressaoAditiva() {
        let expressao = this._processaExpressaoMultiplicativa();

        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ['+', '-'])) {
            const token = this._avancaToken(); // Consome '+' ou '-'
            const direita = this._processaExpressaoMultiplicativa();

            // Cria um nó para a expressão aditiva
            const noAditiva = new NoAST('ADDITIVE_EXPR', token.valor, token.linha, token.coluna);
            noAditiva.adicionaFilho(expressao);
            noAditiva.adicionaFilho(direita);

            expressao = noAditiva;
        }

        return expressao;
    }

    /**
     * Processa uma expressão multiplicativa (*, /, %)
     * @return {NoAST} Nó AST da expressão multiplicativa
     * @private
     */
    _processaExpressaoMultiplicativa() {
        let expressao = this._processaExpressaoCast();

        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ['*', '/', '%'])) {
            const token = this._avancaToken(); // Consome '*', '/' ou '%'
            const direita = this._processaExpressaoCast();

            // Cria um nó para a expressão multiplicativa
            const noMultiplicativa = new NoAST('MULTIPLICATIVE_EXPR', token.valor, token.linha, token.coluna);
            noMultiplicativa.adicionaFilho(expressao);
            noMultiplicativa.adicionaFilho(direita);

            expressao = noMultiplicativa;
        }

        return expressao;
    }

    /**
     * Processa uma expressão de cast
     * @return {NoAST} Nó AST da expressão de cast
     * @private
     */
    _processaExpressaoCast() {
        // Verifica se é um cast (tipo) expressão
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '(')) {
            // Salva a posição atual para backtracking
            const posicaoInicial = this.indiceTokenAtual;

            try {
                this._avancaToken(); // Consome '('

                // Tenta processar como nome de tipo
                const especificadoresTipo = this._processaEspecificadoresTipo();

                if (especificadoresTipo.length > 0) {
                    // Processa declarador abstrato (para ponteiros e arrays)
                    const declaradorInfo = this._processaDeclaradorAbstrato();

                    if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ')')) {
                        this._avancaToken(); // Consome ')'

                        // É um cast, processa a expressão alvo
                        const expressao = this._processaExpressaoCast();

                        // Cria um nó para a expressão de cast
                        const noCast = new NoAST('CAST_EXPR', '',
                            especificadoresTipo[0].linha,
                            especificadoresTipo[0].coluna
                        );

                        // Adiciona especificadores de tipo como filhos
                        especificadoresTipo.forEach(spec => noCast.adicionaFilho(spec));

                        // Adiciona informações de ponteiros do declarador
                        if (declaradorInfo.ponteiros > 0) {
                            noCast.adicionaPropriedade('ponteiros', declaradorInfo.ponteiros);
                        }

                        // Adiciona a expressão alvo
                        noCast.adicionaFilho(expressao);

                        return noCast;
                    }
                }

                // Não é um cast, volta para a posição inicial
                this.indiceTokenAtual = posicaoInicial;
            } catch (erro) {
                // Erro ao processar como cast, volta para a posição inicial
                this.indiceTokenAtual = posicaoInicial;
            }
        }

        // Não é um cast, processa como expressão unária
        return this._processaExpressaoUnaria();
    }

    /**
     * Processa um declarador abstrato (usado em cast)
     * @return {Object} Informações do declarador abstrato
     * @private
     */
    _processaDeclaradorAbstrato() {
        let ponteiros = 0;

        // Processa ponteiros (* e qualificadores)
        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '*')) {
            ponteiros++;
            this._avancaToken(); // Consome '*'

            // Qualificadores após ponteiro (const, volatile, etc.)
            while (this._verificaTipo(Token.TIPOS.KEYWORD, ['const', 'volatile', 'restrict', '_Atomic'])) {
                this._avancaToken(); // Consome o qualificador (ignoramos na AST simplificada)
            }
        }

        // Declarador direto abstrato (parênteses ou colchetes)
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '(')) {
            // Declarador entre parênteses
            this._avancaToken(); // Consome '('
            const declInfo = this._processaDeclaradorAbstrato();
            this._consome(Token.TIPOS.PUNCTUATOR, ')');

            // Combina ponteiros
            ponteiros += declInfo.ponteiros;
        }

        // Sufixos do declarador abstrato ([], ())
        while (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ['[', '('])) {
            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '[')) {
                // Array abstrato
                this._avancaToken(); // Consome '['

                // Expressão de tamanho (se presente)
                if (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ']')) {
                    this._processaExpressaoConstante();
                }

                this._consome(Token.TIPOS.PUNCTUATOR, ']');
            } else if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '(')) {
                // Função abstrata
                this._avancaToken(); // Consome '('

                // Lista de parâmetros (se presente)
                if (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ')')) {
                    this._processaListaParametros();
                }

                this._consome(Token.TIPOS.PUNCTUATOR, ')');
            }
        }

        return {
            ponteiros
        };
    }

    /**
     * Processa uma expressão unária
     * @return {NoAST} Nó AST da expressão unária
     * @private
     */
    _processaExpressaoUnaria() {
        // Operadores unários de prefixo
        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ['++', '--'])) {
            // Incremento/decremento prefixo
            const token = this._avancaToken(); // Consome '++' ou '--'
            const operando = this._processaExpressaoUnaria();

            // Cria um nó para a expressão unária de incremento/decremento
            const noUnaria = new NoAST('PREFIX_EXPR', token.valor, token.linha, token.coluna);
            noUnaria.adicionaFilho(operando);

            return noUnaria;
        } else if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ['+', '-', '!', '~', '*', '&'])) {
            // Operadores unários simples
            const token = this._avancaToken(); // Consome o operador
            const operando = this._processaExpressaoCast();

            // Cria um nó para a expressão unária
            const noUnaria = new NoAST('UNARY_EXPR', token.valor, token.linha, token.coluna);
            noUnaria.adicionaFilho(operando);

            return noUnaria;
        } else if (this._verificaTipo(Token.TIPOS.KEYWORD, 'sizeof')) {
            // Operador sizeof
            const token = this._avancaToken(); // Consome 'sizeof'

            // Verifica se há parênteses para tipo
            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '(')) {
                // Salva a posição atual para backtracking
                const posicaoInicial = this.indiceTokenAtual;

                try {
                    this._avancaToken(); // Consome '('

                    // Tenta processar como nome de tipo
                    const especificadoresTipo = this._processaEspecificadoresTipo();

                    if (especificadoresTipo.length > 0) {
                        // Processa declarador abstrato (para ponteiros e arrays)
                        const declaradorInfo = this._processaDeclaradorAbstrato();

                        if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ')')) {
                            this._avancaToken(); // Consome ')'

                            // É um sizeof(tipo)
                            const noSizeof = new NoAST('SIZEOF_TYPE', '', token.linha, token.coluna);

                            // Adiciona especificadores de tipo como filhos
                            especificadoresTipo.forEach(spec => noSizeof.adicionaFilho(spec));

                            // Adiciona informações de ponteiros do declarador
                            if (declaradorInfo.ponteiros > 0) {
                                noSizeof.adicionaPropriedade('ponteiros', declaradorInfo.ponteiros);
                            }

                            return noSizeof;
                        }
                    }

                    // Não é um sizeof(tipo), volta para a posição inicial
                    this.indiceTokenAtual = posicaoInicial;
                } catch (erro) {
                    // Erro ao processar como sizeof(tipo), volta para a posição inicial
                    this.indiceTokenAtual = posicaoInicial;
                }
            }

            // É um sizeof expressão
            const operando = this._processaExpressaoUnaria();

            // Cria um nó para a expressão sizeof
            const noSizeof = new NoAST('SIZEOF_EXPR', '', token.linha, token.coluna);
            noSizeof.adicionaFilho(operando);

            return noSizeof;
        } else if (this.opcoes.versaoC !== 'C90' && this._verificaTipo(Token.TIPOS.KEYWORD, '_Alignof')) {
            // Operador _Alignof (C11+)
            const token = this._avancaToken(); // Consome '_Alignof'

            this._consome(Token.TIPOS.PUNCTUATOR, '(');

            // Processa o tipo
            const especificadoresTipo = this._processaEspecificadoresTipo();

            if (especificadoresTipo.length === 0) {
                throw this._criaErroSintatico(
                    "Esperado tipo para operador _Alignof",
                    this._pegaTokenAtual()
                );
            }

            // Processa declarador abstrato (para ponteiros e arrays)
            const declaradorInfo = this._processaDeclaradorAbstrato();

            this._consome(Token.TIPOS.PUNCTUATOR, ')');

            // Cria um nó para a expressão _Alignof
            const noAlignof = new NoAST('ALIGNOF_EXPR', '', token.linha, token.coluna);

            // Adiciona especificadores de tipo como filhos
            especificadoresTipo.forEach(spec => noAlignof.adicionaFilho(spec));

            // Adiciona informações de ponteiros do declarador
            if (declaradorInfo.ponteiros > 0) {
                noAlignof.adicionaPropriedade('ponteiros', declaradorInfo.ponteiros);
            }

            return noAlignof;
        }

        // Expressão de sufixo (sem operador unário)
        return this._processaExpressaoSufixo();
    }

    /**
     * Processa uma expressão de sufixo
     * @return {NoAST} Nó AST da expressão de sufixo
     * @private
     */
    _processaExpressaoSufixo() {
        let expressao = this._processaExpressaoPrimaria();

        let continuaProcessando = true;
        while (continuaProcessando) {
            // Acesso a array [indice]
            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '[')) {
                const token = this._avancaToken(); // Consome '['
                const indice = this._processaExpressao();
                this._consome(Token.TIPOS.PUNCTUATOR, ']');

                // Cria um nó para o acesso a array
                const noArray = new NoAST('ARRAY_SUBSCRIPT_EXPR', '', token.linha, token.coluna);
                noArray.adicionaFilho(expressao);
                noArray.adicionaFilho(indice);

                expressao = noArray;
            }
            // Chamada de função (args)
            else if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '(')) {
                const token = this._avancaToken(); // Consome '('

                // Cria um nó para a chamada de função
                const noChamada = new NoAST('CALL_EXPR', '', token.linha, token.coluna);
                noChamada.adicionaFilho(expressao);

                // Processa os argumentos
                if (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ')')) {
                    let primeiro = true;

                    while (true) {
                        if (!primeiro) {
                            this._consome(Token.TIPOS.PUNCTUATOR, ',');
                        }
                        primeiro = false;

                        // Processa o argumento
                        const argumento = this._processaExpressaoAtribuicao();
                        noChamada.adicionaFilho(argumento);

                        if (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ',')) {
                            break;
                        }
                    }
                }

                this._consome(Token.TIPOS.PUNCTUATOR, ')');
                expressao = noChamada;
            }
            // Acesso a membro .membro ou ->membro
            else if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ['.', '->'])) {
                const token = this._avancaToken(); // Consome '.' ou '->'
                const operador = token.valor;

                // Nome do membro
                const nomeMembro = this._consome(Token.TIPOS.IDENTIFIER).valor;

                // Cria um nó para o acesso a membro
                const tipo = operador === '.' ? 'MEMBER_EXPR' : 'ARROW_EXPR';
                const noMembro = new NoAST(tipo, nomeMembro, token.linha, token.coluna);
                noMembro.adicionaFilho(expressao);

                expressao = noMembro;
            }
            // Incremento/decremento pós-fixo
            else if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, ['++', '--'])) {
                const token = this._avancaToken(); // Consome '++' ou '--'

                // Cria um nó para o incremento/decremento pós-fixo
                const noIncDec = new NoAST('POSTFIX_EXPR', token.valor, token.linha, token.coluna);
                noIncDec.adicionaFilho(expressao);

                expressao = noIncDec;
            }
            else {
                continuaProcessando = false;
            }
        }

        return expressao;
    }

    /**
     * Processa uma expressão primária
     * @return {NoAST} Nó AST da expressão primária
     * @private
     */
    _processaExpressaoPrimaria() {
        const token = this._pegaTokenAtual();

        // Identificador
        if (this._verificaTipo(Token.TIPOS.IDENTIFIER)) {
            this._avancaToken(); // Consome o identificador
            return new NoAST('IDENTIFIER_EXPR', token.valor, token.linha, token.coluna);
        }
        // Literal de inteiro
        else if (this._verificaTipo(Token.TIPOS.INT_LITERAL)) {
            this._avancaToken(); // Consome o literal
            return new NoAST('INT_LITERAL', token.valor, token.linha, token.coluna);
        }
        // Literal de ponto flutuante
        else if (this._verificaTipo(Token.TIPOS.FLOAT_LITERAL)) {
            this._avancaToken(); // Consome o literal
            return new NoAST('FLOAT_LITERAL', token.valor, token.linha, token.coluna);
        }
        // Literal de caractere
        else if (this._verificaTipo(Token.TIPOS.CHAR_LITERAL)) {
            this._avancaToken(); // Consome o literal
            return new NoAST('CHAR_LITERAL', token.valor, token.linha, token.coluna);
        }
        // Literal de string
        else if (this._verificaTipo(Token.TIPOS.STRING_LITERAL)) {
            this._avancaToken(); // Consome o literal
            return new NoAST('STRING_LITERAL', token.valor, token.linha, token.coluna);
        }
        // Literais UTF-8 (C11+)
        else if (this._verificaTipo(Token.TIPOS.UTF8_CHAR_LITERAL) ||
            this._verificaTipo(Token.TIPOS.UTF8_STRING_LITERAL)) {
            this._avancaToken(); // Consome o literal
            return new NoAST(
                this._verificaTipo(Token.TIPOS.UTF8_CHAR_LITERAL) ? 'UTF8_CHAR_LITERAL' : 'UTF8_STRING_LITERAL',
                token.valor,
                token.linha,
                token.coluna
            );
        }
        // Literal de booleano (C23)
        else if (this.opcoes.versaoC === 'C23' && this._verificaTipo(Token.TIPOS.KEYWORD, ['true', 'false'])) {
            this._avancaToken(); // Consome 'true' ou 'false'
            return new NoAST('BOOL_LITERAL', token.valor, token.linha, token.coluna);
        }
        // Literal null (C23)
        else if (this.opcoes.versaoC === 'C23' && this._verificaTipo(Token.TIPOS.KEYWORD, 'nullptr')) {
            this._avancaToken(); // Consome 'nullptr'
            return new NoAST('NULLPTR_LITERAL', '', token.linha, token.coluna);
        }
        // Expressão entre parênteses
        else if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, '(')) {
            this._avancaToken(); // Consome '('
            const expressao = this._processaExpressao();
            this._consome(Token.TIPOS.PUNCTUATOR, ')');
            return expressao;
        }
        // Expressão genérica (_Generic) C11+
        else if (this.opcoes.versaoC !== 'C90' && this._verificaTipo(Token.TIPOS.KEYWORD, '_Generic')) {
            return this._processaExpressaoGenerica();
        }

        throw this._criaErroSintatico(
            "Esperada expressão primária",
            token
        );
    }

    /**
     * Processa uma expressão _Generic (C11+)
     * @return {NoAST} Nó AST da expressão _Generic
     * @private
     */
    _processaExpressaoGenerica() {
        const token = this._avancaToken(); // Consome '_Generic'
        const noGeneric = new NoAST('GENERIC_SELECTION', '', token.linha, token.coluna);

        this._consome(Token.TIPOS.PUNCTUATOR, '(');

        // Expressão de controle
        const controle = this._processaExpressaoAtribuicao();
        noGeneric.adicionaFilho(controle);

        this._consome(Token.TIPOS.PUNCTUATOR, ',');

        // Associações de tipo-expressão
        let primeiro = true;

        while (true) {
            if (!primeiro) {
                this._consome(Token.TIPOS.PUNCTUATOR, ',');
            }
            primeiro = false;

            // Caso default
            if (this._verificaTipo(Token.TIPOS.KEYWORD, 'default')) {
                const tokenDefault = this._avancaToken(); // Consome 'default'
                this._consome(Token.TIPOS.PUNCTUATOR, ':');

                const expressao = this._processaExpressaoAtribuicao();

                // Cria um nó para o caso default
                const noDefault = new NoAST('GENERIC_DEFAULT', '', tokenDefault.linha, tokenDefault.coluna);
                noDefault.adicionaFilho(expressao);

                noGeneric.adicionaFilho(noDefault);
            }
            // Caso de tipo
            else {
                // Tipo
                const especificadoresTipo = this._processaEspecificadoresTipo();

                if (especificadoresTipo.length === 0) {
                    throw this._criaErroSintatico(
                        "Esperado tipo para associação em _Generic",
                        this._pegaTokenAtual()
                    );
                }

                // Declarador abstrato (para ponteiros e arrays)
                const declaradorInfo = this._processaDeclaradorAbstrato();

                this._consome(Token.TIPOS.PUNCTUATOR, ':');

                // Expressão associada
                const expressao = this._processaExpressaoAtribuicao();

                // Cria um nó para a associação de tipo
                const noAssociacao = new NoAST('GENERIC_ASSOCIATION', '', especificadoresTipo[0].linha, especificadoresTipo[0].coluna);

                // Adiciona especificadores de tipo como filhos
                especificadoresTipo.forEach(spec => noAssociacao.adicionaFilho(spec));

                // Adiciona informações de ponteiros do declarador
                if (declaradorInfo.ponteiros > 0) {
                    noAssociacao.adicionaPropriedade('ponteiros', declaradorInfo.ponteiros);
                }

                // Adiciona a expressão associada
                noAssociacao.adicionaFilho(expressao);

                noGeneric.adicionaFilho(noAssociacao);
            }

            if (!this._verificaTipo(Token.TIPOS.PUNCTUATOR, ',')) {
                break;
            }
        }

        this._consome(Token.TIPOS.PUNCTUATOR, ')');

        return noGeneric;
    }

    /**
     * Processa uma expressão constante (usada em enum, case, tamanho de array, etc.)
     * @return {NoAST} Nó AST da expressão constante
     * @private
     */
    _processaExpressaoConstante() {
        // As expressões constantes são um subconjunto das expressões normais
        // Por simplicidade, usamos o parser de expressão normal
        return this._processaExpressaoCondicional();
    }

    /**
     * Combina os especificadores de tipo e informações do declarador
     * @param {NoAST[]} especificadoresTipo - Especificadores de tipo
     * @param {Object} declaradorInfo - Informações do declarador
     * @return {string} String representando o tipo completo
     * @private
     */
    _combinaTipoDeclarador(especificadoresTipo, declaradorInfo) {
        // Extrai os nomes dos tipos dos especificadores
        const tiposBase = especificadoresTipo
            .filter(spec => spec.tipo === 'TYPE_SPECIFIER' ||
                (spec.tipo === 'KEYWORD' &&
                    ['struct', 'union', 'enum'].includes(spec.valor)))
            .map(spec => spec.valor);

        // Qualificadores
        const qualificadores = especificadoresTipo
            .filter(spec => spec.tipo === 'TYPE_QUALIFIER')
            .map(spec => spec.valor);

        // Forma o tipo base
        let tipoFinal = tiposBase.join(' ');

        // Adiciona qualificadores
        if (qualificadores.length > 0) {
            tipoFinal = qualificadores.join(' ') + ' ' + tipoFinal;
        }

        // Adiciona ponteiros
        if (declaradorInfo.ponteiros > 0) {
            tipoFinal += ' ' + '*'.repeat(declaradorInfo.ponteiros);
        }

        return tipoFinal.trim();
    }

    /**
     * Cria um novo escopo para análise
     * @param {string} nome - Nome do escopo
     * @param {Object} escopoPai - Escopo pai
     * @return {Object} Novo escopo
     * @private
     */
    _criaEscopo(nome, escopoPai = null) {
        const novoEscopo = {
            nome,
            pai: escopoPai,
            variaveis: new Map(), // nome -> {tipo, ...}
            funcoes: new Map(), // nome -> {retorno, parametros, ...}
            rotulos: new Set() // Conjunto de rótulos definidos
        };

        this.escopos.push(novoEscopo);
        return novoEscopo;
    }

    /**
     * Métodos auxiliares para navegação e tratamento de tokens
     */

    /**
     * Verifica se acabaram os tokens
     * @return {boolean} True se acabaram os tokens
     * @private
     */
    _fimTokens() {
        return this.indiceTokenAtual >= this.tokens.length ||
            this._pegaTokenAtual().tipo === Token.TIPOS.EOF;
    }

    /**
     * Pega o token atual sem avançar
     * @return {Token} Token atual
     * @private
     */
    _pegaTokenAtual() {
        if (this.indiceTokenAtual >= this.tokens.length) {
            // Último token é EOF, ou token sintético se lista vazia
            if (this.tokens.length > 0) {
                return this.tokens[this.tokens.length - 1];
            }
            return new Token(Token.TIPOS.EOF, '', 0, 0);
        }
        return this.tokens[this.indiceTokenAtual];
    }

    /**
     * Pega o token anterior
     * @return {Token} Token anterior
     * @private
     */
    _pegaTokenAnterior() {
        if (this.indiceTokenAtual <= 0) {
            return this.tokens[0];
        }
        return this.tokens[this.indiceTokenAtual - 1];
    }

    /**
     * Pega o próximo token sem avançar
     * @return {Token} Próximo token ou null
     * @private
     */
    _pegaProximoToken() {
        if (this.indiceTokenAtual + 1 >= this.tokens.length) {
            return null;
        }
        return this.tokens[this.indiceTokenAtual + 1];
    }

    /**
     * Pega um token em um índice específico
     * @param {number} indice - Índice do token
     * @return {Token} Token no índice ou null
     * @private
     */
    _pegaToken(indice) {
        if (indice < 0 || indice >= this.tokens.length) {
            return null;
        }
        return this.tokens[indice];
    }

    /**
     * Avança para o próximo token
     * @return {Token} Token consumido
     * @private
     */
    _avancaToken() {
        if (this.indiceTokenAtual < this.tokens.length) {
            return this.tokens[this.indiceTokenAtual++];
        }
        // Se já passou do fim, retorna o último token (EOF)
        return this.tokens[this.tokens.length - 1];
    }

    /**
     * Verifica se o token atual é de um tipo específico
     * @param {string} tipo - Tipo de token
     * @param {string|string[]} [valor] - Valor opcional do token
     * @return {boolean} True se o token for do tipo e valor especificados
     * @private
     */
    _verificaTipo(tipo, valor = null) {
        const token = this._pegaTokenAtual();

        if (!token || token.tipo !== tipo) {
            return false;
        }

        if (valor === null) {
            return true;
        }

        if (Array.isArray(valor)) {
            return valor.includes(token.valor);
        }

        return token.valor === valor;
    }

    /**
     * Verifica se o próximo token é de um tipo específico
     * @param {string} tipo - Tipo de token
     * @param {string|string[]} [valor] - Valor opcional do token
     * @return {boolean} True se o próximo token for do tipo e valor especificados
     * @private
     */
    _verificaProximoToken(tipo, valor = null) {
        const token = this._pegaProximoToken();

        if (!token || token.tipo !== tipo) {
            return false;
        }

        if (valor === null) {
            return true;
        }

        if (Array.isArray(valor)) {
            return valor.includes(token.valor);
        }

        return token.valor === valor;
    }

    /**
     * Consome um token esperado ou lança erro
     * @param {string} tipo - Tipo de token esperado
     * @param {string|string[]} [valor] - Valor opcional esperado
     * @return {Token} Token consumido
     * @throws {Error} Se o token não for do tipo/valor esperado
     * @private
     */
    _consome(tipo, valor = null) {
        if (this._verificaTipo(tipo, valor)) {
            return this._avancaToken();
        }

        const token = this._pegaTokenAtual();
        const valorEsperado = valor
            ? (Array.isArray(valor) ? `um de [${valor.join(', ')}]` : valor)
            : tipo;

        throw this._criaErroSintatico(
            `Esperado '${valorEsperado}', encontrado '${token.valor}'`,
            token
        );
    }

    /**
     * Cria um objeto de erro sintático
     * @param {string} mensagem - Mensagem de erro
     * @param {Token} token - Token onde ocorreu o erro
     * @return {Error} Objeto de erro
     * @private
     */
    _criaErroSintatico(mensagem, token) {
        const erro = new Error(
            `Erro sintático: ${mensagem} em ${token.arquivo}:${token.linha}:${token.coluna}`
        );
        erro.linha = token.linha;
        erro.coluna = token.coluna;
        erro.arquivo = token.arquivo;
        erro.token = token;

        return erro;
    }

    /**
     * Adiciona um aviso
     * @param {string} mensagem - Mensagem de aviso
     * @param {Token} token - Token onde ocorreu o aviso
     * @private
     */
    _adicionaAviso(mensagem, token) {
        this.avisos.push(
            `Aviso: ${mensagem} em ${token.arquivo}:${token.linha}:${token.coluna}`
        );
    }

    /**
     * Tenta sincronizar o parser após um erro
     * @private
     */
    _sincronizaDepoisErro() {
        // Avança até encontrar um ponto de sincronização (;, }, etc.)
        while (!this._fimTokens()) {
            // Pontos de sincronização
            if (this._verificaTipo(Token.TIPOS.PUNCTUATOR, [';', '}'])) {
                this._avancaToken();
                return;
            }

            // Palavras-chave que podem indicar início de nova construção
            if (this._verificaTipo(Token.TIPOS.KEYWORD, [
                'if', 'while', 'for', 'do', 'switch', 'return',
                'int', 'char', 'void', 'struct', 'union', 'enum',
                'typedef', 'static', 'extern', 'const', 'auto',
                'register', 'volatile', 'float', 'double', 'signed',
                'unsigned', 'short', 'long'
            ])) {
                return;
            }

            this._avancaToken();
        }
    }
}

// Exporta a classe
export default AnalisadorSintatico;