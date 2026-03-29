const btnPrepare = document.getElementById('btn-prepare');
const btnEdit = document.getElementById('btn-edit');
const [btnFirst, btnPrev, btnPlay, btnNext, btnLast] = ['btn-first', 'btn-prev', 'btn-play', 'btn-next', 'btn-last'].map(id => document.getElementById(id));
const btnToggleAST = document.getElementById('btn-toggle-ast');
const btnExportAST = document.getElementById('btn-export-ast');
const btnExpandAll = document.getElementById('btn-expand-all');
const btnCollapseAll = document.getElementById('btn-collapse-all');
const speedControl = document.getElementById('speed-control');
const speedDisplay = document.getElementById('speed-display');
const examplesDropdown = document.getElementById('examples-dropdown');
const codeEditor = document.getElementById('code-editor');
const executionView = document.getElementById('code-execution-view');
const memoryVisualizer = document.getElementById('memory-visualizer');
const watchPanel = document.getElementById('watch-panel');
const outputPanel = document.getElementById('output-panel');
const astPanel = document.getElementById('ast-panel');
const astVisualizer = document.getElementById('ast-visualizer');

let executionEngine = null; let history = []; let currentStepIndex = -1;
let watchedVariables = new Set(); // Track which variables to watch
let autoPlayInterval = null; // Auto-play timer
let playSpeed = 5; // Default speed (1-10 scale)
let parsedAST = null; // Store the AST
let astVisible = false; // Track AST panel visibility

/**
 * Syntax highlighting for C code
 * @param {string} code - The C source code to highlight
 * @returns {string} HTML with syntax highlighting
 */
function highlightSyntax(code) {
    const keywords = ['if', 'else', 'while', 'for', 'do', 'break', 'continue', 'return', 'sizeof', 'switch', 'case', 'default'];
    const types = ['int', 'char', 'void', 'float', 'double', 'short', 'long', 'unsigned', 'signed', 'const', 'static', 'extern', 'volatile', '_Bool'];
    const stdFunctions = ['printf', 'scanf', 'malloc', 'free', 'sizeof'];

    let result = code;

    // Comments
    result = result.replace(/(\/\/.*$)/gm, '<span class="syntax-comment">$1</span>');

    // Preprocessor directives
    result = result.replace(/(#\w+.*$)/gm, '<span class="syntax-preprocessor">$1</span>');

    // Strings
    result = result.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="syntax-string">$1</span>');

    // Numbers
    result = result.replace(/\b(\d+\.?\d*[fF]?)\b/g, '<span class="syntax-number">$1</span>');

    // Keywords
    keywords.forEach(kw => {
        result = result.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="syntax-keyword">$1</span>');
    });

    // Types
    types.forEach(type => {
        result = result.replace(new RegExp(`\\b(${type})\\b`, 'g'), '<span class="syntax-type">$1</span>');
    });

    // Standard functions
    stdFunctions.forEach(fn => {
        result = result.replace(new RegExp(`\\b(${fn})\\b(?=\\s*\\()`, 'g'), '<span class="syntax-function">$1</span>');
    });

    return result;
}

btnPrepare.addEventListener('click', () => {
    const sourceCode = codeEditor.value.trim();
    if (!sourceCode) return alert("Digite algum código C!");

    outputPanel.innerHTML = '';
    memoryVisualizer.innerHTML = '<p class="empty-msg">Aguardando execução...</p>';
    history = [];
    currentStepIndex = -1;

    try {
        const preprocessor = new IFSCeePreprocessor(sourceCode);
        const processedCode = preprocessor.process();

        const lexer = new IFSCeeLexer(processedCode);
        parsedAST = new IFSCeeParser(lexer.tokenize()).parse();
        executionEngine = new IFSCeeInterpreter(parsedAST).interpret();

        enterExecutionMode(sourceCode); toggleButtons(true);
        renderAST(parsedAST);
        outputPanel.innerHTML = '<em>Sistema pronto. Clique em "Próximo".</em>';
    } catch (e) { outputPanel.innerHTML = `<span style="color: #ff5252;">${e.message}</span>`; }
});

btnNext.addEventListener('click', () => {
    if (currentStepIndex < history.length - 1) {
        currentStepIndex++;
        applyState(history[currentStepIndex]);
        return;
    }
    if (!executionEngine) return;
    const result = executionEngine.next();
    if (!result.done) {
        history.push(result.value);
        currentStepIndex++;
        applyState(result.value);
    }
});

btnPrev.addEventListener('click', () => {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        applyState(history[currentStepIndex]);
    }
});
btnFirst.addEventListener('click', () => { if (history.length > 0) { currentStepIndex = 0; applyState(history[0]); } });

btnPlay.addEventListener('click', () => {
    if (autoPlayInterval) {
        // Stop auto-play
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        btnPlay.textContent = '▶ Play';
        btnPlay.classList.remove('playing');
        btnPlay.title = 'Atalho: Espaço';
    } else {
        // Start auto-play
        btnPlay.textContent = '⏸ Pause';
        btnPlay.classList.add('playing');
        btnPlay.title = 'Pausar execução automática';

        const delayMs = 1000 / playSpeed; // Convert speed to delay
        autoPlayInterval = setInterval(() => {
            if (currentStepIndex < history.length - 1) {
                applyState(history[++currentStepIndex]);
            } else if (executionEngine) {
                const result = executionEngine.next();
                if (!result.done) {
                    history.push(result.value);
                    currentStepIndex++;
                    applyState(result.value);

                    // Stop if program ended or errored
                    if (['PROGRAM_END', 'ERROR'].includes(result.value.type)) {
                        clearInterval(autoPlayInterval);
                        autoPlayInterval = null;
                        btnPlay.textContent = '▶ Play';
                        btnPlay.classList.remove('playing');
                    }
                } else {
                    clearInterval(autoPlayInterval);
                    autoPlayInterval = null;
                    btnPlay.textContent = '▶ Play';
                    btnPlay.classList.remove('playing');
                }
            } else {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
                btnPlay.textContent = '▶ Play';
                btnPlay.classList.remove('playing');
            }
        }, delayMs);
    }
});

speedControl.addEventListener('input', (e) => {
    playSpeed = parseInt(e.target.value);
    speedDisplay.textContent = `${playSpeed}x`;

    // If playing, restart with new speed
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        btnPlay.click(); // Stop
        btnPlay.click(); // Start again with new speed
    }
});
btnLast.addEventListener('click', () => {
    if (!executionEngine) return;
    let res = executionEngine.next();
    while (!res.done) {
        history.push(res.value); currentStepIndex++; applyState(res.value);
        if (['PROGRAM_END', 'ERROR'].includes(res.value.type)) break;
        res = executionEngine.next();
    }
});

btnEdit.addEventListener('click', () => { executionView.style.display = 'none'; codeEditor.style.display = 'block'; toggleButtons(false); executionEngine = null; });

function applyState(state) {
    // Rebuild output from history when going backwards
    if (currentStepIndex >= 0) {
        rebuildOutput();
    }

    if (state.type === 'ERROR') {
        outputPanel.innerHTML += `<br><span style="color: #ff5252;">${state.message}</span>`;
        updateLineHighlights(null, state.previousLine);
        highlightASTNode(null);
        return;
    }

    if (state.type === 'TERMINAL_PRINT') {
        // Don't add here, will be added by rebuildOutput
        return;
    }

    // Restore memory snapshot if available
    if (state.memorySnapshot) {
        state.memory.restoreSnapshot(state.memorySnapshot);
    }

    if (state.memory) {
        renderMemory(state.memory);
        updateWatchPanel(state.memory);
    }

    if (state.type === 'PROGRAM_END') {
        outputPanel.innerHTML += `<br><strong style="color: #4caf50;">Fim do programa (Cód: ${state.exitCode})</strong>`;
        updateLineHighlights(null, state.previousLine);
        highlightASTNode(null);
    } else if (state.type === 'STEP') {
        updateLineHighlights(state.nextLine, state.previousLine);
        highlightASTNode(state.nextLine);
    }
}

/**
 * Rebuild terminal output from history up to current step
 */
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

/**
 * Highlight AST nodes corresponding to the current execution line
 * @param {number|null} line - The line number to highlight, or null to clear
 */
function highlightASTNode(line) {
    // Clear previous highlights
    document.querySelectorAll('.ast-node-header.executing').forEach(header => {
        header.classList.remove('executing');
    });

    if (!line || !astVisible) return;

    // Find and highlight all nodes with matching line number
    document.querySelectorAll('.ast-node-header').forEach(header => {
        if (header.dataset.line && parseInt(header.dataset.line) === line) {
            header.classList.add('executing');

            // Auto-expand parent nodes and scroll into view
            let parent = header.closest('.ast-node');
            while (parent) {
                parent.classList.remove('ast-collapsed');
                const toggle = parent.querySelector('.ast-toggle');
                if (toggle && toggle.textContent === '▶') {
                    toggle.textContent = '▼';
                }
                parent = parent.parentElement.closest('.ast-node');
            }

            // Scroll into view (first match only)
            if (document.querySelector('.ast-node-header.executing') === header) {
                header.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
}

function renderMemory(memoryManager) {
    memoryVisualizer.innerHTML = '';
    if (!memoryManager || memoryManager.allocations.size === 0) return;

    memoryManager.allocations.forEach((meta, startAddress) => {
        if (!meta.active) return;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'memory-item';
        itemDiv.style.cursor = 'pointer';
        itemDiv.title = 'Clique com botão direito para observar esta variável';

        // Right-click to add to watch panel
        itemDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (meta.name && !meta.name.startsWith('"') && !meta.name.startsWith('malloc')) {
                watchedVariables.add(meta.name);
                updateWatchPanel(memoryManager);
            }
        });

        let regionBadge = `<span class="region-badge bg-${meta.region.toLowerCase()}">${meta.region}</span>`;

        if (meta.isArray) {
            let html = `<div><strong>${meta.name}</strong> ${regionBadge} <br><span style="color:#666; font-size:0.8em;">(Dimensões: [${meta.dimensions.join('][')}] | Total: ${meta.totalLength * meta.byteSize} bytes)</span></div>`;

            if (meta.dimensions.length === 2) {
                const rows = meta.dimensions[0]; const cols = meta.dimensions[1];
                html += `<div style="display: grid; grid-template-columns: repeat(${cols}, max-content); gap: 2px; background: #aaa; border: 1px solid #aaa; padding: 2px; border-radius: 4px; margin-top: 5px; width: max-content;">`;
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const addr = startAddress + (((r * cols) + c) * meta.byteSize);
                        const val = memoryManager.read(addr);
                        let display = val === null ? '<span style="color:#f44336; font-size:0.8em;">lixo</span>' : val;
                        if (meta.type === 'char' && val && val !== '\\0') display = `'${val}'`;
                        html += `<div style="background: #fff; padding: 8px; text-align: center; min-width: 45px;" title="RAM: ${addr}"><span style="display:block; font-size:0.7em; color:#888;">[${r}][${c}]</span>${display}</div>`;
                    }
                }
                html += `</div>`;
            } else {
                html += `<div class="array-container">`;
                for (let i = 0; i < meta.totalLength; i++) {
                    const addr = startAddress + (i * meta.byteSize);
                    const val = memoryManager.read(addr);
                    let display = val === null ? '<span class="uninitialized-memory">lixo</span>' : (val === '\\0' ? '<span class="null-terminator">\\0</span>' : val);
                    if (meta.type === 'char' && val && val !== '\\0') display = `'${val}'`;
                    html += `<div class="array-cell" title="RAM: ${addr}"><span class="array-index">[${i}]</span>${display}</div>`;
                }
                html += `</div>`;
            }
            itemDiv.innerHTML = html;
        } else {
            const val = memoryManager.read(startAddress);
            const display = val === null ? '<span class="uninitialized-memory">Não inic.</span>' : val;
            itemDiv.innerHTML = `<strong>${meta.name}</strong> = ${display} ${regionBadge} <div style="font-size: 0.8em; color: #888; margin-top: 4px;">Tipo: ${meta.type} | ${meta.byteSize} bytes | Addr: ${startAddress}</div>`;
        }
        memoryVisualizer.appendChild(itemDiv);
    });
}

function enterExecutionMode(source) {
    executionView.innerHTML = '';
    source.split('\n').forEach((line, i) => {
        const div = document.createElement('div');
        div.id = `line-${i + 1}`;
        div.className = 'code-line';
        div.innerHTML = highlightSyntax(line); // Apply syntax highlighting
        executionView.appendChild(div);
    });
    codeEditor.style.display = 'none'; executionView.style.display = 'block';
}

function updateLineHighlights(nextL, prevL) {
    document.querySelectorAll('.code-line').forEach(l => l.classList.remove('line-next-execute', 'line-just-executed'));
    if (prevL) document.getElementById(`line-${prevL}`)?.classList.add('line-just-executed');
    if (nextL) {
        const nEl = document.getElementById(`line-${nextL}`);
        if (nEl) { nEl.classList.add('line-next-execute'); nEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
}

function updateWatchPanel(memoryManager) {
    if (watchedVariables.size === 0) {
        watchPanel.innerHTML = '<p class="empty-msg">Clique direito em uma variável para observá-la</p>';
        return;
    }

    watchPanel.innerHTML = '';
    watchedVariables.forEach(varName => {
        const watchItem = document.createElement('div');
        watchItem.className = 'watch-item';

        // Find the variable in memory
        let value = 'não encontrada';
        let found = false;
        memoryManager.allocations.forEach((meta, addr) => {
            if (meta.active && meta.name === varName) {
                found = true;
                if (meta.isArray) {
                    const values = [];
                    for (let i = 0; i < Math.min(meta.totalLength, 5); i++) {
                        const v = memoryManager.read(addr + (i * meta.byteSize));
                        values.push(v === null ? '?' : v);
                    }
                    value = `[${values.join(', ')}${meta.totalLength > 5 ? ', ...' : ''}]`;
                } else {
                    const v = memoryManager.read(addr);
                    value = v === null ? 'não inicializada' : v;
                }
            }
        });

        if (!found) value = '<span style="color: #888;">fora de escopo</span>';

        watchItem.innerHTML = `
            <div>
                <span class="watch-item-name">${varName}</span>
                <span> = </span>
                <span class="watch-item-value">${value}</span>
            </div>
            <span class="watch-item-remove" title="Remover">✕</span>
        `;

        // Remove from watch list
        watchItem.querySelector('.watch-item-remove').addEventListener('click', () => {
            watchedVariables.delete(varName);
            updateWatchPanel(memoryManager);
        });

        watchPanel.appendChild(watchItem);
    });
}

function toggleButtons(isExec) {
    btnPrepare.style.display = isExec ? 'none' : 'inline-block';
    btnEdit.style.display = isExec ? 'inline-block' : 'none';
    btnToggleAST.style.display = isExec ? 'inline-block' : 'none';
    btnExportAST.style.display = isExec ? 'inline-block' : 'none';
    [btnFirst, btnPrev, btnPlay, btnNext, btnLast].forEach(b => b.disabled = !isExec);
    speedControl.disabled = !isExec;

    // Stop auto-play when switching modes
    if (!isExec && autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        btnPlay.textContent = '▶ Play';
        btnPlay.classList.remove('playing');
    }
}

/**
 * Render the AST as a collapsible tree structure
 * @param {Object} ast - The Abstract Syntax Tree to visualize
 */
function renderAST(ast) {
    astVisualizer.innerHTML = '';
    const rootDiv = document.createElement('div');
    rootDiv.className = 'ast-root';
    rootDiv.innerHTML = '🌳 Program AST';
    astVisualizer.appendChild(rootDiv);

    if (ast.body && ast.body.length > 0) {
        ast.body.forEach((node, index) => {
            const nodeDiv = createASTNode(node, `root-${index}`);
            astVisualizer.appendChild(nodeDiv);
        });
    }
}

/**
 * Create a visual representation of an AST node
 * @param {Object} node - The AST node to render
 * @param {string} path - Unique path for this node
 * @returns {HTMLElement} The rendered node element
 */
function createASTNode(node, path) {
    if (!node || typeof node !== 'object') {
        const simpleDiv = document.createElement('div');
        simpleDiv.className = 'ast-node';
        simpleDiv.innerHTML = `<span class="ast-value">${JSON.stringify(node)}</span>`;
        return simpleDiv;
    }

    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'ast-node';
    nodeDiv.dataset.path = path;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'ast-node-header';
    if (node.line) {
        headerDiv.dataset.line = node.line;
    }

    const hasChildren = hasASTChildren(node);
    const toggle = document.createElement('span');
    toggle.className = 'ast-toggle';
    toggle.textContent = hasChildren ? '▼' : '◦';

    const typeSpan = document.createElement('span');
    typeSpan.className = 'ast-type';
    typeSpan.textContent = node.type || 'Unknown';

    const detailsSpan = document.createElement('span');
    detailsSpan.className = 'ast-details';
    detailsSpan.innerHTML = getNodeDetails(node);

    headerDiv.appendChild(toggle);
    headerDiv.appendChild(typeSpan);
    headerDiv.appendChild(detailsSpan);
    nodeDiv.appendChild(headerDiv);

    if (hasChildren) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'ast-children';

        // Render properties
        Object.keys(node).forEach(key => {
            if (key === 'type' || key === 'line') return;

            const value = node[key];
            if (value && typeof value === 'object') {
                const propHeader = document.createElement('div');
                propHeader.style.marginTop = '5px';
                propHeader.innerHTML = `<span class="ast-property">${key}:</span>`;
                childrenDiv.appendChild(propHeader);

                if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        const childNode = createASTNode(item, `${path}-${key}-${index}`);
                        childrenDiv.appendChild(childNode);
                    });
                } else {
                    const childNode = createASTNode(value, `${path}-${key}`);
                    childrenDiv.appendChild(childNode);
                }
            } else if (value !== null && value !== undefined) {
                const propDiv = document.createElement('div');
                propDiv.style.marginLeft = '20px';
                propDiv.innerHTML = `<span class="ast-property">${key}:</span> <span class="ast-value">${JSON.stringify(value)}</span>`;
                childrenDiv.appendChild(propDiv);
            }
        });

        nodeDiv.appendChild(childrenDiv);

        // Toggle expand/collapse
        headerDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            nodeDiv.classList.toggle('ast-collapsed');
            toggle.textContent = nodeDiv.classList.contains('ast-collapsed') ? '▶' : '▼';
        });
    }

    return nodeDiv;
}

/**
 * Check if a node has children to display
 */
function hasASTChildren(node) {
    return Object.keys(node).some(key => {
        if (key === 'type' || key === 'line') return false;
        const value = node[key];
        return value && typeof value === 'object';
    });
}

/**
 * Get human-readable details for a node
 */
function getNodeDetails(node) {
    const details = [];

    if (node.name) details.push(`<span class="ast-value">"${node.name}"</span>`);
    if (node.operator) details.push(`<span class="ast-value">op: ${node.operator}</span>`);
    if (node.value !== undefined && node.type === 'Literal') {
        details.push(`<span class="ast-value">= ${JSON.stringify(node.value)}</span>`);
    }
    if (node.varType) details.push(`<span class="ast-property">type: ${node.varType}</span>`);
    if (node.returnType) details.push(`<span class="ast-property">returns: ${node.returnType}</span>`);
    if (node.line) details.push(`<span style="color: #999;">line ${node.line}</span>`);

    return details.length > 0 ? ' ' + details.join(' ') : '';
}

// AST Toggle Button
btnToggleAST.addEventListener('click', () => {
    astVisible = !astVisible;
    astPanel.style.display = astVisible ? 'flex' : 'none';
    btnToggleAST.textContent = astVisible ? '🌳 Ocultar AST' : '🌳 Mostrar AST';
});

// Export AST Button
btnExportAST.addEventListener('click', () => {
    if (!parsedAST) return alert('Nenhuma AST disponível para exportar!');

    const jsonStr = JSON.stringify(parsedAST, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ast.json';
    a.click();
    URL.revokeObjectURL(url);
});

// Expand/Collapse All Buttons
btnExpandAll.addEventListener('click', () => {
    document.querySelectorAll('.ast-node').forEach(node => {
        node.classList.remove('ast-collapsed');
        const toggle = node.querySelector('.ast-toggle');
        if (toggle && toggle.textContent !== '◦') toggle.textContent = '▼';
    });
});

btnCollapseAll.addEventListener('click', () => {
    document.querySelectorAll('.ast-node').forEach(node => {
        if (hasASTChildren(node)) {
            node.classList.add('ast-collapsed');
            const toggle = node.querySelector('.ast-toggle');
            if (toggle) toggle.textContent = '▶';
        }
    });
});

// EXAMPLES DROPDOWN
const examples = {
    'basic-1': `#include <stdio.h>

int main() {
    printf("Hello, World!");
    return 0;
}`,
    'basic-2': `#include <stdio.h>

int main() {
    int age = 25;
    float height = 1.75;
    char grade = 'A';

    printf("Age: %d", age);
    printf("Height: %d", (int)(height * 100));
    printf("Grade: %c", grade);
    return 0;
}`,
    'basic-3': `#include <stdio.h>

int main() {
    int a = 10;
    int b = 3;

    printf("Addition: %d", a + b);
    printf("Subtraction: %d", a - b);
    printf("Multiplication: %d", a * b);
    printf("Division: %d", a / b);
    printf("Modulo: %d", a % b);
    return 0;
}`,
    'basic-4': `#include <stdio.h>

int main() {
    int score = 85;

    if (score >= 90) {
        printf("Grade: A");
    } else if (score >= 80) {
        printf("Grade: B");
    } else if (score >= 70) {
        printf("Grade: C");
    } else {
        printf("Grade: F");
    }
    return 0;
}`,
    'basic-5': `#include <stdio.h>

int main() {
    int i;
    int sum = 0;

    for (i = 1; i <= 5; i = i + 1) {
        sum = sum + i;
        printf("i=%d, sum=%d", i, sum);
    }
    printf("Final sum: %d", sum);
    return 0;
}`,
    'basic-6': `#include <stdio.h>

int main() {
    int countdown = 5;

    while (countdown > 0) {
        printf("Countdown: %d", countdown);
        countdown = countdown - 1;
    }
    printf("Liftoff!");
    return 0;
}`,
    'basic-7': `#include <stdio.h>

int main() {
    int numbers[5];
    int i;

    numbers[0] = 10;
    numbers[1] = 20;
    numbers[2] = 30;
    numbers[3] = 40;
    numbers[4] = 50;

    for (i = 0; i < 5; i = i + 1) {
        printf("numbers[%d] = %d", i, numbers[i]);
    }
    return 0;
}`,
    'basic-8': `#include <stdio.h>

int square(int x) {
    return x * x;
}

int main() {
    int num = 7;
    int result = square(num);

    printf("Square of %d is %d", num, result);
    return 0;
}`,
    'basic-9': `#include <stdio.h>

int main() {
    int value = 42;
    int *ptr = &value;

    printf("Value: %d", value);
    printf("Address: %d", (int)ptr);
    printf("Dereferenced: %d", *ptr);

    *ptr = 100;
    printf("New value: %d", value);
    return 0;
}`,
    'basic-10': `#include <stdio.h>
#include <stdlib.h>

int main() {
    int *arr = (int*)malloc(3 * sizeof(int));

    arr[0] = 5;
    arr[1] = 10;
    arr[2] = 15;

    printf("arr[0] = %d", arr[0]);
    printf("arr[1] = %d", arr[1]);
    printf("arr[2] = %d", arr[2]);

    free(arr);
    return 0;
}`,
    'escape-1': `#include <stdio.h>

int main() {
    printf("Line 1\\nLine 2\\nLine 3");
    printf("Tabbed:\\tValue1\\tValue2");
    printf("Backslash: \\\\");
    printf("Quote: \\"Hello\\"");
    return 0;
}`,
    'escape-2': `#include <stdio.h>

int main() {
    char newline = '\\n';
    char tab = '\\t';
    char null = '\\0';
    char backslash = '\\\\';
    char quote = '\\'';

    printf("Newline ASCII: %d", newline);
    printf("Tab ASCII: %d", tab);
    printf("Null ASCII: %d", null);
    printf("Backslash ASCII: %d", backslash);
    printf("Quote ASCII: %d", quote);
    return 0;
}`,
    'escape-3': `#include <stdio.h>

int main() {
    char alert = '\\a';
    char backspace = '\\b';
    char formfeed = '\\f';
    char newline = '\\n';
    char cr = '\\r';
    char tab = '\\t';
    char vtab = '\\v';
    char backslash = '\\\\';
    char quote = '\\'';
    char dquote = '\\"';
    char question = '\\?';

    printf("Alert: %d", alert);
    printf("Backspace: %d", backspace);
    printf("Form feed: %d", formfeed);
    printf("Newline: %d", newline);
    printf("CR: %d", cr);
    printf("Tab: %d", tab);
    printf("VTab: %d", vtab);
    printf("Backslash: %d", backslash);
    printf("Quote: %d", quote);
    printf("DQuote: %d", dquote);
    printf("Question: %d", question);
    return 0;
}`,
    'escape-4': `#include <stdio.h>

int main() {
    char null = '\\0';
    char question = '\\77';
    char newline = '\\012';
    char a_char = '\\141';

    printf("Null: %d", null);
    printf("Question \\\\77: %c (%d)", question, question);
    printf("Newline \\\\012: %d", newline);
    printf("Char 'a' \\\\141: %c (%d)", a_char, a_char);
    return 0;
}`,
    'escape-5': `#include <stdio.h>

int main() {
    char a_char = '\\x41';
    char z_char = '\\x5A';
    char null = '\\x00';
    char del = '\\x7F';

    printf("Char 'A' \\\\x41: %c (%d)", a_char, a_char);
    printf("Char 'Z' \\\\x5A: %c (%d)", z_char, z_char);
    printf("Null \\\\x00: %d", null);
    printf("DEL \\\\x7F: %d", del);
    return 0;
}`,
    'escape-6': `#include <stdio.h>

int main() {
    printf("Path: C:\\\\Program Files\\\\MyApp");
    printf("Quote: He said \\"Hello!\\"");
    printf("Mixed: Tab\\there\\nNewline\\tbelow");
    printf("Hex: \\\\x48\\\\x65\\\\x6C\\\\x6C\\\\x6F = Hello");
    printf("Octal: \\\\110\\\\145\\\\154\\\\154\\\\157 = Hello");
    return 0;
}`,
    'escape-7': `#include <stdio.h>

int main() {
    int decimal = 255;
    int octal = 0377;
    int hex = 0xFF;
    int binary = 0b11111111;

    printf("Decimal: %d", decimal);
    printf("Octal 0377: %d", octal);
    printf("Hex 0xFF: %d", hex);
    printf("Binary 0b11111111: %d", binary);
    return 0;
}`,
    'escape-8': `#include <stdio.h>

int main() {
    float f1 = 3.14f;
    float f2 = 1.5e2f;
    float f3 = 2.5e-1f;
    double d1 = 3.14159;

    printf("Float 3.14f: %d", (int)(f1 * 100));
    printf("Float 1.5e2f: %d", (int)f2);
    printf("Float 2.5e-1f: %d", (int)(f3 * 100));
    printf("Double: %d", (int)(d1 * 100));
    return 0;
}`,
    'escape-9': `#include <stdio.h>

int main() {
    int regular = 42;
    unsigned int u = 42u;
    long int l = 42L;
    unsigned long ul = 42UL;

    printf("Regular: %d", regular);
    printf("Unsigned 42u: %d", u);
    printf("Long 42L: %d", l);
    printf("ULong 42UL: %d", ul);
    return 0;
}`,
    'escape-10': `#include <stdio.h>

int main() {
    printf("Note: Wide char/string support is partial");
    printf("Lexer handles L'a' and L\\"wide\\" correctly");
    printf("Full runtime support requires wchar_t implementation");
    return 0;
}`
};

examplesDropdown.addEventListener('change', (event) => {
    const selectedExample = event.target.value;
    if (selectedExample && examples[selectedExample]) {
        codeEditor.value = examples[selectedExample];
        examplesDropdown.value = ''; // Reset dropdown
    }
});

// ATALHOS DE TECLADO
document.addEventListener('keydown', (event) => {
    if (codeEditor.style.display !== 'none') {
        if (event.ctrlKey && event.key === 'Enter') { event.preventDefault(); btnPrepare.click(); }
        return;
    }
    switch (event.key) {
        case 'Escape': btnEdit.click(); break;
        case ' ': if (!btnPlay.disabled) { event.preventDefault(); btnPlay.click(); } break;
        case 'ArrowRight': if (!btnNext.disabled) { event.preventDefault(); btnNext.click(); } break;
        case 'ArrowLeft': if (!btnPrev.disabled) { event.preventDefault(); btnPrev.click(); } break;
        case 'Home': if (!btnFirst.disabled) { event.preventDefault(); btnFirst.click(); } break;
        case 'End': if (!btnLast.disabled) { event.preventDefault(); btnLast.click(); } break;
    }
});