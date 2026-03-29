// script.js
// Arquivo principal para integração dos módulos do IFSCEE - Veja C sendo Interpretado

import AnalisadorLexico from './analisadorLexico.js';
import AnalisadorSintatico from './analisadorSintatico.js';
import GerenciadorMemoria from './gerenciadorMemoria.js';
import NoAST from './noAst.js';
import Token from './token.js';
import InterpretadorC from './interpretadorC.js';
import RegistroExecucao from './registroExecucao.js';
import SimuladorIO from './simuladorIO.js';

// Classe principal que integra todos os componentes
class IFSCEE {
    constructor() {
        // Instâncias dos componentes principais
        this.analisadorLexico = null;
        this.analisadorSintatico = null;
        this.gerenciadorMemoria = null;
        this.simuladorIO = null;
        this.registroExecucao = null;
        this.interpretadorC = null;

        // Estado da aplicação
        this.codigoFonte = '';
        this.tokens = [];
        this.ast = null;
        this.emExecucao = false;
        this.pausado = false;
        this.arquivoAtual = 'main.c';

        // Configurações
        this.configuracoes = {
            versaoC: 'C17',
            modoEstrito: false,
            detectarVazamentos: true,
            validarAcessos: true,
            modoDepuracao: true
        };

        // Elementos da UI
        this.elementosUI = {
            editor: null,
            saida: null,
            entrada: null,
            tokens: null,
            ast: null,
            pilha: null,
            heap: null,
            arquivos: null,
            botaoExecutar: null,
            botaoAnterior: null,
            botaoProximo: null,
            botaoReiniciar: null
        };

        // Inicializar a aplicação
        this.inicializar();
    }

    /**
     * Inicializa a aplicação e seus componentes
     */
    inicializar() {
        // Configurar referências de elementos da UI
        this.configurarElementosUI();

        // Inicializar componentes
        this.inicializarComponentes();

        // Registrar event listeners
        this.registrarEventListeners();

        // Se disponível, carregar código de exemplo
        this.carregarCodigoExemplo();

        console.log("IFSCEE inicializado com sucesso!");
    }

    /**
     * Configura referências aos elementos da UI
     */
    configurarElementosUI() {
        this.elementosUI = {
            editor: document.querySelector('.editor .conteudo'),
            saida: document.querySelector('.areaSaida'),
            entrada: document.querySelector('.areaEntrada'),
            tokens: document.querySelector('.tokens .conteudo'),
            ast: document.querySelector('.ast .conteudo'),
            pilha: document.querySelector('.pilha .conteudo'),
            heap: document.querySelector('.heap .conteudo'),
            arquivos: document.querySelector('.arquivos .conteudo'),
            botaoExecutar: document.querySelector('.botao-primario'),
            botaoAnterior: document.querySelector('.botao-secundario:nth-child(2)'),
            botaoProximo: document.querySelector('.botao-secundario:nth-child(3)'),
            botaoReiniciar: document.querySelector('.botao-perigo')
        };

        // Verificar se os elementos foram encontrados
        const elementosNaoEncontrados = Object.entries(this.elementosUI)
            .filter(([_, elemento]) => !elemento)
            .map(([nome]) => nome);

        if (elementosNaoEncontrados.length > 0) {
            console.warn(`Elementos da UI não encontrados: ${elementosNaoEncontrados.join(', ')}`);
        }
    }

    /**
     * Inicializa todos os componentes necessários
     */
    inicializarComponentes() {
        // Inicializar o gerenciador de memória
        this.gerenciadorMemoria = new GerenciadorMemoria({
            detectarVazamentos: this.configuracoes.detectarVazamentos,
            validarAcessos: this.configuracoes.validarAcessos
        });

        // Inicializar o simulador de I/O
        this.simuladorIO = new SimuladorIO({
            gerenciadorMemoria: this.gerenciadorMemoria
        });

        // Configurar elementos de I/O
        if (this.elementosUI.entrada && this.elementosUI.saida) {
            this.simuladorIO.defineElementosUI(
                this.elementosUI.entrada,
                this.elementosUI.saida
            );
        }

        // Inicializar o registro de execução
        this.registroExecucao = new RegistroExecucao({
            tamanhoMaximoHistorico: 1000,
            registrarHistorico: true
        });

        // Inicializar o analisador léxico
        this.analisadorLexico = new AnalisadorLexico({
            versaoC: this.configuracoes.versaoC,
            preservaComentarios: true
        });

        // Inicializar o analisador sintático
        this.analisadorSintatico = new AnalisadorSintatico(
            this.analisadorLexico,
            {
                versaoC: this.configuracoes.versaoC,
                modoEstrito: this.configuracoes.modoEstrito
            }
        );

        // Inicializar o interpretador
        this.interpretadorC = new InterpretadorC(
            this.gerenciadorMemoria,
            this.simuladorIO,
            this.registroExecucao
        );
    }

    /**
     * Registra os event listeners para os elementos da UI
     */
    registrarEventListeners() {
        // Botão Executar
        if (this.elementosUI.botaoExecutar) {
            this.elementosUI.botaoExecutar.addEventListener('click', () => {
                this.executar();
            });
        }

        // Botão Anterior
        if (this.elementosUI.botaoAnterior) {
            this.elementosUI.botaoAnterior.addEventListener('click', () => {
                this.passoAnterior();
            });
        }

        // Botão Próximo
        if (this.elementosUI.botaoProximo) {
            this.elementosUI.botaoProximo.addEventListener('click', () => {
                this.proximoPasso();
            });
        }

        // Botão Reiniciar
        if (this.elementosUI.botaoReiniciar) {
            this.elementosUI.botaoReiniciar.addEventListener('click', () => {
                this.reiniciar();
            });
        }

        // Entrada de código
        if (this.elementosUI.editor) {
            // Adicionando CodeMirror ou outro editor de código
            this.configurarEditorCodigo();
        }

        // Escutar alterações de registro de execução
        this.registroExecucao.adicionaEscutador((evento) => {
            this.atualizarUI(evento);
        });
    }

    /**
     * Configura o editor de código (CodeMirror ou similar)
     */
    configurarEditorCodigo() {
        // Se não temos uma instância de editor ainda
        if (!this.editor) {
            // Verificar se estamos em ambiente com CodeMirror disponível
            if (typeof CodeMirror !== 'undefined') {
                try {
                    this.editor = CodeMirror(this.elementosUI.editor, {
                        mode: 'text/x-csrc',
                        theme: 'monokai',
                        lineNumbers: true,
                        indentUnit: 4,
                        tabSize: 4,
                        smartIndent: true,
                        indentWithTabs: false,
                        electricChars: true,
                        gutters: ["CodeMirror-linenumbers", "breakpoints"],
                        matchBrackets: true,
                        autoCloseBrackets: true
                    });

                    // Adicionar evento de mudança para atualizar o código fonte
                    this.editor.on('change', () => {
                        this.codigoFonte = this.editor.getValue();
                        this.atualizarTokens();
                    });

                    // Adicionar evento de clique para definir breakpoints
                    this.editor.on('gutterClick', (cm, linha) => {
                        this.alternarBreakpoint(linha + 1); // +1 porque linha é 0-indexada
                    });

                } catch (erro) {
                    console.error('Erro ao inicializar CodeMirror:', erro);
                    this.usarEditorSimples();
                }
            } else {
                // Fallback para editor simples
                this.usarEditorSimples();
            }
        }
    }

    /**
     * Usa um editor simples (textarea) como fallback
     */
    usarEditorSimples() {
        // Remover conteúdo atual
        this.elementosUI.editor.innerHTML = '';

        // Criar textarea
        const textarea = document.createElement('textarea');
        textarea.className = 'editorSimples';
        textarea.spellcheck = false;
        textarea.placeholder = 'Digite seu código C aqui...';
        textarea.style.width = '100%';
        textarea.style.height = '100%';
        textarea.style.fontFamily = 'monospace';
        textarea.style.resize = 'none';
        textarea.style.border = 'none';
        textarea.style.outline = 'none';
        textarea.style.padding = '8px';

        // Adicionar evento de input para atualizar o código fonte
        textarea.addEventListener('input', () => {
            this.codigoFonte = textarea.value;
            this.atualizarTokens();
        });

        // Adicionar ao editor
        this.elementosUI.editor.appendChild(textarea);

        // Referência ao editor simples
        this.editor = {
            getValue: () => textarea.value,
            setValue: (valor) => { textarea.value = valor; }
        };
    }

    /**
     * Carrega um código de exemplo no editor
     */
    carregarCodigoExemplo() {
        const codigoExemplo = `/* Exemplo de código C - Hello World */
#include <stdio.h>

int main() {
    // Declaração de variáveis
    const char* mensagem = "Olá, mundo!";
    int contador = 0;
    
    // Imprime a mensagem
    printf("%s\\n", mensagem);
    
    // Loop de exemplo
    while (contador < 5) {
        printf("Contador: %d\\n", contador);
        contador++;
    }
    
    return 0;
}`;

        // Definir o código no editor
        if (this.editor) {
            this.editor.setValue(codigoExemplo);
        }

        // Atualizar o código fonte
        this.codigoFonte = codigoExemplo;

        // Analisar o código imediatamente
        this.analisarCodigo();
    }

    /**
     * Analisa o código fonte atual
     */
    analisarCodigo() {
        try {
            // Zerar o estado
            this.tokens = [];
            this.ast = null;

            // Analisar tokens
            this.tokens = this.analisadorLexico.analisaTexto(this.codigoFonte, this.arquivoAtual);

            // Mostrar tokens
            this.atualizarVisualizacaoTokens();

            // Analisar sintaxe (se temos tokens)
            if (this.tokens.length > 0) {
                this.ast = this.analisadorSintatico.analisaTokens(this.tokens);

                // Mostrar AST
                this.atualizarVisualizacaoAST();

                console.log("Análise de código concluída com sucesso!");
                return true;
            }
        } catch (erro) {
            console.error("Erro ao analisar código:", erro);
            this.mostrarErro(erro);
            return false;
        }

        return false;
    }

    /**
     * Atualiza os tokens quando o código muda
     */
    atualizarTokens() {
        // Debounce para não analisar a cada tecla
        clearTimeout(this.timeoutAnalise);
        this.timeoutAnalise = setTimeout(() => {
            this.analisarCodigo();
        }, 500);
    }

    /**
     * Atualiza a visualização dos tokens na UI
     */
    atualizarVisualizacaoTokens() {
        if (!this.elementosUI.tokens) return;

        const container = this.elementosUI.tokens;
        container.innerHTML = '';

        // Criar tabela de tokens
        const tabela = document.createElement('table');
        tabela.className = 'tabelaTokens';

        // Cabeçalho da tabela
        const cabecalho = document.createElement('thead');
        cabecalho.innerHTML = `
            <tr>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Linha</th>
                <th>Coluna</th>
            </tr>
        `;
        tabela.appendChild(cabecalho);

        // Corpo da tabela
        const corpo = document.createElement('tbody');

        // Adicionar cada token
        this.tokens.forEach(token => {
            if (token.tipo === Token.TIPOS.WHITESPACE ||
                token.tipo === Token.TIPOS.EOF) {
                return; // Pular tokens de whitespace e EOF
            }

            const linha = document.createElement('tr');

            const tipo = document.createElement('td');
            tipo.textContent = token.tipo;
            tipo.className = `token-${token.tipo.toLowerCase()}`;

            const valor = document.createElement('td');
            valor.textContent = token.valor;
            if (token.tipo === Token.TIPOS.STRING_LITERAL || token.tipo === Token.TIPOS.CHAR_LITERAL) {
                valor.className = 'token-literal';
            }

            const linhaTd = document.createElement('td');
            linhaTd.textContent = token.linha;

            const coluna = document.createElement('td');
            coluna.textContent = token.coluna;

            linha.appendChild(tipo);
            linha.appendChild(valor);
            linha.appendChild(linhaTd);
            linha.appendChild(coluna);

            corpo.appendChild(linha);
        });

        tabela.appendChild(corpo);
        container.appendChild(tabela);
    }

    /**
     * Atualiza a visualização da AST na UI
     */
    atualizarVisualizacaoAST() {
        if (!this.elementosUI.ast || !this.ast) return;

        const container = this.elementosUI.ast;
        container.innerHTML = '';

        // Criar visualização da AST
        const visualizacaoAst = document.createElement('div');
        visualizacaoAst.className = 'arvoreAst';

        // Criar função recursiva para renderizar a árvore
        const renderizarNo = (no, pai) => {
            const noElement = document.createElement('div');
            noElement.className = 'noAst';

            const cabecalhoNo = document.createElement('div');
            cabecalhoNo.className = 'cabecalhoNoAst';
            cabecalhoNo.textContent = no.tipo;
            if (no.valor) {
                cabecalhoNo.textContent += `: "${no.valor}"`;
            }

            noElement.appendChild(cabecalhoNo);

            // Adicionar filhos
            if (no.filhos && no.filhos.length > 0) {
                const filhosContainer = document.createElement('div');
                filhosContainer.className = 'filhosNoAst';

                no.filhos.forEach(filho => {
                    renderizarNo(filho, filhosContainer);
                });

                noElement.appendChild(filhosContainer);
            }

            pai.appendChild(noElement);
        };

        // Iniciar a renderização pela raiz
        renderizarNo(this.ast, visualizacaoAst);

        container.appendChild(visualizacaoAst);
    }

    /**
     * Executa o programa completo
     */
    executar() {
        // Verificar se já está em execução
        if (this.emExecucao && !this.pausado) {
            this.pausar();
            return;
        }

        // Verificar se o código foi analisado
        if (!this.ast) {
            if (!this.analisarCodigo()) {
                return;
            }
        }

        // Se estava pausado, continuar
        if (this.pausado) {
            this.continuar();
            return;
        }

        // Reiniciar todos os componentes
        this.reiniciar(true); // true = não reanalisar código

        // Iniciar a execução
        this.emExecucao = true;
        this.pausado = false;

        // Atualizar texto do botão
        if (this.elementosUI.botaoExecutar) {
            this.elementosUI.botaoExecutar.textContent = '⏸ Pausar';
        }

        // Iniciar execução no interpretador
        this.interpretadorC.inicializa(this.ast);

        // Iniciar registro de execução
        this.registroExecucao.iniciaExecucao({
            nomePrograma: 'Programa C',
            arquivoAtual: this.arquivoAtual
        });

        // Executar o programa
        try {
            this.interpretadorC.executar();

            // Finalizar registro de execução
            const resultado = this.registroExecucao.finalizaExecucao({
                codigoSaida: 0,
                terminouComErro: false
            });

            // Atualizar UI com resultado final
            this.atualizarUI({
                tipo: 'fimExecucao',
                resultado
            });

            // Resetar estado
            this.emExecucao = false;
            this.pausado = false;

            // Atualizar texto do botão
            if (this.elementosUI.botaoExecutar) {
                this.elementosUI.botaoExecutar.textContent = '▶ Executar';
            }

            console.log("Execução concluída com sucesso!");
        } catch (erro) {
            console.error("Erro durante a execução:", erro);
            this.mostrarErro(erro);

            // Finalizar registro de execução com erro
            this.registroExecucao.finalizaExecucao({
                codigoSaida: 1,
                terminouComErro: true,
                mensagemErro: erro.message
            });

            // Resetar estado
            this.emExecucao = false;
            this.pausado = false;

            // Atualizar texto do botão
            if (this.elementosUI.botaoExecutar) {
                this.elementosUI.botaoExecutar.textContent = '▶ Executar';
            }
        }
    }

    /**
     * Executa um passo a frente
     */
    proximoPasso() {
        // Verificar se o código foi analisado
        if (!this.ast) {
            if (!this.analisarCodigo()) {
                return;
            }
        }

        // Se não iniciou execução ainda, inicializar
        if (!this.emExecucao) {
            // Reiniciar todos os componentes
            this.reiniciar(true); // true = não reanalisar código

            // Iniciar a execução
            this.emExecucao = true;
            this.pausado = true;

            // Iniciar execução no interpretador
            this.interpretadorC.inicializa(this.ast);

            // Iniciar registro de execução
            this.registroExecucao.iniciaExecucao({
                nomePrograma: 'Programa C',
                arquivoAtual: this.arquivoAtual
            });
        }

        try {
            // Executar próximo passo
            const resultado = this.interpretadorC.proximoPasso();

            // Verificar se finalizou
            if (resultado && resultado.finalizado) {
                // Finalizar registro de execução
                this.registroExecucao.finalizaExecucao({
                    codigoSaida: 0,
                    terminouComErro: false
                });

                // Resetar estado
                this.emExecucao = false;
                this.pausado = false;

                // Atualizar texto do botão
                if (this.elementosUI.botaoExecutar) {
                    this.elementosUI.botaoExecutar.textContent = '▶ Executar';
                }

                console.log("Execução concluída com sucesso!");
            }
        } catch (erro) {
            console.error("Erro durante a execução do passo:", erro);
            this.mostrarErro(erro);

            // Finalizar registro de execução com erro
            this.registroExecucao.finalizaExecucao({
                codigoSaida: 1,
                terminouComErro: true,
                mensagemErro: erro.message
            });

            // Resetar estado
            this.emExecucao = false;
            this.pausado = false;
        }
    }

    /**
     * Navega para o passo anterior
     */
    passoAnterior() {
        // Verificar se temos estados anteriores
        if (this.registroExecucao.temEstadoAnterior()) {
            // Obter o estado anterior
            const estadoAnterior = this.registroExecucao.retrocede();

            // Atualizar UI com o estado anterior
            this.atualizarUI({
                tipo: 'mudancaEstado',
                estado: estadoAnterior,
                direcao: 'retrocede'
            });
        } else {
            console.log("Não há estados anteriores disponíveis.");
        }
    }

    /**
     * Pausa a execução
     */
    pausar() {
        if (this.emExecucao && !this.pausado) {
            this.pausado = true;
            this.interpretadorC.pausar();

            // Atualizar texto do botão
            if (this.elementosUI.botaoExecutar) {
                this.elementosUI.botaoExecutar.textContent = '▶ Continuar';
            }

            console.log("Execução pausada.");
        }
    }

    /**
     * Continua a execução após pausa
     */
    continuar() {
        if (this.emExecucao && this.pausado) {
            this.pausado = false;

            // Atualizar texto do botão
            if (this.elementosUI.botaoExecutar) {
                this.elementosUI.botaoExecutar.textContent = '⏸ Pausar';
            }

            // Continuar execução
            try {
                this.interpretadorC.executar();

                // Finalizar registro de execução
                const resultado = this.registroExecucao.finalizaExecucao({
                    codigoSaida: 0,
                    terminouComErro: false
                });

                // Atualizar UI com resultado final
                this.atualizarUI({
                    tipo: 'fimExecucao',
                    resultado
                });

                // Resetar estado
                this.emExecucao = false;
                this.pausado = false;

                // Atualizar texto do botão
                if (this.elementosUI.botaoExecutar) {
                    this.elementosUI.botaoExecutar.textContent = '▶ Executar';
                }

                console.log("Execução concluída com sucesso!");
            } catch (erro) {
                console.error("Erro durante a execução:", erro);
                this.mostrarErro(erro);

                // Finalizar registro de execução com erro
                this.registroExecucao.finalizaExecucao({
                    codigoSaida: 1,
                    terminouComErro: true,
                    mensagemErro: erro.message
                });

                // Resetar estado
                this.emExecucao = false;
                this.pausado = false;

                // Atualizar texto do botão
                if (this.elementosUI.botaoExecutar) {
                    this.elementosUI.botaoExecutar.textContent = '▶ Executar';
                }
            }
        }
    }

    /**
     * Reinicia o estado da aplicação
     * @param {boolean} manterCodigo - Se true, mantém o código analisado
     */
    reiniciar(manterCodigo = false) {
        // Resetar estado de execução
        this.emExecucao = false;
        this.pausado = false;

        // Atualizar texto do botão
        if (this.elementosUI.botaoExecutar) {
            this.elementosUI.botaoExecutar.textContent = '▶ Executar';
        }

        // Reiniciar componentes
        this.gerenciadorMemoria.reiniciar();
        this.simuladorIO.limpaBuffers();
        this.registroExecucao.limpaHistorico();

        // Limpar UI
        this.atualizarVisualizacaoPilha();
        this.atualizarVisualizacaoHeap();

        // Reanalisar código se necessário
        if (!manterCodigo) {
            this.tokens = [];
            this.ast = null;
            this.analisarCodigo();
        }

        console.log("Aplicação reiniciada.");
    }

    /**
     * Alterna o estado de um breakpoint
     * @param {number} linha - Número da linha (1-indexed)
     */
    alternarBreakpoint(linha) {
        if (this.registroExecucao.temBreakpoint(linha)) {
            this.registroExecucao.removeBreakpoint(linha);

            // Atualizar marcador no editor
            if (this.editor && typeof this.editor.removeLineClass === 'function') {
                this.editor.removeLineClass(linha - 1, 'gutter', 'breakpoint');
            }

            console.log(`Breakpoint removido da linha ${linha}`);
        } else {
            this.registroExecucao.adicionaBreakpoint(linha);

            // Atualizar marcador no editor
            if (this.editor && typeof this.editor.addLineClass === 'function') {
                this.editor.addLineClass(linha - 1, 'gutter', 'breakpoint');
            }

            console.log(`Breakpoint adicionado na linha ${linha}`);
        }
    }

    /**
     * Atualiza a UI com base no estado atual
     * @param {Object} evento - Evento de mudança de estado
     */
    atualizarUI(evento) {
        // Atualizar linha atual no editor
        this.atualizarLinhaAtual(evento);

        // Atualizar visualização da pilha e heap
        this.atualizarVisualizacaoPilha();
        this.atualizarVisualizacaoHeap();

        // Processar eventos específicos
        switch (evento.tipo) {
            case 'breakpointAtingido':
                this.pausar();
                this.destacarLinha(evento.linha);
                break;

            case 'fimExecucao':
                // Exibir estatísticas
                this.mostrarEstatisticas(evento.resultado.estatisticas);
                break;
        }
    }

    /**
     * Atualiza a linha atual no editor
     * @param {Object} evento - Evento de mudança de estado
     */
    atualizarLinhaAtual(evento) {
        // Remover destaque da linha anterior
        if (this.linhaAtual && this.editor && typeof this.editor.removeLineClass === 'function') {
            this.editor.removeLineClass(this.linhaAtual - 1, 'background', 'linha-atual');
        }

        // Verificar se o evento tem informação de linha
        if (evento && evento.estado && evento.estado.linha) {
            this.linhaAtual = evento.estado.linha;

            // Destacar nova linha atual
            if (this.editor && typeof this.editor.addLineClass === 'function') {
                this.editor.addLineClass(this.linhaAtual - 1, 'background', 'linha-atual');

                // Rolar para a linha
                this.editor.scrollIntoView({ line: this.linhaAtual - 1, ch: 0 }, 100);
            }
        }
    }

    /**
     * Destaca uma linha específica no editor
     * @param {number} linha - Número da linha (1-indexed)
     */
    destacarLinha(linha) {
        if (this.editor && typeof this.editor.addLineClass === 'function') {
            // Remover destaque da linha anterior
            if (this.linhaDestacada) {
                this.editor.removeLineClass(this.linhaDestacada - 1, 'background', 'linha-destacada');
            }

            // Destacar nova linha
            this.editor.addLineClass(linha - 1, 'background', 'linha-destacada');
            this.linhaDestacada = linha;

            // Rolar para a linha
            this.editor.scrollIntoView({ line: linha - 1, ch: 0 }, 100);
        }
    }

    /**
     * Atualiza a visualização da pilha
     */
    atualizarVisualizacaoPilha() {
        if (!this.elementosUI.pilha) return;

        const container = this.elementosUI.pilha;
        container.innerHTML = '';

        // Obter estado atual da memória
        const estadoMemoria = this.gerenciadorMemoria.pegaEstadoMemoria();

        // Criar visualização da pilha
        const pilhaContainer = document.createElement('div');
        pilhaContainer.className = 'pilhaContainer';

        // Adicionar frames
        estadoMemoria.pilha.frames.forEach((frame, indice) => {
            const frameElement = document.createElement('div');
            frameElement.className = 'frameContainer';

            // Cabeçalho do frame
            const cabecalhoFrame = document.createElement('div');
            cabecalhoFrame.className = 'cabecalhoFrame';
            cabecalhoFrame.textContent = `Frame ${indice}: ${frame.nome}`;

            // Variáveis do frame
            const variaveisFrame = document.createElement('div');
            variaveisFrame.className = 'variaveisFrame';

            // Adicionar variáveis locais
            if (frame.variaveis.length > 0) {
                const tituloVars = document.createElement('div');
                tituloVars.className = 'tituloSecao';
                tituloVars.textContent = 'Variáveis Locais:';
                variaveisFrame.appendChild(tituloVars);

                frame.variaveis.forEach(v => {
                    const varElement = document.createElement('div');
                    varElement.className = 'variavelItem';

                    let valorFormatado = this._formatarValorVariavel(v.valor, v.tipo);
                    varElement.textContent = `${v.tipo} ${v.nome} = ${valorFormatado}`;

                    variaveisFrame.appendChild(varElement);
                });
            }

            // Adicionar parâmetros
            if (frame.parametros.length > 0) {
                const tituloParams = document.createElement('div');
                tituloParams.className = 'tituloSecao';
                tituloParams.textContent = 'Parâmetros:';
                variaveisFrame.appendChild(tituloParams);

                frame.parametros.forEach(p => {
                    const paramElement = document.createElement('div');
                    paramElement.className = 'parametroItem';

                    let valorFormatado = this._formatarValorVariavel(p.valor, p.tipo);
                    paramElement.textContent = `${p.tipo} ${p.nome} = ${valorFormatado}`;

                    variaveisFrame.appendChild(paramElement);
                });
            }

            frameElement.appendChild(cabecalhoFrame);
            frameElement.appendChild(variaveisFrame);

            pilhaContainer.appendChild(frameElement);
        });

        // Se não houver frames, mostrar mensagem
        if (estadoMemoria.pilha.frames.length === 0) {
            const mensagem = document.createElement('div');
            mensagem.className = 'mensagemVazia';
            mensagem.textContent = 'A pilha está vazia.';
            pilhaContainer.appendChild(mensagem);
        }

        container.appendChild(pilhaContainer);
    }

    /**
     * Atualiza a visualização da heap
     */
    atualizarVisualizacaoHeap() {
        if (!this.elementosUI.heap) return;

        const container = this.elementosUI.heap;
        container.innerHTML = '';

        // Obter estado atual da memória
        const estadoMemoria = this.gerenciadorMemoria.pegaEstadoMemoria();

        // Criar visualização da heap
        const heapContainer = document.createElement('div');
        heapContainer.className = 'heapContainer';

        // Adicionar blocos alocados
        if (estadoMemoria.heap.blocos.length > 0) {
            const tituloBlocos = document.createElement('div');
            tituloBlocos.className = 'tituloSecao';
            tituloBlocos.textContent = 'Blocos Alocados:';
            heapContainer.appendChild(tituloBlocos);

            estadoMemoria.heap.blocos.forEach(bloco => {
                const blocoElement = document.createElement('div');
                blocoElement.className = 'blocoHeap';

                const cabecalhoBloco = document.createElement('div');
                cabecalhoBloco.className = 'cabecalhoBloco';
                cabecalhoBloco.textContent = `Bloco: 0x${bloco.endereco.toString(16).padStart(8, '0')}`;

                const infoBloco = document.createElement('div');
                infoBloco.className = 'infoBloco';
                infoBloco.innerHTML = `
                    <div>Tamanho: ${bloco.tamanho} bytes</div>
                    <div>Alocado em: ${new Date(bloco.alocadoEm).toLocaleTimeString()}</div>
                    <div>Origem: ${bloco.origem || 'Desconhecida'}</div>
                `;

                blocoElement.appendChild(cabecalhoBloco);
                blocoElement.appendChild(infoBloco);

                heapContainer.appendChild(blocoElement);
            });
        }

        // Adicionar variáveis globais
        if (estadoMemoria.globais.length > 0) {
            const tituloGlobais = document.createElement('div');
            tituloGlobais.className = 'tituloSecao';
            tituloGlobais.textContent = 'Variáveis Globais:';
            heapContainer.appendChild(tituloGlobais);

            estadoMemoria.globais.forEach(v => {
                const varElement = document.createElement('div');
                varElement.className = 'variavelGlobal';

                let valorFormatado = this._formatarValorVariavel(v.valor, v.tipo);
                varElement.textContent = `${v.tipo} ${v.nome} = ${valorFormatado}`;

                heapContainer.appendChild(varElement);
            });
        }

        // Se não houver blocos nem globais, mostrar mensagem
        if (estadoMemoria.heap.blocos.length === 0 && estadoMemoria.globais.length === 0) {
            const mensagem = document.createElement('div');
            mensagem.className = 'mensagemVazia';
            mensagem.textContent = 'A heap está vazia.';
            heapContainer.appendChild(mensagem);
        }

        // Adicionar estatísticas da heap
        const estatisticasHeap = document.createElement('div');
        estatisticasHeap.className = 'estatisticasHeap';
        estatisticasHeap.innerHTML = `
            <div>Utilizado: ${this._formatarTamanho(estadoMemoria.heap.utilizado)} de ${this._formatarTamanho(estadoMemoria.heap.total)}</div>
            <div>Percentual: ${estadoMemoria.heap.percentual.toFixed(2)}%</div>
        `;

        heapContainer.appendChild(estatisticasHeap);
        container.appendChild(heapContainer);
    }

    /**
     * Mostra um erro na interface
     * @param {Error} erro - Objeto de erro
     */
    mostrarErro(erro) {
        // Adicionar ao simulador de I/O para mostrar na saída
        this.simuladorIO.adicionaSaida(`\n[ERRO] ${erro.message}\n`, { erro: true });

        // Destacar linha do erro se disponível
        if (erro.linha && this.editor) {
            this.destacarLinha(erro.linha);
        }

        // Adicionar classe de erro ao elemento da saída
        if (this.elementosUI.saida) {
            this.elementosUI.saida.classList.add('com-erro');

            // Remover a classe após um tempo
            setTimeout(() => {
                this.elementosUI.saida.classList.remove('com-erro');
            }, 3000);
        }
    }

    /**
     * Mostra estatísticas de execução
     * @param {Object} estatisticas - Objeto com estatísticas
     */
    mostrarEstatisticas(estatisticas) {
        if (!estatisticas) return;

        const mensagem = `
=== Estatísticas de Execução ===
Passos totais: ${estatisticas.totalPassos}
Tempo de execução: ${(estatisticas.tempoExecucao / 1000).toFixed(2)}s
Instruções por segundo: ${Math.round(estatisticas.instrucoesPorSegundo)}
Memória máxima utilizada: ${this._formatarTamanho(estatisticas.maxMemoriaUtilizada)}
`;

        this.simuladorIO.adicionaSaida(mensagem);
    }

    /**
     * Formata o valor de uma variável para exibição
     * @param {any} valor - Valor da variável
     * @param {string} tipo - Tipo da variável
     * @return {string} Valor formatado
     */
    _formatarValorVariavel(valor, tipo) {
        if (valor === null || valor === undefined) {
            return 'NULL';
        }

        // Formatar com base no tipo
        if (tipo.includes('char*') || tipo.includes('char *') || tipo.includes('string')) {
            // É uma string
            if (typeof valor === 'string') {
                return `"${valor}"`;
            }
            // É um ponteiro para string (endereço)
            return `0x${valor.toString(16).padStart(8, '0')}`;
        }

        if (tipo.includes('char')) {
            // Caractere
            if (typeof valor === 'number') {
                return `'${String.fromCharCode(valor)}' (${valor})`;
            }
            return `'${valor}'`;
        }

        if (Array.isArray(valor)) {
            // Array
            if (valor.length <= 5) {
                return `[${valor.join(', ')}]`;
            }
            return `[${valor.slice(0, 5).join(', ')}... +${valor.length - 5} elementos]`;
        }

        if (typeof valor === 'object') {
            // Objeto
            return JSON.stringify(valor);
        }

        // Valor simples
        return String(valor);
    }

    /**
     * Formata um tamanho em bytes para uma string legível
     * @param {number} bytes - Tamanho em bytes
     * @return {string} Tamanho formatado
     */
    _formatarTamanho(bytes) {
        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
    }
}

// Inicialização da aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se os módulos foram carregados corretamente
    try {
        window.appIFSCEE = new IFSCEE();
        console.log("IFSCEE inicializado e disponível como window.appIFSCEE");
    } catch (erro) {
        console.error("Erro ao inicializar IFSCEE:", erro);

        // Mostrar erro na interface
        const saida = document.querySelector('.areaSaida');
        if (saida) {
            saida.textContent = `Erro ao inicializar aplicação: ${erro.message}\n\nVerifique se todos os arquivos JavaScript necessários foram carregados.`;
        }
    }
});

// Exporta a classe
export default IFSCEE;