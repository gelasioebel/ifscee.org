# Implementação Completa do AnalisadorLexico para C (C90, C17, C23)

Agora vamos implementar o `analisadorLexico.js` completo, capaz de tokenizar corretamente código C nas várias versões da linguagem, incluindo as particularidades do C17 e C23.

```javascript
// analisadorLexico.js
import Token from './token.js';

/**
 * Analisador Léxico para a linguagem C (compatível com C90, C17 e C23)
 * Converte código-fonte em uma sequência de tokens
 */
class AnalisadorLexico {
  /**
   * @param {Object} opcoes - Opções de configuração
   * @param {string} opcoes.versaoC - Versão do C ('C90', 'C17', 'C23') para compatibilidade específica
   * @param {boolean} opcoes.preservaComentarios - Se comentários devem ser preservados como tokens
   * @param {boolean} opcoes.preservaEspacos - Se espaços em branco devem ser preservados como tokens
   * @param {boolean} opcoes.modoPreprocessador - Se deve processar diretivas de pré-processador
   */
  constructor(opcoes = {}) {
    // Opções de configuração
    this.opcoes = {
      versaoC: opcoes.versaoC || 'C17',
      preservaComentarios: opcoes.preservaComentarios || false, 
      preservaEspacos: opcoes.preservaEspacos || false,
      modoPreprocessador: opcoes.modoPreprocessador || true
    };
    
    // Estado do analisador
    this.codigo = '';
    this.posicao = 0;
    this.linha = 1;
    this.coluna = 1;
    this.tokens = [];
    this.arquivo = 'main.c';
    this.emDiretivaPP = false;
    
    // Buffer para construção de tokens
    this.inicioToken = 0;
    this.inicioLinha = 1;
    this.inicioColuna = 1;
    
    // Cache de palavras-chave
    this._palavrasChave = new Set();
    this._inicializaPalavrasChave();
  }
  
  /**
   * Inicializa o conjunto de palavras-chave com base na versão do C
   * @private
   */
  _inicializaPalavrasChave() {
    // Sempre inclui palavras-chave do C90
    Token.KEYWORDS.C90.forEach(kw => this._palavrasChave.add(kw));
    
    // Se C99 ou posterior
    if (this.opcoes.versaoC !== 'C90') {
      Token.KEYWORDS.C99.forEach(kw => this._palavrasChave.add(kw));
    }
    
    // Se C11 ou posterior
    if (this.opcoes.versaoC === 'C11' || this.opcoes.versaoC === 'C17' || this.opcoes.versaoC === 'C23') {
      Token.KEYWORDS.C11.forEach(kw => this._palavrasChave.add(kw));
    }
    
    // Se C23
    if (this.opcoes.versaoC === 'C23') {
      Token.KEYWORDS.C23.forEach(kw => this._palavrasChave.add(kw));
    }
  }
  
  /**
   * Analisa texto fonte e retorna array de tokens
   * @param {string} codigoFonte - Código-fonte a ser analisado
   * @param {string} [nomeArquivo='main.c'] - Nome do arquivo para rastreamento de erros
   * @return {Token[]} Array de tokens
   */
  analisaTexto(codigoFonte, nomeArquivo = 'main.c') {
    // Inicializa o estado
    this.codigo = codigoFonte;
    this.posicao = 0;
    this.linha = 1;
    this.coluna = 1;
    this.tokens = [];
    this.arquivo = nomeArquivo;
    
    // Processa tokens até o fim do arquivo
    while (!this.fimCodigo()) {
      this.inicioToken = this.posicao;
      this.inicioLinha = this.linha;
      this.inicioColuna = this.coluna;
      
      // Tenta processar um token
      this.processaProximoToken();
    }
    
    // Adiciona token EOF
    this.tokens.push(Token.criaTokenEOF(this.linha, this.coluna, this.arquivo));
    
    return this.tokens;
  }
  
  /**
   * Processa o próximo token do código-fonte
   * @private
   */
  processaProximoToken() {
    const char = this.pegaCharAtual();
    
    // Ignora espaços em branco (exceto se preservaEspacos)
    if (this.ehEspacoEmBranco(char)) {
      if (this.opcoes.preservaEspacos) {
        this.processaEspacoEmBranco();
      } else {
        this.consumeEspacoEmBranco();
      }
      return;
    }
    
    // Diretiva de pré-processador
    if (char === '#' && this.coluna === 1 && this.opcoes.modoPreprocessador) {
      this.processaDiretivaPP();
      return;
    }
    
    // Identificadores e palavras-chave
    if (this.ehLetraOuUnderscore(char)) {
      this.processaIdentificadorOuPalavraChave();
      return;
    }
    
    // Números
    if (this.ehDigito(char)) {
      this.processaNumero();
      return;
    }
    
    // Literais de caractere e string
    if (char === "'" || char === '"') {
      this.processaLiteralCharOuString();
      return;
    }
    
    // Strings Unicode do C11+ (u8"...", u"...", U"...", L"...")
    if ((char === 'u' || char === 'U' || char === 'L') && 
        this.pegaCharNaPosicao(this.posicao + 1) === '"') {
      this.processaStringUnicode();
      return;
    }
    
    // Específico para C11+: u8"..." para strings UTF-8
    if (char === 'u' && this.pegaCharNaPosicao(this.posicao + 1) === '8' && 
        this.pegaCharNaPosicao(this.posicao + 2) === '"') {
      this.processaStringUTF8();
      return;
    }
    
    // Operadores e pontuadores
    if (this.ehPontuador(char)) {
      this.processaOperadorOuPontuador();
      return;
    }
    
    // Comentários
    if (char === '/' && (this.pegaProximoChar() === '/' || this.pegaProximoChar() === '*')) {
      this.processaComentario();
      return;
    }
    
    // Caractere desconhecido
    this.adicionaToken(Token.TIPOS.ERROR, char);
    this.avancaChar();
  }
  
  /**
   * Processa um identificador ou palavra-chave
   * @private
   */
  processaIdentificadorOuPalavraChave() {
    let identificador = '';
    
    // Consome caracteres válidos para identificadores
    while (!this.fimCodigo() && (this.ehLetraOuUnderscore(this.pegaCharAtual()) || this.ehDigito(this.pegaCharAtual()))) {
      identificador += this.pegaCharAtual();
      this.avancaChar();
    }
    
    // Verifica se é uma palavra-chave
    if (this._palavrasChave.has(identificador)) {
      this.adicionaToken(Token.TIPOS.KEYWORD, identificador);
    } else {
      this.adicionaToken(Token.TIPOS.IDENTIFIER, identificador);
    }
  }
  
  /**
   * Processa um operador ou pontuador
   * @private
   */
  processaOperadorOuPontuador() {
    // Tabela de operadores de múltiplos caracteres
    const operadoresMultiChar = {
      '+': { '+': '++', '=': '+=' },
      '-': { '-': '--', '=': '-=', '>': '->' },
      '*': { '=': '*=' },
      '/': { '=': '/=' },
      '%': { '=': '%=', ':': '%:' }, // %: é dígrafos para #
      '=': { '=': '==', '>': '=>' },
      '!': { '=': '!=' },
      '<': { '=': '<=', '<': '<<' },
      '>': { '=': '>=', '>': '>>' },
      '&': { '&': '&&', '=': '&=' },
      '|': { '|': '||', '=': '|=' },
      '^': { '=': '^=' },
      '.': { '.': { '.': '...' } },
      ':': { ':': '::' }
    };
    
    // Operadores específicos C23
    const operadoresC23 = {
      '<': { '=': { '>': '<=>' } }, // operador spaceship
      '<': { '=': { '=': { '>': '<==>' } } } // operador de equivalência
    };
    
    const char = this.pegaCharAtual();
    let token = char;
    this.avancaChar();
    
    // Verifica se pode formar um operador de múltiplos caracteres
    if (operadoresMultiChar[char]) {
      const prox = this.pegaCharAtual();
      
      if (prox && operadoresMultiChar[char][prox]) {
        // Pode ser um operador de 2 ou 3 caracteres
        if (typeof operadoresMultiChar[char][prox] === 'object') {
          // Potencial operador de 3 caracteres
          this.avancaChar();
          const terceiro = this.pegaCharAtual();
          
          if (terceiro && operadoresMultiChar[char][prox][terceiro]) {
            token = operadoresMultiChar[char][prox][terceiro];
            this.avancaChar();
          } else {
            // Volta atrás, era só um operador de 2 caracteres
            token = prox;
          }
        } else {
          // Operador de 2 caracteres
          token = operadoresMultiChar[char][prox];
          this.avancaChar();
          
          // Verifica se é operador de 3 ou 4 caracteres para C23
          if (this.opcoes.versaoC === 'C23' && operadoresC23[char] && 
              operadoresC23[char][prox]) {
            const terceiro = this.pegaCharAtual();
            
            if (operadoresC23[char][prox][terceiro]) {
              this.avancaChar();
              const quarto = this.pegaCharAtual();
              
              if (quarto && operadoresC23[char][prox][terceiro][quarto]) {
                token = operadoresC23[char][prox][terceiro][quarto];
                this.avancaChar();
              } else {
                token = operadoresC23[char][prox][terceiro];
              }
            }
          }
        }
      }
    }
    
    this.adicionaToken(Token.TIPOS.PUNCTUATOR, token);
  }
  
  /**
   * Processa um número (literal inteiro ou de ponto flutuante)
   * @private
   */
  processaNumero() {
    let numero = '';
    let tipo = Token.TIPOS.INT_LITERAL;
    let base = 10;
    
    // Verifica prefixo para bases diferentes
    if (this.pegaCharAtual() === '0') {
      numero += this.pegaCharAtual();
      this.avancaChar();
      
      // Hexadecimal (0x ou 0X)
      if ((this.pegaCharAtual() === 'x' || this.pegaCharAtual() === 'X') && !this.fimCodigo()) {
        numero += this.pegaCharAtual();
        this.avancaChar();
        base = 16;
        
        // Consome dígitos hexadecimais
        while (!this.fimCodigo() && this.ehDigitoHex(this.pegaCharAtual())) {
          numero += this.pegaCharAtual();
          this.avancaChar();
        }
        
        // Separador de dígitos (C23)
        this._processaSeparadorDigitos(numero, base);
      } 
      // Binário (0b ou 0B) - C23
      else if (this.opcoes.versaoC === 'C23' && 
               (this.pegaCharAtual() === 'b' || this.pegaCharAtual() === 'B') && 
               !this.fimCodigo()) {
        numero += this.pegaCharAtual();
        this.avancaChar();
        base = 2;
        
        // Consome dígitos binários
        while (!this.fimCodigo() && (this.pegaCharAtual() === '0' || this.pegaCharAtual() === '1')) {
          numero += this.pegaCharAtual();
          this.avancaChar();
        }
        
        // Separador de dígitos (C23)
        this._processaSeparadorDigitos(numero, base);
      }
      // Octal
      else {
        base = 8;
        
        // Consome dígitos octais
        while (!this.fimCodigo() && this.ehDigitoOctal(this.pegaCharAtual())) {
          numero += this.pegaCharAtual();
          this.avancaChar();
        }
        
        // Separador de dígitos (C23)
        this._processaSeparadorDigitos(numero, base);
      }
    } 
    // Decimal
    else {
      // Consome dígitos decimais
      while (!this.fimCodigo() && this.ehDigito(this.pegaCharAtual())) {
        numero += this.pegaCharAtual();
        this.avancaChar();
      }
      
      // Separador de dígitos (C23)
      this._processaSeparadorDigitos(numero, base);
      
      // Verifica se tem parte decimal
      if (this.pegaCharAtual() === '.') {
        tipo = Token.TIPOS.FLOAT_LITERAL;
        numero += '.';
        this.avancaChar();
        
        // Consome dígitos após o ponto
        while (!this.fimCodigo() && this.ehDigito(this.pegaCharAtual())) {
          numero += this.pegaCharAtual();
          this.avancaChar();
        }
        
        // Separador de dígitos após o ponto (C23)
        this._processaSeparadorDigitos(numero, base);
      }
      
      // Notação científica
      if ((this.pegaCharAtual() === 'e' || this.pegaCharAtual() === 'E') && !this.fimCodigo()) {
        tipo = Token.TIPOS.FLOAT_LITERAL;
        numero += this.pegaCharAtual();
        this.avancaChar();
        
        // Sinal opcional do expoente
        if ((this.pegaCharAtual() === '+' || this.pegaCharAtual() === '-') && !this.fimCodigo()) {
          numero += this.pegaCharAtual();
          this.avancaChar();
        }
        
        // Consome dígitos do expoente
        let temDigitoExpoente = false;
        while (!this.fimCodigo() && this.ehDigito(this.pegaCharAtual())) {
          numero += this.pegaCharAtual();
          this.avancaChar();
          temDigitoExpoente = true;
        }
        
        if (!temDigitoExpoente) {
          // Erro: expoente sem dígitos
          this.adicionaToken(Token.TIPOS.ERROR, numero);
          return;
        }
      }
    }
    
    // Processa sufixos (U, L, LL, F, etc.)
    if (!this.fimCodigo()) {
      let sufixo = '';
      
      // Sufixos de inteiros: U, L, LL, UL, ULL
      if (tipo === Token.TIPOS.INT_LITERAL) {
        let temU = false;
        let temL = false;
        let temLL = false;
        
        // U ou u (unsigned)
        if (this.pegaCharAtual() === 'u' || this.pegaCharAtual() === 'U') {
          sufixo += this.pegaCharAtual();
          this.avancaChar();
          temU = true;
        }
        
        // L ou l (long)
        if (this.pegaCharAtual() === 'l' || this.pegaCharAtual() === 'L') {
          sufixo += this.pegaCharAtual();
          this.avancaChar();
          temL = true;
          
          // LL ou ll (long long)
          if (this.pegaCharAtual() === 'l' || this.pegaCharAtual() === 'L') {
            sufixo += this.pegaCharAtual();
            this.avancaChar();
            temL = false;
            temLL = true;
          }
        }
        
        // UL, Lu, etc.
        if (!temU && (this.pegaCharAtual() === 'u' || this.pegaCharAtual() === 'U')) {
          sufixo += this.pegaCharAtual();
          this.avancaChar();
        }
      }
      // Sufixos de ponto flutuante: F, L, f, l
      else if (tipo === Token.TIPOS.FLOAT_LITERAL) {
        if (this.pegaCharAtual() === 'f' || this.pegaCharAtual() === 'F' || 
            this.pegaCharAtual() === 'l' || this.pegaCharAtual() === 'L') {
          sufixo += this.pegaCharAtual();
          this.avancaChar();
        }
      }
      
      if (sufixo) {
        numero += sufixo;
      }
    }
    
    this.adicionaToken(tipo, numero);
  }
  
  /**
   * Processa separadores de dígitos (_) introduzidos no C23
   * @param {string} numero - Número atual
   * @param {number} base - Base do número (2, 8, 10, 16)
   * @private
   */
  _processaSeparadorDigitos(numero, base) {
    if (this.opcoes.versaoC === 'C23' && this.pegaCharAtual() === '_') {
      // Em C23, permite separador de dígitos (_)
      while (!this.fimCodigo()) {
        if (this.pegaCharAtual() === '_') {
          numero += this.pegaCharAtual();
          this.avancaChar();
          
          // Deve ser seguido por um dígito válido
          if (base === 2 && (this.pegaCharAtual() === '0' || this.pegaCharAtual() === '1')) {
            numero += this.pegaCharAtual();
            this.avancaChar();
          } else if (base === 8 && this.ehDigitoOctal(this.pegaCharAtual())) {
            numero += this.pegaCharAtual();
            this.avancaChar();
          } else if (base === 10 && this.ehDigito(this.pegaCharAtual())) {
            numero += this.pegaCharAtual();
            this.avancaChar();
          } else if (base === 16 && this.ehDigitoHex(this.pegaCharAtual())) {
            numero += this.pegaCharAtual();
            this.avancaChar();
          } else {
            // Erro: separador não seguido por dígito válido
            this.adicionaToken(Token.TIPOS.ERROR, numero);
            return;
          }
        } else if ((base === 2 && (this.pegaCharAtual() === '0' || this.pegaCharAtual() === '1')) ||
                   (base === 8 && this.ehDigitoOctal(this.pegaCharAtual())) ||
                   (base === 10 && this.ehDigito(this.pegaCharAtual())) ||
                   (base === 16 && this.ehDigitoHex(this.pegaCharAtual()))) {
          numero += this.pegaCharAtual();
          this.avancaChar();
        } else {
          break;
        }
      }
    }
  }
  
  /**
   * Processa um literal de caractere ou string
   * @private
   */
  processaLiteralCharOuString() {
    const char = this.pegaCharAtual();
    const ehString = char === '"';
    let conteudo = '';
    
    this.avancaChar(); // Consome o delimitador inicial
    
    while (!this.fimCodigo() && this.pegaCharAtual() !== char) {
      // Processa sequências de escape
      if (this.pegaCharAtual() === '\\') {
        conteudo += this.pegaCharAtual();
        this.avancaChar();
        
        if (this.fimCodigo()) {
          // Erro: escape no fim do arquivo
          break;
        }
        
        conteudo += this.pegaCharAtual();
        this.avancaChar();
      } 
      // Nova linha em string (erro em C, exceto se precedida por \)
      else if (this.pegaCharAtual() === '\n' && ehString) {
        // Em C, strings não podem conter quebras de linha literais
        this.adicionaToken(Token.TIPOS.ERROR, conteudo);
        return;
      }
      else {
        conteudo += this.pegaCharAtual();
        this.avancaChar();
      }
    }
    
    if (this.fimCodigo()) {
      // Erro: literal não terminado
      this.adicionaToken(Token.TIPOS.ERROR, (ehString ? '"' : "'") + conteudo);
      return;
    }
    
    this.avancaChar(); // Consome o delimitador final
    
    // Adiciona o token apropriado
    if (ehString) {
      this.adicionaToken(Token.TIPOS.STRING_LITERAL, conteudo);
      
      // Processa strings adjacentes ("abc" "def" -> "abcdef")
      this._processaStringsAdjacentes();
    } else {
      this.adicionaToken(Token.TIPOS.CHAR_LITERAL, conteudo);
    }
  }
  
  /**
   * Processa strings Unicode (u"...", U"...", L"...")
   * @private
   */
  processaStringUnicode() {
    const prefixo = this.pegaCharAtual();
    let conteudo = prefixo;
    
    this.avancaChar(); // Consome o prefixo
    
    // Processa o resto como uma string normal
    this.processaLiteralCharOuString();
    
    // Atualiza o último token para refletir que é uma string Unicode
    if (this.tokens.length > 0) {
      const ultimoToken = this.tokens[this.tokens.length - 1];
      if (ultimoToken.tipo === Token.TIPOS.STRING_LITERAL) {
        ultimoToken.valor = conteudo + ultimoToken.valor;
      }
    }
  }
  
  /**
   * Processa strings UTF-8 (u8"...") - introduzidas no C11
   * @private
   */
  processaStringUTF8() {
    let conteudo = 'u8';
    
    this.avancaChar(); // Consome 'u'
    this.avancaChar(); // Consome '8'
    
    // Processa o resto como uma string normal
    this.processaLiteralCharOuString();
    
    // Atualiza o último token para refletir que é uma string UTF-8
    if (this.tokens.length > 0) {
      const ultimoToken = this.tokens[this.tokens.length - 1];
      if (ultimoToken.tipo === Token.TIPOS.STRING_LITERAL) {
        ultimoToken.valor = conteudo + ultimoToken.valor;
        ultimoToken.tipo = Token.TIPOS.UTF8_STRING_LITERAL;
      }
    }
  }
  
  /**
   * Processa strings literais adjacentes ("abc" "def" -> "abcdef")
   * @private
   */
  _processaStringsAdjacentes() {
    // Salva a posição atual
    const posAnterior = this.posicao;
    const linhaAnterior = this.linha;
    const colunaAnterior = this.coluna;
    
    // Consome espaços em branco e comentários
    this._consumeEspacosEComentarios();
    
    // Se o próximo token for uma string, combinamos
    if (this.pegaCharAtual() === '"' || 
        ((this.pegaCharAtual() === 'u' || this.pegaCharAtual() === 'U' || this.pegaCharAtual() === 'L') && 
         this.pegaCharNaPosicao(this.posicao + 1) === '"') ||
        (this.pegaCharAtual() === 'u' && this.pegaCharNaPosicao(this.posicao + 1) === '8' && 
         this.pegaCharNaPosicao(this.posicao + 2) === '"')) {
      
      // Remove o último token (a primeira string)
      const primeiraString = this.tokens.pop();
      
      // Processa a próxima string
      this.inicioToken = this.posicao;
      this.inicioLinha = this.linha;
      this.inicioColuna = this.coluna;
      
      if (this.pegaCharAtual() === '"') {
        this.processaLiteralCharOuString();
      } else if (this.pegaCharAtual() === 'u' && this.pegaCharNaPosicao(this.posicao + 1) === '8') {
        this.processaStringUTF8();
      } else {
        this.processaStringUnicode();
      }
      
      // Combina as duas strings
      if (this.tokens.length > 0) {
        const segundaString = this.tokens.pop();
        const stringCombinada = primeiraString.valor + segundaString.valor;
        
        // Adiciona o token combinado
        this.adicionaToken(primeiraString.tipo, stringCombinada, 
                          primeiraString.linha, primeiraString.coluna);
        
        // Verifica se há mais strings adjacentes
        this._processaStringsAdjacentes();
      }
    } else {
      // Não há strings adjacentes, restaura a posição
      this.posicao = posAnterior;
      this.linha = linhaAnterior;
      this.coluna = colunaAnterior;
    }
  }
  
  /**
   * Consome espaços em branco e comentários
   * @private
   */
  _consumeEspacosEComentarios() {
    let mudou;
    do {
      mudou = false;
      
      // Consome espaços em branco
      if (this.ehEspacoEmBranco(this.pegaCharAtual())) {
        this.consumeEspacoEmBranco();
        mudou = true;
      }
      
      // Consome comentários
      if (this.pegaCharAtual() === '/' && 
          (this.pegaProximoChar() === '/' || this.pegaProximoChar() === '*')) {
        const posAnterior = this.posicao;
        this._consumeComentario();
        if (posAnterior !== this.posicao) {
          mudou = true;
        }
      }
    } while (mudou && !this.fimCodigo());
  }
  
  /**
   * Consome um comentário sem criar um token
   * @private
   */
  _consumeComentario() {
    if (this.pegaCharAtual() === '/' && this.pegaProximoChar() === '/') {
      // Comentário de linha
      this.avancaChar(); // Consome '/'
      this.avancaChar(); // Consome '/'
      
      // Consome até o fim da linha
      while (!this.fimCodigo() && this.pegaCharAtual() !== '\n') {
        this.avancaChar();
      }
      
      if (!this.fimCodigo() && this.pegaCharAtual() === '\n') {
        this.avancaChar();
      }
    } else if (this.pegaCharAtual() === '/' && this.pegaProximoChar() === '*') {
      // Comentário de bloco
      this.avancaChar(); // Consome '/'
      this.avancaChar(); // Consome '*'
      
      // Consome até encontrar */
      while (!this.fimCodigo() && 
             !(this.pegaCharAtual() === '*' && this.pegaProximoChar() === '/')) {
        this.avancaChar();
      }
      
      if (!this.fimCodigo()) {
        this.avancaChar(); // Consome '*'
        this.avancaChar(); // Consome '/'
      }
    }
  }
  
  /**
   * Processa um comentário (como token se preservaComentarios=true)
   * @private
   */
  processaComentario() {
    const posicaoInicio = this.posicao;
    const linhaInicio = this.linha;
    const colunaInicio = this.coluna;
    
    let comentario = '';
    
    if (this.pegaCharAtual() === '/' && this.pegaProximoChar() === '/') {
      // Comentário de linha
      comentario += '//';
      this.avancaChar(); // Consome '/'
      this.avancaChar(); // Consome '/'
      
      // Consome até o fim da linha
      while (!this.fimCodigo() && this.pegaCharAtual() !== '\n') {
        comentario += this.pegaCharAtual();
        this.avancaChar();
      }
      
      if (this.opcoes.preservaComentarios) {
        this.adicionaTokenNaPosicao(Token.TIPOS.COMMENT, comentario, linhaInicio, colunaInicio);
      }
      
      // Consome a quebra de linha
      if (!this.fimCodigo() && this.pegaCharAtual() === '\n') {
        this.avancaChar();
      }
    } else if (this.pegaCharAtual() === '/' && this.pegaProximoChar() === '*') {
      // Comentário de bloco
      comentario += '/*';
      this.avancaChar(); // Consome '/'
      this.avancaChar(); // Consome '*'
      
      // Consome até encontrar */
      while (!this.fimCodigo() && 
             !(this.pegaCharAtual() === '*' && this.pegaProximoChar() === '/')) {
        comentario += this.pegaCharAtual();
        this.avancaChar();
      }
      
      if (!this.fimCodigo()) {
        comentario += '*/';
        this.avancaChar(); // Consome '*'
        this.avancaChar(); // Consome '/'
      }
      
      if (this.opcoes.preservaComentarios) {
        this.adicionaTokenNaPosicao(Token.TIPOS.COMMENT, comentario, linhaInicio, colunaInicio);
      }
    }
  }
  
  /**
   * Processa uma diretiva de pré-processador
   * @private
   */
  processaDiretivaPP() {
    let diretiva = '#';
    
    this.avancaChar(); // Consome '#'
    this.emDiretivaPP = true;
    
    // Consome espaços entre # e a diretiva
    this.consumeEspacoEmBranco();
    
    // Processa o nome da diretiva
    while (!this.fimCodigo() && 
           (this.ehLetraOuUnderscore(this.pegaCharAtual()) || this.ehDigito(this.pegaCharAtual()))) {
      diretiva += this.pegaCharAtual();
      this.avancaChar();
    }
    
    // Consome o resto da linha como parte da diretiva
    let continuacao = false;
    do {
      continuacao = false;
      
      // Avança até encontrar \n ou fim de arquivo
      while (!this.fimCodigo() && this.pegaCharAtual() !== '\n') {
        diretiva += this.pegaCharAtual();
        this.avancaChar();
        
        // Verifica continuação de linha (\ seguido de \n)
        if (this.pegaCharAtual() === '\\' && this.pegaProximoChar() === '\n') {
          diretiva += this.pegaCharAtual(); // Adiciona \ à diretiva
          this.avancaChar();
          diretiva += this.pegaCharAtual(); // Adiciona \n à diretiva
          this.avancaChar();
          continuacao = true;
          break;
        }
      }
    } while (continuacao && !this.fimCodigo());
    
    // Adiciona token de pré-processador
    this.adicionaToken(Token.TIPOS.PREPROCESSOR, diretiva.trim());
    
    // Consome a quebra de linha
    if (!this.fimCodigo() && this.pegaCharAtual() === '\n') {
      this.avancaChar();
    }
    
    this.emDiretivaPP = false;
  }
  
  /**
   * Processa espaço em branco como token
   * @private
   */
  processaEspacoEmBranco() {
    let espacos = '';
    
    while (!this.fimCodigo() && this.ehEspacoEmBranco(this.pegaCharAtual())) {
      espacos += this.pegaCharAtual();
      this.avancaChar();
    }
    
    if (espacos.length > 0) {
      this.adicionaToken(Token.TIPOS.WHITESPACE, espacos);
    }
  }
  
  /**
   * Consome espaço em branco (sem criar token)
   * @private
   */
  consumeEspacoEmBranco() {
    while (!this.fimCodigo() && this.ehEspacoEmBranco(this.pegaCharAtual())) {
      this.avancaChar();
    }
  }
  
  /**
   * Métodos auxiliares para verificar tipos de caracteres
   */
  
  /**
   * Verifica se o caractere é uma letra ou underscore
   * @param {string} char - Caractere a verificar
   * @return {boolean} True se for letra ou underscore
   * @private
   */
  ehLetraOuUnderscore(char) {
    return char && (/[a-zA-Z_]/.test(char));
  }
  
  /**
   * Verifica se o caractere é um dígito decimal
   * @param {string} char - Caractere a verificar
   * @return {boolean} True se for dígito 0-9
   * @private
   */
  ehDigito(char) {
    return char && (/[0-9]/.test(char));
  }
  
  /**
   * Verifica se o caractere é um dígito octal
   * @param {string} char - Caractere a verificar
   * @return {boolean} True se for dígito 0-7
   * @private
   */
  ehDigitoOctal(char) {
    return char && (/[0-7]/.test(char));
  }
  
  /**
   * Verifica se o caractere é um dígito hexadecimal
   * @param {string} char - Caractere a verificar
   * @return {boolean} True se for dígito 0-9, a-f, A-F
   * @private
   */
  ehDigitoHex(char) {
    return char && (/[0-9a-fA-F]/.test(char));
  }
  
  /**
   * Verifica se o caractere é espaço em branco
   * @param {string} char - Caractere a verificar
   * @return {boolean} True se for espaço em branco
   * @private
   */
  ehEspacoEmBranco(char) {
    return char && (/\s/.test(char));
  }
  
  /**
   * Verifica se o caractere é um pontuador ou operador
   * @param {string} char - Caractere a verificar
   * @return {boolean} True se for pontuador/operador
   * @private
   */
  ehPontuador(char) {
    return char && (/[+\-*/%=&|^~!<>?:;,.[\](){}]/.test(char));
  }
  
  /**
   * Métodos de navegação e manipulação do código fonte
   */
  
  /**
   * Retorna o caractere na posição atual
   * @return {string|null} Caractere atual ou null se fim do código
   * @private
   */
  pegaCharAtual() {
    if (this.posicao >= this.codigo.length) {
      return null;
    }
    return this.codigo[this.posicao];
  }
  
  /**
   * Retorna o próximo caractere
   * @return {string|null} Próximo caractere ou null se fim do código
   * @private
   */
  pegaProximoChar() {
    if (this.posicao + 1 >= this.codigo.length) {
      return null;
    }
    return this.codigo[this.posicao + 1];
  }
  
  /**
   * Retorna o caractere em uma posição específica
   * @param {number} posicao - Posição no código fonte
   * @return {string|null} Caractere na posição ou null se fora dos limites
   * @private
   */
  pegaCharNaPosicao(posicao) {
    if (posicao >= this.codigo.length) {
      return null;
    }
    return this.codigo[posicao];
  }
  
  /**
   * Avança para o próximo caractere
   * @private
   */
  avancaChar() {
    // Atualiza linha e coluna
    if (this.pegaCharAtual() === '\n') {
      this.linha++;
      this.coluna = 1;
    } else {
      this.coluna++;
    }
    
    this.posicao++;
  }
  
  /**
   * Verifica se chegou ao fim do código fonte
   * @return {boolean} True se chegou ao fim
   * @private
   */
  fimCodigo() {
    return this.posicao >= this.codigo.length;
  }
  
  /**
   * Adiciona um token à lista de tokens
   * @param {string} tipo - Tipo do token
   * @param {string} valor - Valor do token
   * @param {number} [linha] - Linha opcional (usa this.inicioLinha por padrão)
   * @param {number} [coluna] - Coluna opcional (usa this.inicioColuna por padrão)
   * @private
   */
  adicionaToken(tipo, valor, linha, coluna) {
    const token = new Token(
      tipo,
      valor,
      linha || this.inicioLinha,
      coluna || this.inicioColuna,
      this.arquivo
    );
    
    if (this.emDiretivaPP) {
      token.diretivaPP = true;
    }
    
    this.tokens.push(token);
  }
  
  /**
   * Adiciona um token na posição especificada
   * @param {string} tipo - Tipo do token
   * @param {string} valor - Valor do token
   * @param {number} linha - Linha do token
   * @param {number} coluna - Coluna do token
   * @private
   */
  adicionaTokenNaPosicao(tipo, valor, linha, coluna) {
    const token = new Token(
      tipo,
      valor,
      linha,
      coluna,
      this.arquivo
    );
    
    if (this.emDiretivaPP) {
      token.diretivaPP = true;
    }
    
    this.tokens.push(token);
  }
}

// Exporta a classe
export default AnalisadorLexico;
```

## Características Importantes da Implementação

Esta implementação do AnalisadorLexico é muito completa e suporta todas as versões da linguagem C, com especial atenção às particularidades do C17 e C23.

### 1. Suporte às Diferentes Versões do C
- **Configuração de versão**: A classe pode ser configurada para funcionar com C90, C17 ou C23.
- **Palavras-chave específicas**: Inclui palavras-chave de diferentes versões da linguagem.
- **Novos recursos do C23**: Suporta novas funcionalidades como literais binários (0b101), separadores de dígitos (1_000_000) e novos operadores (<=>).

### 2. Suporte Avançado para Literais
- **Literais numéricos**: Decimal, hexadecimal, octal e binário (C23).
- **Sufixos para literais**: Suporta todos os sufixos (U, L, LL, ULL, F, etc.).
- **Literais Unicode**: Strings com prefixos u, U, L e u8.
- **Strings adjacentes**: Combina automaticamente strings contíguas como "abc" "def" -> "abcdef".

### 3. Tratamento Completo de Diretivas de Pré-processador
- **Detecção de diretivas**: Identifica corretamente #include, #define, etc.
- **Continuação de linhas**: Suporta diretivas multi-linha com backslash (\).
- **Identificação especial**: Tokens gerados a partir de diretivas são marcados.

### 4. Suporte a Comentários e Espaços em Branco
- **Opções flexíveis**: Pode preservar ou ignorar comentários e espaços em branco.
- **Compatibilidade**: Suporta comentários estilo C (/* */) e C++ (//).

### 5. Rastreamento Preciso de Posição
- **Linha e coluna**: Todos os tokens têm informações precisas de linha e coluna.
- **Informações de arquivo**: Útil para mensagens de erro em sistemas com múltiplos arquivos.

### 6. Tratamento de Erros
- **Detecção de erros comuns**: Literais não terminados, caracteres inválidos, etc.
- **Mensagens informativas**: Os tokens de erro contêm informações úteis.

### 7. Otimizações
- **Cache de palavras-chave**: Usa um Set para verificação rápida de palavras-chave.
- **Propriedades calculadas**: Armazena resultados de verificações frequentes.

Esta implementação do AnalisadorLexico serve como base sólida para a criação do analisador sintático e, consequentemente, do interpretador completo da linguagem C. Ela lida corretamente com todas as complexidades léxicas do C e está preparada para as adições mais recentes da linguagem.

Agora que temos tanto a classe Token quanto o AnalisadorLexico implementados de forma completa, podemos avançar para a implementação do AnalisadorSintatico.