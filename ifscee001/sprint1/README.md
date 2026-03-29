# IFSCee - Interpretador Visual de C

Um interpretador educacional de C com visualização em tempo real de memória, execução passo a passo e debugging interativo.

## 🎯 Objetivo

IFSCee é uma ferramenta pedagógica para ensinar programação em C, focando especialmente em:
- Gestão de memória (Stack, Heap, RODATA)
- Ponteiros e arrays
- Fluxo de execução
- Debugging visual

## ✨ Funcionalidades Principais

### 🔍 Análise e Compilação
- **Preprocessador Completo**: Suporta `#include`, `#define`, `#ifdef`, `#ifndef`, `#else`, `#endif`
- **Lexer Robusto**: Tokenização de código C com suporte a keywords, operadores, strings, números e caracteres
- **Parser AST**: Geração de Árvore de Sintaxe Abstrata (AST) completa
- **Sistema de Tipos**: Gerenciamento de tipos C incluindo ponteiros, arrays multidimensionais, e modificadores

### 💻 Execução
- **Interpretador Step-by-Step**: Execução linha por linha com visualização
- **Funções Definidas pelo Usuário**: Suporte completo a chamadas de funções e recursão
- **Funções Built-in**: `printf`, `malloc`, `free` totalmente funcionais
- **Stack Overflow Detection**: Prevenção de recursão infinita com limite de 1000 chamadas
- **Gestão de Memória**: Simulação realista de Stack, Heap e RODATA

### 🎨 Interface Visual

#### Syntax Highlighting
- Cores distintas para keywords, tipos, funções, strings, números
- Tema dark moderno (estilo VS Code)

#### Painel de Memória
- Visualização em tempo real da RAM
- Distinção visual entre STACK, HEAP e RODATA
- Arrays bidimensionais em formato de matriz
- Indicação de lixo de memória e valores não inicializados

#### Painel de Variáveis Observadas
- Clique direito em qualquer variável para adicionar ao watch
- Acompanhamento em tempo real dos valores
- Indicação quando variáveis saem de escopo
- Remoção fácil com botão ✕

#### Visualizador de AST (Abstract Syntax Tree)
- **Visualização da Árvore**: Estrutura hierárquica do código parseado
- **Expand/Collapse**: Navegação interativa pelos nós da árvore
- **Highlighting Sincronizado**: Destaque dos nós durante a execução
- **Export JSON**: Exportação da AST completa em formato JSON
- **Toggle View**: Mostrar/ocultar o painel de AST
- **Auto-Expand**: Expande automaticamente o caminho até o nó em execução

#### Controles de Execução
- **Preparar Execução** (Ctrl+Enter): Compila e prepara o código
- **Primeiro** (Home): Vai para o primeiro passo
- **Anterior** (←): Volta um passo
- **Play/Pause** (Espaço): Execução automática
- **Próximo** (→): Avança um passo
- **Último** (End): Executa até o final
- **Controle de Velocidade**: Slider de 1x a 10x para ajustar velocidade do auto-play
- **🌳 AST**: Toggle para mostrar/ocultar visualizador de AST
- **📥 Export AST**: Exportar a árvore sintática em formato JSON

### 🐛 Debugging Avançado

#### Mensagens de Erro Melhoradas
- **Segmentation Fault**: Mostra endereço, offset e alocação mais próxima
- **Array Out of Bounds**: Indica limites válidos e explica indexação em C
- **Null Pointer Dereference**: Alerta sobre ponteiros não inicializados
- **Variável Não Declarada**: Sugere variáveis similares usando distância Levenshtein
- **Stack Overflow**: Mostra últimas 5 chamadas da pilha
- **Erro de Constante**: Explica imutabilidade de `const`

#### Highlighters de Linha
- 🟢 Verde: Linha que será executada próxima
- 🔴 Vermelho: Linha recém executada

## 📋 Recursos Suportados

### Tipos de Dados
- `int`, `char`, `void`, `float`, `double`
- `short`, `long`, `unsigned`, `signed`
- `_Bool` (C99)
- Ponteiros (`*`)
- Arrays multidimensionais
- Modificadores: `const`, `static`, `extern`, `volatile`

### Operadores
- Aritméticos: `+`, `-`, `*`, `/`
- Comparação: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Lógicos: `&&`, `||`, `!`
- Atribuição: `=`, `+=`, `-=`, `*=`, `/=`
- Incremento/Decremento: `++`, `--`
- Ponteiros: `&`, `*`
- Especial: `sizeof`

### Controle de Fluxo
- `if` / `else`
- `while`
- `do-while`
- `for`
- `break`
- `continue`
- `return`

### Funções
- Declaração e definição
- Parâmetros e argumentos
- Recursão com limite de profundidade
- Built-ins: `printf`, `malloc`, `free`

## 🚀 Como Usar

1. **Escrever Código**: Digite ou cole código C no editor
2. **Preparar**: Clique em "Preparar Execução" (Ctrl+Enter)
3. **Executar**:
   - Use setas ←→ para navegar passo a passo
   - Use Espaço para play/pause automático
   - Ajuste velocidade com o slider
4. **Observar Variáveis**: Clique direito em qualquer variável na memória
5. **Analisar**: Veja memória, variáveis e saída em tempo real

## 📚 Exemplo de Código

```c
#include <stdio.h>
#define PI 3.14

int fatorial(int n) {
    if (n <= 1) return 1;
    return n * fatorial(n - 1);
}

int main() {
    int matriz[2][3];
    matriz[0][0] = 10;
    matriz[1][2] = 99;

    int result = fatorial(5);
    printf("Fatorial de 5 = %d\n", result);

    float circulo = PI;
    printf("Valor de PI: %.2f\n", circulo);

    return 0;
}
```

## 🎓 Casos de Uso Educacionais

### 1. Ensino de Ponteiros
Visualize como ponteiros apontam para endereços de memória reais

### 2. Arrays Multidimensionais
Veja o layout linear de matrizes na memória

### 3. Recursão
Acompanhe a pilha de chamadas crescendo e encolhendo

### 4. Memory Leaks
Identifique memória alocada mas não liberada

### 5. Stack vs Heap
Entenda a diferença entre alocação automática e manual

### 6. AST Visualization
Entenda como o parser converte código em estrutura de dados
- Veja a hierarquia de nós (Program → FunctionDeclaration → IfStatement, etc.)
- Acompanhe qual nó está sendo executado em tempo real
- Exporte a AST para análise externa

## 🔧 Arquitetura Técnica

### Preprocessor (`preprocessor.js`)
- Expande macros
- Remove código condicional
- Processa includes (mock)

### Lexer (`lexer.js`)
- Tokenização com suporte a:
  - Keywords, identificadores, números (int/float)
  - Strings, caracteres (com conversão ASCII)
  - Operadores simples e compostos
  - Comentários

### Parser (`parser.js`)
- Parser recursivo descendente
- Geração de AST com 20+ tipos de nós
- Suporte a precedência de operadores
- Type casting e sizeof

### Interpreter (`interpreter.js`)
- Interpretador baseado em generator (yield)
- Memory Manager com três segmentos
- Environment para escopo de variáveis
- Type System para conversões e tamanhos

### UI Controller (`ui-controller.js`)
- Gerenciamento de estado de execução
- Syntax highlighting
- Watch panel
- Auto-play com velocidade ajustável

## 📈 Melhorias Implementadas

✅ **Documentação Completa** - JSDoc em todas as classes
✅ **Mensagens de Erro Contextuais** - Erros informativos com dicas
✅ **Suporte a Recursão** - Stack overflow detection
✅ **Syntax Highlighting** - Tema dark moderno
✅ **Painel de Variáveis** - Watch panel interativo
✅ **Auto-Play** - Execução automática com controle de velocidade
✅ **Visualizador de AST** - Árvore sintática interativa com highlight sincronizado

## 🛠️ Próximos Passos Sugeridos

### Prioridade Alta
- [ ] Switch/Case statements
- [ ] Bitwise operators (&, |, ^, ~, <<, >>)
- [ ] Ternary operator (? :)
- [ ] String functions (strcpy, strlen, strcmp)

### Prioridade Média
- [ ] Structs
- [ ] Unions
- [ ] Enums
- [ ] Typedef
- [ ] File I/O simulation

### Prioridade Baixa
- [ ] Breakpoints
- [ ] Conditional breakpoints
- [ ] Export execution trace
- [ ] Dark/light theme toggle
- [ ] Multi-file projects

## 📝 Notas Técnicas

### Limitações
- Não suporta todas as features do C11
- Ponteiros para funções não implementados
- Sem suporte a bibliotecas externas (além de stdio.h mock)
- Sem otimização de código

### Performance
- Recomendado para programas educacionais pequenos
- Limite de 1000 chamadas recursivas
- Memória simulada limitada

## 🤝 Contribuindo

Este é um projeto educacional. Contribuições são bem-vindas!

## 📄 Licença

Projeto educacional desenvolvido para o IFSC.

## 👨‍💻 Autor

Desenvolvido como ferramenta de apoio ao ensino de programação em C.

---

**IFSCee** - Tornando a programação em C visual e compreensível! 🚀
