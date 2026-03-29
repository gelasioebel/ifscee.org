# Correção: Navegação para Trás (Backward Navigation)

## 🐛 Problema

Quando o usuário voltava um passo na execução (usando o botão "Anterior" ou seta ←), as variáveis criadas naquele passo **não eram removidas** da memória. Isso causava:

1. **Variáveis fantasma**: Variáveis que não deveriam existir ainda permaneciam visíveis
2. **Estado inconsistente**: A memória não correspondia à linha de execução atual
3. **Confusão educacional**: Estudantes não entendiam o fluxo real de alocação de memória

### Exemplo do Bug

```c
int main() {
    int x = 10;  // Linha 2
    int y = 20;  // Linha 3
    return 0;
}
```

**Comportamento Errado:**
1. Executar até linha 3 → Memória: `x=10, y=20`
2. Voltar para linha 2 → Memória: `x=10, y=20` ❌ (y ainda existe!)
3. Estudante fica confuso sobre quando `y` é criada

**Comportamento Esperado:**
1. Executar até linha 3 → Memória: `x=10, y=20`
2. Voltar para linha 2 → Memória: `x=10` ✓ (y foi removida!)
3. Estudante entende claramente o fluxo

## ✅ Solução

Implementamos um **sistema de snapshots de memória** que captura o estado completo da RAM antes de cada passo de execução.

### Arquitetura da Solução

#### 1. Classe `MemoryManager` - Novos Métodos

```javascript
/**
 * Create a deep snapshot of the current memory state
 * @returns {Object} Snapshot containing all memory state
 */
createSnapshot() {
    return {
        ram: new Map(this.ram),
        stackPointer: this.stackPointer,
        heapPointer: this.heapPointer,
        rodataPointer: this.rodataPointer,
        allocations: new Map(
            Array.from(this.allocations.entries()).map(([addr, meta]) => [
                addr,
                { ...meta, dimensions: meta.dimensions ? [...meta.dimensions] : undefined }
            ])
        )
    };
}

/**
 * Restore memory state from a snapshot
 * @param {Object} snapshot - The snapshot to restore
 */
restoreSnapshot(snapshot) {
    this.ram = new Map(snapshot.ram);
    this.stackPointer = snapshot.stackPointer;
    this.heapPointer = snapshot.heapPointer;
    this.rodataPointer = snapshot.rodataPointer;
    this.allocations = new Map(
        Array.from(snapshot.allocations.entries()).map(([addr, meta]) => [
            addr,
            { ...meta, dimensions: meta.dimensions ? [...meta.dimensions] : undefined }
        ])
    );
}
```

**O que é capturado no snapshot:**
- ✅ Conteúdo da RAM (`ram: Map`)
- ✅ Ponteiros de memória (`stackPointer`, `heapPointer`, `rodataPointer`)
- ✅ Metadados de alocações (`allocations: Map`)
- ✅ Dimensões de arrays (deep copy)
- ✅ Estado ativo/inativo de cada alocação

#### 2. Interpretador - Criação de Snapshots

Modificamos o método `*visit()` para criar um snapshot **ANTES** de executar cada passo:

```javascript
*visit(node, env) {
    const stepNodes = ['VariableDeclaration', 'ArrayDeclaration', 'AssignmentExpression', ...];
    if (stepNodes.includes(node.type)) {
        // Create snapshot BEFORE executing the step
        const memorySnapshot = this.memory.createSnapshot();
        yield {
            type: 'STEP',
            nextLine: node.line,
            previousLine: this.lastLine,
            memory: this.memory,
            memorySnapshot  // ← Snapshot adicionado aqui!
        };
        this.lastLine = node.line;
    }
    // ... resto do código
}
```

**Também adicionado em:**
- `visitVariableDeclaration()` → Após criar variável
- `visitArrayDeclaration()` → Após alocar array
- `visitAssignment()` → Após atribuir valor
- `visitUnary()` (++/--) → Após incrementar/decrementar

#### 3. UI Controller - Restauração de Estado

Modificamos `applyState()` para restaurar snapshots ao navegar:

```javascript
function applyState(state) {
    // Rebuild output from history when going backwards
    if (currentStepIndex >= 0) {
        rebuildOutput();
    }

    // ... código para tratar erros e prints

    // Restore memory snapshot if available
    if (state.memorySnapshot) {
        state.memory.restoreSnapshot(state.memorySnapshot);
    }

    if (state.memory) {
        renderMemory(state.memory);
        updateWatchPanel(state.memory);
    }

    // ... resto do código
}
```

#### 4. Reconstrução de Output

Adicionamos `rebuildOutput()` para reconstruir o terminal ao voltar:

```javascript
function rebuildOutput() {
    outputPanel.innerHTML = '<em>Sistema pronto. Clique em "Próximo".</em>';

    for (let i = 0; i <= currentStepIndex; i++) {
        const step = history[i];
        if (step.type === 'TERMINAL_PRINT') {
            outputPanel.innerHTML += `<div>> ${step.output}</div>`;
        } else if (step.type === 'ERROR') {
            outputPanel.innerHTML += `<br><span style="color: #ff5252;">${step.message}</span>`;
        } else if (step.type === 'PROGRAM_END') {
            outputPanel.innerHTML += `<br><strong style="color: #4caf50;">Fim do programa (Cód: ${step.exitCode})</strong>`;
        }
    }
}
```

## 🔍 Deep Dive: Como Funciona

### Fluxo de Execução (Forward)

```
1. Usuário clica "Próximo" →
2. Interpretador cria snapshot ANTES do passo →
3. Interpretador executa o passo (ex: cria variável x) →
4. yield retorna { type: 'STEP', memory, memorySnapshot } →
5. UI renderiza nova memória →
6. História guarda o state completo
```

### Fluxo de Navegação (Backward)

```
1. Usuário clica "Anterior" →
2. currentStepIndex-- →
3. applyState(history[currentStepIndex]) →
4. state.memory.restoreSnapshot(state.memorySnapshot) →
5. Memória volta ao estado ANTES do passo →
6. UI re-renderiza memória restaurada
```

### Diagrama Visual

```
Passo 0: int x = 10;
┌─────────────────────┐
│ Snapshot: {}        │ ← Estado ANTES do passo
├─────────────────────┤
│ Executa: x = 10     │
├─────────────────────┤
│ Estado: {x: 10}     │ ← Estado DEPOIS do passo
└─────────────────────┘

Passo 1: int y = 20;
┌─────────────────────┐
│ Snapshot: {x: 10}   │ ← Guarda estado anterior
├─────────────────────┤
│ Executa: y = 20     │
├─────────────────────┤
│ Estado: {x:10, y:20}│
└─────────────────────┘

Voltar para Passo 0:
┌─────────────────────┐
│ Restaura Snapshot   │ → state.memory.restoreSnapshot()
│ {x: 10}             │
├─────────────────────┤
│ y foi removida! ✓   │
└─────────────────────┘
```

## 📊 Estrutura de Dados

### Objeto State no Histórico

```javascript
{
    type: 'STEP',
    nextLine: 3,
    previousLine: 2,
    memory: MemoryManager {
        ram: Map {...},
        stackPointer: 1004,
        allocations: Map {...}
    },
    memorySnapshot: {  // ← Novo campo!
        ram: Map {...},
        stackPointer: 1000,
        heapPointer: 5000,
        rodataPointer: 10000,
        allocations: Map {...}
    }
}
```

### Deep Copy Considerations

**Por que precisamos de deep copy?**

```javascript
// ❌ Shallow copy (ERRADO)
allocations: this.allocations  // Apenas referência

// ✓ Deep copy (CORRETO)
allocations: new Map(
    Array.from(this.allocations.entries()).map(([addr, meta]) => [
        addr,
        { ...meta, dimensions: meta.dimensions ? [...meta.dimensions] : undefined }
    ])
)
```

Se usássemos shallow copy, modificações futuras afetariam snapshots antigos!

## ✅ Testes e Validação

### Cenário 1: Variáveis Simples
```c
int x = 10;
int y = 20;
```
- ✓ Voltar remove `y` corretamente
- ✓ Avançar recria `y` com valor correto

### Cenário 2: Arrays
```c
int arr[5];
arr[0] = 100;
arr[1] = 200;
```
- ✓ Voltar remove alocação do array
- ✓ Voltar desfaz atribuições individuais

### Cenário 3: Ponteiros e Heap
```c
int *ptr = malloc(10);
*ptr = 42;
free(ptr);
```
- ✓ Voltar desfaz `free`
- ✓ Voltar desfaz atribuição `*ptr = 42`
- ✓ Voltar remove alocação do malloc

### Cenário 4: Terminal Output
```c
printf("A");
printf("B");
printf("C");
```
- ✓ Voltar remove prints do terminal
- ✓ Terminal mostra apenas outputs até o passo atual

## 🚀 Impacto Educacional

### Antes da Correção
- ❌ Estudantes não entendiam quando variáveis eram criadas
- ❌ Impossível demonstrar escopo de variáveis
- ❌ Memória "acumulava" lixo ao navegar

### Depois da Correção
- ✅ Estudantes veem claramente a criação/destruição de variáveis
- ✅ Possível demonstrar escopo (variáveis aparecem e desaparecem)
- ✅ Memória sempre consistente com a linha atual
- ✅ Ferramenta confiável para ensino de gestão de memória

## 📝 Limitações e Considerações

### Performance
- **Overhead de Memória**: Cada passo guarda um snapshot completo
- **Solução**: Para programas grandes, considerar snapshots incrementais
- **Atual**: Aceitável para programas educacionais (< 1000 variáveis)

### Estados Não Capturados
- ✅ RAM
- ✅ Alocações
- ✅ Ponteiros de memória
- ❌ Call stack do interpretador (não necessário, pois apenas navega no history)
- ❌ Estado do gerador (impossível, mas contornado com history)

### Edge Cases Testados
- ✓ Voltar para início (índice 0)
- ✓ Voltar depois de erro
- ✓ Voltar depois de PROGRAM_END
- ✓ Voltar/avançar múltiplas vezes
- ✓ Auto-play com pausas e voltar

## 🔧 Código Modificado

### Arquivos Alterados

1. **interpreter.js** (~50 linhas)
   - `MemoryManager.createSnapshot()`
   - `MemoryManager.restoreSnapshot()`
   - Snapshots em todos os yields relevantes

2. **ui-controller.js** (~30 linhas)
   - Modificação de `applyState()`
   - Nova função `rebuildOutput()`
   - Limpeza de navegação

### Commits Sugeridos

```bash
git add interpreter.js ui-controller.js
git commit -m "Fix: Implement memory snapshots for backward navigation

- Add MemoryManager.createSnapshot() and restoreSnapshot()
- Create snapshot before each execution step
- Restore snapshot when navigating backward
- Rebuild terminal output from history
- Fixes issue where variables weren't removed when going back

This ensures memory state is always consistent with current execution line,
making the tool more reliable for educational purposes."
```

## 📚 Referências

- **Memento Pattern**: Design pattern usado (snapshot/restore)
- **Time Travel Debugging**: Conceito similar ao Redux DevTools
- **Deterministic Replay**: Garantir reprodutibilidade de estados

## 🎯 Conclusão

A implementação de snapshots de memória resolve completamente o problema de navegação para trás, tornando o IFSCee uma ferramenta educacional confiável e intuitiva. Estudantes agora podem:

1. **Explorar livremente** o código sem medo de estados inconsistentes
2. **Entender temporalidade** de alocações de memória
3. **Experimentar** diferentes caminhos de execução
4. **Confiar** que o visualizador mostra o estado correto

---

**Bugfix implementado em**: 2026-03-01
**Versão**: 2.1.1
**Status**: ✅ Resolvido e testado
