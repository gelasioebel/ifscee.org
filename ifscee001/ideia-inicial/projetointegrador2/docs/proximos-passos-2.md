# Próximos Passos para o IFSCEE

Agora que temos implementações completas para as duas estruturas fundamentais do nosso sistema (Token e AnalisadorSintatico), o próximo passo lógico é implementar o **NoAST** completo - a classe que representa os nós da árvore sintática abstrata.

## 1. Implementação Completa do NoAST

A classe NoAST é mencionada e utilizada no AnalisadorSintatico, mas precisamos implementá-la completamente:

```javascript
// noAst.js - Implementação completa
class NoAST {
  /**
   * Cria um nó da árvore sintática abstrata
   * @param {string} tipo - Tipo do nó (ex: 'FUNCTION_DEF', 'VAR_DECL', etc.)
   * @param {string} valor - Valor associado (nome da variável, valor literal, etc.)
   * @param {number} linha - Linha no código fonte
   * @param {number} coluna - Coluna no código fonte
   * @param {NoAST[]} filhos - Array de nós filhos
   */
  constructor(tipo, valor = '', linha = -1, coluna = -1, filhos = []) {
    this.tipo = tipo;
    this.valor = valor;
    this.linha = linha;
    this.coluna = coluna;
    this.filhos = [...filhos];
    this.pai = null;
    this.propriedades = {};
    this.metadados = {};
  }

  /**
   * Adiciona um filho ao nó
   * @param {NoAST} no - Nó filho a ser adicionado
   * @return {NoAST} Este nó (para encadeamento)
   */
  adicionaFilho(no) {
    if (no) {
      this.filhos.push(no);
      no.pai = this;
    }
    return this;
  }

  /**
   * Remove um filho específico
   * @param {NoAST} no - Nó filho a ser removido
   * @return {boolean} True se o filho foi removido
   */
  removeFilho(no) {
    const indice = this.filhos.indexOf(no);
    if (indice !== -1) {
      this.filhos.splice(indice, 1);
      no.pai = null;
      return true;
    }
    return false;
  }

  /**
   * Adiciona uma propriedade ao nó
   * @param {string} chave - Nome da propriedade
   * @param {any} valor - Valor da propriedade
   * @return {NoAST} Este nó (para encadeamento)
   */
  adicionaPropriedade(chave, valor) {
    this.propriedades[chave] = valor;
    return this;
  }

  /**
   * Acessa uma propriedade do nó
   * @param {string} chave - Nome da propriedade
   * @return {any} Valor da propriedade ou undefined
   */
  pegaPropriedade(chave) {
    return this.propriedades[chave];
  }

  /**
   * Verifica se o nó tem uma propriedade
   * @param {string} chave - Nome da propriedade
   * @return {boolean} True se o nó tem a propriedade
   */
  temPropriedade(chave) {
    return Object.prototype.hasOwnProperty.call(this.propriedades, chave);
  }

  /**
   * Cria uma cópia profunda do nó (sem referências pai/filho)
   * @return {NoAST} Cópia do nó
   */
  clone() {
    const novoNo = new NoAST(this.tipo, this.valor, this.linha, this.coluna);
    
    // Copia propriedades
    Object.assign(novoNo.propriedades, this.propriedades);
    Object.assign(novoNo.metadados, this.metadados);
    
    // Copia filhos (recursivamente)
    for (const filho of this.filhos) {
      const filhoClonado = filho.clone();
      novoNo.adicionaFilho(filhoClonado);
    }
    
    return novoNo;
  }

  /**
   * Percorre a árvore com um callback no padrão visitor
   * @param {Function|Object} visitante - Função ou objeto com métodos para visitar nós
   */
  visita(visitante) {
    // Visitante como objeto com métodos por tipo
    if (typeof visitante === 'object') {
      const metodoVisita = visitante[this.tipo] || visitante.default;
      
      if (typeof metodoVisita === 'function') {
        metodoVisita(this);
      }
      
      // Visita filhos
      for (const filho of this.filhos) {
        filho.visita(visitante);
      }
    }
    // Visitante como função
    else if (typeof visitante === 'function') {
      visitante(this);
      
      // Visita filhos
      for (const filho of this.filhos) {
        filho.visita(visitante);
      }
    }
  }

  /**
   * Encontra um nó na subárvore que satisfaça uma condição
   * @param {Function} predicado - Função que retorna true para o nó desejado
   * @return {NoAST|null} Nó encontrado ou null
   */
  encontra(predicado) {
    if (predicado(this)) {
      return this;
    }
    
    for (const filho of this.filhos) {
      const resultado = filho.encontra(predicado);
      if (resultado) {
        return resultado;
      }
    }
    
    return null;
  }

  /**
   * Encontra todos os nós na subárvore que satisfaçam uma condição
   * @param {Function} predicado - Função que retorna true para os nós desejados
   * @return {NoAST[]} Array de nós encontrados
   */
  encontraTodos(predicado) {
    const resultados = [];
    
    if (predicado(this)) {
      resultados.push(this);
    }
    
    for (const filho of this.filhos) {
      const subResultados = filho.encontraTodos(predicado);
      resultados.push(...subResultados);
    }
    
    return resultados;
  }

  /**
   * Retorna uma representação em string para depuração
   * @param {string} prefixo - Prefixo para indentação
   * @return {string} Representação em string
   */
  toString(prefixo = '') {
    let resultado = `${prefixo}${this.tipo}`;
    
    if (this.valor) {
      resultado += `: "${this.valor}"`;
    }
    
    if (Object.keys(this.propriedades).length > 0) {
      resultado += ` ${JSON.stringify(this.propriedades)}`;
    }
    
    resultado += ` [linha ${this.linha}, coluna ${this.coluna}]`;
    
    if (this.filhos.length > 0) {
      for (const filho of this.filhos) {
        resultado += '\n' + filho.toString(prefixo + '  ');
      }
    }
    
    return resultado;
  }

  /**
   * Exporta a AST como estrutura JSON para uso externo
   * @return {Object} Representação JSON da árvore
   */
  paraJSON() {
    const json = {
      tipo: this.tipo,
      valor: this.valor,
      linha: this.linha,
      coluna: this.coluna,
      propriedades: { ...this.propriedades },
      filhos: this.filhos.map(filho => filho.paraJSON())
    };
    
    return json;
  }
}

// Exporta a classe
export default NoAST;
```

## 2. Implementação do Gerenciador de Memória

O próximo passo seria implementar o `GerenciadorMemoria` para simular o gerenciamento de memória em C:

```javascript
// gerenciadorMemoria.js
class GerenciadorMemoria {
  constructor() {
    // Pilha para armazenar frames de função
    this.pilha = [];
    
    // Heap para simular alocação dinâmica
    this.heap = {};
    
    // Próximo endereço de memória disponível na heap
    this.proximoEnderecoHeap = 0x1000;
    
    // Frame atual na pilha de execução
    this.frameAtual = null;
    
    // Variáveis globais
    this.globais = new Map();
    
    // Registros de alocação para detecção de vazamentos
    this.registrosAlocacao = new Map();
    
    // Histórico de operações para visualização e debugging
    this.historico = [];
  }

  // Métodos para manipulação de escopo e frames
  criaNovoFrame(nomeFuncao, escopo) { /* ... */ }
  removeFrame() { /* ... */ }
  
  // Métodos para declaração e manipulação de variáveis
  declaraVariavel(nome, tipo, valor = null) { /* ... */ }
  pegaVariavel(nome) { /* ... */ }
  atualizaVariavel(nome, valor) { /* ... */ }
  
  // Métodos para simulação de alocação dinâmica
  alocaMemoria(tamanho, inicializaZero = false) { /* ... */ }
  liberaMemoria(endereco) { /* ... */ }
  leHeap(endereco, offset = 0) { /* ... */ }
  escreveHeap(endereco, offset, valor) { /* ... */ }
  
  // Métodos para visualização do estado da memória
  pegaEstadoPilha() { /* ... */ }
  pegaEstadoHeap() { /* ... */ }
  pegaEstadoGlobais() { /* ... */ }
  
  // Outros métodos auxiliares
}
```

## 3. Implementação do Interpretador

Em seguida, implementaríamos o `InterpretadorC`, responsável por executar o código C com base na AST:

```javascript
// interpretadorC.js
class InterpretadorC {
  constructor(gerenciadorMemoria, simuladorIO, registroExecucao) {
    this.gerenciadorMemoria = gerenciadorMemoria;
    this.simuladorIO = simuladorIO;
    this.registroExecucao = registroExecucao;
    
    this.ast = null;
    this.posicaoExecucao = { linha: 0, coluna: 0 };
    this.noAtual = null;
    this.emPausa = true;
    this.finalizado = false;
    
    // Funções padrão da biblioteca C
    this.funcoesBiblioteca = new Map();
    this._inicializaFuncoesBiblioteca();
  }

  // Métodos de inicialização
  inicializa(ast) { /* ... */ }
  _inicializaFuncoesBiblioteca() { /* ... */ }
  
  // Métodos de execução
  executar() { /* ... */ }
  executarPassoAPasso() { /* ... */ }
  proximoPasso() { /* ... */ }
  passoAnterior() { /* ... */ }
  pausar() { /* ... */ }
  reiniciar() { /* ... */ }
  
  // Métodos de avaliação de nós da AST
  _avaliaNo(no) { /* ... */ }
  _avaliaExpressao(no) { /* ... */ }
  _processaDeclaracao(no) { /* ... */ }
  _processaInstrucao(no) { /* ... */ }
  _processaChamadaFuncao(no) { /* ... */ }
  
  // Métodos para operações específicas C
  _executaBlocoComposto(no) { /* ... */ }
  _executaIfStmt(no) { /* ... */ }
  _executaForStmt(no) { /* ... */ }
  _executaWhileStmt(no) { /* ... */ }
  _executaDoWhileStmt(no) { /* ... */ }
  _executaSwitchStmt(no) { /* ... */ }
  
  // Métodos para registro de estado
  _registraEstado() { /* ... */ }
}
```

## 4. Simulador de E/S (I/O)

Também precisaríamos de um `SimuladorIO` para funções como printf, scanf, etc.:

```javascript
// simuladorIO.js
class SimuladorIO {
  constructor() {
    this.stdin = [];      // Buffer de entrada
    this.stdout = [];     // Buffer de saída
    this.stderr = [];     // Buffer de erro
    this.listeners = [];  // Ouvintes para eventos de I/O
    this.entradaCallback = null;  // Callback para entrada assíncrona
  }

  // Métodos para stdout (printf, puts, etc.)
  printf(formato, ...args) { /* ... */ }
  puts(texto) { /* ... */ }
  putchar(char) { /* ... */ }
  
  // Métodos para stdin (scanf, getchar, etc.)
  scanf(formato, ...args) { /* ... */ }
  getchar() { /* ... */ }
  gets(buffer, tamanho) { /* ... */ }
  
  // Métodos para stderr
  fprintf(stream, formato, ...args) { /* ... */ }
  
  // Métodos para arquivos
  fopen(caminho, modo) { /* ... */ }
  fclose(stream) { /* ... */ }
  fread(buffer, tamanho, count, stream) { /* ... */ }
  fwrite(buffer, tamanho, count, stream) { /* ... */ }
  
  // Métodos para UI
  defineCampoEntrada(elemento) { /* ... */ }
  defineCampoSaida(elemento) { /* ... */ }
  limpaTerminal() { /* ... */ }
}
```

## 5. Registro de Execução

Por fim, um `RegistroExecucao` para permitir a execução passo a passo:

```javascript
// registroExecucao.js
class RegistroExecucao {
  constructor() {
    this.estados = [];        // Estados durante a execução
    this.posicaoAtual = -1;   // Posição atual na lista de estados
    this.escutadores = [];    // Escutadores para mudanças de estado
  }

  // Métodos para registro de estado
  registraEstado(estado) { /* ... */ }
  voltaEstado(passos = 1) { /* ... */ }
  avancaEstado(passos = 1) { /* ... */ }
  
  // Métodos para consulta de estado
  pegaEstadoAtual() { /* ... */ }
  pegaEstadoAnterior() { /* ... */ }
  pegaProximoEstado() { /* ... */ }
  pegaEstadoEm(indice) { /* ... */ }
  
  // Métodos para notificação
  adicionaEscutador(callback) { /* ... */ }
  removeEscutador(callback) { /* ... */ }
  _notificaEscutadores(evento) { /* ... */ }
  
  // Métodos para depuração
  exportaRegistros() { /* ... */ }
  limpaRegistros() { /* ... */ }
}
```

## Plano de Implementação

1. Primeiro, implementar o `NoAST` completamente
2. Em seguida, o `GerenciadorMemoria`
3. Depois, o `SimuladorIO` e o `RegistroExecucao`
4. Por fim, o `InterpretadorC` completo

Essa seria a sequência lógica para desenvolver o backend do sistema IFSCEE, seguindo a arquitetura estabelecida no diagrama que criamos anteriormente.

Por qual componente você gostaria que eu começasse a implementação detalhada?