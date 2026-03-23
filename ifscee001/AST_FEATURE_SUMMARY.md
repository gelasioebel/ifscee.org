# AST Visualizer - Feature Summary

## 🎉 Nova Funcionalidade Implementada

O **IFSCee** agora inclui um visualizador de Abstract Syntax Tree (AST) totalmente interativo e sincronizado com a execução do código!

## ✨ Funcionalidades Principais

### 1. Visualização Hierárquica da AST
- Árvore completa do código parseado
- Representação visual de todos os nós (Program, FunctionDeclaration, IfStatement, etc.)
- Estrutura aninhada mostrando relações pai-filho

### 2. Navegação Interativa
- **Expand/Collapse**: Clique em qualquer nó para expandir/colapsar
- **Expandir Tudo**: Botão para abrir toda a árvore de uma vez
- **Colapsar Tudo**: Botão para fechar todos os nós
- **Símbolos Visuais**:
  - `▼` = Nó expandido
  - `▶` = Nó colapsado
  - `◦` = Nó folha (sem filhos)

### 3. Sincronização com Execução
- **Highlighting em Tempo Real**: Nós sendo executados são destacados em verde
- **Auto-Expand**: Caminho até o nó atual é automaticamente expandido
- **Auto-Scroll**: Vista ajusta para manter o nó atual visível
- **Line Tracking**: Cada nó mostra o número da linha correspondente no código

### 4. Export/Import
- **Export JSON**: Baixe a AST completa em formato JSON
- **Formato Estruturado**: JSON formatado e indentado para fácil leitura
- **Uso Externo**: Integre com outras ferramentas de análise

### 5. Detalhes Informativos
Cada nó mostra informações relevantes:
- **Tipo do Nó**: FunctionDeclaration, IfStatement, BinaryExpression, etc.
- **Nome**: Para funções, variáveis, identificadores
- **Operador**: Para expressões binárias e unárias (+, -, *, &, etc.)
- **Valor**: Para literais (números, strings)
- **Tipo de Dados**: Para declarações (int, char*, float, etc.)
- **Linha**: Número da linha no código fonte

### 6. Cores Semânticas
- 🔵 **Azul**: Tipo do nó (FunctionDeclaration, etc.)
- 🟢 **Verde**: Propriedades (name, operator, returnType, etc.)
- 🔴 **Vermelho**: Valores (42, "string", true, etc.)
- ⚫ **Cinza**: Metadados (número de linha)
- 🟩 **Verde claro**: Nó em execução

## 🎯 Como Usar

### Passo 1: Preparar
```
1. Digite ou cole código C no editor
2. Clique em "Preparar Execução" (Ctrl+Enter)
```

### Passo 2: Mostrar AST
```
3. Clique no botão "🌳 AST" no topo
4. O painel de AST aparecerá à direita
```

### Passo 3: Explorar
```
5. Clique nos nós para expandir/colapsar
6. Use "Expandir Tudo" / "Colapsar Tudo" conforme necessário
7. Examine as propriedades de cada nó
```

### Passo 4: Acompanhar Execução
```
8. Use as setas (← →) ou Play para executar
9. Observe os nós sendo destacados em verde
10. A árvore se expande automaticamente para mostrar o nó atual
```

### Passo 5: Exportar (Opcional)
```
11. Clique em "📥 Export AST" acima do editor
12. O arquivo 'ast.json' será baixado
```

## 📊 Tipos de Nós Suportados

### Estrutura do Programa
- **Program**: Raiz da árvore
- **FunctionDeclaration**: Declaração de função

### Declarações
- **VariableDeclaration**: `int x = 10;`
- **ArrayDeclaration**: `int arr[5];`

### Expressões
- **BinaryExpression**: `a + b`, `x * y`
- **UnaryExpression**: `*ptr`, `&x`, `++i`, `!flag`
- **AssignmentExpression**: `x = 10`, `y += 5`
- **CallExpression**: `printf(...)`, `function(...)`
- **IndexExpression**: `arr[0]`, `matrix[i][j]`

### Controle de Fluxo
- **IfStatement**: `if (x > 0) { ... }`
- **WhileStatement**: `while (i < 10) { ... }`
- **DoWhileStatement**: `do { ... } while (cond);`
- **ForStatement**: `for (int i = 0; i < 10; i++) { ... }`
- **BreakStatement**: `break;`
- **ContinueStatement**: `continue;`
- **ReturnStatement**: `return x;`

### Primitivos
- **Literal**: `42`, `3.14`, `"string"`
- **Identifier**: `x`, `main`, `contador`
- **TypeName**: Para `sizeof(int)`

## 🎓 Casos de Uso Educacionais

### 1. Ensino de Compiladores
"Como o compilador vê meu código?"
- Mostre visualmente a conversão de texto para estrutura de dados
- Explique o processo de parsing
- Compare código similar com ASTs diferentes

### 2. Precedência de Operadores
"Por que `2 + 3 * 4` resulta em 14 e não 20?"
- Mostre a AST: multiplicação é filho do operador de adição
- Compare com `(2 + 3) * 4` onde a adição vira filho da multiplicação
- Demonstre como parênteses alteram a estrutura

### 3. Análise de Expressões Complexas
"O que acontece em `arr[i++] = x * 2 + y`?"
- Quebre a expressão em sub-árvores
- Mostre a ordem de avaliação
- Identifique operadores e operandos

### 4. Recursão
"Como a recursão funciona na AST?"
- Mostre que `fatorial(n-1)` aparece como CallExpression dentro de `fatorial`
- Demonstre a auto-referência na estrutura
- Explique como o interpretador trata chamadas recursivas

### 5. Refactoring
"Essas duas versões do código são equivalentes?"
- Compare ASTs de código refatorado
- Identifique mudanças estruturais vs mudanças cosméticas
- Verifique se a lógica se mantém

## 💻 Exemplo Prático

### Código
```c
int main() {
    int x = 10 + 20;
    if (x > 25) {
        printf("Grande!");
    }
    return 0;
}
```

### AST Visualizada
```
🌳 Program AST
  └─ ▼ FunctionDeclaration "main" returns: int line 1
      ├─ returnType: "int"
      ├─ name: "main"
      ├─ params: []
      └─ body:
          ├─ ▼ VariableDeclaration "x" type: int line 2
          │   ├─ varType: "int"
          │   ├─ name: "x"
          │   └─ initExpression:
          │       └─ ▼ BinaryExpression op: + line 2
          │           ├─ left: ◦ Literal = 10
          │           ├─ operator: "+"
          │           └─ right: ◦ Literal = 20
          ├─ ▼ IfStatement line 3
          │   ├─ condition:
          │   │   └─ ▼ BinaryExpression op: > line 3
          │   │       ├─ left: ◦ Identifier "x"
          │   │       ├─ operator: ">"
          │   │       └─ right: ◦ Literal = 25
          │   └─ consequent:
          │       └─ ▼ CallExpression line 4
          │           ├─ callee: ◦ Identifier "printf"
          │           └─ arguments:
          │               └─ ◦ Literal = "Grande!"
          └─ ▼ ReturnStatement line 6
              └─ argument: ◦ Literal = 0
```

## 🔧 Detalhes de Implementação

### Arquitetura
- **Renderização Recursiva**: `createASTNode()` constrói a árvore recursivamente
- **DOM Manipulation**: Cada nó é um conjunto de elementos HTML
- **Event Listeners**: Cliques em headers para expand/collapse
- **Sincronização**: `highlightASTNode()` chamado em cada passo de execução

### Performance
- **Lazy Rendering**: Apenas nós expandidos renderizam filhos
- **Event Delegation**: Eventos gerenciados eficientemente
- **Scroll Inteligente**: Apenas scroll quando necessário

### Compatibilidade
- Funciona em todos os navegadores modernos
- Não requer bibliotecas externas
- JavaScript puro (Vanilla JS)

## 📝 Formato de Export

O arquivo JSON exportado tem esta estrutura:

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
            "type": "BinaryExpression",
            "left": { "type": "Literal", "value": 10, "line": 2 },
            "operator": "+",
            "right": { "type": "Literal", "value": 20, "line": 2 },
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

## 🎨 Interface Visual

### Botões de Controle
- **🌳 AST / Ocultar AST**: Toggle do painel (header)
- **📥 Export AST**: Exportar JSON (acima do editor)
- **Expandir Tudo**: Abre todos os nós (painel AST)
- **Colapsar Tudo**: Fecha todos os nós (painel AST)

### Painel de AST
- Ocupa ~40% da largura da coluna direita quando visível
- Scroll vertical e horizontal
- Fundo claro (#fafafa) para contraste com nós
- Borda esquerda tracejada para hierarquia visual

## 🐛 Troubleshooting

### AST não aparece
- ✓ Certifique-se de clicar "Preparar Execução" primeiro
- ✓ Clique no botão "🌳 AST"

### Muitos nós, difícil de navegar
- ✓ Use "Colapsar Tudo" e expanda só o necessário
- ✓ Comece com código simples

### Nó não destaca durante execução
- ✓ Painel de AST deve estar visível
- ✓ Nem todo passo tem nó correspondente

### Export não funciona
- ✓ Verifique permissões de download do navegador
- ✓ Arquivo salvo como `ast.json` na pasta de downloads

## 📊 Estatísticas

- **Linhas de Código**: ~150 linhas adicionadas ao `ui-controller.js`
- **Estilos CSS**: ~15 novas classes
- **Funções Principais**: 4 (`renderAST`, `createASTNode`, `hasASTChildren`, `getNodeDetails`)
- **Event Listeners**: 3 (toggle, export, expand/collapse)
- **Dependências**: 0 (JavaScript puro)

## 🚀 Próximas Melhorias Possíveis

### Curto Prazo
- [ ] Filtro de tipos de nós (mostrar apenas IfStatements, etc.)
- [ ] Busca na AST por nome de variável/função
- [ ] Copy node path (ex: `body[0].body[1].condition`)

### Médio Prazo
- [ ] Diff de ASTs (comparar duas versões)
- [ ] Visualização em grafo (alternativa à árvore)
- [ ] Estatísticas da AST (profundidade, número de nós, etc.)

### Longo Prazo
- [ ] Editor de AST (modificar e regenerar código)
- [ ] Import de AST externa
- [ ] Plugins para outras linguagens

## 📚 Recursos Adicionais

- **AST_GUIDE.md**: Guia completo de uso do visualizador
- **README.md**: Documentação geral do projeto
- **CHANGELOG.md**: Histórico de mudanças

## 🎯 Conclusão

O Visualizador de AST transforma o IFSCee de um simples interpretador em uma ferramenta educacional completa para ensino de:
- Parsing e análise sintática
- Estruturas de dados em compiladores
- Precedência de operadores
- Análise de código

Esta funcionalidade torna visível o que antes era invisível, ajudando estudantes a entender profundamente como o código C é estruturado internamente.

---

**IFSCee v2.1** - Agora com visualização completa de AST! 🌳
