# Implementação Detalhada do AnalisadorSintatico

Vou desenvolver em detalhes o AnalisadorSintatico - o componente mais fundamental do interpretador C. Esse analisador converte os tokens gerados pelo AnalisadorLexico em uma Árvore Sintática Abstrata (AST).

```javascript
// analisadorSintatico.js
import NoAST from './noAst.js';
import Token from './token.js';

class AnalisadorSintatico {
  constructor(analisadorLexico) {
    this.analisadorLexico = analisadorLexico;
    this.tokens = [];
    this.tokenAtual = 0;
    this.erros = [];
  }

  // Analisa os tokens e constrói a AST
  analisaTokens(tokens) {
    this.tokens = tokens;
    this.tokenAtual = 0;
    this.erros = [];

    // Cria o nó raiz do programa
    const raiz = new NoAST('PROGRAMA', null);
    
    // Analisa todas as declarações globais
    while (!this.fimTokens()) {
      try {
        // Tenta processar uma declaração global
        const declaracao = this.processaDeclaracaoGlobal();
        if (declaracao) {
          raiz.adicionaFilho(declaracao);
        }
      } catch (erro) {
        this.erros.push(erro);
        this.sincroniza();
      }
    }

    // Verifica erros
    if (this.erros.length > 0) {
      console.error(`Encontrados ${this.erros.length} erros durante a análise sintática:`);
      this.erros.forEach(erro => console.error(erro));
    }

    return raiz;
  }

  // Processa uma declaração global (função ou variável)
  processaDeclaracaoGlobal() {
    // Verifica pré-processamento (#include, #define, etc)
    if (this.pegaTokenAtual().tipo === 'PREPROCESSOR') {
      return this.processaPreprocessador();
    }

    // Tenta analisar como uma declaração de tipo (typedef, struct, enum)
    if (this.verificaTipo('KEYWORD', ['typedef', 'struct', 'enum', 'union'])) {
      return this.processaDeclaracaoTipo();
    }

    // Analisa o tipo de retorno (ou tipo da variável)
    const tipo = this.processaTipo();
    
    // Verifica se é uma declaração de função ou variável
    let token = this.pegaTokenAtual();
    
    // Olha à frente para ver se é uma função (tem parênteses)
    let ehFuncao = false;
    let tokenPos = this.tokenAtual;
    
    // Pula o nome do identificador
    if (token.tipo === 'IDENTIFIER') {
      tokenPos++;
      
      // Procura por um parêntese de abertura
      while (tokenPos < this.tokens.length) {
        if (this.tokens[tokenPos].tipo === 'PUNCTUATOR' && this.tokens[tokenPos].valor === '(') {
          ehFuncao = true;
          break;
        } else if (this.tokens[tokenPos].tipo === 'PUNCTUATOR' && this.tokens[tokenPos].valor === ';') {
          break;
        }
        tokenPos++;
      }
    }

    if (ehFuncao) {
      return this.processaDeclaracaoFuncao(tipo);
    } else {
      return this.processaDeclaracaoVariavelGlobal(tipo);
    }
  }

  // Processa uma diretiva de pré-processador (#include, #define, etc)
  processaPreprocessador() {
    const token = this.consumeToken();
    const diretiva = token.valor.trim().split(' ')[0]; // Pega a primeira palavra (#include, #define)
    
    let no;
    switch (diretiva) {
      case '#include':
        no = new NoAST('INCLUDE', token.valor.substring(8).trim(), token.linha, token.coluna);
        break;
      case '#define':
        const partes = token.valor.substring(7).trim().split(' ');
        no = new NoAST('DEFINE', partes[0], token.linha, token.coluna);
        if (partes.length > 1) {
          no.adicionaFilho(new NoAST('VALOR', partes.slice(1).join(' '), token.linha, token.coluna));
        }
        break;
      default:
        no = new NoAST('PREPROCESSOR', token.valor, token.linha, token.coluna);
    }
    
    return no;
  }

  // Processa uma declaração de tipo (struct, enum, typedef)
  processaDeclaracaoTipo() {
    const token = this.consumeToken();
    const tipoDeclaracao = token.valor;
    
    switch (tipoDeclaracao) {
      case 'struct':
        return this.processaStruct();
      case 'enum':
        return this.processaEnum();
      case 'typedef':
        return this.processaTypedef();
      case 'union':
        return this.processaUnion();
      default:
        throw new Error(`Tipo de declaração não suportado: ${tipoDeclaracao}`);
    }
  }

  // Processa uma declaração de struct
  processaStruct() {
    // Nome da struct (opcional)
    let nomeStruct = null;
    if (this.verificaTipo('IDENTIFIER')) {
      nomeStruct = this.consumeToken().valor;
    }
    
    // Cria nó da struct
    const noStruct = new NoAST('STRUCT_DECL', nomeStruct || '');
    
    // Processa o corpo da struct
    this.consome('PUNCTUATOR', '{');
    
    // Processa os membros da struct
    while (!this.verificaTipo('PUNCTUATOR', '}')) {
      const tipo = this.processaTipo();
      
      // Processa cada declaração de membro
      let mais = true;
      while (mais) {
        const nome = this.consome('IDENTIFIER').valor;
        let tamanhoArray = null;
        
        // Verifica se é um array
        if (this.verificaTipo('PUNCTUATOR', '[')) {
          this.consumeToken(); // Consome '['
          
          // Processa o tamanho do array, se especificado
          if (!this.verificaTipo('PUNCTUATOR', ']')) {
            tamanhoArray = this.processaExpressao();
          }
          
          this.consome('PUNCTUATOR', ']');
        }
        
        // Cria nó para o membro
        const noMembro = new NoAST('STRUCT_MEMBER', nome);
        noMembro.adicionaPropriedade('tipo', tipo);
        
        if (tamanhoArray) {
          noMembro.adicionaPropriedade('ehArray', true);
          noMembro.adicionaFilho(tamanhoArray);
        }
        
        // Adiciona à struct
        noStruct.adicionaFilho(noMembro);
        
        // Verifica se há mais declarações
        if (this.verificaTipo('PUNCTUATOR', ',')) {
          this.consumeToken();
        } else {
          mais = false;
        }
      }
      
      // Cada declaração termina com ponto e vírgula
      this.consome('PUNCTUATOR', ';');
    }
    
    // Consome o fechamento da chave
    this.consome('PUNCTUATOR', '}');
    
    // Se houver ponto e vírgula após o fechamento da struct
    if (this.verificaTipo('PUNCTUATOR', ';')) {
      this.consumeToken();
    }
    
    return noStruct;
  }

  // Processa uma declaração de função
  processaDeclaracaoFuncao(tipoRetorno) {
    // Nome da função
    const nome = this.consome('IDENTIFIER').valor;
    const noFuncao = new NoAST('FUNCTION_DECL', nome);
    noFuncao.adicionaPropriedade('tipoRetorno', tipoRetorno);
    
    // Parâmetros da função
    this.consome('PUNCTUATOR', '(');
    
    // Lista de parâmetros
    if (!this.verificaTipo('PUNCTUATOR', ')')) {
      let mais = true;
      while (mais) {
        const tipoParam = this.processaTipo();
        let nomeParam = '';
        
        // Nome do parâmetro (opcional em protótipos)
        if (this.verificaTipo('IDENTIFIER')) {
          nomeParam = this.consumeToken().valor;
        }
        
        // Cria nó para o parâmetro
        const noParametro = new NoAST('PARAMETER', nomeParam);
        noParametro.adicionaPropriedade('tipo', tipoParam);
        
        // Verifica se é um array
        if (this.verificaTipo('PUNCTUATOR', '[')) {
          this.consumeToken();
          noParametro.adicionaPropriedade('ehArray', true);
          
          // Tamanho do array (opcional)
          if (!this.verificaTipo('PUNCTUATOR', ']')) {
            const tamanho = this.processaExpressao();
            noParametro.adicionaFilho(tamanho);
          }
          
          this.consome('PUNCTUATOR', ']');
        }
        
        // Adiciona o parâmetro à função
        noFuncao.adicionaFilho(noParametro);
        
        // Verifica se há mais parâmetros
        if (this.verificaTipo('PUNCTUATOR', ',')) {
          this.consumeToken();
        } else {
          mais = false;
        }
      }
    }
    
    this.consome('PUNCTUATOR', ')');
    
    // Corpo da função ou protótipo
    if (this.verificaTipo('PUNCTUATOR', '{')) {
      // Corpo da função
      const corpo = this.processaBlocoComposto();
      noFuncao.adicionaFilho(corpo);
    } else {
      // Protótipo de função termina com ponto e vírgula
      this.consome('PUNCTUATOR', ';');
      noFuncao.adicionaPropriedade('ehPrototipo', true);
    }
    
    return noFuncao;
  }

  // Processa um bloco composto (entre chaves)
  processaBlocoComposto() {
    this.consome('PUNCTUATOR', '{');
    const noBloco = new NoAST('COMPOUND_STMT', '');
    
    // Processa declarações e instruções dentro do bloco
    while (!this.verificaTipo('PUNCTUATOR', '}')) {
      // Verifica se é uma declaração ou instrução
      if (this.ehDeclaracao()) {
        const declaracao = this.processaDeclaracaoVariavel();
        noBloco.adicionaFilho(declaracao);
      } else {
        const instrucao = this.processaInstrucao();
        noBloco.adicionaFilho(instrucao);
      }
    }
    
    this.consome('PUNCTUATOR', '}');
    return noBloco;
  }

  // Verifica se o token atual inicia uma declaração
  ehDeclaracao() {
    // Verifica tipos primitivos
    if (this.verificaTipo('KEYWORD', [
      'void', 'char', 'short', 'int', 'long', 'float', 'double',
      'signed', 'unsigned', 'struct', 'enum', 'union', 'typedef', 'const'
    ])) {
      return true;
    }
    
    // Poderia verificar tipos definidos pelo usuário também
    
    return false;
  }

  // Processa uma declaração de variável
  processaDeclaracaoVariavel() {
    const tipo = this.processaTipo();
    const noDeclaracao = new NoAST('VAR_DECL_STMT', '');
    
    // Processa uma ou mais variáveis separadas por vírgula
    let mais = true;
    while (mais) {
      const nome = this.consome('IDENTIFIER').valor;
      const noVar = new NoAST('VAR_DECL', nome);
      noVar.adicionaPropriedade('tipo', tipo);
      
      // Verifica se é array
      if (this.verificaTipo('PUNCTUATOR', '[')) {
        this.consumeToken();
        noVar.adicionaPropriedade('ehArray', true);
        
        // Tamanho do array
        if (!this.verificaTipo('PUNCTUATOR', ']')) {
          const tamanho = this.processaExpressao();
          noVar.adicionaFilho(tamanho);
        }
        
        this.consome('PUNCTUATOR', ']');
      }
      
      // Inicialização de variável
      if (this.verificaTipo('PUNCTUATOR', '=')) {
        this.consumeToken();
        const inicializacao = this.processaExpressao();
        noVar.adicionaFilho(inicializacao);
      }
      
      // Adiciona a variável à declaração
      noDeclaracao.adicionaFilho(noVar);
      
      // Verifica se há mais variáveis
      if (this.verificaTipo('PUNCTUATOR', ',')) {
        this.consumeToken();
      } else {
        mais = false;
      }
    }
    
    this.consome('PUNCTUATOR', ';');
    return noDeclaracao;
  }

  // Processa um tipo (básico ou complexo)
  processaTipo() {
    let resultado = "";
    let continuaPorcessamento = true;
    
    while (continuaPorcessamento) {
      if (this.verificaTipo('KEYWORD', [
        'void', 'char', 'short', 'int', 'long', 'float', 'double',
        'signed', 'unsigned', 'const', 'volatile'
      ])) {
        if (resultado.length > 0) resultado += " ";
        resultado += this.consumeToken().valor;
        
      } else if (this.verificaTipo('IDENTIFIER')) {
        // Tipo definido pelo usuário
        if (resultado.length > 0) resultado += " ";
        resultado += this.consumeToken().valor;
        continuaPorcessamento = false;
        
      } else if (this.verificaTipo('KEYWORD', ['struct', 'enum', 'union'])) {
        // Tipos compostos
        if (resultado.length > 0) resultado += " ";
        const tipoComp = this.consumeToken().valor;
        resultado += tipoComp;
        
        // Nome da struct/enum/union
        if (this.verificaTipo('IDENTIFIER')) {
          resultado += " " + this.consumeToken().valor;
        }
        
        // Se seguido por definição, pule-a
        if (this.verificaTipo('PUNCTUATOR', '{')) {
          // Pular toda a definição
          let contaChaves = 1;
          this.consumeToken(); // Consome '{'
          
          while (contaChaves > 0 && !this.fimTokens()) {
            const token = this.consumeToken();
            if (token.tipo === 'PUNCTUATOR') {
              if (token.valor === '{') contaChaves++;
              else if (token.valor === '}') contaChaves--;
            }
          }
        }
        
        continuaPorcessamento = false;
      } else {
        continuaPorcessamento = false;
      }
    }
    
    // Verifica ponteiros
    while (this.verificaTipo('PUNCTUATOR', '*')) {
      resultado += this.consumeToken().valor;
    }
    
    return resultado;
  }

  // Processa uma instrução
  processaInstrucao() {
    // Verifica qual tipo de instrução
    if (this.verificaTipo('PUNCTUATOR', '{')) {
      return this.processaBlocoComposto();
    } else if (this.verificaTipo('KEYWORD', 'if')) {
      return this.processaIfStmt();
    } else if (this.verificaTipo('KEYWORD', 'while')) {
      return this.processaWhileStmt();
    } else if (this.verificaTipo('KEYWORD', 'for')) {
      return this.processaForStmt();
    } else if (this.verificaTipo('KEYWORD', 'do')) {
      return this.processaDoWhileStmt();
    } else if (this.verificaTipo('KEYWORD', 'switch')) {
      return this.processaSwitchStmt();
    } else if (this.verificaTipo('KEYWORD', 'return')) {
      return this.processaReturnStmt();
    } else if (this.verificaTipo('KEYWORD', 'break')) {
      const token = this.consumeToken();
      this.consome('PUNCTUATOR', ';');
      return new NoAST('BREAK_STMT', '', token.linha, token.coluna);
    } else if (this.verificaTipo('KEYWORD', 'continue')) {
      const token = this.consumeToken();
      this.consome('PUNCTUATOR', ';');
      return new NoAST('CONTINUE_STMT', '', token.linha, token.coluna);
    } else if (this.verificaTipo('PUNCTUATOR', ';')) {
      // Instrução vazia
      const token = this.consumeToken();
      return new NoAST('EMPTY_STMT', '', token.linha, token.coluna);
    } else {
      // Expressão (atribuição, chamada de função, etc.)
      const expressao = this.processaExpressao();
      this.consome('PUNCTUATOR', ';');
      return new NoAST('EXPR_STMT', '', expressao.linha, expressao.coluna, [expressao]);
    }
  }

  // Processa uma instrução if-else
  processaIfStmt() {
    const tokenIf = this.consome('KEYWORD', 'if');
    const noIf = new NoAST('IF_STMT', '', tokenIf.linha, tokenIf.coluna);
    
    // Condição
    this.consome('PUNCTUATOR', '(');
    const condicao = this.processaExpressao();
    this.consome('PUNCTUATOR', ')');
    noIf.adicionaFilho(condicao);
    
    // Bloco then
    const blocoThen = this.processaInstrucao();
    noIf.adicionaFilho(blocoThen);
    
    // Bloco else (opcional)
    if (this.verificaTipo('KEYWORD', 'else')) {
      this.consumeToken();
      const blocoElse = this.processaInstrucao();
      noIf.adicionaFilho(blocoElse);
    }
    
    return noIf;
  }

  // Processa uma instrução while
  processaWhileStmt() {
    const tokenWhile = this.consome('KEYWORD', 'while');
    const noWhile = new NoAST('WHILE_STMT', '', tokenWhile.linha, tokenWhile.coluna);
    
    // Condição
    this.consome('PUNCTUATOR', '(');
    const condicao = this.processaExpressao();
    this.consome('PUNCTUATOR', ')');
    noWhile.adicionaFilho(condicao);
    
    // Corpo do loop
    const corpo = this.processaInstrucao();
    noWhile.adicionaFilho(corpo);
    
    return noWhile;
  }

  // Processa uma instrução for
  processaForStmt() {
    const tokenFor = this.consome('KEYWORD', 'for');
    const noFor = new NoAST('FOR_STMT', '', tokenFor.linha, tokenFor.coluna);
    
    this.consome('PUNCTUATOR', '(');
    
    // Inicialização
    if (!this.verificaTipo('PUNCTUATOR', ';')) {
      // Verifica se é uma declaração
      if (this.ehDeclaracao()) {
        const inicializacao = this.processaDeclaracaoVariavel();
        noFor.adicionaFilho(inicializacao);
      } else {
        const inicializacao = this.processaExpressao();
        this.consome('PUNCTUATOR', ';');
        noFor.adicionaFilho(inicializacao);
      }
    } else {
      // Inicialização vazia
      this.consumeToken();
      noFor.adicionaFilho(new NoAST('EMPTY_STMT', ''));
    }
    
    // Condição
    if (!this.verificaTipo('PUNCTUATOR', ';')) {
      const condicao = this.processaExpressao();
      noFor.adicionaFilho(condicao);
    } else {
      // Condição vazia (sempre verdadeira)
      noFor.adicionaFilho(new NoAST('EMPTY_STMT', ''));
    }
    this.consome('PUNCTUATOR', ';');
    
    // Atualização
    if (!this.verificaTipo('PUNCTUATOR', ')')) {
      const atualizacao = this.processaExpressao();
      noFor.adicionaFilho(atualizacao);
    } else {
      // Atualização vazia
      noFor.adicionaFilho(new NoAST('EMPTY_STMT', ''));
    }
    this.consome('PUNCTUATOR', ')');
    
    // Corpo do loop
    const corpo = this.processaInstrucao();
    noFor.adicionaFilho(corpo);
    
    return noFor;
  }

  // Processa um return
  processaReturnStmt() {
    const tokenReturn = this.consome('KEYWORD', 'return');
    const noReturn = new NoAST('RETURN_STMT', '', tokenReturn.linha, tokenReturn.coluna);
    
    // Valor de retorno (opcional)
    if (!this.verificaTipo('PUNCTUATOR', ';')) {
      const valorRetorno = this.processaExpressao();
      noReturn.adicionaFilho(valorRetorno);
    }
    
    this.consome('PUNCTUATOR', ';');
    return noReturn;
  }

  // Processa uma expressão (geral)
  processaExpressao() {
    // Começa pela expressão de atribuição
    return this.processaExpressaoAtribuicao();
  }

  // Processa expressões de atribuição
  processaExpressaoAtribuicao() {
    // Processa a expressão do lado esquerdo
    const esquerda = this.processaExpressaoOr();
    
    // Verifica se é uma atribuição
    if (this.verificaTipo('PUNCTUATOR', ['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|='])) {
      const operador = this.consumeToken().valor;
      const direita = this.processaExpressaoAtribuicao();
      
      return new NoAST('ASSIGN_EXPR', operador, esquerda.linha, esquerda.coluna, [esquerda, direita]);
    }
    
    return esquerda;
  }

  // Processa expressões lógicas OR (||)
  processaExpressaoOr() {
    let esquerda = this.processaExpressaoAnd();
    
    while (this.verificaTipo('PUNCTUATOR', '||')) {
      const operador = this.consumeToken().valor;
      const direita = this.processaExpressaoAnd();
      
      esquerda = new NoAST('BINARY_EXPR', operador, esquerda.linha, esquerda.coluna, [esquerda, direita]);
    }
    
    return esquerda;
  }

  // Processa expressões lógicas AND (&&)
  processaExpressaoAnd() {
    let esquerda = this.processaExpressaoIgualdade();
    
    while (this.verificaTipo('PUNCTUATOR', '&&')) {
      const operador = this.consumeToken().valor;
      const direita = this.processaExpressaoIgualdade();
      
      esquerda = new NoAST('BINARY_EXPR', operador, esquerda.linha, esquerda.coluna, [esquerda, direita]);
    }
    
    return esquerda;
  }

  // Processa expressões de igualdade (==, !=)
  processaExpressaoIgualdade() {
    let esquerda = this.processaExpressaoRelacional();
    
    while (this.verificaTipo('PUNCTUATOR', ['==', '!='])) {
      const operador = this.consumeToken().valor;
      const direita = this.processaExpressaoRelacional();
      
      esquerda = new NoAST('BINARY_EXPR', operador, esquerda.linha, esquerda.coluna, [esquerda, direita]);
    }
    
    return esquerda;
  }

  // Processa expressões relacionais (<, >, <=, >=)
  processaExpressaoRelacional() {
    let esquerda = this.processaExpressaoAditiva();
    
    while (this.verificaTipo('PUNCTUATOR', ['<', '>', '<=', '>='])) {
      const operador = this.consumeToken().valor;
      const direita = this.processaExpressaoAditiva();
      
      esquerda = new NoAST('BINARY_EXPR', operador, esquerda.linha, esquerda.coluna, [esquerda, direita]);
    }
    
    return esquerda;
  }

  // Processa expressões aditivas (+, -)
  processaExpressaoAditiva() {
    let esquerda = this.processaExpressaoMultiplicativa();
    
    while (this.verificaTipo('PUNCTUATOR', ['+', '-'])) {
      const operador = this.consumeToken().valor;
      const direita = this.processaExpressaoMultiplicativa();
      
      esquerda = new NoAST('BINARY_EXPR', operador, esquerda.linha, esquerda.coluna, [esquerda, direita]);
    }
    
    return esquerda;
  }

  // Processa expressões multiplicativas (*, /, %)
  processaExpressaoMultiplicativa() {
    let esquerda = this.processaExpressaoUnaria();
    
    while (this.verificaTipo('PUNCTUATOR', ['*', '/', '%'])) {
      const operador = this.consumeToken().valor;
      const direita = this.processaExpressaoUnaria();
      
      esquerda = new NoAST('BINARY_EXPR', operador, esquerda.linha, esquerda.coluna, [esquerda, direita]);
    }
    
    return esquerda;
  }

  // Processa expressões unárias (!, -, +, ++, --, *, &)
  processaExpressaoUnaria() {
    if (this.verificaTipo('PUNCTUATOR', ['!', '-', '+', '++', '--', '*', '&'])) {
      const operador = this.consumeToken().valor;
      const operando = this.processaExpressaoUnaria();
      
      return new NoAST('UNARY_EXPR', operador, operando.linha, operando.coluna, [operando]);
    }
    
    // Se não for uma expressão unária, é uma expressão primária
    return this.processaExpressaoPrimaria();
  }

  // Processa expressões primárias (literais, identificadores, chamadas de função)
  processaExpressaoPrimaria() {
    const token = this.pegaTokenAtual();
    
    if (this.verificaTipo('INT')) {
      this.consumeToken();
      return new NoAST('INT_LITERAL', token.valor, token.linha, token.coluna);
    } else if (this.verificaTipo('FLOAT')) {
      this.consumeToken();
      return new NoAST('FLOAT_LITERAL', token.valor, token.linha, token.coluna);
    } else if (this.verificaTipo('STRING')) {
      this.consumeToken();
      return new NoAST('STRING_LITERAL', token.valor, token.linha, token.coluna);
    } else if (this.verificaTipo('PUNCTUATOR', '(')) {
      this.consumeToken();
      const expressao = this.processaExpressao();
      this.consome('PUNCTUATOR', ')');
      return expressao;
    } else if (this.verificaTipo('IDENTIFIER')) {
      this.consumeToken();
      
      // Verifica se é uma chamada de função
      if (this.verificaTipo('PUNCTUATOR', '(')) {
        return this.processaChamadaFuncao(token);
      } else if (this.verificaTipo('PUNCTUATOR', '[')) {
        return this.processaAcessoArray(token);
      } else {
        // Referência a variável simples
        return new NoAST('IDENTIFIER', token.valor, token.linha, token.coluna);
      }
    } else {
      throw new Error(`Token inesperado: ${token.tipo} ${token.valor}`);
    }
  }

  // Processa chamadas de função
  processaChamadaFuncao(tokenNome) {
    const noChamada = new NoAST('CALL_EXPR', tokenNome.valor, tokenNome.linha, tokenNome.coluna);
    
    this.consome('PUNCTUATOR', '(');
    
    // Processa os argumentos
    if (!this.verificaTipo('PUNCTUATOR', ')')) {
      let mais = true;
      while (mais) {
        const argumento = this.processaExpressao();
        noChamada.adicionaFilho(argumento);
        
        if (this.verificaTipo('PUNCTUATOR', ',')) {
          this.consumeToken();
        } else {
          mais = false;
        }
      }
    }
    
    this.consome('PUNCTUATOR', ')');
    return noChamada;
  }

  // Processa acesso a array
  processaAcessoArray(tokenNome) {
    const noArray = new NoAST('ARRAY_ACCESS', tokenNome.valor, tokenNome.linha, tokenNome.coluna);
    
    this.consome('PUNCTUATOR', '[');
    const indice = this.processaExpressao();
    this.consome('PUNCTUATOR', ']');
    
    noArray.adicionaFilho(indice);
    
    // Encadeamento de acesso a array
    if (this.verificaTipo('PUNCTUATOR', '[')) {
      return this.processaAcessoArray(noArray);
    }
    
    return noArray;
  }

  // Métodos auxiliares
  pegaTokenAtual() {
    if (this.tokenAtual >= this.tokens.length) {
      return new Token('EOF', '', -1, -1);
    }
    return this.tokens[this.tokenAtual];
  }

  consumeToken() {
    return this.tokens[this.tokenAtual++];
  }

  // Verifica o tipo e opcionalmente o valor do token atual
  verificaTipo(tipo, valor = null) {
    const token = this.pegaTokenAtual();
    
    if (token.tipo !== tipo) {
      return false;
    }
    
    if (valor === null) {
      return true;
    }
    
    if (Array.isArray(valor)) {
      return valor.includes(token.valor);
    }
    
    return token.valor === valor;
  }

  // Consome um token esperado ou lança um erro
  consome(tipo, valor = null) {
    if (this.verificaTipo(tipo, valor)) {
      return this.consumeToken();
    }
    
    const token = this.pegaTokenAtual();
    const valorEsperado = valor ? (Array.isArray(valor) ? valor.join(' ou ') : valor) : tipo;
    throw new Error(`Erro de sintaxe: esperado ${valorEsperado}, encontrado ${token.tipo} ${token.valor} (linha ${token.linha}, coluna ${token.coluna})`);
  }

  // Verifica se acabaram os tokens
  fimTokens() {
    return this.tokenAtual >= this.tokens.length || this.pegaTokenAtual().tipo === 'EOF';
  }

  // Tenta recuperar de um erro
  sincroniza() {
    this.consumeToken();
    
    while (!this.fimTokens()) {
      if (this.verificaTipo('PUNCTUATOR', ';')) {
        this.consumeToken();
        return;
      }
      
      if (this.verificaTipo('KEYWORD', ['if', 'while', 'for', 'return', 'int', 'float', 'void'])) {
        return;
      }
      
      this.consumeToken();
    }
  }
}

// Exporta a classe
export default AnalisadorSintatico;
```

### Classe NoAST

```javascript
// noAst.js
class NoAST {
  constructor(tipo, valor = '', linha = -1, coluna = -1, filhos = []) {
    this.tipo = tipo;        // Tipo do nó (ex: 'FUNCTION_DECL', 'VAR_DECL', etc.)
    this.valor = valor;      // Valor associado (nome da variável, valor literal, etc.)
    this.linha = linha;      // Linha no código fonte
    this.coluna = coluna;    // Coluna no código fonte
    this.filhos = [...filhos]; // Nós filhos
    this.pai = null;         // Referência ao nó pai
    this.propriedades = {};  // Propriedades adicionais
  }

  // Adiciona um filho ao nó
  adicionaFilho(no) {
    this.filhos.push(no);
    no.pai = this;
    return this;
  }

  // Adiciona uma propriedade ao nó
  adicionaPropriedade(chave, valor) {
    this.propriedades[chave] = valor;
    return this;
  }

  // Acessa uma propriedade
  pegaPropriedade(chave) {
    return this.propriedades[chave];
  }

  // Verifica se o nó tem uma propriedade
  temPropriedade(chave) {
    return this.propriedades.hasOwnProperty(chave);
  }

  // Retorna uma representação textual do nó (útil para depuração)
  toString(prefixo = '') {
    let resultado = `${prefixo}${this.tipo}`;
    
    if (this.valor) {
      resultado += `: ${this.valor}`;
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

  // Visita o nó e seus filhos com um callback (padrão Visitor)
  visita(visitante) {
    if (typeof visitante[this.tipo] === 'function') {
      visitante[this.tipo](this);
    } else if (typeof visitante.default === 'function') {
      visitante.default(this);
    }
    
    for (const filho of this.filhos) {
      filho.visita(visitante);
    }
  }

  // Encontra o primeiro nó filho de um tipo específico
  encontraFilho(tipo) {
    for (const filho of this.filhos) {
      if (filho.tipo === tipo) return filho;
    }
    return null;
  }

  // Encontra todos os nós filhos de um tipo específico
  encontraFilhos(tipo) {
    return this.filhos.filter(filho => filho.tipo === tipo);
  }
}

// Exporta a classe
export default NoAST;
```

### Classe Token

```javascript
// token.js
class Token {
  constructor(tipo, valor, linha, coluna) {
    this.tipo = tipo;     // Tipo do token (KEYWORD, IDENTIFIER, INT, FLOAT, STRING, PUNCTUATOR, etc.)
    this.valor = valor;   // Valor do token
    this.linha = linha;   // Linha no código fonte
    this.coluna = coluna; // Coluna no código fonte
  }

  toString() {
    return `Token(${this.tipo}, '${this.valor}', linha ${this.linha}, coluna ${this.coluna})`;
  }
}

// Exporta a classe
export default Token;
```

## Explicação da Implementação

O AnalisadorSintatico implementado segue uma abordagem de **parser recursivo descendente**, que é uma técnica comum para análise sintática onde:

1. **Cada função de análise** corresponde a uma regra gramatical da linguagem C
2. **Recursão** é usada para analisar estruturas aninhadas (como blocos e expressões)
3. A análise começa com a regra mais geral (programa) e desce para regras mais específicas

### Fluxo de Processamento:

1. **Tokenização**: O código-fonte é primeiro convertido em tokens pelo AnalisadorLexico
2. **Construção da AST**: O AnalisadorSintatico percorre os tokens e constrói a árvore
3. **Validação Sintática**: Erros de sintaxe são detectados durante a análise
4. **Recuperação de Erros**: O método `sincroniza()` tenta continuar a análise após um erro

### Suporte a Funcionalidades da Linguagem C:

- **Declarações**: variáveis, funções, structs, enums, typedefs
- **Tipos de Dados**: primitivos (int, float, etc.) e compostos (struct, array)
- **Expressões**: operadores binários, unários, chamadas de função, acesso a arrays
- **Instruções de Controle**: if-else, for, while, do-while, switch, return, break, continue

### Vantagens deste Design:

1. **Modularidade**: Cada função processadora é responsável por uma parte específica da gramática
2. **Extensibilidade**: Fácil adicionar suporte a novas construções da linguagem
3. **Rastreabilidade**: Cada nó na AST armazena informações de linha e coluna para mensagens de erro precisas
4. **Depuração**: Método `toString()` no NoAST facilita a visualização da árvore gerada

Esta implementação do AnalisadorSintatico forma a base para o interpretador C e permite a simulação passo a passo de programas C, visualizando mudanças no estado de execução e estruturas de dados em tempo real.

Falta implementar algumas partes mais complexas como inicializadores de arrays, estruturas condicionais mais avançadas e manipulação de tipos complexos, mas o núcleo está presente e funcional para um subconjunto significativo da linguagem C.