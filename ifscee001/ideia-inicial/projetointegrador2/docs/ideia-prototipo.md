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