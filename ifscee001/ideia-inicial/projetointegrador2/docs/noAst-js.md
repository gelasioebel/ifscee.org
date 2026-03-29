# Implementação Completa do NoAST

Aqui está a implementação completa da classe `NoAST`, que representa cada nó na Árvore Sintática Abstrata (AST) para nosso sistema IFSCEE:

```javascript
// noAst.js
/**
 * Classe que representa um nó na Árvore Sintática Abstrata (AST) para linguagem C.
 * Suporta todas as versões do C (C90, C17, C23).
 */
class NoAST {
  /**
   * Cria um nó da árvore sintática abstrata
   * @param {string} tipo - Tipo do nó (ex: 'FUNCTION_DEF', 'VAR_DECL', etc.)
   * @param {string} valor - Valor associado (nome da variável, valor literal, etc.)
   * @param {number} linha - Linha no código fonte
   * @param {number} coluna - Coluna no código fonte
   * @param {NoAST[]} filhos - Array de nós filhos (opcional)
   */
  constructor(tipo, valor = '', linha = -1, coluna = -1, filhos = []) {
    // Informações básicas do nó
    this.tipo = tipo;                 // Tipo do nó (ex: FUNCTION_DEF, VAR_DECL, etc.)
    this.valor = valor;               // Valor associado (nome, valor literal, etc.)
    this.linha = linha;               // Linha no código fonte
    this.coluna = coluna;             // Coluna no código fonte
    
    // Relações hierárquicas
    this.filhos = [...filhos];        // Array de nós filhos
    this.pai = null;                  // Referência ao nó pai

    // Metadados e propriedades
    this.propriedades = {};           // Propriedades do nó (tipo, ponteiros, etc.)
    this.metadados = {};              // Metadados para análise e interpretação
    
    // Informações de execução (utilizadas pelo interpretador)
    this.marcadores = new Set();      // Marcadores (breakpoint, linha atual, etc.)
    this.ultimaExecucao = null;       // Timestamp da última execução
    
    // Decoradores para visualização
    this.estiloVisualizacao = null;   // Estilo para visualização na UI
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
   * Adiciona vários filhos ao nó
   * @param {NoAST[]} nos - Array de nós filhos
   * @return {NoAST} Este nó (para encadeamento)
   */
  adicionaFilhos(nos) {
    if (Array.isArray(nos)) {
      nos.forEach(no => {
        if (no) {
          this.filhos.push(no);
          no.pai = this;
        }
      });
    }
    return this;
  }

  /**
   * Insere um filho em uma posição específica
   * @param {NoAST} no - Nó filho a ser inserido
   * @param {number} indice - Índice onde inserir
   * @return {NoAST} Este nó (para encadeamento)
   */
  insereFilho(no, indice) {
    if (no && indice >= 0 && indice <= this.filhos.length) {
      this.filhos.splice(indice, 0, no);
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
   * Remove um filho pelo índice
   * @param {number} indice - Índice do filho a remover
   * @return {NoAST|null} Nó removido ou null
   */
  removeFilhoIndice(indice) {
    if (indice >= 0 && indice < this.filhos.length) {
      const no = this.filhos[indice];
      this.filhos.splice(indice, 1);
      no.pai = null;
      return no;
    }
    return null;
  }

  /**
   * Substitui um filho por outro
   * @param {NoAST} antigo - Nó filho a ser substituído
   * @param {NoAST} novo - Nó filho substituto
   * @return {boolean} True se a substituição foi bem-sucedida
   */
  substituiFilho(antigo, novo) {
    const indice = this.filhos.indexOf(antigo);
    if (indice !== -1) {
      this.filhos[indice] = novo;
      antigo.pai = null;
      novo.pai = this;
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
   * @param {any} [valorPadrao=undefined] - Valor padrão caso a propriedade não exista
   * @return {any} Valor da propriedade ou valorPadrao
   */
  pegaPropriedade(chave, valorPadrao = undefined) {
    return Object.prototype.hasOwnProperty.call(this.propriedades, chave) 
      ? this.propriedades[chave] 
      : valorPadrao;
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
   * Remove uma propriedade do nó
   * @param {string} chave - Nome da propriedade
   * @return {boolean} True se a propriedade foi removida
   */
  removePropriedade(chave) {
    if (this.temPropriedade(chave)) {
      delete this.propriedades[chave];
      return true;
    }
    return false;
  }

  /**
   * Adiciona um metadado ao nó
   * @param {string} chave - Nome do metadado
   * @param {any} valor - Valor do metadado
   * @return {NoAST} Este nó (para encadeamento)
   */
  adicionaMetadado(chave, valor) {
    this.metadados[chave] = valor;
    return this;
  }

  /**
   * Acessa um metadado do nó
   * @param {string} chave - Nome do metadado
   * @param {any} [valorPadrao=undefined] - Valor padrão caso o metadado não exista
   * @return {any} Valor do metadado ou valorPadrao
   */
  pegaMetadado(chave, valorPadrao = undefined) {
    return Object.prototype.hasOwnProperty.call(this.metadados, chave) 
      ? this.metadados[chave] 
      : valorPadrao;
  }

  /**
   * Adiciona um marcador ao nó
   * @param {string} marcador - Nome do marcador
   * @return {NoAST} Este nó (para encadeamento)
   */
  adicionaMarcador(marcador) {
    this.marcadores.add(marcador);
    return this;
  }

  /**
   * Remove um marcador do nó
   * @param {string} marcador - Nome do marcador
   * @return {NoAST} Este nó (para encadeamento)
   */
  removeMarcador(marcador) {
    this.marcadores.delete(marcador);
    return this;
  }

  /**
   * Verifica se o nó tem um marcador
   * @param {string} marcador - Nome do marcador
   * @return {boolean} True se o nó tem o marcador
   */
  temMarcador(marcador) {
    return this.marcadores.has(marcador);
  }

  /**
   * Define o estilo de visualização do nó
   * @param {Object} estilo - Objeto com propriedades de estilo CSS
   * @return {NoAST} Este nó (para encadeamento)
   */
  definirEstilo(estilo) {
    this.estiloVisualizacao = estilo;
    return this;
  }

  /**
   * Cria uma cópia profunda do nó (sem referências pai/filho)
   * @param {boolean} [comFilhos=true] - Se deve clonar também os filhos
   * @return {NoAST} Cópia do nó
   */
  clone(comFilhos = true) {
    const novoNo = new NoAST(this.tipo, this.valor, this.linha, this.coluna);
    
    // Copia propriedades
    Object.assign(novoNo.propriedades, this.propriedades);
    Object.assign(novoNo.metadados, this.metadados);
    
    // Copia marcadores
    this.marcadores.forEach(m => novoNo.marcadores.add(m));
    
    // Copia estilo
    if (this.estiloVisualizacao) {
      novoNo.estiloVisualizacao = { ...this.estiloVisualizacao };
    }
    
    // Copia filhos (recursivamente)
    if (comFilhos) {
      for (const filho of this.filhos) {
        const filhoClonado = filho.clone(true);
        novoNo.adicionaFilho(filhoClonado);
      }
    }
    
    return novoNo;
  }

  /**
   * Procura o ancestral mais próximo de um tipo específico
   * @param {string|string[]} tipo - Tipo(s) do nó a ser encontrado
   * @return {NoAST|null} O ancestral encontrado ou null
   */
  encontraAncestral(tipo) {
    let atual = this.pai;
    
    while (atual) {
      if (Array.isArray(tipo)) {
        if (tipo.includes(atual.tipo)) {
          return atual;
        }
      } else if (atual.tipo === tipo) {
        return atual;
      }
      
      atual = atual.pai;
    }
    
    return null;
  }

  /**
   * Verifica se o nó é ancestral de outro
   * @param {NoAST} no - Nó a verificar
   * @return {boolean} True se este nó é ancestral do nó fornecido
   */
  ehAncestralDe(no) {
    let atual = no.pai;
    
    while (atual) {
      if (atual === this) {
        return true;
      }
      
      atual = atual.pai;
    }
    
    return false;
  }

  /**
   * Percorre a árvore com um callback no padrão visitor
   * @param {Function|Object} visitante - Função ou objeto com métodos para visitar nós
   * @param {Object} [contexto={}] - Contexto compartilhado entre visitas
   */
  visita(visitante, contexto = {}) {
    // Visitante como objeto com métodos por tipo
    if (typeof visitante === 'object') {
      const metodoVisita = visitante[this.tipo] || visitante.default;
      
      if (typeof metodoVisita === 'function') {
        metodoVisita(this, contexto);
      }
      
      // Visita filhos (se o método não retornou false para indicar parada)
      if (contexto.continua !== false) {
        for (const filho of this.filhos) {
          filho.visita(visitante, contexto);
          
          // Verifica se a visita deve ser interrompida
          if (contexto.continua === false) {
            break;
          }
        }
      }
    }
    // Visitante como função
    else if (typeof visitante === 'function') {
      const resultado = visitante(this, contexto);
      
      // Se o resultado for false, não visita os filhos
      if (resultado !== false) {
        for (const filho of this.filhos) {
          filho.visita(visitante, contexto);
          
          // Verifica se a visita deve ser interrompida
          if (contexto.continua === false) {
            break;
          }
        }
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
   * Encontra o primeiro filho de um tipo específico
   * @param {string|string[]} tipo - Tipo(s) de nó a procurar
   * @return {NoAST|null} Filho encontrado ou null
   */
  pegaFilhoPorTipo(tipo) {
    if (Array.isArray(tipo)) {
      return this.filhos.find(filho => tipo.includes(filho.tipo)) || null;
    }
    return this.filhos.find(filho => filho.tipo === tipo) || null;
  }

  /**
   * Encontra todos os filhos de um tipo específico
   * @param {string|string[]} tipo - Tipo(s) de nó a procurar
   * @return {NoAST[]} Array de filhos encontrados
   */
  pegaFilhosPorTipo(tipo) {
    if (Array.isArray(tipo)) {
      return this.filhos.filter(filho => tipo.includes(filho.tipo));
    }
    return this.filhos.filter(filho => filho.tipo === tipo);
  }

  /**
   * Verifica se o nó tem um filho de tipo específico
   * @param {string|string[]} tipo - Tipo(s) de nó a verificar
   * @return {boolean} True se o nó tem pelo menos um filho do tipo
   */
  temFilhoTipo(tipo) {
    if (Array.isArray(tipo)) {
      return this.filhos.some(filho => tipo.includes(filho.tipo));
    }
    return this.filhos.some(filho => filho.tipo === tipo);
  }

  /**
   * Conta quantos filhos de um tipo específico o nó tem
   * @param {string|string[]} tipo - Tipo(s) de nó a contar
   * @return {number} Quantidade de filhos do tipo
   */
  contaFilhosTipo(tipo) {
    if (Array.isArray(tipo)) {
      return this.filhos.filter(filho => tipo.includes(filho.tipo)).length;
    }
    return this.filhos.filter(filho => filho.tipo === tipo).length;
  }

  /**
   * Obtém o índice de um filho específico
   * @param {NoAST} filho - Nó filho a procurar
   * @return {number} Índice do filho ou -1 se não encontrado
   */
  indiceFilho(filho) {
    return this.filhos.indexOf(filho);
  }

  /**
   * Obtém o caminho desde a raiz até este nó
   * @return {NoAST[]} Array de nós formando o caminho
   */
  pegaCaminho() {
    const caminho = [];
    let atual = this;
    
    while (atual) {
      caminho.unshift(atual);
      atual = atual.pai;
    }
    
    return caminho;
  }

  /**
   * Retorna o número de nós na subárvore (incluindo este nó)
   * @return {number} Quantidade de nós
   */
  tamanhoSubarvore() {
    let tamanho = 1; // Conta este nó
    
    for (const filho of this.filhos) {
      tamanho += filho.tamanhoSubarvore();
    }
    
    return tamanho;
  }

  /**
   * Retorna a altura da subárvore (caminho mais longo até uma folha)
   * @return {number} Altura da subárvore
   */
  alturaSubarvore() {
    if (this.filhos.length === 0) {
      return 0;
    }
    
    let alturaMaxima = 0;
    
    for (const filho of this.filhos) {
      const altura = filho.alturaSubarvore();
      if (altura > alturaMaxima) {
        alturaMaxima = altura;
      }
    }
    
    return alturaMaxima + 1;
  }

  /**
   * Executa uma função em todos os nós da subárvore em pré-ordem
   * @param {Function} callback - Função a ser executada em cada nó
   */
  percorreProfundidade(callback) {
    callback(this);
    
    for (const filho of this.filhos) {
      filho.percorreProfundidade(callback);
    }
  }

  /**
   * Executa uma função em todos os nós da subárvore em largura
   * @param {Function} callback - Função a ser executada em cada nó
   */
  percorreLargura(callback) {
    const fila = [this];
    
    while (fila.length > 0) {
      const no = fila.shift();
      callback(no);
      
      for (const filho of no.filhos) {
        fila.push(filho);
      }
    }
  }

  /**
   * Gera uma representação formatada da árvore para debugging
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
    
    if (this.marcadores.size > 0) {
      resultado += ` [${Array.from(this.marcadores).join(', ')}]`;
    }
    
    if (this.filhos.length > 0) {
      for (const filho of this.filhos) {
        resultado += '\n' + filho.toString(prefixo + '  ');
      }
    }
    
    return resultado;
  }

  /**
   * Exporta a árvore como estrutura JSON para uso externo
   * @param {boolean} [simplificado=false] - Se deve omitir detalhes não essenciais
   * @return {Object} Representação JSON da árvore
   */
  paraJSON(simplificado = false) {
    const json = {
      tipo: this.tipo,
      valor: this.valor,
      linha: this.linha,
      coluna: this.coluna
    };
    
    if (!simplificado) {
      json.propriedades = { ...this.propriedades };
      json.marcadores = Array.from(this.marcadores);
      
      if (Object.keys(this.metadados).length > 0) {
        json.metadados = { ...this.metadados };
      }
      
      if (this.estiloVisualizacao) {
        json.estilo = { ...this.estiloVisualizacao };
      }
    }
    
    json.filhos = this.filhos.map(filho => filho.paraJSON(simplificado));
    
    return json;
  }

  /**
   * Cria um nó AST a partir de uma representação JSON
   * @param {Object} json - Objeto JSON
   * @return {NoAST} Nó AST criado
   * @static
   */
  static deJSON(json) {
    const no = new NoAST(json.tipo, json.valor, json.linha, json.coluna);
    
    // Restaura propriedades
    if (json.propriedades) {
      Object.assign(no.propriedades, json.propriedades);
    }
    
    // Restaura marcadores
    if (json.marcadores) {
      json.marcadores.forEach(m => no.marcadores.add(m));
    }
    
    // Restaura metadados
    if (json.metadados) {
      Object.assign(no.metadados, json.metadados);
    }
    
    // Restaura estilo
    if (json.estilo) {
      no.estiloVisualizacao = { ...json.estilo };
    }
    
    // Restaura filhos
    if (json.filhos) {
      json.filhos.forEach(filhoJSON => {
        const filho = NoAST.deJSON(filhoJSON);
        no.adicionaFilho(filho);
      });
    }
    
    return no;
  }
  
  /**
   * Cria um novo nó-folha (sem filhos)
   * @param {string} tipo - Tipo do nó
   * @param {string} valor - Valor do nó
   * @param {number} linha - Linha no código fonte
   * @param {number} coluna - Coluna no código fonte
   * @return {NoAST} Novo nó
   * @static
   */
  static criaNoFolha(tipo, valor, linha, coluna) {
    return new NoAST(tipo, valor, linha, coluna);
  }
  
  /**
   * Cria um nó-pai com filhos
   * @param {string} tipo - Tipo do nó
   * @param {string} valor - Valor do nó
   * @param {number} linha - Linha no código fonte
   * @param {number} coluna - Coluna no código fonte
   * @param {NoAST[]} filhos - Array de nós filhos
   * @return {NoAST} Novo nó
   * @static
   */
  static criaNo(tipo, valor, linha, coluna, filhos = []) {
    const no = new NoAST(tipo, valor, linha, coluna);
    filhos.forEach(filho => no.adicionaFilho(filho));
    return no;
  }
}

// Exporta a classe
export default NoAST;
```

## Características Principais da Implementação

1. **Estrutura Hierárquica Completa**
    - Relacionamentos pai-filho claros e bem mantidos
    - Métodos para adicionar, remover e substituir filhos
    - Navegação por toda a árvore (ancestrais, filhos)

2. **Propriedades e Metadados Flexíveis**
    - Sistema de propriedades extensível para diferentes tipos de nós
    - Metadados separados para informações de análise e interpretação
    - Marcadores para debugging e visualização

3. **Navegação Eficiente**
    - Métodos para encontrar nós específicos na árvore
    - Filtros por tipo, predicado ou outras condições
    - Funções para verificar relacionamentos entre nós

4. **Padrão Visitor**
    - Implementação do padrão Visitor para processamento da árvore
    - Suporte para visitantes por tipo ou função genérica
    - Contexto compartilhado entre visitas para acumulação de resultados

5. **Métodos de Traversal**
    - Percurso em profundidade (DFS)
    - Percurso em largura (BFS)
    - Busca condicional e coleta de nós

6. **Utilitários para Visualização e Debug**
    - Métodos para representação em string com formatação clara
    - Serialização para JSON (completa ou simplificada)
    - Sistema de estilos para visualização na UI

7. **Métodos Estáticos para Construção**
    - Construção facilitada de nós com diferentes complexidades
    - Desserialização de estruturas JSON

Esta implementação do `NoAST` fornece uma base robusta e flexível para representar todas as estruturas da linguagem C nas diferentes versões que o IFSCEE suporta. A classe está pronta para trabalhar em conjunto com o AnalisadorSintatico para construir a árvore, e com o InterpretadorC para executar o código passo a passo.