// gerenciadorMemoria.js
/**
 * Classe que gerencia a memória para a simulação da linguagem C.
 * Simula a pilha, heap, variáveis globais e estáticas.
 */
class GerenciadorMemoria {
    /**
     * Inicializa o gerenciador de memória
     * @param {Object} [opcoes={}] - Opções de configuração
     * @param {boolean} [opcoes.detectarVazamentos=true] - Se deve detectar vazamentos de memória
     * @param {boolean} [opcoes.validarAcessos=true] - Se deve validar acessos à memória
     * @param {boolean} [opcoes.registrarHistorico=true] - Se deve registrar histórico de operações
     * @param {number} [opcoes.tamanhoMaximoHeap=1048576] - Tamanho máximo da heap (1MB por padrão)
     */
    constructor(opcoes = {}) {
        // Opções de configuração
        this.opcoes = {
            detectarVazamentos: opcoes.detectarVazamentos !== false,
            validarAcessos: opcoes.validarAcessos !== false,
            registrarHistorico: opcoes.registrarHistorico !== false,
            tamanhoMaximoHeap: opcoes.tamanhoMaximoHeap || 1048576, // 1MB
            tamanhoPadraoPilha: opcoes.tamanhoPadraoPilha || 65536, // 64KB
            limiteRecursao: opcoes.limiteRecursao || 1000
        };

        // Pilha para armazenar frames de função
        this.pilha = [];

        // Contagem de chamadas recursivas
        this.contadorRecursao = 0;

        // Heap para simular alocação dinâmica
        this.heap = new Map();

        // Espaço utilizado na heap
        this.espacoUtilizadoHeap = 0;

        // Próximo endereço de memória disponível na heap
        this.proximoEnderecoHeap = 0x10000000;

        // Frame atual na pilha de execução
        this.frameAtual = null;

        // Variáveis globais e estáticas
        this.variaveis = {
            globais: new Map(),  // Map de nome -> {valor, tipo, endereco}
            estaticas: new Map() // Map de escopo+nome -> {valor, tipo, endereco}
        };

        // Segmento de dados constantes (strings literais, etc.)
        this.segmentoDados = new Map();

        // Endereços de início para cada região
        this.enderecos = {
            segmentoDados: 0x00100000,
            globais: 0x00200000,
            estaticas: 0x00300000,
            heap: 0x10000000,
            pilha: 0xF0000000
        };

        // Registros de alocação para detecção de vazamentos
        this.registrosAlocacao = new Map();

        // Histórico de operações para visualização e debugging
        this.historico = this.opcoes.registrarHistorico ? [] : null;

        // Contador para identificadores únicos
        this.contadorId = 0;

        // Registra o frame global padrão
        this._criaFrameGlobal();
    }

    /**
     * Cria o frame global inicial
     * @private
     */
    _criaFrameGlobal() {
        this.frameAtual = {
            id: this._geraId('frame'),
            nome: 'global',
            escopo: 'global',
            inicio: Date.now(),
            variaveis: new Map(),
            parametros: new Map(),
            retorno: undefined,
            enderecoBase: this.enderecos.pilha,
            tamanho: this.opcoes.tamanhoPadraoPilha,
            enderecoPai: null,
            linhaRetorno: null
        };

        this.pilha.push(this.frameAtual);

        if (this.historico) {
            this.historico.push({
                tipo: 'inicio_frame',
                id: this.frameAtual.id,
                nome: this.frameAtual.nome,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Gera um ID único
     * @param {string} prefixo - Prefixo para o ID
     * @return {string} ID único
     * @private
     */
    _geraId(prefixo) {
        return `${prefixo}_${++this.contadorId}`;
    }

    /**
     * Registra uma operação no histórico
     * @param {Object} operacao - Detalhes da operação
     * @private
     */
    _registraOperacao(operacao) {
        if (this.historico) {
            operacao.timestamp = Date.now();
            this.historico.push(operacao);
        }
    }

    /**
     * Reinicia o estado do gerenciador de memória
     */
    reiniciar() {
        this.pilha = [];
        this.heap = new Map();
        this.espacoUtilizadoHeap = 0;
        this.proximoEnderecoHeap = this.enderecos.heap;
        this.frameAtual = null;
        this.contadorRecursao = 0;

        this.variaveis = {
            globais: new Map(),
            estaticas: new Map()
        };

        this.segmentoDados = new Map();
        this.registrosAlocacao = new Map();

        if (this.historico) {
            this.historico = [];
        }

        this._criaFrameGlobal();

        this._registraOperacao({
            tipo: 'reinicio'
        });
    }

    /**
     * Cria um novo frame de função quando uma função é chamada
     * @param {string} nomeFuncao - Nome da função
     * @param {string} escopo - Escopo da função
     * @param {Object} args - Argumentos adicionais
     * @param {number} [args.linhaRetorno] - Linha para retorno
     * @param {number} [args.enderecoPai] - Endereço de retorno
     * @return {Object} Novo frame criado
     */
    criaNovoFrame(nomeFuncao, escopo, { linhaRetorno, enderecoPai } = {}) {
        // Verifica limite de recursão
        if (this.pilha.length > 0 && this.frameAtual.nome === nomeFuncao) {
            this.contadorRecursao++;

            if (this.contadorRecursao > this.opcoes.limiteRecursao) {
                throw new Error(`Limite de recursão excedido (${this.opcoes.limiteRecursao} chamadas)`);
            }
        } else {
            this.contadorRecursao = 0;
        }

        // Calcula endereço base para o novo frame
        const enderecoBase = this.frameAtual
            ? this.frameAtual.enderecoBase - this.frameAtual.tamanho
            : this.enderecos.pilha;

        const novoFrame = {
            id: this._geraId('frame'),
            nome: nomeFuncao,
            escopo,
            inicio: Date.now(),
            variaveis: new Map(),
            parametros: new Map(),
            retorno: undefined,
            enderecoBase,
            tamanho: this.opcoes.tamanhoPadraoPilha,
            enderecoPai: enderecoPai || (this.frameAtual ? this.frameAtual.enderecoBase : null),
            linhaRetorno
        };

        this.pilha.push(novoFrame);
        this.frameAtual = novoFrame;

        this._registraOperacao({
            tipo: 'inicio_frame',
            id: novoFrame.id,
            nome: nomeFuncao,
            escopo,
            endereco: enderecoBase
        });

        return novoFrame;
    }

    /**
     * Remove o frame do topo da pilha quando uma função retorna
     * @param {any} valorRetorno - Valor de retorno da função
     * @return {Object} Informações do frame removido
     */
    removeFrame(valorRetorno = undefined) {
        if (this.pilha.length <= 1) {
            throw new Error('Não é possível remover o frame global');
        }

        const frameSaindo = this.pilha.pop();
        frameSaindo.fim = Date.now();
        frameSaindo.retorno = valorRetorno;

        this.frameAtual = this.pilha[this.pilha.length - 1];

        this._registraOperacao({
            tipo: 'fim_frame',
            id: frameSaindo.id,
            nome: frameSaindo.nome,
            retorno: valorRetorno
        });

        // Limpa variáveis estáticas de funções que não precisam preservar valor

        return {
            id: frameSaindo.id,
            nome: frameSaindo.nome,
            duracao: frameSaindo.fim - frameSaindo.inicio,
            retorno: valorRetorno,
            linhaRetorno: frameSaindo.linhaRetorno
        };
    }

    /**
     * Adiciona um parâmetro ao frame atual
     * @param {string} nome - Nome do parâmetro
     * @param {Object} info - Informações do parâmetro
     * @param {any} info.valor - Valor do parâmetro
     * @param {string} info.tipo - Tipo do parâmetro
     * @param {boolean} [info.ehPonteiro=false] - Se o parâmetro é um ponteiro
     * @param {boolean} [info.ehArray=false] - Se o parâmetro é um array
     * @return {Object} Informações do parâmetro
     */
    adicionaParametro(nome, { valor, tipo, ehPonteiro = false, ehArray = false }) {
        if (!this.frameAtual) {
            throw new Error('Não há frame ativo para adicionar parâmetro');
        }

        const endereco = this.frameAtual.enderecoBase -
            (8 * (this.frameAtual.parametros.size + 1)); // 8 bytes por parâmetro

        const infoParametro = {
            nome,
            valor,
            tipo,
            ehPonteiro,
            ehArray,
            endereco,
            alteracoes: []
        };

        this.frameAtual.parametros.set(nome, infoParametro);

        this._registraOperacao({
            tipo: 'definir_parametro',
            nome,
            valor,
            tipo,
            endereco,
            frameId: this.frameAtual.id
        });

        return infoParametro;
    }

    /**
     * Declara uma variável no escopo atual
     * @param {string} nome - Nome da variável
     * @param {Object} info - Informações da variável
     * @param {string} info.tipo - Tipo da variável
     * @param {any} [info.valorInicial=null] - Valor inicial
     * @param {boolean} [info.ehPonteiro=false] - Se é ponteiro
     * @param {boolean} [info.ehArray=false] - Se é array
     * @param {number[]} [info.dimensoes=[]] - Dimensões, se for array
     * @param {boolean} [info.ehEstatica=false] - Se é variável estática
     * @param {boolean} [info.ehExterna=false] - Se é declarada com extern
     * @return {Object} Informações da variável
     */
    declaraVariavel(nome, {
        tipo,
        valorInicial = null,
        ehPonteiro = false,
        ehArray = false,
        dimensoes = [],
        ehEstatica = false,
        ehExterna = false
    }) {
        // Verifica se é variável global
        const ehGlobal = this.frameAtual.nome === 'global';

        // Se for extern, procura a variável global existente
        if (ehExterna) {
            const varGlobal = this.variaveis.globais.get(nome);
            if (varGlobal) {
                return varGlobal;
            }
            // Se não existir, cria como global
            return this.declaraVariavelGlobal(nome, { tipo, valorInicial, ehPonteiro, ehArray, dimensoes });
        }

        // Se for estática, usa o segmento de dados estáticos
        if (ehEstatica) {
            return this.declaraVariavelEstatica(nome, this.frameAtual.nome, { tipo, valorInicial, ehPonteiro, ehArray, dimensoes });
        }

        // Se for global, usa o segmento de dados globais
        if (ehGlobal) {
            return this.declaraVariavelGlobal(nome, { tipo, valorInicial, ehPonteiro, ehArray, dimensoes });
        }

        // Variável local (no frame atual)
        if (!this.frameAtual) {
            throw new Error('Não há frame ativo para declarar variável');
        }

        // Verifica se a variável já existe no escopo atual
        if (this.frameAtual.variaveis.has(nome)) {
            throw new Error(`Variável '${nome}' já declarada no escopo atual`);
        }

        // Calcula o tamanho da variável
        const tamanho = this._calculaTamanhoTipo(tipo, ehArray, dimensoes);

        // Calcula o endereço com base no alinhamento adequado
        const endereco = this._alinhaEndereco(
            this.frameAtual.enderecoBase -
            (8 + [...this.frameAtual.variaveis.values()].reduce((acc, v) => acc + this._calculaTamanhoTipo(v.tipo, v.ehArray, v.dimensoes), 0)),
            this._pegaAlinhamentoTipo(tipo)
        );

        // Cria a informação da variável
        const infoVar = {
            nome,
            tipo,
            valor: valorInicial,
            ehPonteiro,
            ehArray,
            dimensoes,
            tamanho,
            endereco,
            alteracoes: [{
                valor: valorInicial,
                timestamp: Date.now()
            }]
        };

        // Inicializa array, se necessário
        if (ehArray) {
            infoVar.valor = this._inicializaArray(valorInicial, dimensoes, tipo);
        }

        // Armazena a variável no frame atual
        this.frameAtual.variaveis.set(nome, infoVar);

        this._registraOperacao({
            tipo: 'declarar_variavel',
            nome,
            tipo,
            valor: infoVar.valor,
            endereco,
            tamanho,
            ehPonteiro,
            ehArray,
            dimensoes,
            frameId: this.frameAtual.id
        });

        return infoVar;
    }

    /**
     * Declara uma variável global
     * @param {string} nome - Nome da variável
     * @param {Object} info - Informações da variável
     * @return {Object} Informações da variável
     */
    declaraVariavelGlobal(nome, info) {
        // Verifica se a variável global já existe
        if (this.variaveis.globais.has(nome)) {
            // Se for extern, retorna a existente
            if (info.ehExterna) {
                return this.variaveis.globais.get(nome);
            }
            throw new Error(`Variável global '${nome}' já declarada`);
        }

        // Calcula o tamanho da variável
        const tamanho = this._calculaTamanhoTipo(info.tipo, info.ehArray, info.dimensoes);

        // Calcula o endereço no segmento de dados globais
        const endereco = this._alinhaEndereco(
            this.enderecos.globais +
            [...this.variaveis.globais.values()].reduce(
                (acc, v) => acc + this._calculaTamanhoTipo(v.tipo, v.ehArray, v.dimensoes),
                0
            ),
            this._pegaAlinhamentoTipo(info.tipo)
        );

        // Cria a informação da variável
        const infoVar = {
            nome,
            tipo: info.tipo,
            valor: info.valorInicial,
            ehPonteiro: info.ehPonteiro || false,
            ehArray: info.ehArray || false,
            dimensoes: info.dimensoes || [],
            tamanho,
            endereco,
            alteracoes: [{
                valor: info.valorInicial,
                timestamp: Date.now()
            }]
        };

        // Inicializa array, se necessário
        if (infoVar.ehArray) {
            infoVar.valor = this._inicializaArray(info.valorInicial, info.dimensoes, info.tipo);
        }

        // Armazena a variável global
        this.variaveis.globais.set(nome, infoVar);

        this._registraOperacao({
            tipo: 'declarar_global',
            nome,
            tipo: info.tipo,
            valor: infoVar.valor,
            endereco,
            tamanho,
            ehPonteiro: infoVar.ehPonteiro,
            ehArray: infoVar.ehArray,
            dimensoes: infoVar.dimensoes
        });

        return infoVar;
    }

    /**
     * Declara uma variável estática
     * @param {string} nome - Nome da variável
     * @param {string} escopo - Escopo da variável (nome da função)
     * @param {Object} info - Informações da variável
     * @return {Object} Informações da variável
     */
    declaraVariavelEstatica(nome, escopo, info) {
        const chave = `${escopo}.${nome}`;

        // Verifica se a variável estática já existe
        if (this.variaveis.estaticas.has(chave)) {
            // Variáveis estáticas são inicializadas apenas uma vez
            return this.variaveis.estaticas.get(chave);
        }

        // Calcula o tamanho da variável
        const tamanho = this._calculaTamanhoTipo(info.tipo, info.ehArray, info.dimensoes);

        // Calcula o endereço no segmento de dados estáticos
        const endereco = this._alinhaEndereco(
            this.enderecos.estaticas +
            [...this.variaveis.estaticas.values()].reduce(
                (acc, v) => acc + this._calculaTamanhoTipo(v.tipo, v.ehArray, v.dimensoes),
                0
            ),
            this._pegaAlinhamentoTipo(info.tipo)
        );

        // Cria a informação da variável
        const infoVar = {
            nome,
            escopo,
            tipo: info.tipo,
            valor: info.valorInicial,
            ehPonteiro: info.ehPonteiro || false,
            ehArray: info.ehArray || false,
            dimensoes: info.dimensoes || [],
            tamanho,
            endereco,
            alteracoes: [{
                valor: info.valorInicial,
                timestamp: Date.now()
            }]
        };

        // Inicializa array, se necessário
        if (infoVar.ehArray) {
            infoVar.valor = this._inicializaArray(info.valorInicial, info.dimensoes, info.tipo);
        }

        // Armazena a variável estática
        this.variaveis.estaticas.set(chave, infoVar);

        this._registraOperacao({
            tipo: 'declarar_estatica',
            nome,
            escopo,
            tipo: info.tipo,
            valor: infoVar.valor,
            endereco,
            tamanho,
            ehPonteiro: infoVar.ehPonteiro,
            ehArray: infoVar.ehArray,
            dimensoes: infoVar.dimensoes
        });

        return infoVar;
    }

    /**
     * Obtém uma variável do escopo atual ou dos escopos superiores
     * @param {string} nome - Nome da variável
     * @return {Object|null} Informações da variável ou null
     */
    pegaVariavel(nome) {
        // Busca no frame atual primeiro
        if (this.frameAtual) {
            // Verifica parâmetros
            if (this.frameAtual.parametros.has(nome)) {
                return this.frameAtual.parametros.get(nome);
            }

            // Verifica variáveis locais
            if (this.frameAtual.variaveis.has(nome)) {
                return this.frameAtual.variaveis.get(nome);
            }

            // Verifica variáveis estáticas no escopo atual
            const chaveEstatica = `${this.frameAtual.nome}.${nome}`;
            if (this.variaveis.estaticas.has(chaveEstatica)) {
                return this.variaveis.estaticas.get(chaveEstatica);
            }
        }

        // Busca nos escopos superiores (percorrendo a pilha)
        for (let i = this.pilha.length - 2; i >= 0; i--) {
            const frame = this.pilha[i];

            if (frame.variaveis.has(nome)) {
                return frame.variaveis.get(nome);
            }
        }

        // Por fim, verifica variáveis globais
        if (this.variaveis.globais.has(nome)) {
            return this.variaveis.globais.get(nome);
        }

        // Não encontrou a variável
        return null;
    }

    /**
     * Atualiza o valor de uma variável
     * @param {string} nome - Nome da variável
     * @param {any} valor - Novo valor
     * @param {Object} [opcoes={}] - Opções adicionais
     * @param {number} [opcoes.indice] - Índice para arrays
     * @param {string} [opcoes.escopo] - Escopo específico para procurar
     * @return {boolean} True se a atualização foi bem-sucedida
     */
    atualizaVariavel(nome, valor, opcoes = {}) {
        let variavel;
        let onde = '';

        // Se o escopo for especificado, procura diretamente
        if (opcoes.escopo) {
            if (opcoes.escopo === 'global') {
                variavel = this.variaveis.globais.get(nome);
                onde = 'global';
            } else {
                // Busca variável estática no escopo especificado
                const chaveEstatica = `${opcoes.escopo}.${nome}`;
                variavel = this.variaveis.estaticas.get(chaveEstatica);
                onde = 'estatica';

                // Se não for estática, procura nos frames da pilha
                if (!variavel) {
                    for (const frame of this.pilha) {
                        if (frame.nome === opcoes.escopo) {
                            variavel = frame.variaveis.get(nome) || frame.parametros.get(nome);
                            onde = 'frame';
                            break;
                        }
                    }
                }
            }
        } else {
            // Procura a variável normalmente
            variavel = this.pegaVariavel(nome);

            // Determina onde a variável foi encontrada
            if (variavel) {
                if (this.frameAtual.variaveis.has(nome)) {
                    onde = 'frame';
                } else if (this.frameAtual.parametros.has(nome)) {
                    onde = 'parametro';
                } else if (this.variaveis.globais.has(nome)) {
                    onde = 'global';
                } else {
                    onde = 'estatica';
                }
            }
        }

        // Se não encontrou a variável
        if (!variavel) {
            return false;
        }

        // Atualiza array ou valor simples
        if (variavel.ehArray && opcoes.indice !== undefined) {
            // Atualiza um elemento do array
            if (!this._atualizaElementoArray(variavel, opcoes.indice, valor)) {
                return false;
            }
        } else if (variavel.ehArray && Array.isArray(valor)) {
            // Atualiza múltiplos elementos do array
            variavel.valor = [...valor]; // Cria uma cópia
        } else {
            // Atualiza valor simples
            variavel.valor = valor;
        }

        // Registra a alteração
        variavel.alteracoes.push({
            valor: variavel.ehArray ? [...variavel.valor] : variavel.valor,
            timestamp: Date.now()
        });

        this._registraOperacao({
            tipo: 'atualizar_variavel',
            nome,
            valor: variavel.ehArray ? [...variavel.valor] : variavel.valor,
            onde,
            indice: opcoes.indice,
            frameId: this.frameAtual.id
        });

        return true;
    }

    /**
     * Atualiza um elemento específico de um array
     * @param {Object} variavel - Informações da variável array
     * @param {number|number[]} indice - Índice ou array de índices para arrays multidimensionais
     * @param {any} valor - Novo valor
     * @return {boolean} True se a atualização foi bem-sucedida
     * @private
     */
    _atualizaElementoArray(variavel, indice, valor) {
        // Array unidimensional com índice simples
        if (!Array.isArray(indice) && Array.isArray(variavel.valor)) {
            if (indice < 0 || indice >= variavel.valor.length) {
                if (this.opcoes.validarAcessos) {
                    throw new Error(`Acesso fora dos limites: índice ${indice} em array de tamanho ${variavel.valor.length}`);
                }
                return false;
            }

            variavel.valor[indice] = valor;
            return true;
        }

        // Array multidimensional
        if (Array.isArray(indice)) {
            let atual = variavel.valor;

            // Navega pelas dimensões até a penúltima
            for (let i = 0; i < indice.length - 1; i++) {
                if (!Array.isArray(atual) || indice[i] < 0 || indice[i] >= atual.length) {
                    if (this.opcoes.validarAcessos) {
                        throw new Error(`Acesso fora dos limites: índice ${indice[i]} na dimensão ${i+1}`);
                    }
                    return false;
                }

                atual = atual[indice[i]];
            }

            // Atualiza o elemento na última dimensão
            const ultimoIndice = indice[indice.length - 1];
            if (!Array.isArray(atual) || ultimoIndice < 0 || ultimoIndice >= atual.length) {
                if (this.opcoes.validarAcessos) {
                    throw new Error(`Acesso fora dos limites: índice ${ultimoIndice} na última dimensão`);
                }
                return false;
            }

            atual[ultimoIndice] = valor;
            return true;
        }

        return false;
    }

    /**
     * Aloca memória na heap (similar a malloc/calloc)
     * @param {number} tamanho - Tamanho em bytes a alocar
     * @param {boolean} [inicializaZero=false] - Se deve inicializar com zeros
     * @param {Object} [info={}] - Informações adicionais para rastreamento
     * @param {string} [info.origem="desconhecida"] - Função que solicitou a alocação
     * @param {number} [info.linha=-1] - Linha do código fonte
     * @return {number} Endereço da memória alocada
     */
    alocaMemoria(tamanho, inicializaZero = false, info = {}) {
        // Verifica o tamanho
        if (tamanho <= 0) {
            return 0; // Null pointer em C
        }

        // Verifica se excede o limite da heap
        if (this.espacoUtilizadoHeap + tamanho > this.opcoes.tamanhoMaximoHeap) {
            throw new Error(`Não há memória suficiente para alocar ${tamanho} bytes`);
        }

        // Alinha o tamanho (tipicamente a 8 bytes)
        const tamanhoAlinhado = this._alinhaTamanho(tamanho, 8);

        // Encontra o endereço para a nova alocação
        const endereco = this.proximoEnderecoHeap;

        // Atualiza o próximo endereço disponível
        this.proximoEnderecoHeap += tamanhoAlinhado;

        // Cria o array para os dados
        const dados = new Array(tamanho);

        // Inicializa com zeros se necessário
        if (inicializaZero) {
            dados.fill(0);
        } else {
            // Preenche com valores indefinidos
            dados.fill(undefined);
        }

        // Registra a alocação
        const id = this._geraId('alocacao');
        this.heap.set(endereco, {
            id,
            endereco,
            tamanho,
            tamanhoAlinhado,
            dados,
            alocado: true,
            alocadoEm: Date.now(),
            liberadoEm: null,
            origem: info.origem || 'desconhecida',
            linha: info.linha || -1,
            acessos: []
        });

        // Registra para detecção de vazamentos
        this.registrosAlocacao.set(id, {
            id,
            endereco,
            tamanho,
            alocadoEm: Date.now(),
            liberadoEm: null,
            origem: info.origem || 'desconhecida',
            linha: info.linha || -1,
            frameId: this.frameAtual ? this.frameAtual.id : null
        });

        // Atualiza o espaço utilizado
        this.espacoUtilizadoHeap += tamanhoAlinhado;

        this._registraOperacao({
            tipo: 'alocar_memoria',
            id,
            endereco,
            tamanho,
            inicializaZero,
            origem: info.origem,
            linha: info.linha,
            frameId: this.frameAtual ? this.frameAtual.id : null
        });

        return endereco;
    }

    /**
     * Libera memória alocada na heap (similar a free)
     * @param {number} endereco - Endereço da memória a liberar
     * @return {boolean} True se a memória foi liberada com sucesso
     */
    liberaMemoria(endereco) {
        // Ponteiro nulo
        if (!endereco) {
            return true; // Em C, free(NULL) é uma operação válida e não faz nada
        }

        // Verifica se o endereço existe na heap
        if (!this.heap.has(endereco)) {
            if (this.opcoes.validarAcessos) {
                throw new Error(`Tentativa de liberar memória não alocada no endereço 0x${endereco.toString(16)}`);
            }
            return false;
        }

        const bloco = this.heap.get(endereco);

        // Verifica se o bloco já foi liberado
        if (!bloco.alocado) {
            if (this.opcoes.validarAcessos) {
                throw new Error(`Tentativa de liberar memória já liberada no endereço 0x${endereco.toString(16)}`);
            }
            return false;
        }

        // Marca como liberado
        bloco.alocado = false;
        bloco.liberadoEm = Date.now();

        // Atualiza o registro para detecção de vazamentos
        if (this.registrosAlocacao.has(bloco.id)) {
            const registro = this.registrosAlocacao.get(bloco.id);
            registro.liberadoEm = Date.now();
        }

        // Atualiza o espaço utilizado
        this.espacoUtilizadoHeap -= bloco.tamanhoAlinhado;

        this._registraOperacao({
            tipo: 'liberar_memoria',
            endereco,
            id: bloco.id,
            frameId: this.frameAtual ? this.frameAtual.id : null
        });

        return true;
    }

    /**
     * Realoca memória na heap (similar a realloc)
     * @param {number} endereco - Endereço original
     * @param {number} novoTamanho - Novo tamanho em bytes
     * @param {Object} [info={}] - Informações adicionais
     * @return {number} Novo endereço (pode ser o mesmo ou um diferente)
     */
    realocaMemoria(endereco, novoTamanho, info = {}) {
        // Casos especiais conforme comportamento de realloc em C

        // Se o ponteiro for NULL, equivale a malloc
        if (endereco === 0) {
            return this.alocaMemoria(novoTamanho, false, info);
        }

        // Se o tamanho for 0, equivale a free
        if (novoTamanho === 0) {
            this.liberaMemoria(endereco);
            return 0;
        }

        // Verifica se o endereço existe na heap
        if (!this.heap.has(endereco)) {
            if (this.opcoes.validarAcessos) {
                throw new Error(`Tentativa de realocar memória não alocada no endereço 0x${endereco.toString(16)}`);
            }
            return 0;
        }

        const blocoOriginal = this.heap.get(endereco);

        // Verifica se o bloco já foi liberado
        if (!blocoOriginal.alocado) {
            if (this.opcoes.validarAcessos) {
                throw new Error(`Tentativa de realocar memória já liberada no endereço 0x${endereco.toString(16)}`);
            }
            return 0;
        }

        // Se o tamanho for o mesmo, retorna o mesmo endereço
        if (novoTamanho === blocoOriginal.tamanho) {
            return endereco;
        }

        // Aloca um novo bloco
        const novoEndereco = this.alocaMemoria(novoTamanho, false, info);

        if (novoEndereco === 0) {
            return 0; // Falha na alocação
        }

        // Copia os dados do bloco original para o novo
        const novoBloco = this.heap.get(novoEndereco);
        const tamanhoCopia = Math.min(blocoOriginal.tamanho, novoTamanho);

        for (let i = 0; i < tamanhoCopia; i++) {
            novoBloco.dados[i] = blocoOriginal.dados[i];
        }

        // Libera o bloco original
        this.liberaMemoria(endereco);

        this._registraOperacao({
            tipo: 'realocar_memoria',
            enderecoOriginal: endereco,
            novoEndereco,
            tamanhoOriginal: blocoOriginal.tamanho,
            novoTamanho,
            frameId: this.frameAtual ? this.frameAtual.id : null
        });

        return novoEndereco;
    }

    /**
     * Lê um valor da memória (heap, pilha, segmento de dados)
     * @param {number} endereco - Endereço de memória
     * @param {number} [offset=0] - Deslocamento em bytes
     * @param {Object} [opcoes={}] - Opções adicionais
     * @param {string} [opcoes.tipo='byte'] - Tipo de dado a ler
     * @return {any} Valor lido da memória
     */
    leMemoria(endereco, offset = 0, opcoes = {}) {
        const tipo = opcoes.tipo || 'byte';
        const enderecoFinal = endereco + offset;

        // Determina a região de memória
        if (enderecoFinal >= this.enderecos.heap) {
            // Heap
            return this.leHeap(endereco, offset, opcoes);
        } else if (enderecoFinal >= this.enderecos.estaticas) {
            // Variáveis estáticas
            return this._leDadosEstaticos(enderecoFinal);
        } else if (enderecoFinal >= this.enderecos.globais) {
            // Variáveis globais
            return this._leDadosGlobais(enderecoFinal);
        } else if (enderecoFinal >= this.enderecos.segmentoDados) {
            // Segmento de dados constantes
            return this._leDadosConstantes(enderecoFinal);
        } else {
            // Pilha ou região inválida
            return this._lePilha(enderecoFinal);
        }
    }

    /**
     * Lê um valor da heap
     * @param {number} endereco - Endereço base na heap
     * @param {number} [offset=0] - Deslocamento em bytes
     * @param {Object} [opcoes={}] - Opções adicionais
     * @return {any} Valor lido da heap
     */
    leHeap(endereco, offset = 0, opcoes = {}) {
        // Encontra o bloco na heap
        const bloco = this._encontraBlocoHeap(endereco);

        if (!bloco) {
            if (this.opcoes.validarAcessos) {
                throw new Error(`Tentativa de ler memória não alocada no endereço 0x${(endereco + offset).toString(16)}`);
            }
            return undefined;
        }

        // Verifica se o bloco está alocado
        if (!bloco.alocado) {
            if (this.opcoes.validarAcessos) {
                throw new Error(`Tentativa de ler memória já liberada no endereço 0x${(endereco + offset).toString(16)}`);
            }
            return undefined;
        }

        // Calcula o offset relativo ao início do bloco
        const offsetRelativo = (endereco - bloco.endereco) + offset;

        // Verifica limites
        if (offsetRelativo < 0 || offsetRelativo >= bloco.tamanho) {
            if (this.opcoes.validarAcessos) {
                throw new Error(`Acesso fora dos limites: offset ${offsetRelativo} em bloco de tamanho ${bloco.tamanho}`);
            }
            return undefined;
        }

        // Registra o acesso
        bloco.acessos.push({
            tipo: 'leitura',
            offset: offsetRelativo,
            timestamp: Date.now()
        });

        this._registraOperacao({
            tipo: 'ler_heap',
            endereco: bloco.endereco,
            offset: offsetRelativo,
            frameId: this.frameAtual ? this.frameAtual.id : null
        });

        // Retorna o valor
        return bloco.dados[offsetRelativo];
    }

    /**
     * Escreve um valor na memória (heap, pilha, segmento de dados)
     * @param {number} endereco - Endereço de memória
     * @param {number} [offset=0] - Deslocamento em bytes
     * @param {any} valor - Valor a escrever
     * @param {Object} [opcoes={}] - Opções adicionais
     * @param {string} [opcoes.tipo='byte'] - Tipo de dado a escrever
     * @return {boolean} True se a escrita foi bem-sucedida
     */
    escreveMemoria(endereco, offset = 0, valor, opcoes = {}) {
        const tipo = opcoes.tipo || 'byte';
        const enderecoFinal = endereco + offset;

        // Determina a região de memória
        if (enderecoFinal >= this.enderecos.heap) {
            // Heap
            return this.escreveHeap(endereco, offset, valor, opcoes);
        } else if (enderecoFinal >= this.enderecos.estaticas) {
            // Variáveis estáticas
            return this._escreveDadosEstaticos(enderecoFinal, valor);
        } else if (enderecoFinal >= this.enderecos.globais) {
            // Variáveis globais
            return this._escreveDadosGlobais(enderecoFinal, valor);
        } else if (enderecoFinal >= this.enderecos.segmentoDados) {
            // Segmento de dados constantes (não deve ser modificado!)
            if (this.opcoes.validarAcessos) {
                throw new Error(`Tentativa de escrever em segmento de dados constantes no endereço 0x${enderecoFinal.toString(16)}`);
            }
            return false;
        } else {
            // Pilha ou região inválida
            return this._escrevePilha(enderecoFinal, valor);
        }
    }

    /**
     * Escreve um valor na heap
     * @param {number} endereco - Endereço base na heap
     * @param {number} [offset=0] - Deslocamento em bytes
     * @param {any} valor - Valor a escrever
     * @param {Object} [opcoes={}] - Opções adicionais
     * @return {boolean} True se a escrita foi bem-sucedida
     */
    escreveHeap(endereco, offset = 0, valor, opcoes = {}) {
        // Encontra o bloco na heap
        const bloco = this._encontraBlocoHeap(endereco);

        if (!bloco) {
            if (this.opcoes.validarAcessos) {
                throw new Error(`Tentativa de escrever em memória não alocada no endereço 0x${(endereco + offset).toString(16)}`);
            }
            return false;
        }

        // Verifica se o bloco está alocado
        if (!bloco.alocado) {
            if (this.opcoes.validarAcessos) {
                throw new Error(`Tentativa de escrever em memória já liberada no endereço 0x${(endereco + offset).toString(16)}`);
            }
            return false;
        }

        // Calcula o offset relativo ao início do bloco
        const offsetRelativo = (endereco - bloco.endereco) + offset;

        // Verifica limites
        if (offsetRelativo < 0 || offsetRelativo >= bloco.tamanho) {
            if (this.opcoes.validarAcessos) {
                throw new Error(`Acesso fora dos limites: offset ${offsetRelativo} em bloco de tamanho ${bloco.tamanho}`);
            }
            return false;
        }

        // Escreve o valor
        bloco.dados[offsetRelativo] = valor;

        // Registra o acesso
        bloco.acessos.push({
            tipo: 'escrita',
            offset: offsetRelativo,
            valor,
            timestamp: Date.now()
        });

        this._registraOperacao({
            tipo: 'escrever_heap',
            endereco: bloco.endereco,
            offset: offsetRelativo,
            valor,
            frameId: this.frameAtual ? this.frameAtual.id : null
        });

        return true;
    }

    /**
     * Adiciona uma string literal ao segmento de dados
     * @param {string} texto - String literal
     * @return {number} Endereço da string na memória
     */
    adicionaStringLiteral(texto) {
        // Verifica se a string já existe no segmento de dados
        for (const [endereco, info] of this.segmentoDados.entries()) {
            if (info.tipo === 'string' && info.valor === texto) {
                return endereco;
            }
        }

        // Calcula o tamanho (inclui o nulo terminador)
        const tamanho = texto.length + 1;

        // Calcula o endereço
        const endereco = this._alinhaEndereco(
            this.enderecos.segmentoDados +
            [...this.segmentoDados.values()].reduce((acc, v) => acc + v.tamanho, 0),
            1 // Alinhamento para char é 1 byte
        );

        // Armazena a string
        this.segmentoDados.set(endereco, {
            tipo: 'string',
            valor: texto,
            tamanho,
            endereco
        });

        this._registraOperacao({
            tipo: 'adicionar_string_literal',
            texto,
            endereco,
            tamanho
        });

        return endereco;
    }

    /**
     * Verifica se há vazamentos de memória
     * @return {Object[]} Array de informações sobre vazamentos
     */
    detectaVazamentos() {
        if (!this.opcoes.detectarVazamentos) {
            return [];
        }

        const vazamentos = [];

        for (const [id, registro] of this.registrosAlocacao.entries()) {
            if (!registro.liberadoEm) {
                vazamentos.push({
                    ...registro,
                    duracaoMs: Date.now() - registro.alocadoEm
                });
            }
        }

        return vazamentos;
    }

    /**
     * Retorna informações sobre o estado atual da memória
     * @return {Object} Estado da memória
     */
    pegaEstadoMemoria() {
        return {
            heap: {
                utilizado: this.espacoUtilizadoHeap,
                total: this.opcoes.tamanhoMaximoHeap,
                percentual: (this.espacoUtilizadoHeap / this.opcoes.tamanhoMaximoHeap) * 100,
                blocos: Array.from(this.heap.values()).filter(b => b.alocado).map(b => ({
                    id: b.id,
                    endereco: b.endereco,
                    tamanho: b.tamanho,
                    alocadoEm: b.alocadoEm,
                    origem: b.origem,
                    linha: b.linha
                }))
            },
            pilha: {
                frames: this.pilha.map(f => ({
                    id: f.id,
                    nome: f.nome,
                    escopo: f.escopo,
                    inicio: f.inicio,
                    variaveis: Array.from(f.variaveis.entries()).map(([nome, v]) => ({
                        nome,
                        tipo: v.tipo,
                        valor: v.ehArray ? [...v.valor] : v.valor,
                        endereco: v.endereco,
                        tamanho: v.tamanho,
                        ehPonteiro: v.ehPonteiro,
                        ehArray: v.ehArray,
                        dimensoes: v.dimensoes
                    })),
                    parametros: Array.from(f.parametros.entries()).map(([nome, p]) => ({
                        nome,
                        tipo: p.tipo,
                        valor: p.ehArray ? [...p.valor] : p.valor,
                        endereco: p.endereco,
                        ehPonteiro: p.ehPonteiro,
                        ehArray: p.ehArray
                    }))
                })),
                tamanho: this.pilha.reduce((acc, f) => acc + f.tamanho, 0)
            },
            globais: Array.from(this.variaveis.globais.entries()).map(([nome, v]) => ({
                nome,
                tipo: v.tipo,
                valor: v.ehArray ? [...v.valor] : v.valor,
                endereco: v.endereco,
                tamanho: v.tamanho,
                ehPonteiro: v.ehPonteiro,
                ehArray: v.ehArray,
                dimensoes: v.dimensoes
            })),
            estaticas: Array.from(this.variaveis.estaticas.entries()).map(([chave, v]) => ({
                chave,
                nome: v.nome,
                escopo: v.escopo,
                tipo: v.tipo,
                valor: v.ehArray ? [...v.valor] : v.valor,
                endereco: v.endereco,
                tamanho: v.tamanho,
                ehPonteiro: v.ehPonteiro,
                ehArray: v.ehArray,
                dimensoes: v.dimensoes
            })),
            segmentoDados: Array.from(this.segmentoDados.entries()).map(([endereco, v]) => ({
                endereco,
                tipo: v.tipo,
                valor: v.valor,
                tamanho: v.tamanho
            }))
        };
    }

    /**
     * Retorna a alocação de memória em bytes por região
     * @return {Object} Uso de memória em bytes
     */
    pegaUsoMemoria() {
        return {
            heap: this.espacoUtilizadoHeap,
            pilha: this.pilha.reduce((acc, f) => acc + f.tamanho, 0),
            globais: [...this.variaveis.globais.values()].reduce((acc, v) => acc + v.tamanho, 0),
            estaticas: [...this.variaveis.estaticas.values()].reduce((acc, v) => acc + v.tamanho, 0),
            segmentoDados: [...this.segmentoDados.values()].reduce((acc, v) => acc + v.tamanho, 0),
            total: this.espacoUtilizadoHeap +
                this.pilha.reduce((acc, f) => acc + f.tamanho, 0) +
                [...this.variaveis.globais.values()].reduce((acc, v) => acc + v.tamanho, 0) +
                [...this.variaveis.estaticas.values()].reduce((acc, v) => acc + v.tamanho, 0) +
                [...this.segmentoDados.values()].reduce((acc, v) => acc + v.tamanho, 0)
        };
    }

    /**
     * Retorna uma parte do histórico de operações
     * @param {number} [limite=100] - Número máximo de entradas
     * @param {string} [filtro] - Filtro por tipo de operação
     * @return {Object[]} Histórico de operações
     */
    pegaHistorico(limite = 100, filtro = null) {
        if (!this.historico) {
            return [];
        }

        let resultado = this.historico;

        if (filtro) {
            resultado = resultado.filter(op => op.tipo.includes(filtro));
        }

        return resultado.slice(-limite);
    }

    /**
     * Limpa o histórico de operações
     */
    limpaHistorico() {
        if (this.historico) {
            this.historico = [];
        }
    }

    // ===== Métodos auxiliares privados =====

    /**
     * Encontra o bloco na heap que contém um endereço
     * @param {number} endereco - Endereço a procurar
     * @return {Object|null} Bloco ou null se não encontrado
     * @private
     */
    _encontraBlocoHeap(endereco) {
        // Verificação direta primeiro
        if (this.heap.has(endereco)) {
            return this.heap.get(endereco);
        }

        // Procura em todos os blocos (para endereços no meio de um bloco)
        for (const bloco of this.heap.values()) {
            if (endereco >= bloco.endereco && endereco < bloco.endereco + bloco.tamanho) {
                return bloco;
            }
        }

        return null;
    }

    /**
     * Calcula o tamanho de um tipo
     * @param {string} tipo - Tipo (int, char, etc.)
     * @param {boolean} ehArray - Se é um array
     * @param {number[]} dimensoes - Dimensões, se for array
     * @return {number} Tamanho em bytes
     * @private
     */
    _calculaTamanhoTipo(tipo, ehArray, dimensoes) {
        // Tamanho base do tipo
        let tamanhoBase = 0;

        if (tipo.includes('char')) tamanhoBase = 1;
        else if (tipo.includes('short')) tamanhoBase = 2;
        else if (tipo.includes('int')) tamanhoBase = 4;
        else if (tipo.includes('long long')) tamanhoBase = 8;
        else if (tipo.includes('long')) tamanhoBase = 4;
        else if (tipo.includes('float')) tamanhoBase = 4;
        else if (tipo.includes('double')) tamanhoBase = 8;
        else if (tipo.includes('void')) tamanhoBase = 1; // void* ou similar
        else if (tipo.includes('bool') || tipo.includes('_Bool')) tamanhoBase = 1;
        else tamanhoBase = 4; // Padrão (struct, enum, etc.)

        // Para arrays, multiplica pelo produto das dimensões
        if (ehArray && dimensoes && dimensoes.length > 0) {
            return tamanhoBase * dimensoes.reduce((acc, dim) => acc * (dim || 1), 1);
        }

        return tamanhoBase;
    }

    /**
     * Retorna o alinhamento requerido para um tipo
     * @param {string} tipo - Tipo (int, char, etc.)
     * @return {number} Alinhamento em bytes
     * @private
     */
    _pegaAlinhamentoTipo(tipo) {
        if (tipo.includes('char')) return 1;
        else if (tipo.includes('short')) return 2;
        else if (tipo.includes('int')) return 4;
        else if (tipo.includes('long long')) return 8;
        else if (tipo.includes('long')) return 4;
        else if (tipo.includes('float')) return 4;
        else if (tipo.includes('double')) return 8;
        else if (tipo.includes('void')) return 1;
        else if (tipo.includes('bool') || tipo.includes('_Bool')) return 1;
        else return 4; // Padrão
    }

    /**
     * Alinha um tamanho a um valor específico
     * @param {number} tamanho - Tamanho a alinhar
     * @param {number} alinhamento - Valor de alinhamento
     * @return {number} Tamanho alinhado
     * @private
     */
    _alinhaTamanho(tamanho, alinhamento) {
        return Math.ceil(tamanho / alinhamento) * alinhamento;
    }

    /**
     * Alinha um endereço a um valor específico
     * @param {number} endereco - Endereço a alinhar
     * @param {number} alinhamento - Valor de alinhamento
     * @return {number} Endereço alinhado
     * @private
     */
    _alinhaEndereco(endereco, alinhamento) {
        const resto = endereco % alinhamento;
        return resto === 0 ? endereco : endereco + (alinhamento - resto);
    }

    /**
     * Inicializa um array com valores
     * @param {any} valorInicial - Valor inicial ou array de valores
     * @param {number[]} dimensoes - Dimensões do array
     * @param {string} tipo - Tipo dos elementos
     * @return {Array} Array inicializado
     * @private
     */
    _inicializaArray(valorInicial, dimensoes, tipo) {
        // Se não houver dimensões ou forem inválidas
        if (!dimensoes || !dimensoes.length || dimensoes[0] <= 0) {
            return [];
        }

        // Se valorInicial já for um array e tiver o tamanho correto
        if (Array.isArray(valorInicial) && valorInicial.length === dimensoes[0]) {
            // Para arrays multidimensionais, inicializa recursivamente
            if (dimensoes.length > 1) {
                return valorInicial.map(v =>
                    Array.isArray(v) ? this._inicializaArray(v, dimensoes.slice(1), tipo) : this._valorPadrao(tipo)
                );
            }
            return [...valorInicial]; // Cria uma cópia
        }

        // Cria um array com a primeira dimensão
        const resultado = new Array(dimensoes[0]);

        // Preenche com valor padrão ou inicializa subarrays
        if (dimensoes.length === 1) {
            // Array unidimensional
            if (valorInicial !== null && valorInicial !== undefined) {
                // Inicializa com o valor fornecido
                resultado.fill(valorInicial);
            } else {
                // Inicializa com valor padrão para o tipo
                resultado.fill(this._valorPadrao(tipo));
            }
        } else {
            // Array multidimensional
            for (let i = 0; i < dimensoes[0]; i++) {
                resultado[i] = this._inicializaArray(null, dimensoes.slice(1), tipo);
            }
        }

        return resultado;
    }

    /**
     * Retorna o valor padrão para um tipo
     * @param {string} tipo - Tipo (int, char, etc.)
     * @return {any} Valor padrão para o tipo
     * @private
     */
    _valorPadrao(tipo) {
        if (tipo.includes('int') || tipo.includes('short') || tipo.includes('long') ||
            tipo.includes('char') || tipo.includes('byte')) {
            return 0;
        } else if (tipo.includes('float') || tipo.includes('double')) {
            return 0.0;
        } else if (tipo.includes('bool') || tipo.includes('_Bool')) {
            return false;
        } else if (tipo.includes('void') || tipo.includes('pointer')) {
            return 0; // NULL
        } else {
            return 0; // Padrão
        }
    }

    /**
     * Lê dados de variáveis estáticas
     * @param {number} endereco - Endereço na memória
     * @return {any} Valor lido
     * @private
     */
    _leDadosEstaticos(endereco) {
        for (const variavel of this.variaveis.estaticas.values()) {
            if (endereco >= variavel.endereco && endereco < variavel.endereco + variavel.tamanho) {
                if (variavel.ehArray) {
                    const offset = endereco - variavel.endereco;
                    // Calcula índice com base no offset e tamanho do elemento
                    const tamElem = this._calculaTamanhoTipo(variavel.tipo, false, []);
                    const indice = Math.floor(offset / tamElem);

                    if (indice >= 0 && indice < variavel.valor.length) {
                        return variavel.valor[indice];
                    }
                } else {
                    return variavel.valor;
                }
            }
        }

        if (this.opcoes.validarAcessos) {
            throw new Error(`Tentativa de ler memória não alocada no endereço 0x${endereco.toString(16)}`);
        }

        return undefined;
    }

    /**
     * Escreve dados em variáveis estáticas
     * @param {number} endereco - Endereço na memória
     * @param {any} valor - Valor a escrever
     * @return {boolean} True se a escrita foi bem-sucedida
     * @private
     */
    _escreveDadosEstaticos(endereco, valor) {
        for (const variavel of this.variaveis.estaticas.values()) {
            if (endereco >= variavel.endereco && endereco < variavel.endereco + variavel.tamanho) {
                if (variavel.ehArray) {
                    const offset = endereco - variavel.endereco;
                    // Calcula índice com base no offset e tamanho do elemento
                    const tamElem = this._calculaTamanhoTipo(variavel.tipo, false, []);
                    const indice = Math.floor(offset / tamElem);

                    if (indice >= 0 && indice < variavel.valor.length) {
                        variavel.valor[indice] = valor;
                        variavel.alteracoes.push({
                            valor: variavel.ehArray ? [...variavel.valor] : variavel.valor,
                            timestamp: Date.now()
                        });
                        return true;
                    }
                } else {
                    variavel.valor = valor;
                    variavel.alteracoes.push({
                        valor,
                        timestamp: Date.now()
                    });
                    return true;
                }
            }
        }

        if (this.opcoes.validarAcessos) {
            throw new Error(`Tentativa de escrever em memória não alocada no endereço 0x${endereco.toString(16)}`);
        }

        return false;
    }

    /**
     * Lê dados de variáveis globais
     * @param {number} endereco - Endereço na memória
     * @return {any} Valor lido
     * @private
     */
    _leDadosGlobais(endereco) {
        for (const variavel of this.variaveis.globais.values()) {
            if (endereco >= variavel.endereco && endereco < variavel.endereco + variavel.tamanho) {
                if (variavel.ehArray) {
                    const offset = endereco - variavel.endereco;
                    // Calcula índice com base no offset e tamanho do elemento
                    const tamElem = this._calculaTamanhoTipo(variavel.tipo, false, []);
                    const indice = Math.floor(offset / tamElem);

                    if (indice >= 0 && indice < variavel.valor.length) {
                        return variavel.valor[indice];
                    }
                } else {
                    return variavel.valor;
                }
            }
        }

        if (this.opcoes.validarAcessos) {
            throw new Error(`Tentativa de ler memória não alocada no endereço 0x${endereco.toString(16)}`);
        }

        return undefined;
    }

    /**
     * Escreve dados em variáveis globais
     * @param {number} endereco - Endereço na memória
     * @param {any} valor - Valor a escrever
     * @return {boolean} True se a escrita foi bem-sucedida
     * @private
     */
    _escreveDadosGlobais(endereco, valor) {
        for (const variavel of this.variaveis.globais.values()) {
            if (endereco >= variavel.endereco && endereco < variavel.endereco + variavel.tamanho) {
                if (variavel.ehArray) {
                    const offset = endereco - variavel.endereco;
                    // Calcula índice com base no offset e tamanho do elemento
                    const tamElem = this._calculaTamanhoTipo(variavel.tipo, false, []);
                    const indice = Math.floor(offset / tamElem);

                    if (indice >= 0 && indice < variavel.valor.length) {
                        variavel.valor[indice] = valor;
                        variavel.alteracoes.push({
                            valor: variavel.ehArray ? [...variavel.valor] : variavel.valor,
                            timestamp: Date.now()
                        });
                        return true;
                    }
                } else {
                    variavel.valor = valor;
                    variavel.alteracoes.push({
                        valor,
                        timestamp: Date.now()
                    });
                    return true;
                }
            }
        }

        if (this.opcoes.validarAcessos) {
            throw new Error(`Tentativa de escrever em memória não alocada no endereço 0x${endereco.toString(16)}`);
        }

        return false;
    }

    /**
     * Lê dados do segmento de dados constantes
     * @param {number} endereco - Endereço na memória
     * @return {any} Valor lido
     * @private
     */
    _leDadosConstantes(endereco) {
        for (const [addrBase, info] of this.segmentoDados.entries()) {
            if (endereco >= addrBase && endereco < addrBase + info.tamanho) {
                if (info.tipo === 'string') {
                    const offset = endereco - addrBase;
                    // Retorna o caractere da string ou 0 para o nulo terminador
                    return offset < info.valor.length ? info.valor.charCodeAt(offset) : 0;
                } else {
                    return info.valor;
                }
            }
        }

        if (this.opcoes.validarAcessos) {
            throw new Error(`Tentativa de ler memória não alocada no endereço 0x${endereco.toString(16)}`);
        }

        return undefined;
    }

    /**
     * Lê dados da pilha
     * @param {number} endereco - Endereço na memória
     * @return {any} Valor lido
     * @private
     */
    _lePilha(endereco) {
        // Procura em todos os frames
        for (const frame of this.pilha) {
            // Verifica se o endereço está no range do frame
            if (endereco < frame.enderecoBase && endereco >= frame.enderecoBase - frame.tamanho) {
                // Procura em variáveis locais
                for (const variavel of frame.variaveis.values()) {
                    if (endereco >= variavel.endereco && endereco < variavel.endereco + variavel.tamanho) {
                        if (variavel.ehArray) {
                            const offset = endereco - variavel.endereco;
                            // Calcula índice com base no offset e tamanho do elemento
                            const tamElem = this._calculaTamanhoTipo(variavel.tipo, false, []);
                            const indice = Math.floor(offset / tamElem);

                            if (indice >= 0 && indice < variavel.valor.length) {
                                return variavel.valor[indice];
                            }
                        } else {
                            return variavel.valor;
                        }
                    }
                }

                // Procura em parâmetros
                for (const parametro of frame.parametros.values()) {
                    if (endereco === parametro.endereco) {
                        return parametro.valor;
                    }
                }
            }
        }

        if (this.opcoes.validarAcessos) {
            throw new Error(`Tentativa de ler memória não alocada no endereço 0x${endereco.toString(16)}`);
        }

        return undefined;
    }

    /**
     * Escreve dados na pilha
     * @param {number} endereco - Endereço na memória
     * @param {any} valor - Valor a escrever
     * @return {boolean} True se a escrita foi bem-sucedida
     * @private
     */
    _escrevePilha(endereco, valor) {
        // Procura em todos os frames
        for (const frame of this.pilha) {
            // Verifica se o endereço está no range do frame
            if (endereco < frame.enderecoBase && endereco >= frame.enderecoBase - frame.tamanho) {
                // Procura em variáveis locais
                for (const variavel of frame.variaveis.values()) {
                    if (endereco >= variavel.endereco && endereco < variavel.endereco + variavel.tamanho) {
                        if (variavel.ehArray) {
                            const offset = endereco - variavel.endereco;
                            // Calcula índice com base no offset e tamanho do elemento
                            const tamElem = this._calculaTamanhoTipo(variavel.tipo, false, []);
                            const indice = Math.floor(offset / tamElem);

                            if (indice >= 0 && indice < variavel.valor.length) {
                                variavel.valor[indice] = valor;
                                variavel.alteracoes.push({
                                    valor: variavel.ehArray ? [...variavel.valor] : variavel.valor,
                                    timestamp: Date.now()
                                });
                                return true;
                            }
                        } else {
                            variavel.valor = valor;
                            variavel.alteracoes.push({
                                valor,
                                timestamp: Date.now()
                            });
                            return true;
                        }
                    }
                }

                // Procura em parâmetros
                for (const parametro of frame.parametros.values()) {
                    if (endereco === parametro.endereco) {
                        parametro.valor = valor;
                        parametro.alteracoes.push({
                            valor,
                            timestamp: Date.now()
                        });
                        return true;
                    }
                }
            }
        }

        if (this.opcoes.validarAcessos) {
            throw new Error(`Tentativa de escrever em memória não alocada no endereço 0x${endereco.toString(16)}`);
        }

        return false;
    }
}

// Exporta a classe
export default GerenciadorMemoria;