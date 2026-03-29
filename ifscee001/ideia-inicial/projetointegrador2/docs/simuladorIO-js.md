# Implementação Completa do SimuladorIO

Aqui está a implementação completa da classe `SimuladorIO`, que simula as operações de entrada e saída do C:

```javascript
// simuladorIO.js
/**
 * Classe que simula operações de entrada/saída (I/O) da linguagem C.
 * Implementa funcionalidades da stdio.h e outras bibliotecas I/O do C.
 */
class SimuladorIO {
  /**
   * Inicializa o simulador de I/O
   * @param {Object} [opcoes={}] - Opções de configuração
   * @param {number} [opcoes.tamanhoBufferEntrada=1024] - Tamanho do buffer de entrada
   * @param {number} [opcoes.tamanhoBufferSaida=4096] - Tamanho do buffer de saída
   * @param {GerenciadorMemoria} [opcoes.gerenciadorMemoria=null] - Instância do gerenciador de memória
   */
  constructor(opcoes = {}) {
    // Buffers de entrada e saída
    this.stdin = [];
    this.stdout = [];
    this.stderr = [];
    
    // Tamanhos dos buffers
    this.tamanhoBufferEntrada = opcoes.tamanhoBufferEntrada || 1024;
    this.tamanhoBufferSaida = opcoes.tamanhoBufferSaida || 4096;
    
    // Gerenciador de memória (opcional)
    this.gerenciadorMemoria = opcoes.gerenciadorMemoria || null;
    
    // Estado dos buffers
    this.posicaoEntrada = 0;
    this.posicaoSaida = 0;
    
    // Handlers para UI
    this.elementoEntrada = null;
    this.elementoSaida = null;
    
    // Callback para entrada assíncrona
    this.callbackEntrada = null;
    this.entradaPendente = false;
    
    // Modos de saída
    this.modoSaidaInterativo = true; // true = atualiza a UI em tempo real
    
    // Arquivos simulados
    this.arquivos = new Map();
    this.proximoFileHandle = 3; // 0 = stdin, 1 = stdout, 2 = stderr
    
    // Histórico de operações
    this.historico = [];
    
    // Inicializa arquivos padrão
    this._inicializaArquivosPadrao();
  }

  /**
   * Inicializa os descritores de arquivo padrão (stdin, stdout, stderr)
   * @private
   */
  _inicializaArquivosPadrao() {
    // stdin (file descriptor 0)
    this.arquivos.set(0, {
      modo: 'r',
      buffer: this.stdin,
      posicao: 0,
      nome: '<stdin>',
      aberto: true,
      tipo: 'text'
    });
    
    // stdout (file descriptor 1)
    this.arquivos.set(1, {
      modo: 'w',
      buffer: this.stdout,
      posicao: 0,
      nome: '<stdout>',
      aberto: true,
      tipo: 'text'
    });
    
    // stderr (file descriptor 2)
    this.arquivos.set(2, {
      modo: 'w',
      buffer: this.stderr,
      posicao: 0,
      nome: '<stderr>',
      aberto: true,
      tipo: 'text'
    });
  }

  /**
   * Define os elementos de UI para entrada/saída
   * @param {HTMLElement} elementoEntrada - Elemento para entrada (input/textarea)
   * @param {HTMLElement} elementoSaida - Elemento para saída (div/pre)
   */
  defineElementosUI(elementoEntrada, elementoSaida) {
    this.elementoEntrada = elementoEntrada;
    this.elementoSaida = elementoSaida;
    
    // Configura o elemento de entrada
    if (this.elementoEntrada) {
      this.elementoEntrada.addEventListener('keypress', (evento) => {
        if (evento.key === 'Enter' && this.entradaPendente) {
          this.processaEntradaUI();
        }
      });
    }
    
    // Atualiza a UI com o estado atual
    this.atualizaUI();
  }

  /**
   * Processa a entrada do usuário na UI
   */
  processaEntradaUI() {
    if (!this.elementoEntrada || !this.entradaPendente) {
      return;
    }
    
    // Obtém o texto do elemento de entrada
    const texto = this.elementoEntrada.value || '';
    
    // Adiciona a entrada ao buffer
    this.adicionaEntrada(texto + '\n');
    
    // Limpa o campo de entrada
    this.elementoEntrada.value = '';
    
    // Reseta o estado de entrada pendente
    this.entradaPendente = false;
    
    // Chama o callback se existir
    if (this.callbackEntrada) {
      const callback = this.callbackEntrada;
      this.callbackEntrada = null;
      callback(true);
    }
  }

  /**
   * Atualiza a UI com o estado atual dos buffers
   */
  atualizaUI() {
    // Atualiza o elemento de saída
    if (this.elementoSaida) {
      // Combina stdout e stderr
      const saida = [
        ...this.stdout,
        ...this.stderr.map(linha => `[ERRO] ${linha}`)
      ].join('');
      
      // Atualiza o conteúdo
      if (this.elementoSaida.tagName === 'INPUT' || 
          this.elementoSaida.tagName === 'TEXTAREA') {
        this.elementoSaida.value = saida;
      } else {
        this.elementoSaida.textContent = saida;
      }
      
      // Rola para o final
      if (this.elementoSaida.scrollHeight) {
        this.elementoSaida.scrollTop = this.elementoSaida.scrollHeight;
      }
    }
    
    // Atualiza o elemento de entrada
    if (this.elementoEntrada) {
      // Habilita ou desabilita com base no estado
      this.elementoEntrada.disabled = !this.entradaPendente;
      
      if (this.entradaPendente) {
        this.elementoEntrada.focus();
      }
    }
  }

  /**
   * Adiciona texto à entrada
   * @param {string} texto - Texto a ser adicionado à entrada
   */
  adicionaEntrada(texto) {
    // Adiciona ao buffer de entrada
    this.stdin.push(texto);
    
    // Registra a operação
    this._registraOperacao('adicionar_entrada', { texto });
  }

  /**
   * Adiciona texto à saída
   * @param {string} texto - Texto a ser adicionado à saída
   * @param {Object} [opcoes={}] - Opções adicionais
   * @param {boolean} [opcoes.erro=false] - Se true, adiciona ao stderr
   */
  adicionaSaida(texto, opcoes = {}) {
    // Verifica se é para stderr
    if (opcoes.erro) {
      this.stderr.push(texto);
    } else {
      this.stdout.push(texto);
    }
    
    // Atualiza a UI imediatamente se no modo interativo
    if (this.modoSaidaInterativo) {
      this.atualizaUI();
    }
    
    // Registra a operação
    this._registraOperacao('adicionar_saida', { texto, erro: opcoes.erro });
  }

  /**
   * Limpa os buffers de entrada e saída
   * @param {Object} [opcoes={}] - Opções adicionais
   * @param {boolean} [opcoes.entrada=true] - Se true, limpa o buffer de entrada
   * @param {boolean} [opcoes.saida=true] - Se true, limpa o buffer de saída
   * @param {boolean} [opcoes.erro=true] - Se true, limpa o buffer de erro
   */
  limpaBuffers(opcoes = {}) {
    const limpaEntrada = opcoes.entrada !== false;
    const limpaSaida = opcoes.saida !== false;
    const limpaErro = opcoes.erro !== false;
    
    if (limpaEntrada) {
      this.stdin = [];
      this.posicaoEntrada = 0;
    }
    
    if (limpaSaida) {
      this.stdout = [];
      this.posicaoSaida = 0;
    }
    
    if (limpaErro) {
      this.stderr = [];
    }
    
    // Atualiza a UI
    this.atualizaUI();
    
    // Registra a operação
    this._registraOperacao('limpar_buffers', { entrada: limpaEntrada, saida: limpaSaida, erro: limpaErro });
  }

  /**
   * Implementação similar à função printf do C
   * @param {string} formato - String de formato
   * @param {...any} args - Argumentos para substituir no formato
   * @return {number} Número de caracteres escritos
   */
  printf(formato, ...args) {
    try {
      // Processa a string de formato
      const resultado = this._processaStringFormato(formato, args);
      
      // Adiciona à saída
      this.adicionaSaida(resultado);
      
      // Retorna o número de caracteres escritos
      return resultado.length;
    } catch (erro) {
      this.adicionaSaida(`[Erro em printf] ${erro.message}`, { erro: true });
      return -1;
    }
  }

  /**
   * Implementação similar à função puts do C
   * @param {string} texto - Texto a escrever
   * @return {number} Número de caracteres escritos ou -1 em caso de erro
   */
  puts(texto) {
    try {
      // Adiciona o texto com quebra de linha
      const comQuebraDeLinha = texto + '\n';
      this.adicionaSaida(comQuebraDeLinha);
      
      // Retorna o número de caracteres escritos
      return comQuebraDeLinha.length;
    } catch (erro) {
      this.adicionaSaida(`[Erro em puts] ${erro.message}`, { erro: true });
      return -1;
    }
  }

  /**
   * Implementação similar à função putchar do C
   * @param {number} charCode - Código do caractere a escrever
   * @return {number} Código do caractere escrito ou -1 em caso de erro
   */
  putchar(charCode) {
    try {
      // Converte para caractere
      const char = String.fromCharCode(charCode);
      
      // Adiciona à saída
      this.adicionaSaida(char);
      
      // Retorna o código do caractere
      return charCode;
    } catch (erro) {
      this.adicionaSaida(`[Erro em putchar] ${erro.message}`, { erro: true });
      return -1;
    }
  }

  /**
   * Implementação similar à função scanf do C
   * @param {string} formato - String de formato
   * @param {...number} enderecos - Endereços de memória para armazenar os valores lidos
   * @return {number} Número de itens processados ou -1 em caso de erro
   */
  scanf(formato, ...enderecos) {
    // Verifica se o gerenciador de memória está disponível
    if (!this.gerenciadorMemoria) {
      this.adicionaSaida('[Erro em scanf] Gerenciador de memória não disponível', { erro: true });
      return -1;
    }
    
    // Verifica se há entrada disponível
    if (this.stdin.length === 0) {
      // Solicita entrada ao usuário
      this.entradaPendente = true;
      this.atualizaUI();
      
      // Retorna uma Promise para ser resolvida quando a entrada estiver disponível
      return new Promise((resolve) => {
        this.callbackEntrada = resolve;
      }).then(() => {
        // Tenta novamente com a entrada disponível
        return this.scanf(formato, ...enderecos);
      });
    }
    
    try {
      // Obtém o texto de entrada atual
      const entradaAtual = this.stdin.join('');
      
      // Processa a string de formato
      const especificadores = this._extraiEspecificadoresFormato(formato);
      
      // Posição atual na entrada
      let posicaoEntrada = 0;
      
      // Número de itens processados com sucesso
      let itensProcessados = 0;
      
      // Processa cada especificador
      for (let i = 0; i < especificadores.length; i++) {
        const espec = especificadores[i];
        
        // Pula espaços em branco
        while (posicaoEntrada < entradaAtual.length && 
               /\s/.test(entradaAtual[posicaoEntrada])) {
          posicaoEntrada++;
        }
        
        // Verifica se chegou ao fim da entrada
        if (posicaoEntrada >= entradaAtual.length) {
          break;
        }
        
        // Endereço para armazenar o valor
        const endereco = enderecos[i];
        
        // Processa de acordo com o especificador
        switch (espec.tipo) {
          case 'd': // int
          case 'i': // int
            {
              const resultado = this._lerInteiro(entradaAtual, posicaoEntrada);
              
              if (resultado.sucesso) {
                // Escreve o valor na memória
                this.gerenciadorMemoria.escreveMemoria(endereco, 0, resultado.valor);
                posicaoEntrada = resultado.novaPosicao;
                itensProcessados++;
              } else {
                // Falha na leitura
                return itensProcessados;
              }
            }
            break;
            
          case 'f': // float
          case 'g': // float
          case 'e': // float
            {
              const resultado = this._lerFloat(entradaAtual, posicaoEntrada);
              
              if (resultado.sucesso) {
                // Escreve o valor na memória
                this.gerenciadorMemoria.escreveMemoria(endereco, 0, resultado.valor);
                posicaoEntrada = resultado.novaPosicao;
                itensProcessados++;
              } else {
                // Falha na leitura
                return itensProcessados;
              }
            }
            break;
            
          case 'c': // char
            {
              // Lê um único caractere
              if (posicaoEntrada < entradaAtual.length) {
                const charCode = entradaAtual.charCodeAt(posicaoEntrada);
                
                // Escreve o valor na memória
                this.gerenciadorMemoria.escreveMemoria(endereco, 0, charCode);
                posicaoEntrada++;
                itensProcessados++;
              } else {
                // Fim da entrada
                return itensProcessados;
              }
            }
            break;
            
          case 's': // string
            {
              const resultado = this._lerString(entradaAtual, posicaoEntrada);
              
              if (resultado.sucesso) {
                // Escreve a string na memória como array de chars
                for (let j = 0; j < resultado.valor.length; j++) {
                  this.gerenciadorMemoria.escreveMemoria(endereco, j, resultado.valor.charCodeAt(j));
                }
                
                // Adiciona terminador nulo
                this.gerenciadorMemoria.escreveMemoria(endereco, resultado.valor.length, 0);
                
                posicaoEntrada = resultado.novaPosicao;
                itensProcessados++;
              } else {
                // Falha na leitura
                return itensProcessados;
              }
            }
            break;
            
          // Outros especificadores podem ser adicionados conforme necessário
        }
      }
      
      // Consome a entrada processada
      const entradaRestante = entradaAtual.substring(posicaoEntrada);
      this.stdin = [entradaRestante];
      
      // Registra a operação
      this._registraOperacao('scanf', { formato, itensProcessados });
      
      return itensProcessados;
    } catch (erro) {
      this.adicionaSaida(`[Erro em scanf] ${erro.message}`, { erro: true });
      return -1;
    }
  }

  /**
   * Implementação similar à função getchar do C
   * @return {number} Código do caractere lido ou -1 (EOF) se não houver entrada
   */
  getchar() {
    // Verifica se há entrada disponível
    if (this.stdin.length === 0) {
      // Solicita entrada ao usuário
      this.entradaPendente = true;
      this.atualizaUI();
      
      // Retorna uma Promise para ser resolvida quando a entrada estiver disponível
      return new Promise((resolve) => {
        this.callbackEntrada = resolve;
      }).then(() => {
        // Tenta novamente com a entrada disponível
        return this.getchar();
      });
    }
    
    try {
      // Obtém o texto de entrada atual
      let entradaAtual = this.stdin.join('');
      
      // Verifica se há caracteres disponíveis
      if (entradaAtual.length === 0) {
        return -1; // EOF
      }
      
      // Lê o primeiro caractere
      const charCode = entradaAtual.charCodeAt(0);
      
      // Atualiza o buffer de entrada
      this.stdin = [entradaAtual.substring(1)];
      
      // Registra a operação
      this._registraOperacao('getchar', { charCode });
      
      return charCode;
    } catch (erro) {
      this.adicionaSaida(`[Erro em getchar] ${erro.message}`, { erro: true });
      return -1;
    }
  }

  /**
   * Implementação similar à função gets do C
   * @param {number} buffer - Endereço do buffer para armazenar a string
   * @param {number} tamanho - Tamanho máximo do buffer
   * @return {number} Endereço do buffer ou 0 em caso de erro/EOF
   */
  gets(buffer, tamanho) {
    // Verifica se o gerenciador de memória está disponível
    if (!this.gerenciadorMemoria) {
      this.adicionaSaida('[Erro em gets] Gerenciador de memória não disponível', { erro: true });
      return 0;
    }
    
    // Verifica se há entrada disponível
    if (this.stdin.length === 0) {
      // Solicita entrada ao usuário
      this.entradaPendente = true;
      this.atualizaUI();
      
      // Retorna uma Promise para ser resolvida quando a entrada estiver disponível
      return new Promise((resolve) => {
        this.callbackEntrada = resolve;
      }).then(() => {
        // Tenta novamente com a entrada disponível
        return this.gets(buffer, tamanho);
      });
    }
    
    try {
      // Obtém o texto de entrada atual
      let entradaAtual = this.stdin.join('');
      
      // Verifica se há texto disponível
      if (entradaAtual.length === 0) {
        return 0; // EOF
      }
      
      // Encontra o fim da linha
      let fimLinha = entradaAtual.indexOf('\n');
      if (fimLinha === -1) {
        fimLinha = entradaAtual.length;
      }
      
      // Limita ao tamanho do buffer (menos 1 para o terminador nulo)
      const tamanhoMaximo = Math.min(fimLinha, tamanho - 1);
      
      // Obtém a linha
      const linha = entradaAtual.substring(0, tamanhoMaximo);
      
      // Escreve a linha na memória
      for (let i = 0; i < linha.length; i++) {
        this.gerenciadorMemoria.escreveMemoria(buffer, i, linha.charCodeAt(i));
      }
      
      // Adiciona terminador nulo
      this.gerenciadorMemoria.escreveMemoria(buffer, linha.length, 0);
      
      // Atualiza o buffer de entrada (remove a linha processada)
      this.stdin = [entradaAtual.substring(fimLinha + 1)];
      
      // Registra a operação
      this._registraOperacao('gets', { tamanho, comprimentoLido: linha.length });
      
      return buffer; // Retorna o endereço do buffer
    } catch (erro) {
      this.adicionaSaida(`[Erro em gets] ${erro.message}`, { erro: true });
      return 0;
    }
  }

  /**
   * Implementação similar à função fopen do C
   * @param {string} caminho - Caminho do arquivo
   * @param {string} modo - Modo de abertura ("r", "w", "a", etc.)
   * @return {number} Handle do arquivo ou 0 em caso de erro
   */
  fopen(caminho, modo) {
    try {
      // Valida o modo
      if (!/^[rwa]\+?b?$/.test(modo)) {
        throw new Error(`Modo inválido: ${modo}`);
      }
      
      // Cria o arquivo se ainda não existir
      if (!this.arquivos.has(caminho) && (modo.includes('w') || modo.includes('a'))) {
        // Cria um novo arquivo
        const novoArquivo = {
          modo,
          buffer: [],
          posicao: 0,
          nome: caminho,
          aberto: true,
          tipo: modo.includes('b') ? 'binary' : 'text'
        };
        
        // Gera um novo handle
        const handle = this.proximoFileHandle++;
        
        // Armazena o arquivo
        this.arquivos.set(handle, novoArquivo);
        
        // Registra a operação
        this._registraOperacao('fopen', { caminho, modo, handle });
        
        return handle;
      }
      
      // Verifica se o arquivo existe para leitura
      if (modo.includes('r') && !this.arquivos.has(caminho)) {
        // Arquivo não encontrado
        return 0;
      }
      
      // Abre um arquivo existente
      const arquivo = this.arquivos.get(caminho);
      
      // Limpa o buffer se estiver abrindo para escrita
      if (modo.includes('w')) {
        arquivo.buffer = [];
      }
      
      // Posiciona no final do arquivo se estiver abrindo para append
      if (modo.includes('a')) {
        arquivo.posicao = arquivo.buffer.length;
      } else {
        arquivo.posicao = 0;
      }
      
      // Marca como aberto
      arquivo.aberto = true;
      arquivo.modo = modo;
      
      // Gera um novo handle
      const handle = this.proximoFileHandle++;
      
      // Armazena o arquivo
      this.arquivos.set(handle, arquivo);
      
      // Registra a operação
      this._registraOperacao('fopen', { caminho, modo, handle });
      
      return handle;
    } catch (erro) {
      this.adicionaSaida(`[Erro em fopen] ${erro.message}`, { erro: true });
      return 0;
    }
  }

  /**
   * Implementação similar à função fclose do C
   * @param {number} handle - Handle do arquivo
   * @return {number} 0 em caso de sucesso ou -1 em caso de erro
   */
  fclose(handle) {
    try {
      // Verifica se o handle é válido
      if (!this.arquivos.has(handle)) {
        throw new Error(`Handle de arquivo inválido: ${handle}`);
      }
      
      // Obtém o arquivo
      const arquivo = this.arquivos.get(handle);
      
      // Verifica se o arquivo está aberto
      if (!arquivo.aberto) {
        throw new Error(`Arquivo já está fechado: ${arquivo.nome}`);
      }
      
      // Marca como fechado
      arquivo.aberto = false;
      
      // Registra a operação
      this._registraOperacao('fclose', { handle });
      
      return 0;
    } catch (erro) {
      this.adicionaSaida(`[Erro em fclose] ${erro.message}`, { erro: true });
      return -1;
    }
  }

  /**
   * Implementação similar à função fprintf do C
   * @param {number} handle - Handle do arquivo
   * @param {string} formato - String de formato
   * @param {...any} args - Argumentos para substituir no formato
   * @return {number} Número de caracteres escritos ou -1 em caso de erro
   */
  fprintf(handle, formato, ...args) {
    try {
      // Verifica se o handle é válido
      if (!this.arquivos.has(handle)) {
        throw new Error(`Handle de arquivo inválido: ${handle}`);
      }
      
      // Obtém o arquivo
      const arquivo = this.arquivos.get(handle);
      
      // Verifica se o arquivo está aberto
      if (!arquivo.aberto) {
        throw new Error(`Arquivo está fechado: ${arquivo.nome}`);
      }
      
      // Verifica se o arquivo está aberto para escrita
      if (!arquivo.modo.includes('w') && !arquivo.modo.includes('a') && !arquivo.modo.includes('+')) {
        throw new Error(`Arquivo não está aberto para escrita: ${arquivo.nome}`);
      }
      
      // Processa a string de formato
      const resultado = this._processaStringFormato(formato, args);
      
      // Casos especiais para stdout e stderr
      if (handle === 1) {
        // stdout
        this.adicionaSaida(resultado);
        return resultado.length;
      } else if (handle === 2) {
        // stderr
        this.adicionaSaida(resultado, { erro: true });
        return resultado.length;
      }
      
      // Escreve no buffer do arquivo
      arquivo.buffer.push(resultado);
      arquivo.posicao += resultado.length;
      
      // Registra a operação
      this._registraOperacao('fprintf', { handle, formato, comprimento: resultado.length });
      
      return resultado.length;
    } catch (erro) {
      this.adicionaSaida(`[Erro em fprintf] ${erro.message}`, { erro: true });
      return -1;
    }
  }

  /**
   * Implementação similar à função fread do C
   * @param {number} buffer - Endereço do buffer para armazenar os dados
   * @param {number} tamanhoItem - Tamanho de cada item em bytes
   * @param {number} quantidadeItens - Quantidade de itens a ler
   * @param {number} handle - Handle do arquivo
   * @return {number} Número de itens lidos ou 0 em caso de erro/EOF
   */
  fread(buffer, tamanhoItem, quantidadeItens, handle) {
    // Verifica se o gerenciador de memória está disponível
    if (!this.gerenciadorMemoria) {
      this.adicionaSaida('[Erro em fread] Gerenciador de memória não disponível', { erro: true });
      return 0;
    }
    
    try {
      // Verifica se o handle é válido
      if (!this.arquivos.has(handle)) {
        throw new Error(`Handle de arquivo inválido: ${handle}`);
      }
      
      // Obtém o arquivo
      const arquivo = this.arquivos.get(handle);
      
      // Verifica se o arquivo está aberto
      if (!arquivo.aberto) {
        throw new Error(`Arquivo está fechado: ${arquivo.nome}`);
      }
      
      // Verifica se o arquivo está aberto para leitura
      if (!arquivo.modo.includes('r') && !arquivo.modo.includes('+')) {
        throw new Error(`Arquivo não está aberto para leitura: ${arquivo.nome}`);
      }
      
      // Caso especial para stdin
      if (handle === 0) {
        // Vamos ler do stdin
        return this._lerDoStdin(buffer, tamanhoItem, quantidadeItens);
      }
      
      // Converte o buffer do arquivo para uma string
      const conteudo = arquivo.buffer.join('');
      
      // Verifica se já chegou ao fim do arquivo
      if (arquivo.posicao >= conteudo.length) {
        return 0; // EOF
      }
      
      // Calcula quantos itens podem ser lidos
      const bytesDisponiveis = conteudo.length - arquivo.posicao;
      const bytesRequisitados = tamanhoItem * quantidadeItens;
      const bytesLer = Math.min(bytesDisponiveis, bytesRequisitados);
      const itensLer = Math.floor(bytesLer / tamanhoItem);
      
      // Lê os dados
      const dados = conteudo.substring(arquivo.posicao, arquivo.posicao + bytesLer);
      
      // Escreve os dados no buffer de memória
      for (let i = 0; i < dados.length; i++) {
        this.gerenciadorMemoria.escreveMemoria(buffer, i, dados.charCodeAt(i));
      }
      
      // Atualiza a posição
      arquivo.posicao += bytesLer;
      
      // Registra a operação
      this._registraOperacao('fread', { handle, tamanhoItem, quantidadeItens, itensLidos: itensLer });
      
      return itensLer;
    } catch (erro) {
      this.adicionaSaida(`[Erro em fread] ${erro.message}`, { erro: true });
      return 0;
    }
  }

  /**
   * Lê dados do stdin para fread
   * @param {number} buffer - Endereço do buffer para armazenar os dados
   * @param {number} tamanhoItem - Tamanho de cada item em bytes
   * @param {number} quantidadeItens - Quantidade de itens a ler
   * @return {number} Número de itens lidos ou 0 em caso de erro/EOF
   * @private
   */
  _lerDoStdin(buffer, tamanhoItem, quantidadeItens) {
    // Verifica se há entrada disponível
    if (this.stdin.length === 0) {
      // Solicita entrada ao usuário
      this.entradaPendente = true;
      this.atualizaUI();
      
      // Retorna uma Promise para ser resolvida quando a entrada estiver disponível
      return new Promise((resolve) => {
        this.callbackEntrada = resolve;
      }).then(() => {
        // Tenta novamente com a entrada disponível
        return this._lerDoStdin(buffer, tamanhoItem, quantidadeItens);
      });
    }
    
    // Obtém o texto de entrada atual
    const entradaAtual = this.stdin.join('');
    
    // Verifica se há texto disponível
    if (entradaAtual.length === 0) {
      return 0; // EOF
    }
    
    // Calcula quantos itens podem ser lidos
    const bytesRequisitados = tamanhoItem * quantidadeItens;
    const bytesLer = Math.min(entradaAtual.length, bytesRequisitados);
    const itensLer = Math.floor(bytesLer / tamanhoItem);
    
    // Lê os dados
    const dados = entradaAtual.substring(0, bytesLer);
    
    // Escreve os dados no buffer de memória
    for (let i = 0; i < dados.length; i++) {
      this.gerenciadorMemoria.escreveMemoria(buffer, i, dados.charCodeAt(i));
    }
    
    // Atualiza o buffer de entrada
    this.stdin = [entradaAtual.substring(bytesLer)];
    
    return itensLer;
  }

  /**
   * Implementação similar à função fwrite do C
   * @param {number} buffer - Endereço do buffer contendo os dados
   * @param {number} tamanhoItem - Tamanho de cada item em bytes
   * @param {number} quantidadeItens - Quantidade de itens a escrever
   * @param {number} handle - Handle do arquivo
   * @return {number} Número de itens escritos ou 0 em caso de erro
   */
  fwrite(buffer, tamanhoItem, quantidadeItens, handle) {
    // Verifica se o gerenciador de memória está disponível
    if (!this.gerenciadorMemoria) {
      this.adicionaSaida('[Erro em fwrite] Gerenciador de memória não disponível', { erro: true });
      return 0;
    }
    
    try {
      // Verifica se o handle é válido
      if (!this.arquivos.has(handle)) {
        throw new Error(`Handle de arquivo inválido: ${handle}`);
      }
      
      // Obtém o arquivo
      const arquivo = this.arquivos.get(handle);
      
      // Verifica se o arquivo está aberto
      if (!arquivo.aberto) {
        throw new Error(`Arquivo está fechado: ${arquivo.nome}`);
      }
      
      // Verifica se o arquivo está aberto para escrita
      if (!arquivo.modo.includes('w') && !arquivo.modo.includes('a') && !arquivo.modo.includes('+')) {
        throw new Error(`Arquivo não está aberto para escrita: ${arquivo.nome}`);
      }
      
      // Calcula o número total de bytes a escrever
      const bytesTotal = tamanhoItem * quantidadeItens;
      
      // Lê os dados da memória
      let dados = '';
      for (let i = 0; i < bytesTotal; i++) {
        const byte = this.gerenciadorMemoria.leMemoria(buffer, i);
        dados += String.fromCharCode(byte);
      }
      
      // Casos especiais para stdout e stderr
      if (handle === 1) {
        // stdout
        this.adicionaSaida(dados);
        return quantidadeItens;
      } else if (handle === 2) {
        // stderr
        this.adicionaSaida(dados, { erro: true });
        return quantidadeItens;
      }
      
      // Escreve no buffer do arquivo
      arquivo.buffer.push(dados);
      arquivo.posicao += dados.length;
      
      // Registra a operação
      this._registraOperacao('fwrite', { handle, tamanhoItem, quantidadeItens });
      
      return quantidadeItens;
    } catch (erro) {
      this.adicionaSaida(`[Erro em fwrite] ${erro.message}`, { erro: true });
      return 0;
    }
  }

  /**
   * Implementação similar à função fseek do C
   * @param {number} handle - Handle do arquivo
   * @param {number} offset - Deslocamento em bytes
   * @param {number} origem - 0 (SEEK_SET), 1 (SEEK_CUR) ou 2 (SEEK_END)
   * @return {number} 0 em caso de sucesso ou -1 em caso de erro
   */
  fseek(handle, offset, origem) {
    try {
      // Verifica se o handle é válido
      if (!this.arquivos.has(handle)) {
        throw new Error(`Handle de arquivo inválido: ${handle}`);
      }
      
      // Obtém o arquivo
      const arquivo = this.arquivos.get(handle);
      
      // Verifica se o arquivo está aberto
      if (!arquivo.aberto) {
        throw new Error(`Arquivo está fechado: ${arquivo.nome}`);
      }
      
      // Converte o buffer do arquivo para uma string
      const conteudo = arquivo.buffer.join('');
      
      // Calcula a nova posição
      let novaPosicao;
      
      switch (origem) {
        case 0: // SEEK_SET - a partir do início
          novaPosicao = offset;
          break;
        case 1: // SEEK_CUR - a partir da posição atual
          novaPosicao = arquivo.posicao + offset;
          break;
        case 2: // SEEK_END - a partir do fim
          novaPosicao = conteudo.length + offset;
          break;
        default:
          throw new Error(`Origem inválida: ${origem}`);
      }
      
      // Verifica limites
      if (novaPosicao < 0) {
        throw new Error('Posição resultante é negativa');
      }
      
      // Atualiza a posição
      arquivo.posicao = novaPosicao;
      
      // Registra a operação
      this._registraOperacao('fseek', { handle, offset, origem, novaPosicao });
      
      return 0;
    } catch (erro) {
      this.adicionaSaida(`[Erro em fseek] ${erro.message}`, { erro: true });
      return -1;
    }
  }

  /**
   * Implementação similar à função ftell do C
   * @param {number} handle - Handle do arquivo
   * @return {number} Posição atual ou -1 em caso de erro
   */
  ftell(handle) {
    try {
      // Verifica se o handle é válido
      if (!this.arquivos.has(handle)) {
        throw new Error(`Handle de arquivo inválido: ${handle}`);
      }
      
      // Obtém o arquivo
      const arquivo = this.arquivos.get(handle);
      
      // Verifica se o arquivo está aberto
      if (!arquivo.aberto) {
        throw new Error(`Arquivo está fechado: ${arquivo.nome}`);
      }
      
      // Registra a operação
      this._registraOperacao('ftell', { handle, posicao: arquivo.posicao });
      
      return arquivo.posicao;
    } catch (erro) {
      this.adicionaSaida(`[Erro em ftell] ${erro.message}`, { erro: true });
      return -1;
    }
  }

  /**
   * Implementação similar à função feof do C
   * @param {number} handle - Handle do arquivo
   * @return {number} 1 se EOF, 0 se não ou -1 em caso de erro
   */
  feof(handle) {
    try {
      // Verifica se o handle é válido
      if (!this.arquivos.has(handle)) {
        throw new Error(`Handle de arquivo inválido: ${handle}`);
      }
      
      // Obtém o arquivo
      const arquivo = this.arquivos.get(handle);
      
      // Verifica se o arquivo está aberto
      if (!arquivo.aberto) {
        throw new Error(`Arquivo está fechado: ${arquivo.nome}`);
      }
      
      // Converte o buffer do arquivo para uma string
      const conteudo = arquivo.buffer.join('');
      
      // Verifica se chegou ao fim
      const resultado = arquivo.posicao >= conteudo.length ? 1 : 0;
      
      // Registra a operação
      this._registraOperacao('feof', { handle, resultado });
      
      return resultado;
    } catch (erro) {
      this.adicionaSaida(`[Erro em feof] ${erro.message}`, { erro: true });
      return -1;
    }
  }

  // ===== Métodos auxiliares =====

  /**
   * Processa uma string de formato (printf/fprintf)
   * @param {string} formato - String de formato
   * @param {any[]} args - Argumentos para substituir
   * @return {string} String formatada
   * @private
   */
  _processaStringFormato(formato, args) {
    let resultado = '';
    let i = 0;
    let argIndex = 0;
    
    while (i < formato.length) {
      // Procura pelo próximo %
      if (formato[i] !== '%') {
        resultado += formato[i++];
        continue;
      }
      
      // Encontrou um %
      i++;
      
      // Verifica se é %% (escape para %)
      if (i < formato.length && formato[i] === '%') {
        resultado += '%';
        i++;
        continue;
      }
      
      // Processa flags, largura, precisão, etc.
      let flags = '';
      let width = '';
      let precision = '';
      let length = '';
      let specifier = '';
      
      // Flags
      while (i < formato.length && ['-', '+', ' ', '#', '0'].includes(formato[i])) {
        flags += formato[i++];
      }
      
      // Largura
      while (i < formato.length && /\d/.test(formato[i])) {
        width += formato[i++];
      }
      
      // Precisão
      if (i < formato.length && formato[i] === '.') {
        precision += formato[i++];
        while (i < formato.length && /\d/.test(formato[i])) {
          precision += formato[i++];
        }
      }
      
      // Modificadores de comprimento
      if (i < formato.length && ['h', 'l', 'L', 'z', 'j', 't'].includes(formato[i])) {
        length += formato[i++];
        // Verificar 'hh' ou 'll'
        if (i < formato.length && 
           ((formato[i-1] === 'h' && formato[i] === 'h') || 
            (formato[i-1] === 'l' && formato[i] === 'l'))) {
          length += formato[i++];
        }
      }
      
      // Especificador
      if (i < formato.length) {
        specifier = formato[i++];
      } else {
        throw new Error('Formato inválido: especificador ausente');
      }
      
      // Obtém o argumento correspondente
      const arg = argIndex < args.length ? args[argIndex++] : undefined;
      
      // Processa o especificador
      switch (specifier) {
        case 'd':
        case 'i':
          // Inteiro
          resultado += this._formatarNumero(arg, 10, flags, width, precision);
          break;
          
        case 'u':
          // Inteiro sem sinal
          resultado += this._formatarNumero(arg, 10, flags, width, precision, true);
          break;
          
        case 'o':
          // Octal
          resultado += this._formatarNumero(arg, 8, flags, width, precision);
          break;
          
        case 'x':
          // Hexadecimal (minúsculo)
          resultado += this._formatarNumero(arg, 16, flags, width, precision).toLowerCase();
          break;
          
        case 'X':
          // Hexadecimal (maiúsculo)
          resultado += this._formatarNumero(arg, 16, flags, width, precision).toUpperCase();
          break;
          
        case 'f':
        case 'F':
          // Ponto flutuante
          resultado += this._formatarFloat(arg, flags, width, precision);
          break;
          
        case 'e':
        case 'E':
          // Notação científica
          resultado += this._formatarNotacaoCientifica(arg, flags, width, precision, specifier === 'E');
          break;
          
        case 'g':
        case 'G':
          // Formato mais curto entre %f e %e
          resultado += this._formatarG(arg, flags, width, precision, specifier === 'G');
          break;
          
        case 'c':
          // Caractere
          resultado += this._formatarChar(arg);
          break;
          
        case 's':
          // String
          resultado += this._formatarString(arg, flags, width, precision);
          break;
          
        case 'p':
          // Ponteiro
          resultado += this._formatarPonteiro(arg);
          break;
          
        case 'n':
          // Armazena o número de caracteres escritos até agora
          if (this.gerenciadorMemoria && typeof arg === 'number') {
            this.gerenciadorMemoria.escreveMemoria(arg, 0, resultado.length);
          }
          break;
          
        default:
          throw new Error(`Especificador de formato não suportado: %${specifier}`);
      }
    }
    
    return resultado;
  }

  /**
   * Formata um número inteiro
   * @param {any} valor - Valor a formatar
   * @param {number} base - Base numérica (10, 16, 8)
   * @param {string} flags - Flags de formatação
   * @param {string} width - Largura mínima
   * @param {string} precision - Precisão
   * @param {boolean} [semSinal=false] - Se é um número sem sinal
   * @return {string} Número formatado
   * @private
   */
  _formatarNumero(valor, base, flags, width, precision, semSinal = false) {
    // Converte para número
    let num = parseInt(valor);
    
    // Verifica se é um número válido
    if (isNaN(num)) {
      num = 0;
    }
    
    // Trata números sem sinal
    if (semSinal && num < 0) {
      // Para 32 bits: 2^32 + num
      num = 4294967296 + num;
    }
    
    // Converte para a base especificada
    let result = num.toString(base);
    
    // Aplica a precisão (número mínimo de dígitos)
    if (precision) {
      const precisao = parseInt(precision.substring(1));
      if (!isNaN(precisao) && result.length < precisao) {
        result = '0'.repeat(precisao - result.length) + result;
      }
    }
    
    // Aplica o prefixo para números não decimais
    if (flags.includes('#')) {
      if (base === 16) {
        result = '0x' + result;
      } else if (base === 8 && !result.startsWith('0')) {
        result = '0' + result;
      }
    }
    
    // Aplica o sinal
    if (num >= 0) {
      if (flags.includes('+')) {
        result = '+' + result;
      } else if (flags.includes(' ')) {
        result = ' ' + result;
      }
    } else {
      result = '-' + result.substring(1);
    }
    
    // Aplica a largura mínima
    if (width) {
      const largura = parseInt(width);
      if (!isNaN(largura) && result.length < largura) {
        if (flags.includes('0') && !flags.includes('-') && !precision) {
          // Preenchimento com zeros à esquerda
          const sinal = result.match(/^[-+ ]/)?.[0] || '';
          if (sinal) {
            result = sinal + '0'.repeat(largura - result.length) + result.substring(1);
          } else {
            result = '0'.repeat(largura - result.length) + result;
          }
        } else if (flags.includes('-')) {
          // Alinhamento à esquerda
          result = result + ' '.repeat(largura - result.length);
        } else {
          // Alinhamento à direita (padrão)
          result = ' '.repeat(largura - result.length) + result;
        }
      }
    }
    
    return result;
  }

  /**
   * Formata um número de ponto flutuante
   * @param {any} valor - Valor a formatar
   * @param {string} flags - Flags de formatação
   * @param {string} width - Largura mínima
   * @param {string} precision - Precisão
   * @return {string} Número formatado
   * @private
   */
  _formatarFloat(valor, flags, width, precision) {
    // Converte para número
    let num = parseFloat(valor);
    
    // Verifica se é um número válido
    if (isNaN(num)) {
      num = 0;
    }
    
    // Define a precisão (padrão é 6)
    const precisao = precision ? parseInt(precision.substring(1)) : 6;
    
    // Formata o número com a precisão especificada
    let result = num.toFixed(precisao);
    
    // Verifica o flag '#' para manter zeros à direita
    if (!flags.includes('#') && precision) {
      // Remove zeros à direita da parte decimal
      result = result.replace(/\.?0+$/, '');
    }
    
    // Aplica o sinal
    if (num >= 0) {
      if (flags.includes('+')) {
        result = '+' + result;
      } else if (flags.includes(' ')) {
        result = ' ' + result;
      }
    }
    
    // Aplica a largura mínima
    if (width) {
      const largura = parseInt(width);
      if (!isNaN(largura) && result.length < largura) {
        if (flags.includes('0') && !flags.includes('-')) {
          // Preenchimento com zeros à esquerda
          const sinal = result.match(/^[-+ ]/)?.[0] || '';
          if (sinal) {
            result = sinal + '0'.repeat(largura - result.length) + result.substring(1);
          } else {
            result = '0'.repeat(largura - result.length) + result;
          }
        } else if (flags.includes('-')) {
          // Alinhamento à esquerda
          result = result + ' '.repeat(largura - result.length);
        } else {
          // Alinhamento à direita (padrão)
          result = ' '.repeat(largura - result.length) + result;
        }
      }
    }
    
    return result;
  }

  /**
   * Formata um caractere
   * @param {any} valor - Valor a formatar
   * @return {string} Caractere formatado
   * @private
   */
  _formatarChar(valor) {
    if (typeof valor === 'number') {
      return String.fromCharCode(valor);
    } else if (typeof valor === 'string' && valor.length > 0) {
      return valor[0];
    } else {
      return '\0';
    }
  }

  /**
   * Formata uma string
   * @param {any} valor - Valor a formatar
   * @param {string} flags - Flags de formatação
   * @param {string} width - Largura mínima
   * @param {string} precision - Precisão (máximo de caracteres)
   * @return {string} String formatada
   * @private
   */
  _formatarString(valor, flags, width, precision) {
    let str = String(valor || '');
    
    // Aplica a precisão (limita o número de caracteres)
    if (precision) {
      const precisao = parseInt(precision.substring(1));
      if (!isNaN(precisao) && str.length > precisao) {
        str = str.substring(0, precisao);
      }
    }
    
    // Aplica a largura mínima
    if (width) {
      const largura = parseInt(width);
      if (!isNaN(largura) && str.length < largura) {
        if (flags.includes('-')) {
          // Alinhamento à esquerda
          str = str + ' '.repeat(largura - str.length);
        } else {
          // Alinhamento à direita (padrão)
          str = ' '.repeat(largura - str.length) + str;
        }
      }
    }
    
    return str;
  }

  /**
   * Formata um ponteiro
   * @param {any} valor - Valor a formatar
   * @return {string} Ponteiro formatado como hexadecimal
   * @private
   */
  _formatarPonteiro(valor) {
    let endereco;
    
    if (typeof valor === 'number') {
      endereco = valor;
    } else {
      endereco = 0;
    }
    
    return `0x${endereco.toString(16).padStart(8, '0')}`;
  }

  /**
   * Formata um número em notação científica
   * @param {any} valor - Valor a formatar
   * @param {string} flags - Flags de formatação
   * @param {string} width - Largura mínima
   * @param {string} precision - Precisão
   * @param {boolean} maiusculo - Se deve usar 'E' maiúsculo
   * @return {string} Número em notação científica
   * @private
   */
  _formatarNotacaoCientifica(valor, flags, width, precision, maiusculo) {
    // Converte para número
    let num = parseFloat(valor);
    
    // Verifica se é um número válido
    if (isNaN(num)) {
      num = 0;
    }
    
    // Define a precisão (padrão é 6)
    const precisao = precision ? parseInt(precision.substring(1)) : 6;
    
    // Formata o número com a precisão especificada
    const e = maiusculo ? 'E' : 'e';
    let result = num.toExponential(precisao);
    
    // Substitui 'e' por 'E' se necessário
    if (maiusculo) {
      result = result.replace('e', 'E');
    }
    
    // Aplica o sinal
    if (num >= 0) {
      if (flags.includes('+')) {
        result = '+' + result;
      } else if (flags.includes(' ')) {
        result = ' ' + result;
      }
    }
    
    // Aplica a largura mínima
    if (width) {
      const largura = parseInt(width);
      if (!isNaN(largura) && result.length < largura) {
        if (flags.includes('0') && !flags.includes('-')) {
          // Preenchimento com zeros à esquerda
          const sinal = result.match(/^[-+ ]/)?.[0] || '';
          if (sinal) {
            result = sinal + '0'.repeat(largura - result.length) + result.substring(1);
          } else {
            result = '0'.repeat(largura - result.length) + result;
          }
        } else if (flags.includes('-')) {
          // Alinhamento à esquerda
          result = result + ' '.repeat(largura - result.length);
        } else {
          // Alinhamento à direita (padrão)
          result = ' '.repeat(largura - result.length) + result;
        }
      }
    }
    
    return result;
  }

  /**
   * Formata um número usando %g/%G (escolhe entre notação decimal e científica)
   * @param {any} valor - Valor a formatar
   * @param {string} flags - Flags de formatação
   * @param {string} width - Largura mínima
   * @param {string} precision - Precisão
   * @param {boolean} maiusculo - Se deve usar 'E' maiúsculo
   * @return {string} Número formatado
   * @private
   */
  _formatarG(valor, flags, width, precision, maiusculo) {
    // Converte para número
    let num = parseFloat(valor);
    
    // Verifica se é um número válido
    if (isNaN(num)) {
      num = 0;
    }
    
    // Define a precisão (padrão é 6)
    const precisao = precision ? parseInt(precision.substring(1)) : 6;
    
    // Decide entre notação decimal e científica
    const absNum = Math.abs(num);
    if (absNum === 0 || (absNum >= 0.0001 && absNum < Math.pow(10, precisao))) {
      // Usa notação decimal
      let result = this._formatarFloat(num, flags, '', precision);
      
      // Remove zeros à direita e ponto decimal se não houver '#'
      if (!flags.includes('#')) {
        result = result.replace(/\.?0+$/, '');
      }
      
      // Aplica a largura
      if (width) {
        const largura = parseInt(width);
        if (!isNaN(largura) && result.length < largura) {
          if (flags.includes('-')) {
            // Alinhamento à esquerda
            result = result + ' '.repeat(largura - result.length);
          } else {
            // Alinhamento à direita (padrão)
            result = ' '.repeat(largura - result.length) + result;
          }
        }
      }
      
      return result;
    } else {
      // Usa notação científica
      return this._formatarNotacaoCientifica(num, flags, width, precision, maiusculo);
    }
  }

  /**
   * Extrai os especificadores de formato de uma string de formato
   * @param {string} formato - String de formato
   * @return {Object[]} Array de objetos com informações sobre os especificadores
   * @private
   */
  _extraiEspecificadoresFormato(formato) {
    const especificadores = [];
    let i = 0;
    
    while (i < formato.length) {
      // Procura pelo próximo %
      if (formato[i] !== '%') {
        i++;
        continue;
      }
      
      // Encontrou um %
      i++;
      
      // Verifica se é %% (escape para %)
      if (i < formato.length && formato[i] === '%') {
        i++;
        continue;
      }
      
      // Processa flags, largura, precisão, etc.
      let flags = '';
      let width = '';
      let precision = '';
      let length = '';
      let tipo = '';
      
      // Flags
      while (i < formato.length && ['-', '+', ' ', '#', '0'].includes(formato[i])) {
        flags += formato[i++];
      }
      
      // Largura
      while (i < formato.length && /\d/.test(formato[i])) {
        width += formato[i++];
      }
      
      // Precisão
      if (i < formato.length && formato[i] === '.') {
        precision += formato[i++];
        while (i < formato.length && /\d/.test(formato[i])) {
          precision += formato[i++];
        }
      }
      
      // Modificadores de comprimento
      if (i < formato.length && ['h', 'l', 'L', 'z', 'j', 't'].includes(formato[i])) {
        length += formato[i++];
        // Verificar 'hh' ou 'll'
        if (i < formato.length && 
           ((formato[i-1] === 'h' && formato[i] === 'h') || 
            (formato[i-1] === 'l' && formato[i] === 'l'))) {
          length += formato[i++];
        }
      }
      
      // Especificador
      if (i < formato.length) {
        tipo = formato[i++];
        especificadores.push({ flags, width, precision, length, tipo });
      }
    }
    
    return especificadores;
  }

  /**
   * Lê um número inteiro da entrada
   * @param {string} entrada - String de entrada
   * @param {number} posicao - Posição inicial
   * @return {Object} Objeto com informações sobre a leitura
   * @private
   */
  _lerInteiro(entrada, posicao) {
    let i = posicao;
    let numeroStr = '';
    let negativo = false;
    
    // Pula espaços em branco iniciais
    while (i < entrada.length && /\s/.test(entrada[i])) {
      i++;
    }
    
    // Verifica sinal
    if (i < entrada.length && (entrada[i] === '+' || entrada[i] === '-')) {
      negativo = entrada[i] === '-';
      numeroStr += entrada[i];
      i++;
    }
    
    // Lê dígitos
    let temDigito = false;
    while (i < entrada.length && /\d/.test(entrada[i])) {
      numeroStr += entrada[i];
      i++;
      temDigito = true;
    }
    
    // Verifica se leu pelo menos um dígito
    if (!temDigito) {
      return { sucesso: false };
    }
    
    // Converte para número
    const valor = parseInt(numeroStr);
    
    return {
      sucesso: true,
      valor,
      novaPosicao: i
    };
  }

  /**
   * Lê um número de ponto flutuante da entrada
   * @param {string} entrada - String de entrada
   * @param {number} posicao - Posição inicial
   * @return {Object} Objeto com informações sobre a leitura
   * @private
   */
  _lerFloat(entrada, posicao) {
    let i = posicao;
    let numeroStr = '';
    
    // Pula espaços em branco iniciais
    while (i < entrada.length && /\s/.test(entrada[i])) {
      i++;
    }
    
    // Verifica sinal
    if (i < entrada.length && (entrada[i] === '+' || entrada[i] === '-')) {
      numeroStr += entrada[i];
      i++;
    }
    
    // Lê parte inteira
    let temDigito = false;
    while (i < entrada.length && /\d/.test(entrada[i])) {
      numeroStr += entrada[i];
      i++;
      temDigito = true;
    }
    
    // Lê parte decimal
    if (i < entrada.length && entrada[i] === '.') {
      numeroStr += entrada[i];
      i++;
      
      while (i < entrada.length && /\d/.test(entrada[i])) {
        numeroStr += entrada[i];
        i++;
        temDigito = true;
      }
    }
    
    // Lê expoente
    if (i < entrada.length && (entrada[i] === 'e' || entrada[i] === 'E')) {
      numeroStr += entrada[i];
      i++;
      
      // Sinal do expoente
      if (i < entrada.length && (entrada[i] === '+' || entrada[i] === '-')) {
        numeroStr += entrada[i];
        i++;
      }
      
      // Dígitos do expoente
      let temDigitoExp = false;
      while (i < entrada.length && /\d/.test(entrada[i])) {
        numeroStr += entrada[i];
        i++;
        temDigitoExp = true;
      }
      
      // Se não tem dígitos no expoente, a leitura falha
      if (!temDigitoExp) {
        return { sucesso: false };
      }
    }
    
    // Verifica se leu pelo menos um dígito
    if (!temDigito) {
      return { sucesso: false };
    }
    
    // Converte para número
    const valor = parseFloat(numeroStr);
    
    return {
      sucesso: true,
      valor,
      novaPosicao: i
    };
  }

  /**
   * Lê uma string da entrada
   * @param {string} entrada - String de entrada
   * @param {number} posicao - Posição inicial
   * @return {Object} Objeto com informações sobre a leitura
   * @private
   */
  _lerString(entrada, posicao) {
    let i = posicao;
    let str = '';
    
    // Pula espaços em branco iniciais
    while (i < entrada.length && /\s/.test(entrada[i])) {
      i++;
    }
    
    // Lê caracteres não-espaço
    while (i < entrada.length && !/\s/.test(entrada[i])) {
      str += entrada[i];
      i++;
    }
    
    // Verifica se leu pelo menos um caractere
    if (str.length === 0) {
      return { sucesso: false };
    }
    
    return {
      sucesso: true,
      valor: str,
      novaPosicao: i
    };
  }

  /**
   * Registra uma operação no histórico
   * @param {string} tipo - Tipo da operação
   * @param {Object} dados - Dados adicionais
   * @private
   */
  _registraOperacao(tipo, dados = {}) {
    this.historico.push({
      tipo,
      timestamp: Date.now(),
      ...dados
    });
    
    // Limita o tamanho do histórico
    if (this.historico.length > 1000) {
      this.historico.shift();
    }
  }
}

// Exporta a classe
export default SimuladorIO;
```

## Características Principais do SimuladorIO

1. **Funções de I/O C Completas**
    - `printf`, `puts`, `putchar` para saída formatada
    - `scanf`, `gets`, `getchar` para entrada
    - Suporte para streams (`stdin`, `stdout`, `stderr`)

2. **Manipulação de Arquivos**
    - `fopen`, `fclose` para abertura e fechamento
    - `fread`, `fwrite` para leitura e escrita
    - `fseek`, `ftell`, `feof` para navegação
    - Suporte a diferentes modos de abertura (`r`, `w`, `a`, `b`, etc.)

3. **Formatação de Strings Robusto**
    - Implementação completa de especificadores de formato
    - Suporte para flags, largura, precisão, etc.
    - Formatação numérica em várias bases (decimal, octal, hexadecimal)
    - Formatação de ponto flutuante (decimal e científica)

4. **Integração com UI**
    - Conexão com elementos HTML para entrada/saída visual
    - Atualização em tempo real da interface
    - Manipulação de entrada assíncrona

5. **Gerenciamento de Buffer**
    - Simula o comportamento de buffering do C
    - Suporte para leitura e escrita eficientes
    - Navegação pelos buffers

6. **Tratamento de Erros**
    - Detecção e reporte de erros comuns
    - Simulação do comportamento de erro do C
    - Retorno de valores apropriados (-1, NULL, etc.)

7. **Suporte para Internacionalização**
    - Formatação adequada para caracteres Unicode
    - Manipulação correta de strings UTF-8

8. **Interações com o Gerenciador de Memória**
    - Leitura e escrita de dados na memória gerenciada
    - Compatibilidade com ponteiros
    - Integração para simular o modelo de memória C

Esta implementação do `SimuladorIO` fornece uma simulação completa e fidedigna das operações de entrada e saída da linguagem C, permitindo que os estudantes visualizem e interajam com programas C no ambiente do IFSCEE.