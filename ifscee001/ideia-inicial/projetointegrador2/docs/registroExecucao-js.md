# Implementação Completa do RegistroExecucao

Aqui está a implementação completa da classe `RegistroExecucao`, que permite o rastreamento e visualização da execução passo a passo do código C:

```javascript
// registroExecucao.js
/**
 * Classe que gerencia o registro da execução de um programa C.
 * Permite rastrear estados intermediários e navegar pela execução passo-a-passo.
 */
class RegistroExecucao {
  /**
   * Inicializa o registro de execução
   * @param {Object} [opcoes={}] - Opções de configuração
   * @param {number} [opcoes.tamanhoMaximoHistorico=1000] - Número máximo de estados armazenados
   * @param {boolean} [opcoes.armazenarValoresCompletos=true] - Se deve armazenar cópias completas dos valores
   * @param {boolean} [opcoes.comprimirHistorico=false] - Se deve comprimir estados idênticos consecutivos
   */
  constructor(opcoes = {}) {
    // Opções de configuração
    this.opcoes = {
      tamanhoMaximoHistorico: opcoes.tamanhoMaximoHistorico || 1000,
      armazenarValoresCompletos: opcoes.armazenarValoresCompletos !== false,
      comprimirHistorico: opcoes.comprimirHistorico || false
    };
    
    // Lista de estados durante a execução
    this.estados = [];
    
    // Índice do estado atual
    this.indiceAtual = -1;
    
    // Escutadores para eventos
    this.escutadores = [];
    
    // Contador de passos executados
    this.contadorPassos = 0;
    
    // Marcadores e breakpoints
    this.breakpoints = new Set();
    this.marcadores = new Map(); // Mapa de nome -> linha
    
    // Flag para gravar ou não novos estados (quando navegando no histórico)
    this.gravacaoAtiva = true;
    
    // Metadados da execução
    this.metadados = {
      inicioExecucao: null,
      fimExecucao: null,
      arquivoAtual: null,
      nomePrograma: null
    };
    
    // Estatísticas de execução
    this.estatisticas = {
      totalPassos: 0,
      totalEstados: 0,
      tempoTotalExecucao: 0,
      instrucoesPorSegundo: 0,
      maxMemoriaUtilizada: 0
    };
  }

  /**
   * Inicia uma nova sessão de execução
   * @param {Object} informacoes - Informações iniciais da execução
   * @param {string} [informacoes.nomePrograma] - Nome do programa
   * @param {string} [informacoes.arquivoAtual] - Nome do arquivo principal
   */
  iniciaExecucao(informacoes = {}) {
    // Reinicia todos os estados
    this.estados = [];
    this.indiceAtual = -1;
    this.contadorPassos = 0;
    
    // Atualiza metadados
    this.metadados = {
      inicioExecucao: Date.now(),
      fimExecucao: null,
      arquivoAtual: informacoes.arquivoAtual || 'programa.c',
      nomePrograma: informacoes.nomePrograma || 'Programa C'
    };
    
    // Reinicia estatísticas
    this.estatisticas = {
      totalPassos: 0,
      totalEstados: 0,
      tempoTotalExecucao: 0,
      instrucoesPorSegundo: 0,
      maxMemoriaUtilizada: 0
    };
    
    // Ativa gravação
    this.gravacaoAtiva = true;
    
    // Notifica escutadores
    this._notificaEscutadores('inicioExecucao', { metadados: this.metadados });
  }

  /**
   * Finaliza a sessão de execução atual
   * @param {Object} [resultado={}] - Resultado da execução
   * @param {number} [resultado.codigoSaida=0] - Código de saída do programa
   * @param {boolean} [resultado.terminouComErro=false] - Se terminou com erro
   * @param {string} [resultado.mensagemErro=''] - Mensagem de erro, se houver
   */
  finalizaExecucao(resultado = {}) {
    // Atualiza metadados
    this.metadados.fimExecucao = Date.now();
    
    // Calcula estatísticas
    this.estatisticas.totalEstados = this.estados.length;
    this.estatisticas.tempoTotalExecucao = this.metadados.fimExecucao - this.metadados.inicioExecucao;
    this.estatisticas.instrucoesPorSegundo = (this.estatisticas.totalPassos / this.estatisticas.tempoTotalExecucao) * 1000;
    
    // Resultado
    const resultadoFinal = {
      codigoSaida: resultado.codigoSaida || 0,
      terminouComErro: resultado.terminouComErro || false,
      mensagemErro: resultado.mensagemErro || '',
      estatisticas: this.estatisticas,
      metadados: this.metadados
    };
    
    // Notifica escutadores
    this._notificaEscutadores('fimExecucao', resultadoFinal);
    
    return resultadoFinal;
  }

  /**
   * Registra um novo estado durante a execução
   * @param {Object} estado - Estado atual da execução
   * @return {number} Índice do estado no histórico
   */
  registraEstado(estado) {
    // Se a gravação não estiver ativa, ignora
    if (!this.gravacaoAtiva) {
      return this.indiceAtual;
    }
    
    // Incremente o contador de passos (mesmo que não armazene o estado)
    this.contadorPassos++;
    this.estatisticas.totalPassos++;
    
    // Copia o estado para evitar referências
    const estadoArmazenado = this._copiaEstado(estado);
    
    // Adiciona metadata
    estadoArmazenado.timestamp = Date.now();
    estadoArmazenado.passoExecucao = this.contadorPassos;
    
    // Opção para comprimir o histórico (não armazena estados idênticos consecutivos)
    if (this.opcoes.comprimirHistorico && this.estados.length > 0) {
      const ultimoEstado = this.estados[this.estados.length - 1];
      
      // Verifica se o estado atual é idêntico ao anterior
      if (this._estadosIdenticos(ultimoEstado, estadoArmazenado)) {
        // Atualiza apenas o contador de passos do último estado
        ultimoEstado.contagemRepetida = (ultimoEstado.contagemRepetida || 1) + 1;
        return this.indiceAtual;
      }
    }
    
    // Se estivermos navegando pelo histórico, remove todos os estados futuros
    if (this.indiceAtual < this.estados.length - 1) {
      this.estados = this.estados.slice(0, this.indiceAtual + 1);
    }
    
    // Adiciona o novo estado
    this.estados.push(estadoArmazenado);
    this.indiceAtual = this.estados.length - 1;
    
    // Limita o tamanho do histórico
    if (this.estados.length > this.opcoes.tamanhoMaximoHistorico) {
      this.estados.shift();
      this.indiceAtual--;
    }
    
    // Notifica escutadores
    this._notificaEscutadores('novoEstado', { 
      indice: this.indiceAtual,
      estado: estadoArmazenado,
      totalEstados: this.estados.length
    });
    
    // Verifica se é um breakpoint
    if (estado.linha && this.breakpoints.has(estado.linha)) {
      this._notificaEscutadores('breakpointAtingido', {
        linha: estado.linha,
        indice: this.indiceAtual,
        estado: estadoArmazenado
      });
    }
    
    return this.indiceAtual;
  }

  /**
   * Move para o estado anterior no histórico
   * @param {number} [passos=1] - Número de passos para retroceder
   * @return {Object|null} Estado anterior ou null se não houver
   */
  retrocede(passos = 1) {
    // Verifica se há estados anteriores
    if (this.indiceAtual <= 0) {
      return null;
    }
    
    // Calcula novo índice
    let novoIndice = Math.max(0, this.indiceAtual - passos);
    
    // Atualiza o índice atual
    this.indiceAtual = novoIndice;
    
    // Desativa gravação (estamos navegando no histórico)
    this.gravacaoAtiva = false;
    
    // Obtém o estado
    const estado = this.estados[this.indiceAtual];
    
    // Notifica escutadores
    this._notificaEscutadores('mudancaEstado', {
      indice: this.indiceAtual,
      direcao: 'retrocede',
      passos,
      estado
    });
    
    return estado;
  }

  /**
   * Move para o próximo estado no histórico
   * @param {number} [passos=1] - Número de passos para avançar
   * @return {Object|null} Próximo estado ou null se não houver
   */
  avanca(passos = 1) {
    // Verifica se há estados posteriores
    if (this.indiceAtual >= this.estados.length - 1) {
      return null;
    }
    
    // Calcula novo índice
    let novoIndice = Math.min(this.estados.length - 1, this.indiceAtual + passos);
    
    // Atualiza o índice atual
    this.indiceAtual = novoIndice;
    
    // Verifica se estamos no último estado
    if (this.indiceAtual === this.estados.length - 1) {
      // Reativa gravação quando chegamos ao final do histórico
      this.gravacaoAtiva = true;
    }
    
    // Obtém o estado
    const estado = this.estados[this.indiceAtual];
    
    // Notifica escutadores
    this._notificaEscutadores('mudancaEstado', {
      indice: this.indiceAtual,
      direcao: 'avanca',
      passos,
      estado
    });
    
    return estado;
  }

  /**
   * Vai para um estado específico no histórico
   * @param {number} indice - Índice do estado no histórico
   * @return {Object|null} Estado solicitado ou null se índice inválido
   */
  vaiParaEstado(indice) {
    // Verifica se o índice é válido
    if (indice < 0 || indice >= this.estados.length) {
      return null;
    }
    
    // Atualiza o índice atual
    const indiceAnterior = this.indiceAtual;
    this.indiceAtual = indice;
    
    // Configura a gravação
    this.gravacaoAtiva = (indice === this.estados.length - 1);
    
    // Obtém o estado
    const estado = this.estados[this.indiceAtual];
    
    // Notifica escutadores
    this._notificaEscutadores('mudancaEstado', {
      indice: this.indiceAtual,
      indiceAnterior,
      direcao: indice > indiceAnterior ? 'avanca' : 'retrocede',
      estado
    });
    
    return estado;
  }

  /**
   * Retorna o estado atual
   * @return {Object|null} Estado atual ou null se não houver estados
   */
  pegaEstadoAtual() {
    if (this.indiceAtual < 0 || this.indiceAtual >= this.estados.length) {
      return null;
    }
    return this.estados[this.indiceAtual];
  }

  /**
   * Retorna o estado anterior ao atual
   * @return {Object|null} Estado anterior ou null se não houver
   */
  pegaEstadoAnterior() {
    if (this.indiceAtual <= 0 || this.indiceAtual >= this.estados.length) {
      return null;
    }
    return this.estados[this.indiceAtual - 1];
  }

  /**
   * Retorna o próximo estado após o atual
   * @return {Object|null} Próximo estado ou null se não houver
   */
  pegaProximoEstado() {
    if (this.indiceAtual < 0 || this.indiceAtual >= this.estados.length - 1) {
      return null;
    }
    return this.estados[this.indiceAtual + 1];
  }

  /**
   * Retorna o estado em um índice específico
   * @param {number} indice - Índice do estado no histórico
   * @return {Object|null} Estado solicitado ou null se índice inválido
   */
  pegaEstadoEm(indice) {
    if (indice < 0 || indice >= this.estados.length) {
      return null;
    }
    return this.estados[indice];
  }

  /**
   * Retorna o primeiro estado no histórico
   * @return {Object|null} Primeiro estado ou null se não houver estados
   */
  pegaPrimeiroEstado() {
    if (this.estados.length === 0) {
      return null;
    }
    return this.estados[0];
  }

  /**
   * Retorna o último estado no histórico
   * @return {Object|null} Último estado ou null se não houver estados
   */
  pegaUltimoEstado() {
    if (this.estados.length === 0) {
      return null;
    }
    return this.estados[this.estados.length - 1];
  }

  /**
   * Adiciona um breakpoint
   * @param {number} linha - Número da linha para o breakpoint
   * @param {Object} [opcoes={}] - Opções adicionais
   * @param {string} [opcoes.condicao] - Condição para o breakpoint (expressão)
   * @param {string} [opcoes.arquivo] - Arquivo do breakpoint
   * @return {boolean} True se o breakpoint foi adicionado com sucesso
   */
  adicionaBreakpoint(linha, opcoes = {}) {
    // Verifica se a linha é válida
    if (!Number.isInteger(linha) || linha <= 0) {
      return false;
    }
    
    // Adiciona o breakpoint
    this.breakpoints.add(linha);
    
    // Notifica escutadores
    this._notificaEscutadores('breakpointAdicionado', {
      linha,
      arquivo: opcoes.arquivo,
      condicao: opcoes.condicao
    });
    
    return true;
  }

  /**
   * Remove um breakpoint
   * @param {number} linha - Número da linha do breakpoint
   * @return {boolean} True se o breakpoint foi removido com sucesso
   */
  removeBreakpoint(linha) {
    // Verifica se o breakpoint existe
    if (!this.breakpoints.has(linha)) {
      return false;
    }
    
    // Remove o breakpoint
    this.breakpoints.delete(linha);
    
    // Notifica escutadores
    this._notificaEscutadores('breakpointRemovido', { linha });
    
    return true;
  }

  /**
   * Verifica se uma linha tem um breakpoint
   * @param {number} linha - Número da linha
   * @return {boolean} True se a linha tem um breakpoint
   */
  temBreakpoint(linha) {
    return this.breakpoints.has(linha);
  }

  /**
   * Retorna todos os breakpoints
   * @return {number[]} Array com as linhas que têm breakpoints
   */
  pegaBreakpoints() {
    return Array.from(this.breakpoints);
  }

  /**
   * Limpa todos os breakpoints
   */
  limpaBreakpoints() {
    this.breakpoints.clear();
    this._notificaEscutadores('breakpointsLimpos');
  }

  /**
   * Adiciona um marcador
   * @param {string} nome - Nome do marcador
   * @param {number} linha - Número da linha
   * @return {boolean} True se o marcador foi adicionado com sucesso
   */
  adicionaMarcador(nome, linha) {
    // Verifica se a linha é válida
    if (!Number.isInteger(linha) || linha <= 0) {
      return false;
    }
    
    // Adiciona o marcador
    this.marcadores.set(nome, linha);
    
    // Notifica escutadores
    this._notificaEscutadores('marcadorAdicionado', { nome, linha });
    
    return true;
  }

  /**
   * Remove um marcador
   * @param {string} nome - Nome do marcador
   * @return {boolean} True se o marcador foi removido com sucesso
   */
  removeMarcador(nome) {
    // Verifica se o marcador existe
    if (!this.marcadores.has(nome)) {
      return false;
    }
    
    // Remove o marcador
    this.marcadores.delete(nome);
    
    // Notifica escutadores
    this._notificaEscutadores('marcadorRemovido', { nome });
    
    return true;
  }

  /**
   * Vai para um marcador
   * @param {string} nome - Nome do marcador
   * @return {Object|null} Estado encontrado para o marcador ou null se não encontrado
   */
  vaiParaMarcador(nome) {
    // Verifica se o marcador existe
    if (!this.marcadores.has(nome)) {
      return null;
    }
    
    const linha = this.marcadores.get(nome);
    
    // Procura um estado com essa linha
    for (let i = 0; i < this.estados.length; i++) {
      if (this.estados[i].linha === linha) {
        return this.vaiParaEstado(i);
      }
    }
    
    return null;
  }

  /**
   * Limpa o histórico de estados
   */
  limpaHistorico() {
    this.estados = [];
    this.indiceAtual = -1;
    this.gravacaoAtiva = true;
    
    // Notifica escutadores
    this._notificaEscutadores('historicoLimpo');
  }

  /**
   * Adiciona um escutador para eventos
   * @param {Function} callback - Função de callback
   * @return {number} ID do escutador
   */
  adicionaEscutador(callback) {
    this.escutadores.push(callback);
    return this.escutadores.length - 1;
  }

  /**
   * Remove um escutador
   * @param {number|Function} idOuCallback - ID ou função do escutador
   * @return {boolean} True se o escutador foi removido com sucesso
   */
  removeEscutador(idOuCallback) {
    if (typeof idOuCallback === 'number') {
      if (idOuCallback >= 0 && idOuCallback < this.escutadores.length) {
        this.escutadores.splice(idOuCallback, 1);
        return true;
      }
    } else if (typeof idOuCallback === 'function') {
      const indice = this.escutadores.indexOf(idOuCallback);
      if (indice !== -1) {
        this.escutadores.splice(indice, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Exporta o histórico completo
   * @param {Object} [opcoes={}] - Opções de exportação
   * @param {boolean} [opcoes.incluirMetadados=true] - Se deve incluir metadados
   * @param {boolean} [opcoes.incluirBreakpoints=true] - Se deve incluir breakpoints
   * @param {boolean} [opcoes.compactar=false] - Se deve compactar o histórico
   * @return {Object} Histórico exportado
   */
  exportaHistorico(opcoes = {}) {
    const incluirMetadados = opcoes.incluirMetadados !== false;
    const incluirBreakpoints = opcoes.incluirBreakpoints !== false;
    const compactar = opcoes.compactar || false;
    
    const resultado = {
      estados: compactar ? this._compactaHistorico() : this.estados,
      indiceAtual: this.indiceAtual,
      contadorPassos: this.contadorPassos
    };
    
    if (incluirMetadados) {
      resultado.metadados = this.metadados;
      resultado.estatisticas = this.estatisticas;
    }
    
    if (incluirBreakpoints) {
      resultado.breakpoints = Array.from(this.breakpoints);
      resultado.marcadores = Array.from(this.marcadores.entries());
    }
    
    return resultado;
  }

  /**
   * Importa um histórico previamente exportado
   * @param {Object} historico - Histórico exportado
   * @return {boolean} True se o histórico foi importado com sucesso
   */
  importaHistorico(historico) {
    try {
      // Verifica se o histórico é válido
      if (!historico || !Array.isArray(historico.estados)) {
        return false;
      }
      
      // Importa o histórico
      this.estados = historico.estados;
      this.indiceAtual = historico.indiceAtual || 0;
      this.contadorPassos = historico.contadorPassos || historico.estados.length;
      
      // Importa metadados, se existirem
      if (historico.metadados) {
        this.metadados = historico.metadados;
      }
      
      // Importa estatísticas, se existirem
      if (historico.estatisticas) {
        this.estatisticas = historico.estatisticas;
      }
      
      // Importa breakpoints, se existirem
      if (historico.breakpoints) {
        this.breakpoints = new Set(historico.breakpoints);
      }
      
      // Importa marcadores, se existirem
      if (historico.marcadores) {
        this.marcadores = new Map(historico.marcadores);
      }
      
      // Notifica escutadores
      this._notificaEscutadores('historicoImportado', {
        totalEstados: this.estados.length
      });
      
      return true;
    } catch (erro) {
      console.error('Erro ao importar histórico:', erro);
      return false;
    }
  }

  /**
   * Busca estados no histórico
   * @param {Object} filtro - Filtro de busca
   * @param {number} [filtro.linha] - Linha a procurar
   * @param {string} [filtro.arquivo] - Arquivo a procurar
   * @param {Function} [filtro.predicado] - Função de predicado personalizada
   * @return {Object[]} Array de resultados (indice e estado)
   */
  buscaEstados(filtro) {
    const resultados = [];
    
    for (let i = 0; i < this.estados.length; i++) {
      const estado = this.estados[i];
      let corresponde = true;
      
      // Verifica linha
      if (filtro.linha !== undefined && estado.linha !== filtro.linha) {
        corresponde = false;
      }
      
      // Verifica arquivo
      if (filtro.arquivo !== undefined && estado.arquivo !== filtro.arquivo) {
        corresponde = false;
      }
      
      // Verifica predicado personalizado
      if (typeof filtro.predicado === 'function' && !filtro.predicado(estado)) {
        corresponde = false;
      }
      
      if (corresponde) {
        resultados.push({
          indice: i,
          estado
        });
      }
    }
    
    return resultados;
  }

  /**
   * Retorna o número total de estados
   * @return {number} Número total de estados
   */
  totalEstados() {
    return this.estados.length;
  }

  /**
   * Verifica se há estados anteriores disponíveis
   * @return {boolean} True se há estados anteriores
   */
  temEstadoAnterior() {
    return this.indiceAtual > 0;
  }

  /**
   * Verifica se há estados posteriores disponíveis
   * @return {boolean} True se há estados posteriores
   */
  temProximoEstado() {
    return this.indiceAtual < this.estados.length - 1;
  }

  /**
   * Obtém as estatísticas de execução
   * @return {Object} Estatísticas de execução
   */
  pegaEstatisticas() {
    // Atualiza algumas estatísticas em tempo real
    if (this.metadados.inicioExecucao && !this.metadados.fimExecucao) {
      const tempoAtual = Date.now() - this.metadados.inicioExecucao;
      this.estatisticas.tempoTotalExecucao = tempoAtual;
      this.estatisticas.instrucoesPorSegundo = (this.estatisticas.totalPassos / tempoAtual) * 1000;
    }
    
    return {
      totalPassos: this.estatisticas.totalPassos,
      totalEstados: this.estados.length,
      tempoExecucao: this.estatisticas.tempoTotalExecucao,
      instrucoesPorSegundo: this.estatisticas.instrucoesPorSegundo,
      maxMemoriaUtilizada: this.estatisticas.maxMemoriaUtilizada
    };
  }

  // ===== Métodos auxiliares privados =====

  /**
   * Copia um estado para evitar referências
   * @param {Object} estado - Estado a ser copiado
   * @return {Object} Cópia profunda do estado
   * @private
   */
  _copiaEstado(estado) {
    // Verifica o modo de armazenamento
    if (!this.opcoes.armazenarValoresCompletos) {
      // Modo otimizado: armazena apenas as informações essenciais
      return {
        linha: estado.linha,
        coluna: estado.coluna,
        arquivo: estado.arquivo,
        instrucao: estado.instrucao,
        escopo: estado.escopo,
        // Outras propriedades essenciais
        ...estado.propriedades
      };
    }
    
    // Modo completo: faz uma cópia profunda
    return this._copiaObjeto(estado);
  }

  /**
   * Copia profundamente um objeto
   * @param {any} objeto - Objeto a ser copiado
   * @return {any} Cópia profunda do objeto
   * @private
   */
  _copiaObjeto(objeto) {
    // Caso base: null ou undefined
    if (objeto === null || objeto === undefined) {
      return objeto;
    }
    
    // Tipos primitivos
    if (typeof objeto !== 'object') {
      return objeto;
    }
    
    // Arrays
    if (Array.isArray(objeto)) {
      return objeto.map(item => this._copiaObjeto(item));
    }
    
    // Para evitar problemas com objetos cíclicos
    try {
      // Objetos: cópia profunda usando JSON
      return JSON.parse(JSON.stringify(objeto));
    } catch (erro) {
      // Fallback para objetos com referências circulares
      const copia = {};
      for (const chave in objeto) {
        if (Object.prototype.hasOwnProperty.call(objeto, chave)) {
          try {
            copia[chave] = this._copiaObjeto(objeto[chave]);
          } catch (e) {
            copia[chave] = '[Circular]';
          }
        }
      }
      return copia;
    }
  }

  /**
   * Verifica se dois estados são idênticos
   * @param {Object} estado1 - Primeiro estado
   * @param {Object} estado2 - Segundo estado
   * @return {boolean} True se os estados são idênticos
   * @private
   */
  _estadosIdenticos(estado1, estado2) {
    // Compara propriedades essenciais
    if (estado1.linha !== estado2.linha ||
        estado1.coluna !== estado2.coluna ||
        estado1.arquivo !== estado2.arquivo ||
        estado1.instrucao !== estado2.instrucao) {
      return false;
    }
    
    // Mais comparações detalhadas podem ser adicionadas aqui
    
    return true;
  }

  /**
   * Compacta o histórico para exportação
   * @return {Object[]} Histórico compactado
   * @private
   */
  _compactaHistorico() {
    // Implementação de compactação simplificada
    // Em uma implementação real, poderia usar algoritmos mais eficientes
    
    const compactado = [];
    let estadoAnterior = null;
    
    for (const estado of this.estados) {
      if (!estadoAnterior) {
        // Primeiro estado
        compactado.push(estado);
      } else {
        // Armazena apenas as diferenças em relação ao estado anterior
        const diff = {};
        let temDiferenca = false;
        
        for (const chave in estado) {
          if (Object.prototype.hasOwnProperty.call(estado, chave)) {
            if (JSON.stringify(estado[chave]) !== JSON.stringify(estadoAnterior[chave])) {
              diff[chave] = estado[chave];
              temDiferenca = true;
            }
          }
        }
        
        if (temDiferenca) {
          diff._tipo = 'diff';
          diff._referenciaIndice = compactado.length - 1;
          compactado.push(diff);
        } else {
          compactado.push({ _tipo: 'igual', _referenciaIndice: compactado.length - 1 });
        }
      }
      
      estadoAnterior = estado;
    }
    
    return compactado;
  }

  /**
   * Descompacta um histórico compactado
   * @param {Object[]} compactado - Histórico compactado
   * @return {Object[]} Histórico descompactado
   * @private
   */
  _descompactaHistorico(compactado) {
    if (!compactado || !compactado.length) {
      return [];
    }
    
    const descompactado = [compactado[0]];
    
    for (let i = 1; i < compactado.length; i++) {
      const item = compactado[i];
      
      if (item._tipo === 'igual') {
        // Clone o estado anterior
        descompactado.push(this._copiaObjeto(descompactado[item._referenciaIndice]));
      } else if (item._tipo === 'diff') {
        // Aplica as diferenças ao estado anterior
        const base = this._copiaObjeto(descompactado[item._referenciaIndice]);
        const novo = { ...base };
        
        for (const chave in item) {
          if (chave !== '_tipo' && chave !== '_referenciaIndice') {
            novo[chave] = item[chave];
          }
        }
        
        descompactado.push(novo);
      } else {
        // Estado completo
        descompactado.push(item);
      }
    }
    
    return descompactado;
  }

  /**
   * Notifica todos os escutadores registrados
   * @param {string} evento - Nome do evento
   * @param {Object} dados - Dados do evento
   * @private
   */
  _notificaEscutadores(evento, dados = {}) {
    // Adiciona informações básicas ao evento
    const eventoCompleto = {
      tipo: evento,
      timestamp: Date.now(),
      indiceAtual: this.indiceAtual,
      totalEstados: this.estados.length,
      ...dados
    };
    
    // Notifica todos os escutadores
    for (const escutador of this.escutadores) {
      try {
        escutador(eventoCompleto);
      } catch (erro) {
        console.error('Erro ao notificar escutador:', erro);
      }
    }
  }
}

// Exporta a classe
export default RegistroExecucao;
```

## Características Principais do RegistroExecucao

1. **Armazenamento de Estados**
    - Captura e armazenamento de estados da execução passo a passo
    - Controle de tamanho máximo do histórico
    - Opções de armazenamento completo ou otimizado

2. **Navegação no Histórico**
    - Avançar e retroceder na execução
    - Ir para estados específicos
    - Verificação de disponibilidade de estados

3. **Breakpoints e Marcadores**
    - Adição e remoção de breakpoints
    - Criação de marcadores para pontos importantes
    - Navegação direta para marcadores

4. **Compressão e Otimização**
    - Compressão opcional de estados idênticos consecutivos
    - Otimização do armazenamento
    - Exportação e importação do histórico

5. **Estatísticas e Análise**
    - Coleta de estatísticas de execução (tempo, passos, etc.)
    - Busca de estados com filtros específicos
    - Metadados detalhados da execução

6. **Sistema de Notificação**
    - Padrão observer para notificação de eventos
    - Registro e gerenciamento de escutadores
    - Eventos para todos os aspectos da execução

7. **Persistência**
    - Exportação do histórico completo
    - Importação de histórico salvo
    - Compactação para reduzir o tamanho dos dados

Esta implementação do `RegistroExecucao` fornece uma base robusta para a funcionalidade de depuração passo a passo no IFSCEE, permitindo aos estudantes explorar o comportamento dos programas C, avançar e retroceder na execução, e entender as mudanças de estado durante o tempo de execução.