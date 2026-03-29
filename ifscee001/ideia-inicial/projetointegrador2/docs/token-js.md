# Implementação Completa do Token para C (C90, C17, C23)

Vamos desenvolver uma implementação completa do `token.js` que leve em consideração todas as particularidades da linguagem C, incluindo as versões C17 e C23.

```javascript
// token.js
/**
 * Representa um token no código-fonte C
 * Suporte completo para C90, C17 e C23
 */
class Token {
  /**
   * @param {string} tipo - Tipo do token
   * @param {string} valor - Valor léxico do token
   * @param {number} linha - Linha no código fonte (1-indexed)
   * @param {number} coluna - Coluna no código fonte (1-indexed)
   * @param {string} arquivo - Nome do arquivo de origem
   */
  constructor(tipo, valor, linha, coluna, arquivo = "main.c") {
    this.tipo = tipo;         // Tipo do token
    this.valor = valor;       // Valor léxico
    this.linha = linha;       // Linha no código fonte
    this.coluna = coluna;     // Coluna no código fonte
    this.arquivo = arquivo;   // Nome do arquivo (útil para includes)
    this.comprimento = valor ? valor.length : 0;  // Comprimento do token
    
    // Propriedades derivadas
    this._propriedadesCalculadas = new Map();
    
    // Metadados de pré-processamento
    this.expandidoMacro = false;     // Se o token veio de expansão de macro
    this.origemMacro = null;         // Nome da macro que o gerou
    this.diretivaPP = false;         // Se é parte de uma diretiva de pré-processador
    
    // Metadados de concatenação
    this.concatenado = false;        // Se foi formado por concatenação (##)
    this.tokensOriginais = null;     // Tokens originais se concatenado
    
    // Contexto C23
    this.atributosC23 = [];          // Atributos C23 (se aplicável)
  }

  /**
   * Tipos de token estáticos para fácil referência e comparação
   */
  static get TIPOS() {
    return {
      // Palavras-chave
      KEYWORD: "KEYWORD",
      
      // Identificadores
      IDENTIFIER: "IDENTIFIER",
      
      // Literais
      INT_LITERAL: "INT_LITERAL",
      FLOAT_LITERAL: "FLOAT_LITERAL",
      CHAR_LITERAL: "CHAR_LITERAL",
      STRING_LITERAL: "STRING_LITERAL",
      
      // Novos tipos de literais C23
      UTF8_CHAR_LITERAL: "UTF8_CHAR_LITERAL",
      UTF8_STRING_LITERAL: "UTF8_STRING_LITERAL",
      
      // Operadores e pontuação
      PUNCTUATOR: "PUNCTUATOR",
      
      // Pré-processador
      PREPROCESSOR: "PREPROCESSOR",
      
      // Especiais
      COMMENT: "COMMENT",        // Comentários (se preservados)
      WHITESPACE: "WHITESPACE",  // Espaços em branco (se preservados)
      
      // Controle
      EOF: "EOF",                // Fim de arquivo
      ERROR: "ERROR"             // Token de erro
    };
  }

  /**
   * Retorna todas as palavras-chave da linguagem C
   * Incluindo as adições do C99, C11, C17 e C23
   */
  static get KEYWORDS() {
    return {
      // C90 Keywords
      C90: [
        "auto", "break", "case", "char", "const", "continue", "default", "do",
        "double", "else", "enum", "extern", "float", "for", "goto", "if",
        "int", "long", "register", "return", "short", "signed", "sizeof", "static",
        "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while"
      ],
      
      // C99 Additions
      C99: [
        "inline", "_Bool", "_Complex", "_Imaginary", "restrict"
      ],
      
      // C11 Additions
      C11: [
        "_Alignas", "_Alignof", "_Atomic", "_Generic", "_Noreturn", 
        "_Static_assert", "_Thread_local"
      ],
      
      // C17 não adicionou novas palavras-chave
      
      // C23 Additions
      C23: [
        "_BitInt", "nullptr", "typeof", "typeof_unqual", "alignas", "alignof",
        "bool", "constexpr", "false", "noreturn", "static_assert", "thread_local", "true"
      ],
      
      // Macros comuns (não são palavras-chave, mas úteis para autocompletar)
      COMMON_MACROS: [
        "NULL", "EOF", "EXIT_SUCCESS", "EXIT_FAILURE", "RAND_MAX",
        "INT_MIN", "INT_MAX", "UINT_MAX", "SIZE_MAX"
      ]
    };
  }

  /**
   * Retorna todos os operadores e pontuadores da linguagem C
   * Incluindo os novos do C23
   */
  static get PUNCTUATORS() {
    return {
      // Operadores básicos
      BASIC: [
        "+", "-", "*", "/", "%", "=", "==", "!=", "<", ">", "<=", ">=",
        "++", "--", "&", "|", "^", "~", "<<", ">>", "&&", "||", "!", "&=",
        "|=", "^=", "<<=", ">>=", "+=", "-=", "*=", "/=", "%="
      ],
      
      // Ponteiros e acesso a membros
      MEMBER_ACCESS: [".", "->", ".*", "->*"],
      
      // Parênteses, chaves e colchetes
      DELIMITERS: ["(", ")", "{", "}", "[", "]"],
      
      // Pontuação
      SEPARATORS: [",", ";", ":", "..."],
      
      // Específicos de pré-processador
      PREPROCESSOR: ["#", "##", "?:", "%:", "%:%:"],
      
      // Adições C23
      C23: ["<=>", "<==>"]
    };
  }

  /**
   * Verifica se o token é de um tipo específico
   * @param {string} tipo - Tipo a ser verificado
   * @return {boolean} True se o token for do tipo especificado
   */
  ehTipo(tipo) {
    return this.tipo === tipo;
  }

  /**
   * Verifica se o token é uma palavra-chave específica
   * @param {string|string[]} palavraChave - Palavra-chave ou array de palavras-chave
   * @return {boolean} True se o token for a palavra-chave especificada
   */
  ehPalavraChave(palavraChave) {
    if (!this.ehTipo(Token.TIPOS.KEYWORD)) return false;
    
    if (Array.isArray(palavraChave)) {
      return palavraChave.includes(this.valor);
    }
    
    return this.valor === palavraChave;
  }

  /**
   * Verifica se o token é um ponteiro
   * @return {boolean} True se o token for um operador de ponteiro
   */
  get ehPonteiro() {
    if (!this._propriedadesCalculadas.has('ehPonteiro')) {
      this._propriedadesCalculadas.set(
        'ehPonteiro', 
        this.ehTipo(Token.TIPOS.PUNCTUATOR) && this.valor === '*'
      );
    }
    return this._propriedadesCalculadas.get('ehPonteiro');
  }

  /**
   * Verifica se o token é um identificador
   * @return {boolean} True se o token for um identificador
   */
  get ehIdentificador() {
    return this.ehTipo(Token.TIPOS.IDENTIFIER);
  }

  /**
   * Verifica se o token é um literal
   * @return {boolean} True se o token for qualquer tipo de literal
   */
  get ehLiteral() {
    const literais = [
      Token.TIPOS.INT_LITERAL,
      Token.TIPOS.FLOAT_LITERAL,
      Token.TIPOS.CHAR_LITERAL,
      Token.TIPOS.STRING_LITERAL,
      Token.TIPOS.UTF8_CHAR_LITERAL,
      Token.TIPOS.UTF8_STRING_LITERAL
    ];
    
    return literais.includes(this.tipo);
  }

  /**
   * Verifica se o token é um tipo primitivo
   * @return {boolean} True se o token for um tipo primitivo
   */
  get ehTipoPrimitivo() {
    const tiposPrimitivos = [
      'void', 'char', 'short', 'int', 'long', 'float', 'double',
      'signed', 'unsigned', '_Bool', '_Complex', '_Imaginary', '_BitInt'
    ];
    
    return this.ehPalavraChave(tiposPrimitivos);
  }

  /**
   * Verifica se o token é um qualificador de tipo
   * @return {boolean} True se o token for um qualificador de tipo
   */
  get ehQualificadorTipo() {
    const qualificadores = [
      'const', 'volatile', 'restrict', '_Atomic'
    ];
    
    return this.ehPalavraChave(qualificadores);
  }

  /**
   * Converte o token para string (para debug)
   * @return {string} Representação em string do token
   */
  toString() {
    let resultado = `Token(${this.tipo}, '${this.valor}', linha ${this.linha}, coluna ${this.coluna})`;
    
    if (this.expandidoMacro) {
      resultado += ` [expandido de ${this.origemMacro}]`;
    }
    
    return resultado;
  }

  /**
   * Cria uma cópia exata do token
   * @return {Token} Cópia do token
   */
  clone() {
    const clone = new Token(this.tipo, this.valor, this.linha, this.coluna, this.arquivo);
    
    // Copia propriedades adicionais
    clone.expandidoMacro = this.expandidoMacro;
    clone.origemMacro = this.origemMacro;
    clone.diretivaPP = this.diretivaPP;
    clone.concatenado = this.concatenado;
    clone.tokensOriginais = this.tokensOriginais ? [...this.tokensOriginais] : null;
    clone.atributosC23 = [...this.atributosC23];
    
    return clone;
  }

  /**
   * Retorna a posição formatada
   * @return {string} Posição no formato "arquivo:linha:coluna"
   */
  posicaoFormatada() {
    return `${this.arquivo}:${this.linha}:${this.coluna}`;
  }

  /**
   * Cria um token de erro com uma mensagem
   * @param {string} mensagem - Mensagem de erro
   * @param {number} linha - Linha do erro
   * @param {number} coluna - Coluna do erro
   * @param {string} arquivo - Arquivo onde ocorreu o erro
   * @return {Token} Token de erro
   */
  static criaTokenErro(mensagem, linha, coluna, arquivo = "main.c") {
    const token = new Token(Token.TIPOS.ERROR, mensagem, linha, coluna, arquivo);
    return token;
  }

  /**
   * Cria um token EOF (fim de arquivo)
   * @param {number} linha - Última linha do arquivo
   * @param {number} coluna - Última coluna do arquivo
   * @param {string} arquivo - Nome do arquivo
   * @return {Token} Token EOF
   */
  static criaTokenEOF(linha, coluna, arquivo = "main.c") {
    return new Token(Token.TIPOS.EOF, "", linha, coluna, arquivo);
  }

  /**
   * Verifica se a string é uma palavra-chave válida de C
   * Opcionalmente, restringe a palavras-chave de uma versão específica
   * @param {string} palavra - Palavra a verificar
   * @param {string} versao - Versão do C ('C90', 'C99', 'C11', 'C17', 'C23' ou 'ALL')
   * @return {boolean} True se for uma palavra-chave válida
   */
  static ehPalavraChaveValida(palavra, versao = 'ALL') {
    if (versao === 'ALL') {
      return [
        ...Token.KEYWORDS.C90, 
        ...Token.KEYWORDS.C99,
        ...Token.KEYWORDS.C11,
        ...Token.KEYWORDS.C23
      ].includes(palavra);
    }
    
    return Token.KEYWORDS[versao] && Token.KEYWORDS[versao].includes(palavra);
  }
}

// Exporta a classe
export default Token;
```

Esta implementação de Token é completa e abrangente, considerando todas as particularidades do C90, C17 e C23:

### 1. Suporte a Todas as Versões da Linguagem C
- Lista completa de palavras-chave para C90, C99, C11, C17 e C23
- Operadores e pontuadores específicos de cada versão
- Métodos para verificar palavras-chave por versão da linguagem

### 2. Metadados Completos
- Posição no código fonte (linha, coluna)
- Arquivo de origem (útil para includes)
- Comprimento do token
- Suporte a atributos específicos do C23

### 3. Metadados de Pré-processamento
- Suporte para macros e expansão de macros
- Identificação de tokens provenientes de expansão de macros
- Concatenação de tokens (operador ##)

### 4. Métodos de Utilidade
- Verificação de tipos de token (ehTipo, ehPalavraChave)
- Propriedades calculadas para identificação rápida (ehPonteiro, ehLiteral)
- Clonagem de tokens
- Formatação de posição para mensagens de erro

### 5. Tokens Especiais
- Tokens de erro com mensagens
- Tokens EOF (fim de arquivo)
- Suporte para comentários e espaços em branco (se necessário preservá-los)

Esta implementação é um passo fundamental para um analisador C completo, pois estabelece uma base sólida para representar todos os elementos léxicos da linguagem, incluindo as extensões mais recentes do C17 e C23.

Podemos prosseguir para o próximo componente: a implementação completa do AnalisadorLexico.