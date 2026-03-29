/**
 * IFSCee - UI Controller
 * Responsável por:
 * - Gerenciar eventos da UI
 * - Sincronizar estado do editor
 * - Renderizar memória, AST, tokens
 * - Orquestrar o fluxo de execução
 */

class UIController {
    constructor() {
        // ============ CACHE DE ELEMENTOS ============
        // Editor
        this.editor = document.getElementById('editor-codigo');
        this.highlighter = document.getElementById('highlighter');
        this.highlighterContainer = this.highlighter.querySelector('code');
        
        // Controles
        this.btnExecutar = document.getElementById('btn-executar');
        this.btnAnterior = document.getElementById('btn-anterior');
        this.btnProximo = document.getElementById('btn-proximo');
        this.btnReiniciar = document.getElementById('btn-reiniciar');
        
        // Info
        this.infoPasso = document.getElementById('info-passo');
        this.infoStatus = document.getElementById('info-status');
        
        // I/O
        this.entradaStdin = document.getElementById('entrada-stdin');
        this.saidaStdout = document.getElementById('saida-stdout');
        
        // Memória
        this.memoriaPilha = document.getElementById('memoria-pilha');
        this.memoriaHeap = document.getElementById('memoria-heap');
        this.callStack = document.getElementById('call-stack');
        this.variavelObservadas = document.getElementById('variaveis-observadas');
        
        // Tokens e AST
        this.tokensContainer = document.getElementById('tokens-container');
        this.astContainer = document.getElementById('ast-container');
        
        // Modal
        this.modalExemplos = document.getElementById('modal-exemplos');
        
        // ============ ESTADO DA APLICAÇÃO ============
        this.codigoAtual = '';
        this.tokens = [];
        this.ast = null;
        this.executando = false;
        this.historico = []; // Snapshots de cada passo
        this.passoAtual = 0;
        this.memoria = null;
        this.callStackAtual = [];
        
        // ============ EXEMPLOS EMBUTIDOS ============
        this.exemplos = {
            'hello-world': `#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}`,
            'soma': `#include <stdio.h>

int main(void) {
    int a = 10;
    int b = 20;
    int sum = a + b;
    printf("Soma: %d\\n", sum);
    return 0;
}`,
            'loop': `#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 5; i++) {
        printf("i = %d\\n", i);
    }
    return 0;
}`,
            'struct': `#include <stdio.h>

typedef struct {
    int x;
    int y;
} Ponto;

int main(void) {
    Ponto p = {10, 20};
    printf("Ponto: (%d, %d)\\n", p.x, p.y);
    return 0;
}`
        };
        
        this.inicializar();
    }

    /**
     * Inicializa listeners e estado inicial
     */
    inicializar() {
        // ============ LISTENERS DO EDITOR ============
        this.editor.addEventListener('input', (e) => this.sintonizarEditor(e));
        this.editor.addEventListener('scroll', () => this.sincronizarScroll());
        this.editor.addEventListener('keydown', (e) => this.tratarTabEmEditor(e));
        
        // ============ LISTENERS DOS CONTROLES ============
        this.btnExecutar.addEventListener('click', () => this.executarPrograma());
        this.btnAnterior.addEventListener('click', () => this.voltarPasso());
        this.btnProximo.addEventListener('click', () => this.avançarPasso());
        this.btnReiniciar.addEventListener('click', () => this.reiniciarExecucao());
        
        // ============ LISTENERS DE ARQUIVOS ============
        document.querySelectorAll('.item-arquivo').forEach(item => {
            item.addEventListener('click', () => this.carregarArquivo(item));
        });
        
        // ============ LISTENERS DO EDITOR ============
        document.querySelectorAll('.btn-editor').forEach((btn, idx) => {
            if (idx === 0) { // Carregar exemplo
                btn.addEventListener('click', () => this.abrirModalExemplos());
            } else { // Limpar código
                btn.addEventListener('click', () => this.limparEditor());
            }
        });
        
        // ============ LISTENERS DE EXEMPLOS ============
        document.querySelectorAll('.exemplo-card').forEach(card => {
            card.addEventListener('click', (e) => this.carregarExemplo(e));
        });
        
        // ============ LISTENERS DA MODAL ============
        document.querySelector('.modal__fechar').addEventListener('click', () => {
            this.modalExemplos.close();
        });
        
        this.modalExemplos.addEventListener('click', (e) => {
            if (e.target === this.modalExemplos) this.modalExemplos.close();
        });
        
        // ============ LISTENERS DE I/O ============
        document.querySelector('.io-btn-limpar')?.addEventListener('click', () => {
            this.saidaStdout.textContent = '';
        });
        
        // ============ LISTENERS DE MEMÓRIA ============
        document.querySelectorAll('.filtro-memoria').forEach(btn => {
            btn.addEventListener('click', () => this.filtrarMemoria(btn));
        });
        
        document.querySelector('.watch__btn-novo')?.addEventListener('click', () => {
            this.adicionarObservado();
        });
        
        // ============ CARREGAMENTO INICIAL ============
        this.atualizarSyntaxHighlighting();
        this.atualizarInfo();
    }

    /**
     * Sincroniza o textarea com o highlighter
     */
    sintonizarEditor(e) {
        this.codigoAtual = e.target.value;
        this.atualizarSyntaxHighlighting();
    }

    /**
     * Atualiza o syntax highlighting
     */
    atualizarSyntaxHighlighting() {
        const codigo = this.editor.value;
        const linhas = codigo.split('\n');
        
        let htmlSaida = linhas.map(linha => {
            return this.colorirLinha(linha);
        }).join('\n');
        
        this.highlighterContainer.innerHTML = htmlSaida;
    }

    /**
     * Colore uma linha de código (syntax highlighting simples)
     */
    colorirLinha(linha) {
        // Palavras-chave C
        const palavrasChave = [
            'int', 'float', 'double', 'char', 'void', 'return', 'if', 'else',
            'while', 'for', 'do', 'switch', 'case', 'break', 'continue',
            'struct', 'typedef', 'include', 'define', 'ifdef', 'ifndef'
        ];
        
        let resultado = linha;
        
        // Comentários (// e /* */)
        resultado = resultado.replace(/\/\/.*$/, (m) => `<span class="syntax-comment">${this.escaparHTML(m)}</span>`);
        
        // Strings
        resultado = resultado.replace(/"([^"\\]|\\.)*"/g, (m) => `<span class="syntax-string">${this.escaparHTML(m)}</span>`);
        
        // Números
        resultado = resultado.replace(/\b\d+(\.\d+)?\b/g, (m) => `<span class="syntax-number">${m}</span>`);
        
        // Palavras-chave
        palavrasChave.forEach(palavra => {
            const regex = new RegExp(`\\b${palavra}\\b`, 'g');
            resultado = resultado.replace(regex, (m) => `<span class="syntax-keyword">${m}</span>`);
        });
        
        return resultado;
    }

    /**
     * Escapa caracteres HTML
     */
    escaparHTML(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    /**
     * Sincroniza scroll entre editor e highlighter
     */
    sincronizarScroll() {
        this.highlighter.scrollTop = this.editor.scrollTop;
        this.highlighter.scrollLeft = this.editor.scrollLeft;
    }

    /**
     * Trata Tab no editor (inserir espaços)
     */
    tratarTabEmEditor(e) {
        if (e.key !== 'Tab') return;
        
        e.preventDefault();
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const codigo = this.editor.value;
        
        this.editor.value = codigo.substring(0, start) + '    ' + codigo.substring(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + 4;
        
        // Disparar input event
        this.editor.dispatchEvent(new Event('input'));
    }

    /**
     * Abre modal de exemplos
     */
    abrirModalExemplos() {
        this.modalExemplos.showModal();
    }

    /**
     * Carrega um exemplo
     */
    carregarExemplo(e) {
        const card = e.target.closest('.exemplo-card');
        const idExemplo = card.dataset.exemplo;
        const codigo = this.exemplos[idExemplo];
        
        if (codigo) {
            this.editor.value = codigo;
            this.editor.dispatchEvent(new Event('input'));
            this.modalExemplos.close();
        }
    }

    /**
     * Limpa o editor
     */
    limparEditor() {
        if (confirm('Tem certeza que quer limpar o código?')) {
            this.editor.value = '';
            this.editor.dispatchEvent(new Event('input'));
            this.reiniciarExecucao();
        }
    }

    /**
     * Carrega um arquivo da lista
     */
    carregarArquivo(element) {
        // Remove ativo de todos
        document.querySelectorAll('.item-arquivo').forEach(el => {
            el.classList.remove('item-arquivo--ativo');
        });
        
        // Marca como ativo
        element.classList.add('item-arquivo--ativo');
        
        // Aqui você carregaria o arquivo real
        const nomeArquivo = element.dataset.arquivo;
        console.log('Carregando arquivo:', nomeArquivo);
    }

    /**
     * Executa o programa
     */
    async executarPrograma() {
        console.log('🚀 Executando programa...');
        
        try {
            // 1. Preprocessar
            console.log('📋 Fase 1: Preprocessamento...');
            const preprocessor = new IFSCeePreprocessor(this.codigoAtual);
            const codigoProcessado = preprocessor.processar();
            
            // 2. Tokenizar
            console.log('🔤 Fase 2: Tokenização...');
            const lexer = new IFSCeeLexer(codigoProcessado);
            this.tokens = lexer.tokenizar();
            this.renderizarTokens();
            
            // 3. Parsear
            console.log('🌳 Fase 3: Parse e AST...');
            const parser = new IFSCeeParser(this.tokens);
            this.ast = parser.parsear();
            this.renderizarAST(this.ast);
            
            // 4. Interpretar
            console.log('⚙️ Fase 4: Interpretação...');
            const interpreter = new IFSCeeInterpreter(this.ast);
            
            // Executar até o fim e capturar todos os estados
            this.historico = [];
            this.passoAtual = 0;
            
            // Placeholder: Simular execução
            this.simularExecucao();
            
            this.executando = true;
            this.atualizarBotoesControle();
            this.atualizarInfo('Execução iniciada', 'sucesso');
            
        } catch (erro) {
            console.error('❌ Erro:', erro);
            this.mostrarErro(erro);
        }
    }

    /**
     * Simula execução (placeholder)
     */
    simularExecucao() {
        // Este é um placeholder. Será substituído pela integração real do interpreter
        this.historico = [
            {
                passo: 0,
                linha: 1,
                memoria: { stack: [], heap: [] },
                saida: '',
                callStack: []
            },
            {
                passo: 1,
                linha: 3,
                memoria: { stack: [{ nome: 'a', valor: 10 }], heap: [] },
                saida: '',
                callStack: ['main']
            },
            {
                passo: 2,
                linha: 4,
                memoria: { stack: [{ nome: 'a', valor: 10 }, { nome: 'b', valor: 20 }], heap: [] },
                saida: '',
                callStack: ['main']
            },
            {
                passo: 3,
                linha: 5,
                memoria: { stack: [{ nome: 'a', valor: 10 }, { nome: 'b', valor: 20 }, { nome: 'sum', valor: 30 }], heap: [] },
                saida: '',
                callStack: ['main']
            },
            {
                passo: 4,
                linha: 6,
                memoria: { stack: [{ nome: 'a', valor: 10 }, { nome: 'b', valor: 20 }, { nome: 'sum', valor: 30 }], heap: [] },
                saida: 'Soma: 30\n',
                callStack: ['main']
            }
        ];
        
        this.aplicarEstado(this.historico[0]);
    }

    /**
     * Avança um passo
     */
    avançarPasso() {
        if (this.passoAtual < this.historico.length - 1) {
            this.passoAtual++;
            this.aplicarEstado(this.historico[this.passoAtual]);
        }
    }

    /**
     * Volta um passo
     */
    voltarPasso() {
        if (this.passoAtual > 0) {
            this.passoAtual--;
            this.aplicarEstado(this.historico[this.passoAtual]);
        }
    }

    /**
     * Reinicia execução
     */
    reiniciarExecucao() {
        this.historico = [];
        this.passoAtual = 0;
        this.executando = false;
        this.saidaStdout.textContent = '';
        this.memoriaPilha.innerHTML = '<div class="memoria-vazia"><span>Vazia</span></div>';
        this.memoriaHeap.innerHTML = '<div class="memoria-vazia"><span>Vazia</span></div>';
        this.callStack.innerHTML = '<div class="callstack-frame"><span class="frame__nome">-</span></div>';
        
        this.atualizarBotoesControle();
        this.atualizarInfo('Reiniciado', 'info');
    }

    /**
     * Aplica um estado (snapshow de um passo)
     */
    aplicarEstado(estado) {
        if (!estado) return;
        
        // Atualizar memória
        this.renderizarMemoria(estado.memoria);
        
        // Atualizar saída
        this.saidaStdout.textContent = estado.saida;
        
        // Atualizar call stack
        this.renderizarCallStack(estado.callStack);
        
        // Atualizar informações
        this.atualizarInfo(`Passo ${estado.passo} / Linha ${estado.linha}`);
        
        // Atualizar observados
        this.atualizarObservados();
    }

    /**
     * Renderiza a memória
     */
    renderizarMemoria(memoria) {
        // Pilha
        this.memoriaPilha.innerHTML = memoria.stack.length > 0
            ? memoria.stack.map((item, idx) => `
                <div class="memoria-item">
                    <span class="endereco">0x${(1000 + idx * 4).toString(16)}</span>
                    <span class="nome">${item.nome}</span>
                    <span class="valor">${item.valor}</span>
                </div>
            `).join('')
            : '<div class="memoria-vazia"><span>Vazia</span></div>';
        
        // Heap
        this.memoriaHeap.innerHTML = memoria.heap.length > 0
            ? memoria.heap.map((item, idx) => `
                <div class="memoria-item">
                    <span class="endereco">0x${(5000 + idx * 4).toString(16)}</span>
                    <span class="nome">${item.nome}</span>
                    <span class="valor">${item.valor}</span>
                </div>
            `).join('')
            : '<div class="memoria-vazia"><span>Vazio</span></div>';
    }

    /**
     * Renderiza call stack
     */
    renderizarCallStack(callStack) {
        this.callStack.innerHTML = callStack.length > 0
            ? callStack.map((frame, idx) => `
                <div class="callstack-frame">
                    <span class="frame__nome">${frame}</span>
                    <span class="frame__linha">nível: ${idx}</span>
                </div>
            `).join('')
            : '<div class="callstack-frame"><span class="frame__nome">-</span></div>';
    }

    /**
     * Renderiza tokens
     */
    renderizarTokens() {
        const tokensStr = this.tokens
            .map(token => `[${token.type}: ${token.value}]`)
            .join(' ');
        
        this.tokensContainer.innerHTML = `<pre class="tokens-conteudo">${tokensStr}</pre>`;
    }

    /**
     * Renderiza AST
     */
    renderizarAST(ast) {
        const astStr = this.stringificarAST(ast, 0);
        this.astContainer.innerHTML = `<pre class="ast-conteudo">${astStr}</pre>`;
    }

    /**
     * Converte AST para string visual
     */
    stringificarAST(node, profundidade = 0) {
        if (!node) return '';
        
        const indent = '│   '.repeat(profundidade);
        let resultado = '';
        
        if (typeof node === 'object' && node.type) {
            resultado += `${indent}${node.type}`;
            
            if (node.name) resultado += ` '${node.name}'`;
            if (node.value !== undefined && typeof node.value !== 'object') resultado += ` = ${node.value}`;
            
            resultado += '\n';
            
            // Iterar propriedades
            for (const [chave, valor] of Object.entries(node)) {
                if (chave === 'type' || chave === 'name' || chave === 'value' || chave === 'line') continue;
                
                if (Array.isArray(valor)) {
                    valor.forEach((item, idx) => {
                        const prefix = idx === valor.length - 1 ? '└── ' : '├── ';
                        resultado += prefix + this.stringificarAST(item, profundidade + 1);
                    });
                } else if (typeof valor === 'object' && valor !== null) {
                    resultado += this.stringificarAST(valor, profundidade + 1);
                }
            }
        }
        
        return resultado;
    }

    /**
     * Renderiza observados (watch variables)
     */
    atualizarObservados() {
        // Placeholder
    }

    /**
     * Adiciona variável observada
     */
    adicionarObservado() {
        // Placeholder
    }

    /**
     * Filtra memória por tipo
     */
    filtrarMemoria(btn) {
        document.querySelectorAll('.filtro-memoria').forEach(b => {
            b.classList.remove('filtro-memoria--ativo');
        });
        btn.classList.add('filtro-memoria--ativo');
        
        const filtro = btn.dataset.filtro;
        document.querySelectorAll('.secao-memoria').forEach(secao => {
            const tipo = secao.dataset.tipo;
            secao.style.display = filtro === 'all' || filtro === tipo ? 'block' : 'none';
        });
    }

    /**
     * Atualiza informações de status
     */
    atualizarInfo(mensagem = '', tipo = 'info') {
        if (mensagem) {
            this.infoStatus.textContent = mensagem;
        }
        this.infoPasso.textContent = `Passo: ${this.passoAtual}/${this.historico.length}`;
    }

    /**
     * Atualiza estado dos botões
     */
    atualizarBotoesControle() {
        this.btnAnterior.disabled = this.passoAtual === 0;
        this.btnProximo.disabled = this.passoAtual === this.historico.length - 1 || this.historico.length === 0;
        this.btnExecutar.disabled = this.executando;
    }

    /**
     * Mostra erro
     */
    mostrarErro(erro) {
        this.saidaStdout.textContent = `❌ ERRO: ${erro.message}`;
        this.infoStatus.textContent = 'Erro durante execução';
    }
}

// ============ INICIALIZAÇÃO ============
document.addEventListener('DOMContentLoaded', () => {
    const uiController = new UIController();
    window.uiController = uiController; // Disponível globalmente para debug
    console.log('✅ IFSCee UI inicializado');
});
