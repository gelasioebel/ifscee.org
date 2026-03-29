# IDEIA

Vou criar um diagrama conceitual das classes e funções em JavaScript para sua plataforma de aprendizado interativo de C, usando camelCase em português BR como solicitado.

# Diagrama de Classes e Funções para IFSCEE

## 1. GerenciadorUI
- **Responsabilidade**: Controlar toda a interface de usuário
- **Métodos**:
    - `inicializaInterface()` → void
    - `mudaLayout(tipoLayout)` → void
    - `configuraRedimensionamento()` → void
    - `salvaPreferencias()` → void
    - `carregaPreferencias()` → void

## 2. AnalisadorLexico
- **Responsabilidade**: Analisar o código e gerar tokens
- **Métodos**:
    - `analisaTexto(codigoFonte)` → Array\<Token>
    - `pegaProximoToken()` → Token
    - `ehOperador(texto)` → boolean
    - `ehPalavraChave(texto)` → boolean
    - `ehIdentificador(texto)` → boolean
    - `ehNumero(texto)` → boolean

## 3. AnalisadorSintatico
- **Responsabilidade**: Criar a árvore sintática (AST)
- **Métodos**:
    - `analisaTokens(tokens)` → AST
    - `verificaSintaxe()` → boolean
    - `criaNo(tipo, valor)` → NoAST
    - `processaDeclaracao()` → NoAST
    - `processaExpressao()` → NoAST
    - `processaFuncao()` → NoAST

## 4. Interpretador
- **Responsabilidade**: Executar o código C passo a passo
- **Métodos**:
    - `executaCodigo(ast)` → void
    - `executaPassoAPasso()` → void
    - `executaLinha(numeroLinha)` → EstadoExecucao
    - `avancaExecucao()` → void
    - `retrocedeExecucao()` → void
    - `reiniciaExecucao()` → void

## 5. GerenciadorMemoria
- **Responsabilidade**: Simular a gestão de memória em C
- **Métodos**:
    - `alocaMemoria(tamanho)` → Ponteiro
    - `liberaMemoria(ponteiro)` → void
    - `escreveValor(endereco, valor)` → void
    - `leValor(endereco)` → any
    - `pegaEstadoPilha()` → Array\<FramePilha>
    - `pegaEstadoHeap()` → Array\<AlocacaoHeap>

## 6. RegistroExecucao
- **Responsabilidade**: Registrar todas as mudanças durante a execução
- **Métodos**:
    - `registraEstado(linha, variaveis, pilha, heap)` → void
    - `exportaHistorico()` → JSON
    - `pegaEstadoEm(indice)` → EstadoExecucao
    - `adicionaEvento(tipo, dados)` → void
    - `contaPassos()` → number

## 7. VisualizadorAST
- **Responsabilidade**: Renderizar a AST na interface
- **Métodos**:
    - `renderizaArvore(ast)` → void
    - `destacaNo(idNo)` → void
    - `expandeNo(idNo)` → void
    - `contraNo(idNo)` → void
    - `pegaVisualizacao()` → HTMLElement

## 8. VisualizadorMemoria
- **Responsabilidade**: Mostrar o estado da memória (pilha e heap)
- **Métodos**:
    - `atualizaVisualizacao(estadoMemoria)` → void
    - `destacaVariavel(nomeVar)` → void
    - `visualizaPilha(estadoPilha)` → void
    - `visualizaHeap(estadoHeap)` → void
    - `formataDados(valor, tipo)` → string

## 9. EditorCodigo
- **Responsabilidade**: Interface para edição de código
- **Métodos**:
    - `inicializaEditor(elementoDOM)` → void
    - `pegaConteudo()` → string
    - `setaConteudo(texto)` → void
    - `destacaLinha(numero)` → void
    - `adicionaDestaque(inicio, fim, classe)` → void
    - `configuraAutoCompletar()` → void

## 10. SimuladorIO
- **Responsabilidade**: Simular entrada e saída padrão do C
- **Métodos**:
    - `processaEntrada(textoEntrada)` → void
    - `adicionaSaida(texto)` → void
    - `limpaTerminal()` → void
    - `simulaLeituraStdin()` → string
    - `simulaEscritaStdout(texto)` → void

## Relacionamentos entre as classes:
- **GerenciadorUI** coordena todos os outros componentes
- **AnalisadorLexico** → **AnalisadorSintatico** → **Interpretador**
- **Interpretador** utiliza **GerenciadorMemoria** e **RegistroExecucao**
- **VisualizadorAST** e **VisualizadorMemoria** consomem dados do **RegistroExecucao**
- **EditorCodigo** fornece o código para **AnalisadorLexico**
- **SimuladorIO** é utilizado pelo **Interpretador** para operações de I/O

Esta arquitetura permitirá:
1. Tokenizar e analisar código C
2. Criar uma representação visual da AST
3. Executar o código passo a passo
4. Registrar mudanças nas estruturas de dados
5. Visualizar as alterações na memória em tempo real
6. Controlar a simulação (avançar, retroceder, reiniciar)

Isso atenderá ao objetivo de criar uma plataforma de aprendizado interativa para programação C, respeitando a visão original e usando a interface que você compartilhou, adaptada ao estilo visual do IFSC.

Gostaria de continuar desenvolvendo algum aspecto específico deste diagrama ou prefere que eu adapte a interface para o estilo do site do IFSC?

```
/ifscee
  /src
    /analisador
      analisadorLexico.js
      analisadorSintatico.js
      token.js
      noAst.js
    /interpretador
      interpretadorC.js
      gerenciadorMemoria.js
      registroExecucao.js
    /ui
      visualizadorAst.js
      visualizadorMemoria.js
      editorCodigo.js
      gerenciadorUI.js
    /simuladores
      simuladorIO.js
      simuladorBibliotecas.js
    /utils
      tiposC.js
      constantes.js
    app.js
  index.html
  styles.css
```

# TODO
Excelente escolha! Vamos prosseguir com o Layout Principal (Mockup 1). Agora vou detalhar como implementá-lo, adaptando o estilo visual do IFSC enquanto mantemos a estrutura funcional que você definiu.

## Implementação do Layout Principal IFSCEE

### 1. Paleta de Cores do IFSC

```css
:root {
    /* Cores institucionais do IFSC */
    --ifsc-verde-primario: #006837;
    --ifsc-verde-secundario: #00552e;
    --ifsc-cinza-claro: #f5f5f5;
    --ifsc-cinza-medio: #e9ecef;
    --ifsc-cinza-escuro: #495057;
    
    /* Cores funcionais */
    --cor-execucao: #198754;
    --cor-destaque: #0d6efd;
    --cor-alerta: #ffc107;
    --cor-erro: #dc3545;
    
    /* Cores de fundo e texto */
    --cor-fundo-principal: #ffffff;
    --cor-texto-claro: #ffffff;
    --cor-texto-escuro: #212529;
    --cor-borda: #dee2e6;
    
    /* Cores para o terminal */
    --cor-fundo-terminal: #000000;
    --cor-texto-terminal: #ffffff;
    
    /* Cores para o editor */
    --cor-fundo-editor: #f8f9fa;
    --cor-linha-ativa: #e2f3e9;
}
```

### 2. Modificações no HTML

1. **Barra Superior (Topo)**
```html
<div class="topo">
    <div class="logo-ifsc">
        <img src="logo-ifsc.svg" alt="Logo IFSC">
    </div>
    <h1>IFSCEE - Veja C sendo Interpretado</h1>
    <div class="controles-topo">
        <button class="botao-ifsc" id="botaoLayout">Layouts</button>
        <button class="botao-ifsc" id="botaoConfig">⚙</button>
    </div>
</div>
```

2. **Cabeçalhos dos Painéis**
   Modificar todos os cabeçalhos para usar o estilo visual do IFSC:
```html
<div class="cabecalho-ifsc">
    <div class="icone-cabecalho">📁</div>
    <div class="titulo-cabecalho">ARQUIVOS</div>
    <button class="controle-cabecalho">◀</button>
</div>
```

3. **Botões de Ação**
```html
<button class="botao-ifsc botao-primario">▶ Executar</button>
<button class="botao-ifsc botao-secundario">◀ Anterior</button>
<button class="botao-ifsc botao-secundario">▶ Próximo</button>
<button class="botao-ifsc botao-perigo">↻ Reiniciar</button>
```

### 3. Estilos CSS Principais

```css
/* Estilos gerais */
body {
    font-family: 'Roboto', 'Arial', sans-serif;
    background-color: var(--ifsc-cinza-claro);
    margin: 0;
    padding: 0;
    color: var(--cor-texto-escuro);
}

/* Topo */
.topo {
    background: linear-gradient(to bottom, var(--ifsc-verde-primario), var(--ifsc-verde-secundario));
    color: var(--cor-texto-claro);
    padding: 10px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.logo-ifsc {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-ifsc img {
    max-width: 100%;
    max-height: 100%;
}

/* Cabeçalhos dos painéis */
.cabecalho-ifsc {
    background-color: var(--ifsc-verde-primario);
    color: var(--cor-texto-claro);
    padding: 8px 15px;
    border-radius: 4px 4px 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 500;
}

.icone-cabecalho {
    margin-right: 10px;
}

/* Botões */
.botao-ifsc {
    background-color: rgba(255,255,255,0.2);
    color: var(--cor-texto-claro);
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
}

.botao-ifsc:hover {
    background-color: rgba(255,255,255,0.3);
}

.botao-primario {
    background-color: var(--cor-execucao);
}

.botao-secundario {
    background-color: var(--cor-destaque);
}

.botao-perigo {
    background-color: var(--cor-erro);
}

/* Painéis */
.painel {
    background-color: var(--cor-fundo-principal);
    border-radius: 4px;
    border: 1px solid var(--cor-borda);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Conteúdo dos painéis */
.conteudo-painel {
    padding: 10px;
    overflow: auto;
}

/* Editor de código */
.editor-codigo {
    background-color: var(--cor-fundo-editor);
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    line-height: 1.5;
    padding: 10px;
    border: 1px solid var(--cor-borda);
    border-radius: 4px;
    min-height: 300px;
}

.linha-ativa {
    background-color: var(--cor-linha-ativa);
    border-left: 3px solid var(--ifsc-verde-primario);
}

/* Terminal */
.terminal {
    background-color: var(--cor-fundo-terminal);
    color: var(--cor-texto-terminal);
    font-family: 'Consolas', 'Monaco', monospace;
    padding: 10px;
    border-radius: 4px;
    min-height: 100px;
    white-space: pre-wrap;
}
```

### 4. Melhorias Visuais Específicas do IFSC

1. **Gradientes nos Cabeçalhos**
```css
.cabecalho-ifsc {
    background: linear-gradient(to right, var(--ifsc-verde-primario), var(--ifsc-verde-secundario));
}
```

2. **Ícones Institucionais**
   Incluir ícones com estilo do IFSC nos cabeçalhos dos painéis

3. **Tipografia Institucional**
```css
body {
    font-family: 'Roboto', 'Arial', sans-serif;
}

h1, h2, h3, .cabecalho-ifsc {
    font-family: 'Montserrat', 'Arial', sans-serif;
    font-weight: 600;
}
```

4. **Área de Rodapé**
```html
<div class="rodape-ifsc">
    <div class="logo-ifsc-rodape">
        <img src="logo-ifsc-horizontal.svg" alt="IFSC">
    </div>
    <div class="info-rodape">
        <p>Instituto Federal de Santa Catarina</p>
        <p>© 2025 - IFSCEE - Desenvolvido por [seu nome]</p>
    </div>
</div>
```

### 5. Responsividade

```css
@media (max-width: 1200px) {
    .principal {
        flex-direction: column;
    }
    
    .arquivos, .centro, .memoria {
        width: 100%;
        margin-bottom: 15px;
    }
    
    .tokens, .ast {
        width: 100%;
        height: auto;
    }
    
    .tokensAst {
        flex-direction: column;
    }
}
```

### 6. Animações Sutis

```css
/* Transições suaves */
.botao-ifsc, .itemArquivo, .cabecalho-ifsc, .editor-codigo {
    transition: all 0.2s ease-in-out;
}

/* Animação para linha ativa */
@keyframes pulso-linha {
    0% { background-color: var(--cor-linha-ativa); }
    50% { background-color: rgba(0,104,55,0.2); }
    100% { background-color: var(--cor-linha-ativa); }
}

.linha-ativa.executando {
    animation: pulso-linha 1.5s infinite;
}
```

Estas modificações mantêm a estrutura funcional que você projetou, mas adaptam o visual para corresponder ao estilo do IFSC. O verde institucional predomina nos elementos principais, com uma interface mais limpa e profissional, mantendo todos os componentes necessários para a visualização interativa do código C.

Gostaria que eu detalhasse algum aspecto específico da implementação ou prefere avançar para os próximos passos do projeto?


# Implementação do Núcleo do IFSCEE

Vamos avançar com a implementação do código JavaScript principal do simulador. Seguindo o diagrama conceitual, vou implementar as principais classes para interpretar e visualizar o código C passo a passo.

## 1. Estrutura de Arquivos

```
/ifscee
  /src
    /analisador
      analisadorLexico.js
      analisadorSintatico.js
      token.js
      noAst.js
    /interpretador
      interpretadorC.js
      gerenciadorMemoria.js
      registroExecucao.js
    /ui
      visualizadorAst.js
      visualizadorMemoria.js
      editorCodigo.js
      gerenciadorUI.js
    /simuladores
      simuladorIO.js
      simuladorBibliotecas.js
    /utils
      tiposC.js
      constantes.js
    app.js
  index.html
  styles.css
```

## 2. Implementação das Classes Principais

### AnalisadorLexico.js

```javascript
// Analisador léxico para C
class AnalisadorLexico {
  constructor() {
    this.codigoFonte = '';
    this.posicaoAtual = 0;
    this.linhaAtual = 1;
    this.colunaAtual = 1;
    this.tokens = [];
    this.palavrasChave = [
      'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
      'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
      'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
      'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while'
    ];
  }

  analisaTexto(codigoFonte) {
    this.codigoFonte = codigoFonte;
    this.posicaoAtual = 0;
    this.linhaAtual = 1;
    this.colunaAtual = 1;
    this.tokens = [];

    while (this.posicaoAtual < this.codigoFonte.length) {
      const charAtual = this.pegaCharAtual();

      // Ignora espaços em branco
      if (this.ehEspacoEmBranco(charAtual)) {
        this.avanca();
        continue;
      }

      // Comentários
      if (charAtual === '/' && this.pegaProximoChar() === '/') {
        this.processaComentarioLinha();
        continue;
      }

      if (charAtual === '/' && this.pegaProximoChar() === '*') {
        this.processaComentarioBloco();
        continue;
      }

      // Identificadores e palavras-chave
      if (this.ehLetra(charAtual) || charAtual === '_') {
        this.processaIdentificador();
        continue;
      }

      // Números
      if (this.ehDigito(charAtual)) {
        this.processaNumero();
        continue;
      }

      // Strings
      if (charAtual === '"') {
        this.processaString();
        continue;
      }

      // Caracteres
      if (charAtual === "'") {
        this.processaCaractere();
        continue;
      }

      // Operadores e pontuação
      this.processaOperadorOuPontuacao();
    }

    // Adiciona token de fim de arquivo
    this.adicionaToken('EOF', '', this.linhaAtual, this.colunaAtual);
    return this.tokens;
  }

  // Métodos auxiliares
  pegaCharAtual() {
    if (this.posicaoAtual >= this.codigoFonte.length) return null;
    return this.codigoFonte[this.posicaoAtual];
  }

  pegaProximoChar() {
    if (this.posicaoAtual + 1 >= this.codigoFonte.length) return null;
    return this.codigoFonte[this.posicaoAtual + 1];
  }

  avanca() {
    if (this.pegaCharAtual() === '\n') {
      this.linhaAtual++;
      this.colunaAtual = 1;
    } else {
      this.colunaAtual++;
    }
    this.posicaoAtual++;
  }

  // Processamento de tipos específicos
  processaIdentificador() {
    let inicio = this.posicaoAtual;
    let identificador = '';

    while (
      this.pegaCharAtual() && 
      (this.ehLetra(this.pegaCharAtual()) || 
       this.ehDigito(this.pegaCharAtual()) || 
       this.pegaCharAtual() === '_')
    ) {
      identificador += this.pegaCharAtual();
      this.avanca();
    }

    // Verifica se é uma palavra-chave
    const tipo = this.palavrasChave.includes(identificador) ? 'KEYWORD' : 'IDENTIFIER';
    this.adicionaToken(tipo, identificador, this.linhaAtual, this.colunaAtual - identificador.length);
  }

  processaNumero() {
    let inicio = this.posicaoAtual;
    let numero = '';
    let tipoNumero = 'INT';

    // Processa a parte inteira
    while (this.pegaCharAtual() && this.ehDigito(this.pegaCharAtual())) {
      numero += this.pegaCharAtual();
      this.avanca();
    }

    // Processa a parte decimal se houver
    if (this.pegaCharAtual() === '.') {
      tipoNumero = 'FLOAT';
      numero += '.';
      this.avanca();

      while (this.pegaCharAtual() && this.ehDigito(this.pegaCharAtual())) {
        numero += this.pegaCharAtual();
        this.avanca();
      }
    }

    // Sufixos de tipo (f, l, etc.)
    if (this.pegaCharAtual() && this.ehLetra(this.pegaCharAtual())) {
      const sufixo = this.pegaCharAtual().toLowerCase();
      if (sufixo === 'f' || sufixo === 'l') {
        numero += this.pegaCharAtual();
        this.avanca();
      }
    }

    this.adicionaToken(tipoNumero, numero, this.linhaAtual, this.colunaAtual - numero.length);
  }

  // Funções de verificação
  ehLetra(char) {
    return /[a-zA-Z]/.test(char);
  }

  ehDigito(char) {
    return /[0-9]/.test(char);
  }

  ehEspacoEmBranco(char) {
    return /\s/.test(char);
  }

  adicionaToken(tipo, valor, linha, coluna) {
    this.tokens.push(new Token(tipo, valor, linha, coluna));
  }

  // Outros métodos necessários para tokenização completa
  processaString() {
    let string = '';
    this.avanca(); // Pula a aspa inicial

    while (this.pegaCharAtual() && this.pegaCharAtual() !== '"') {
      // Processamento de escapes
      if (this.pegaCharAtual() === '\\' && this.pegaProximoChar()) {
        string += this.pegaCharAtual();
        this.avanca();
      }
      string += this.pegaCharAtual();
      this.avanca();
    }

    if (this.pegaCharAtual() === '"') {
      this.avanca(); // Pula a aspa final
      this.adicionaToken('STRING', string, this.linhaAtual, this.colunaAtual - string.length - 2);
    } else {
      console.error('String não terminada');
    }
  }

  // Outros métodos para processamento de tokens
}

// Exporta a classe
export default AnalisadorLexico;
```

### GerenciadorMemoria.js

```javascript
// Gerenciador de memória para simulação de C
class GerenciadorMemoria {
  constructor() {
    // Pilha para armazenar frames de função
    this.pilha = [];
    
    // Heap para simular alocação dinâmica
    this.heap = {};
    
    // Próximo endereço de memória disponível na heap
    this.proximoEnderecoHeap = 0x7fff1000;
    
    // Frame atual na pilha de execução
    this.frameAtual = null;
  }

  // Cria um novo frame de função quando uma função é chamada
  criaNovoFrame(nomeFuncao, escopo) {
    const novoFrame = {
      id: this.pilha.length,
      nomeFuncao,
      variaveis: {},
      parametros: {},
      escopo,
      linhaRetorno: null
    };
    
    this.pilha.push(novoFrame);
    this.frameAtual = novoFrame;
    return novoFrame;
  }

  // Remove o frame do topo da pilha quando uma função retorna
  removeFrame() {
    if (this.pilha.length > 0) {
      this.pilha.pop();
      this.frameAtual = this.pilha.length > 0 ? this.pilha[this.pilha.length - 1] : null;
    }
  }

  // Adiciona uma variável ao frame atual
  declaraVariavel(nome, tipo, valor = null) {
    if (!this.frameAtual) {
      console.error('Tentativa de declarar variável fora de um frame');
      return;
    }

    this.frameAtual.variaveis[nome] = {
      tipo,
      valor,
      endereco: this.geraEnderecoStack()
    };
    
    return this.frameAtual.variaveis[nome];
  }

  // Obtém uma variável do escopo atual ou dos escopos superiores
  pegaVariavel(nome) {
    // Verifica no frame atual primeiro
    if (this.frameAtual && this.frameAtual.variaveis[nome]) {
      return this.frameAtual.variaveis[nome];
    }
    
    // Verifica nos parâmetros
    if (this.frameAtual && this.frameAtual.parametros[nome]) {
      return this.frameAtual.parametros[nome];
    }
    
    // Procura em frames anteriores (escopo global ou externo)
    for (let i = this.pilha.length - 2; i >= 0; i--) {
      if (this.pilha[i].variaveis[nome]) {
        return this.pilha[i].variaveis[nome];
      }
    }
    
    console.error(`Variável '${nome}' não encontrada`);
    return null;
  }

  // Atualiza o valor de uma variável
  atualizaVariavel(nome, valor) {
    const variavel = this.pegaVariavel(nome);
    if (variavel) {
      variavel.valor = valor;
      return true;
    }
    return false;
  }

  // Aloca memória dinâmica (simulando malloc/calloc)
  alocaMemoria(tamanho, inicializaZero = false) {
    const endereco = this.proximoEnderecoHeap;
    this.proximoEnderecoHeap += tamanho;
    
    // Aloca um bloco na heap
    this.heap[endereco] = {
      tamanho,
      dados: new Array(tamanho).fill(inicializaZero ? 0 : undefined),
      alocado: true
    };
    
    return endereco;
  }

  // Libera memória (simulando free)
  liberaMemoria(endereco) {
    if (this.heap[endereco] && this.heap[endereco].alocado) {
      this.heap[endereco].alocado = false;
      return true;
    }
    console.error(`Tentativa de liberar memória não alocada no endereço ${endereco.toString(16)}`);
    return false;
  }

  // Lê um valor da heap
  leHeap(endereco, offset = 0) {
    const bloco = this.heap[endereco];
    if (bloco && bloco.alocado) {
      if (offset >= 0 && offset < bloco.tamanho) {
        return bloco.dados[offset];
      }
      console.error(`Acesso fora dos limites na heap: offset ${offset} em bloco de tamanho ${bloco.tamanho}`);
    } else {
      console.error(`Tentativa de acessar memória não alocada no endereço ${endereco.toString(16)}`);
    }
    return undefined;
  }

  // Escreve um valor na heap
  escreveHeap(endereco, offset, valor) {
    const bloco = this.heap[endereco];
    if (bloco && bloco.alocado) {
      if (offset >= 0 && offset < bloco.tamanho) {
        bloco.dados[offset] = valor;
        return true;
      }
      console.error(`Acesso fora dos limites na heap: offset ${offset} em bloco de tamanho ${bloco.tamanho}`);
    } else {
      console.error(`Tentativa de escrever em memória não alocada no endereço ${endereco.toString(16)}`);
    }
    return false;
  }

  // Retorna o estado atual da pilha
  pegaEstadoPilha() {
    return [...this.pilha];
  }

  // Retorna o estado atual da heap
  pegaEstadoHeap() {
    // Cria uma cópia da heap para visualização
    const estadoHeap = {};
    for (const endereco in this.heap) {
      if (this.heap[endereco].alocado) {
        estadoHeap[endereco] = {
          ...this.heap[endereco],
          endereco: parseInt(endereco)
        };
      }
    }
    return estadoHeap;
  }

  // Gera um endereço fictício para variáveis na stack
  geraEnderecoStack() {
    // Endereços para a pilha começam em uma região diferente da heap
    return 0xbfff0000 - (this.pilha.length * 1000) - Object.keys(this.frameAtual.variaveis).length * 8;
  }
}

// Exporta a classe
export default GerenciadorMemoria;
```

### InterpretadorC.js

```javascript
// Interpretador de C
class InterpretadorC {
  constructor(analisadorSintatico, gerenciadorMemoria, registroExecucao, simuladorIO) {
    this.analisadorSintatico = analisadorSintatico;
    this.gerenciadorMemoria = gerenciadorMemoria;
    this.registroExecucao = registroExecucao;
    this.simuladorIO = simuladorIO;
    
    this.ast = null;
    this.posicaoExecucao = 0;
    this.noAtual = null;
    this.emPausa = false;
    this.finalizado = false;
    
    // Cache de linhas para melhorar o desempenho
    this.mapaLinhas = new Map();
  }

  // Inicializa o interpretador com código C
  inicializa(codigoFonte) {
    // Análise léxica e sintática do código
    const tokens = this.analisadorSintatico.analisadorLexico.analisaTexto(codigoFonte);
    this.ast = this.analisadorSintatico.analisaTokens(tokens);
    
    // Inicializa o mapa de linhas para facilitar a navegação
    this.construirMapaLinhas(this.ast);
    
    // Reinicia o estado do interpretador
    this.posicaoExecucao = 0;
    this.noAtual = null;
    this.emPausa = true;
    this.finalizado = false;
    
    // Configuração inicial da memória
    this.gerenciadorMemoria = new GerenciadorMemoria();
    
    // Adiciona um frame para o escopo global
    this.gerenciadorMemoria.criaNovoFrame('global', 'global');
    
    // Limpa registros de execução anteriores
    this.registroExecucao.limpaRegistros();
    
    return this.ast;
  }

  // Constrói um mapa das linhas do código para os nós da AST
  construirMapaLinhas(no, linha = null) {
    if (!no) return;
    
    if (no.linha) {
      linha = no.linha;
      if (!this.mapaLinhas.has(linha)) {
        this.mapaLinhas.set(linha, []);
      }
      this.mapaLinhas.get(linha).push(no);
    }
    
    // Processa recursivamente os filhos
    if (no.filhos) {
      for (const filho of no.filhos) {
        this.construirMapaLinhas(filho, linha);
      }
    }
  }

  // Executa a próxima instrução
  executaProximaInstrucao() {
    if (this.finalizado || !this.ast) {
      return false;
    }
    
    if (!this.noAtual) {
      // Encontra o primeiro nó (geralmente a função main)
      this.noAtual = this.encontraMain();
      if (!this.noAtual) {
        console.error('Função main não encontrada');
        this.finalizado = true;
        return false;
      }
    } else {
      // Avança para o próximo nó
      this.noAtual = this.encontraProximoNo(this.noAtual);
      if (!this.noAtual) {
        this.finalizado = true;
        return false;
      }
    }
    
    // Executa o nó atual
    this.executaNo(this.noAtual);
    
    // Registra o estado atual da execução
    this.registraEstadoAtual();
    
    return true;
  }

  // Encontra a função main na AST
  encontraMain() {
    // Procura o nó de declaração da função main
    for (const no of this.ast.filhos) {
      if (no.tipo === 'FUNCTION_DECL' && no.valor === 'main') {
        // Retorna o primeiro nó dentro do corpo da função main
        return no.filhos.find(filho => filho.tipo === 'COMPOUND_STMT')?.filhos[0];
      }
    }
    return null;
  }

  // Encontra o próximo nó a ser executado
  encontraProximoNo(noAtual) {
    // Lógica de navegação pela AST para execução sequencial
    // Implementação depende da estrutura exata da AST
    
    // Exemplo simplificado:
    if (noAtual.proximo) {
      return noAtual.proximo;
    }
    
    // Busca pelo próximo nó no mesmo escopo
    const pai = noAtual.pai;
    if (pai && pai.filhos) {
      const index = pai.filhos.indexOf(noAtual);
      if (index < pai.filhos.length - 1) {
        return pai.filhos[index + 1];
      }
    }
    
    // Se for o fim de um bloco, retorna ao escopo superior
    // Lógica adicional necessária para controle de fluxo (if, for, while, etc.)
    
    return null; // Fim da execução
  }

  // Executa um nó específico da AST
  executaNo(no) {
    if (!no) return;
    
    switch (no.tipo) {
      case 'VAR_DECL':
        this.executaDeclaracaoVariavel(no);
        break;
      case 'ASSIGN_EXPR':
        this.executaAtribuicao(no);
        break;
      case 'BINARY_EXPR':
        return this.avaliaBinariaExpr(no);
      case 'UNARY_EXPR':
        return this.avaliaUnariaExpr(no);
      case 'CALL_EXPR':
        return this.executaChamadaFuncao(no);
      case 'IF_STMT':
        this.executaIfStmt(no);
        break;
      case 'WHILE_STMT':
        this.executaWhileStmt(no);
        break;
      case 'FOR_STMT':
        this.executaForStmt(no);
        break;
      case 'RETURN_STMT':
        this.executaReturnStmt(no);
        break;
      // Outros tipos de nós...
      default:
        console.log(`Tipo de nó não tratado: ${no.tipo}`);
    }
  }

  // Executa uma declaração de variável
  executaDeclaracaoVariavel(no) {
    const nome = no.valor;
    const tipo = no.tipoVariavel;
    
    // Verifica se há inicialização
    let valorInicial = null;
    if (no.filhos && no.filhos.length > 0) {
      // Avalia a expressão de inicialização
      valorInicial = this.avaliaExpressao(no.filhos[0]);
    }
    
    // Declara a variável na memória
    this.gerenciadorMemoria.declaraVariavel(nome, tipo, valorInicial);
  }

  // Executa uma expressão de atribuição
  executaAtribuicao(no) {
    const nomeVariavel = no.filhos[0].valor;
    const valor = this.avaliaExpressao(no.filhos[1]);
    
    // Atualiza o valor na memória
    this.gerenciadorMemoria.atualizaVariavel(nomeVariavel, valor);
  }

  // Avalia uma expressão e retorna seu valor
  avaliaExpressao(no) {
    if (!no) return null;
    
    switch (no.tipo) {
      case 'INT_LITERAL':
        return parseInt(no.valor);
      case 'FLOAT_LITERAL':
        return parseFloat(no.valor);
      case 'CHAR_LITERAL':
        return no.valor.charCodeAt(0);
      case 'STRING_LITERAL':
        return no.valor;
      case 'IDENTIFIER':
        return this.gerenciadorMemoria.pegaVariavel(no.valor)?.valor;
      case 'BINARY_EXPR':
        return this.avaliaBinariaExpr(no);
      case 'UNARY_EXPR':
        return this.avaliaUnariaExpr(no);
      case 'CALL_EXPR':
        return this.executaChamadaFuncao(no);
      default:
        console.error(`Tipo de expressão não suportado: ${no.tipo}`);
        return null;
    }
  }

  // Avalia uma expressão binária
  avaliaBinariaExpr(no) {
    const esquerda = this.avaliaExpressao(no.filhos[0]);
    const direita = this.avaliaExpressao(no.filhos[1]);
    const operador = no.valor;
    
    switch (operador) {
      case '+': return esquerda + direita;
      case '-': return esquerda - direita;
      case '*': return esquerda * direita;
      case '/': return esquerda / direita;
      case '%': return esquerda % direita;
      case '==': return esquerda === direita;
      case '!=': return esquerda !== direita;
      case '<': return esquerda < direita;
      case '>': return esquerda > direita;
      case '<=': return esquerda <= direita;
      case '>=': return esquerda >= direita;
      case '&&': return esquerda && direita;
      case '||': return esquerda || direita;
      default:
        console.error(`Operador binário não suportado: ${operador}`);
        return null;
    }
  }

  // Executa uma instrução if
  executaIfStmt(no) {
    // Avalia a condição
    const condicao = this.avaliaExpressao(no.filhos[0]);
    
    if (condicao) {
      // Define o próximo nó para ser o bloco 'then'
      this.noAtual = no.filhos[1];
    } else if (no.filhos.length > 2) {
      // Se houver um bloco 'else', define-o como próximo
      this.noAtual = no.filhos[2];
    }
    // Se não houver else e a condição for falsa, continua normalmente
  }

  // Registra o estado atual da execução
  registraEstadoAtual() {
    const estado = {
      linha: this.noAtual.linha,
      coluna: this.noAtual.coluna,
      tipo: this.noAtual.tipo,
      pilha: this.gerenciadorMemoria.pegaEstadoPilha(),
      heap: this.gerenciadorMemoria.pegaEstadoHeap()
    };
    
    this.registroExecucao.registraEstado(estado);
  }

  // Executa o código passo a passo até o fim ou pausa
  executaPasosAPasso() {
    this.emPausa = false;
    
    // Executa enquanto não estiver em pausa ou finalizado
    while (!this.emPausa && !this.finalizado) {
      const sucesso = this.executaProximaInstrucao();
      if (!sucesso) {
        this.finalizado = true;
        break;
      }
    }
  }

  // Pausa a execução
  pausaExecucao() {
    this.emPausa = true;
  }

  // Reinicia a execução
  reiniciaExecucao() {
    // Reinicia o estado do interpretador
    this.posicaoExecucao = 0;
    this.noAtual = null;
    this.emPausa = true;
    this.finalizado = false;
    
    // Recria o gerenciador de memória
    this.gerenciadorMemoria = new GerenciadorMemoria();
    
    // Adiciona um frame para o escopo global
    this.gerenciadorMemoria.criaNovoFrame('global', 'global');
    
    // Limpa registros de execução anteriores
    this.registroExecucao.limpaRegistros();
  }
}

// Exporta a classe
export default InterpretadorC;
```

### app.js (Integrando os Componentes)

```javascript
// Arquivo principal da aplicação
import AnalisadorLexico from './analisador/analisadorLexico.js';
import AnalisadorSintatico from './analisador/analisadorSintatico.js';
import InterpretadorC from './interpretador/interpretadorC.js';
import GerenciadorMemoria from './interpretador/gerenciadorMemoria.js';
import RegistroExecucao from './interpretador/registroExecucao.js';
import SimuladorIO from './simuladores/simuladorIO.js';
import VisualizadorAst from './ui/visualizadorAst.js';
import VisualizadorMemoria from './ui/visualizadorMemoria.js';
import EditorCodigo from './ui/editorCodigo.js';
import GerenciadorUI from './ui/gerenciadorUI.js';

class AppIFSCEE {
  constructor() {
    // Inicializa componentes
    this.analisadorLexico = new AnalisadorLexico();
    this.analisadorSintatico = new AnalisadorSintatico(this.analisadorLexico);
    this.gerenciadorMemoria = new GerenciadorMemoria();
    this.registroExecucao = new RegistroExecucao();
    this.simuladorIO = new SimuladorIO();
    
    this.interpretador = new InterpretadorC(
      this.analisadorSintatico,
      this.gerenciadorMemoria,
      this.registroExecucao,
      this.simuladorIO
    );
    
    // Inicializa componentes de UI
    this.editorCodigo = new EditorCodigo();
    this.visualizadorAst = new VisualizadorAst();
    this.visualizadorMemoria = new VisualizadorMemoria();
    this.gerenciadorUI = new GerenciadorUI();
    
    // Estado da aplicação
    this.codigoAtual = '';
    this.arquivoAtual = 'main.c';
    this.arquivos = {
      'main.c': '#include <stdio.h>\n\nint main(void) {\n  printf("Olá, mundo!\\n");\n  return 0;\n}'
    };
  }

  // Inicializa a aplicação
  inicializa() {
    // Configura o editor de código
    this.editorCodigo.inicializaEditor(document.getElementById('editor-conteudo'));
    this.editorCodigo.setaConteudo(this.arquivos[this.arquivoAtual]);
    
    // Configura os listeners de eventos
    this.configuraEventos();
    
    // Configura o simulador de entrada/saída
    this.simuladorIO.inicializa(
      document.getElementById('entrada-conteudo'),
      document.getElementById('saida-conteudo')
    );
    
    // Carrega o código inicial
    this.carregaArquivo(this.arquivoAtual);
  }

  // Configura os listeners de eventos da UI
  configuraEventos() {
    // Botão de execução
    document.getElementById('botao-executar').addEventListener('click', () => {
      this.executaCodigo();
    });
    
    // Botão de passo a passo
    document.getElementById('botao-proximo').addEventListener('click', () => {
      this.proximoPasso();
    });
    
    // Botão de retroceder
    document.getElementById('botao-anterior').addEventListener('click', () => {
      this.passoAnterior();
    });
    
    // Botão de reiniciar
    document.getElementById('botao-reiniciar').addEventListener('click', () => {
      this.reiniciaExecucao();
    });
    
    // Eventos para itens de arquivo
    document.querySelectorAll('.itemArquivo').forEach(item => {
      item.addEventListener('click', (e) => {
        const nomeArquivo = e.target.textContent.trim();
        this.carregaArquivo(nomeArquivo);
      });
    });
    
    // Configuração de layout
    document.getElementById('botaoLayout').addEventListener('click', () => {
      this.gerenciadorUI.alternaMenu();
    });
  }

  // Carrega um arquivo no editor
  carregaArquivo(nomeArquivo) {
    // Salva o conteúdo atual antes de trocar
    if (this.arquivoAtual) {
      this.arquivos[this.arquivoAtual] = this.editorCodigo.pegaConteudo();
    }
    
    // Carrega o novo arquivo
    this.arquivoAtual = nomeArquivo;
    if (this.arquivos[nomeArquivo]) {
      this.editorCodigo.setaConteudo(this.arquivos[nomeArquivo]);
    } else {
      // Cria um novo arquivo vazio
      this.arquivos[nomeArquivo] = '';
      this.editorCodigo.setaConteudo('');
    }
  }

  // Executa o código atual
  executaCodigo() {
    // Obtém o código atual do editor
    this.codigoAtual = this.editorCodigo.pegaConteudo();
    
    // Limpa a saída
    this.simuladorIO.limpaTerminal();
    
    try {
      // Inicializa o interpretador com o código atual
      const ast = this.interpretador.inicializa(this.codigoAtual);
      
      // Atualiza a visualização da AST
      this.visualizadorAst.renderizaArvore(ast);
      
      // Executa todo o código
      this.interpretador.executaPasosAPasso();
      
      // Atualiza a visualização da memória
      this.atualizaVisualizacaoMemoria();
      
    } catch (erro) {
      console.error('Erro ao executar o código:', erro);
      this.simuladorIO.simulaEscritaStdout(`Erro: ${erro.message}`);
    }
  }

  // Executa apenas o próximo passo
  proximoPasso() {
    if (!this.interpretador || this.interpretador.finalizado) {
      // Se o interpretador não foi inicializado ou já finalizou, reinicia
      this.codigoAtual = this.editorCodigo.pegaConteudo();
      this.interpretador.inicializa(this.codigoAtual);
    }
    
    // Executa um único passo
    const sucesso = this.interpretador.executaProximaInstrucao();
    
    // Atualiza a visualização da memória
    this.atualizaVisualizacaoMemoria();
    
    // Destaca a linha atual
    if (this.interpretador.noAtual) {
      this.editorCodigo.destacaLinha(this.interpretador.noAtual.linha);
    }
    
    return sucesso;
  }

  // Retorna ao passo anterior
  passoAnterior() {
    const estadoAnterior = this.registroExecucao.pegaEstadoAnterior();
    if (estadoAnterior) {
      // Atualiza o interpretador com o estado anterior
      this.interpretador.carregaEstado(estadoAnterior);
      
      // Atualiza a visualização da memória
      this.atualizaVisualizacaoMemoria();
      
      // Destaca a linha correspondente
      this.editorCodigo.destacaLinha(estadoAnterior.linha);
    }
  }

  // Reinicia a execução
  reiniciaExecucao() {
    this.interpretador.reiniciaExecucao();
    this.simuladorIO.limpaTerminal();
    this.editorCodigo.removeDestaquesLinha();
    
    // Atualiza a visualização da memória para mostrar o estado inicial
    this.atualizaVisualizacaoMemoria();
  }

  // Atualiza a visualização da memória
  atualizaVisualizacaoMemoria() {
    const estadoPilha = this.gerenciadorMemoria.pegaEstadoPilha();
    const estadoHeap = this.gerenciadorMemoria.pegaEstadoHeap();
    
    this.visualizadorMemoria.atualizaVisualizacao(estadoPilha, estadoHeap);
  }
}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppIFSCEE();
  app.inicializa();
  
  // Expõe a aplicação globalmente para debug
  window.ifscee = app;
});
```

## 3. Próximos Passos

1. **Implementar o AnalisadorSintatico:**
    - Criar um parser real para C, possivelmente usando uma abordagem recursiva descendente.
    - Criar a estrutura completa da AST respeitando as regras da gramática C.

2. **Completar o SimuladorIO:**
    - Implementar simulação completa de funções como scanf, printf, etc.

3. **Implementar o VisualizadorAST:**
    - Criar uma representação visual interativa da AST.

4. **Aprimorar a Visualização de Memória:**
    - Melhorar a visualização da pilha e heap.
    - Adicionar representações visuais para ponteiros.

5. **Implementar Bibliotecas C Padrão:**
    - Simular comportamento de funções das bibliotecas stdio.h, stdlib.h, etc.

6. **Adicionar Recursos de Depuração:**
    - Visualização de variáveis locais, watches.
    - Avaliação de expressões durante a execução.

Esta implementação oferece uma estrutura robusta para o seu IFSCEE, com classes bem definidas e responsabilidades claras, seguindo o padrão camelCase em português brasileiro conforme solicitado. O próximo passo seria implementar cada componente em detalhes, especialmente o analisador sintático, que é a peça mais complexa deste sistema.

Você gostaria que eu focasse em algum componente específico para desenvolver em mais detalhes?