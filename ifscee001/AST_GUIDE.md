# Guia do Visualizador de AST

## 🌳 O que é uma AST?

Uma **Abstract Syntax Tree (Árvore de Sintaxe Abstrata)** é uma representação em árvore da estrutura sintática do código fonte. Cada nó da árvore denota uma construção que ocorre no código.

## 🎯 Por que visualizar a AST?

### Para Estudantes
- **Entender Parsing**: Ver como o compilador interpreta seu código
- **Aprender Estruturas**: Identificar a hierarquia de declarações e expressões
- **Debug Conceptual**: Verificar se o código está sendo parseado como esperado

### Para Professores
- **Ensinar Compiladores**: Demonstrar visualmente o processo de parsing
- **Explicar Precedência**: Mostrar como operadores são agrupados
- **Comparar Linguagens**: Diferenças na representação de construções similares

## 🚀 Como Usar

### 1. Preparar o Código
```c
int main() {
    int x = 10 + 20;
    return x;
}
```

### 2. Ativar o Visualizador
1. Clique em **"Preparar Execução"** (Ctrl+Enter)
2. Clique no botão **"🌳 AST"** para mostrar o painel
3. A árvore será renderizada automaticamente

### 3. Navegar na Árvore
- **Clique nos nós** para expandir/colapsar
- **"Expandir Tudo"**: Abre toda a árvore
- **"Colapsar Tudo"**: Fecha todos os nós
- **Scroll**: Navegue pela estrutura completa

### 4. Acompanhar a Execução
- Durante a execução passo a passo, os nós correspondentes são **destacados em verde**
- A árvore **auto-expande** para mostrar o nó em execução
- **Scroll automático** mantém o nó atual visível

### 5. Exportar
- Clique em **"📥 Export AST"** para baixar a árvore em formato JSON
- Útil para análise externa, documentação ou debugging avançado

## 📊 Estrutura de Nós

### Program (Raiz)
O nó raiz que contém todo o programa.
```
🌳 Program AST
  └─ body: [array de FunctionDeclaration]
```

### FunctionDeclaration
Declaração de uma função.
```
▼ FunctionDeclaration "main" returns: int line 1
  ├─ returnType: "int"
  ├─ name: "main"
  ├─ params: []
  └─ body: [array de Statements]
```

### VariableDeclaration
Declaração de variável.
```
▼ VariableDeclaration "x" type: int line 2
  ├─ varType: "int"
  ├─ name: "x"
  └─ initExpression: BinaryExpression
```

### BinaryExpression
Operação binária (ex: `10 + 20`).
```
▼ BinaryExpression op: + line 2
  ├─ left: Literal = 10
  ├─ operator: "+"
  └─ right: Literal = 20
```

### CallExpression
Chamada de função (ex: `printf(...)`).
```
▼ CallExpression line 3
  ├─ callee: Identifier "printf"
  └─ arguments: [array de expressions]
```

### IfStatement
Condicional if/else.
```
▼ IfStatement line 4
  ├─ condition: BinaryExpression
  ├─ consequent: [array de statements]
  └─ alternate: [array de statements] (opcional)
```

### WhileStatement
Loop while.
```
▼ WhileStatement line 5
  ├─ condition: BinaryExpression
  └─ body: [array de statements]
```

### ForStatement
Loop for.
```
▼ ForStatement line 6
  ├─ init: VariableDeclaration (opcional)
  ├─ condition: BinaryExpression (opcional)
  ├─ increment: AssignmentExpression (opcional)
  └─ body: [array de statements]
```

### AssignmentExpression
Atribuição de valor (ex: `x = 10`).
```
▼ AssignmentExpression op: = line 7
  ├─ left: Identifier "x"
  ├─ operator: "="
  └─ right: Literal = 10
```

### IndexExpression
Acesso a array (ex: `arr[0]`).
```
▼ IndexExpression line 8
  ├─ arrayObject: Identifier "arr"
  └─ indexExpressions: [Literal = 0]
```

### UnaryExpression
Operação unária (ex: `*ptr`, `&x`, `++i`).
```
▼ UnaryExpression op: * line 9
  ├─ operator: "*"
  └─ argument: Identifier "ptr"
```

### ReturnStatement
Retorno de função.
```
▼ ReturnStatement line 10
  └─ argument: Identifier "x"
```

### Literal
Valor literal (número, string).
```
◦ Literal = 42 line 2
```

### Identifier
Nome de variável ou função.
```
◦ Identifier "x" line 3
```

## 💡 Exemplos Práticos

### Exemplo 1: Expressão Matemática
```c
int x = (10 + 20) * 3;
```

**AST Resultante:**
```
▼ VariableDeclaration "x"
  └─ initExpression:
      ▼ BinaryExpression op: *
        ├─ left:
        │   ▼ BinaryExpression op: +
        │     ├─ left: Literal = 10
        │     └─ right: Literal = 20
        └─ right: Literal = 3
```

**Lição**: Os parênteses criam uma sub-árvore, mostrando precedência de operadores.

### Exemplo 2: Condicional Aninhada
```c
if (x > 0) {
    if (x < 10) {
        printf("Entre 0 e 10");
    }
}
```

**AST Resultante:**
```
▼ IfStatement
  ├─ condition: BinaryExpression (x > 0)
  └─ consequent:
      └─ IfStatement (aninhado)
          ├─ condition: BinaryExpression (x < 10)
          └─ consequent:
              └─ CallExpression "printf"
```

**Lição**: If's aninhados aparecem como nós filhos dentro do consequent.

### Exemplo 3: Recursão
```c
int fatorial(int n) {
    if (n <= 1) return 1;
    return n * fatorial(n - 1);
}
```

**AST Resultante:**
```
▼ FunctionDeclaration "fatorial"
  └─ body:
      ├─ IfStatement
      │   ├─ condition: BinaryExpression (n <= 1)
      │   └─ consequent: ReturnStatement = 1
      └─ ReturnStatement
          └─ BinaryExpression op: *
              ├─ left: Identifier "n"
              └─ right: CallExpression "fatorial" (recursivo!)
```

**Lição**: A chamada recursiva aparece como um CallExpression dentro da própria função.

### Exemplo 4: Array Multidimensional
```c
int matriz[2][3];
matriz[0][1] = 5;
```

**AST Resultante:**
```
▼ ArrayDeclaration "matriz"
  ├─ varType: "int"
  └─ sizeExpressions: [Literal = 2, Literal = 3]

▼ AssignmentExpression
  ├─ left:
  │   ▼ IndexExpression
  │     ├─ arrayObject: Identifier "matriz"
  │     └─ indexExpressions: [Literal = 0, Literal = 1]
  └─ right: Literal = 5
```

**Lição**: Arrays multidimensionais têm múltiplas expressões de índice.

## 🎓 Casos de Uso Educacionais

### 1. Ensinar Precedência de Operadores
Compare estas ASTs:
- `2 + 3 * 4` → Multiplicação é filho direito da adição
- `(2 + 3) * 4` → Adição é filho esquerdo da multiplicação

### 2. Explicar Short-Circuit Evaluation
```c
if (x != 0 && 10 / x > 1)
```
A AST mostra o operador `&&` com dois filhos, preparando para explicar que o segundo só é avaliado se o primeiro for true.

### 3. Demonstrar Diferenças Sintáticas
Compare ASTs de `for` vs `while`:
```c
for (int i = 0; i < 10; i++) { }
// vs
int i = 0;
while (i < 10) { i++; }
```

### 4. Analisar Refactoring
Antes e depois de refatorar código, compare as ASTs para ver se a estrutura lógica se manteve.

### 5. Debug de Parser Errors
Se o código não compila, a AST parcial pode mostrar onde o parser "travou".

## 🔍 Recursos Avançados

### JSON Export
O arquivo exportado tem esta estrutura:
```json
{
  "type": "Program",
  "body": [
    {
      "type": "FunctionDeclaration",
      "returnType": "int",
      "name": "main",
      "params": [],
      "body": [
        {
          "type": "VariableDeclaration",
          "varType": "int",
          "name": "x",
          "initExpression": {
            "type": "Literal",
            "value": 10,
            "line": 2
          },
          "line": 2
        }
      ],
      "line": 1
    }
  ],
  "line": 1
}
```

Use este JSON para:
- Análise programática
- Testes automatizados
- Geração de documentação
- Comparação de versões

### Sincronização com Execução
Durante a execução:
1. **Verde** = Nó em execução atual
2. **Auto-expand** = Caminho até o nó é revelado
3. **Scroll** = Vista ajusta para mostrar o nó

### Cores e Símbolos
- **▶ / ▼**: Nó colapsado / expandido
- **◦**: Nó folha (sem filhos)
- **Azul**: Tipo do nó (FunctionDeclaration, etc.)
- **Verde**: Propriedades (name, operator, etc.)
- **Vermelho**: Valores (42, "texto", etc.)
- **Cinza**: Número da linha

## 🐛 Troubleshooting

### A AST não aparece
✓ Certifique-se de clicar em "Preparar Execução" primeiro
✓ Clique no botão "🌳 AST" para mostrar o painel

### Muitos nós, árvore confusa
✓ Use "Colapsar Tudo" e expanda apenas o que precisa
✓ Comece com código simples para aprender

### Nó não destaca durante execução
✓ Verifique se o painel de AST está visível
✓ Nem todos os passos têm nó correspondente (ex: atualizações de memória)

### Export não funciona
✓ Verifique se o navegador permite downloads
✓ O arquivo será salvo como `ast.json`

## 📚 Referências

- [AST Explorer](https://astexplorer.net/) - Ferramenta online para explorar ASTs
- [Compiler Design](https://en.wikipedia.org/wiki/Abstract_syntax_tree) - Artigo Wikipedia sobre AST
- [LLVM](https://llvm.org/) - Infraestrutura de compiladores com AST

## 🎯 Próximos Passos

Depois de dominar a visualização de AST:
1. Explore como diferentes construções geram diferentes árvores
2. Compare ASTs de código equivalente mas escrito diferentemente
3. Use o export para criar ferramentas de análise customizadas
4. Entenda como otimizações de compilador transformam a AST

---

**Happy Parsing!** 🌳 A visualização de AST torna o invisível visível, revelando a verdadeira estrutura do seu código C.
