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
let watchedVariables = new Set();
let autoPlayInterval = null;
let playSpeed = 5;
let parsedAST = null;
let astVisible = false;

function highlightSyntax(code) {
    const keywords = ['if', 'else', 'while', 'for', 'do', 'break', 'continue', 'return', 'sizeof',
        'switch', 'case', 'default', 'typedef', 'struct', 'union', 'enum', 'goto'];
    const types = ['int', 'char', 'void', 'float', 'double', 'short', 'long', 'unsigned', 'signed',
        'const', 'static', 'extern', 'volatile', '_Bool', 'bool', 'size_t'];
    const stdFunctions = ['printf', 'scanf', 'malloc', 'free', 'calloc', 'realloc', 'sizeof',
        'puts', 'putchar', 'sprintf', 'snprintf', 'fprintf',
        'strlen', 'strcpy', 'strncpy', 'strcat', 'strncat', 'strcmp', 'strncmp',
        'strchr', 'strstr', 'memcpy', 'memmove', 'memset', 'memcmp',
        'atoi', 'atof', 'atol', 'abs', 'rand', 'srand', 'exit',
        'sin', 'cos', 'tan', 'sqrt', 'pow', 'ceil', 'floor', 'fabs', 'log',
        'isalpha', 'isdigit', 'isspace', 'toupper', 'tolower'];

    let result = code;
    result = result.replace(/(\/\/.*$)/gm, '<span class="syntax-comment">$1</span>');
    result = result.replace(/(#\w+.*$)/gm, '<span class="syntax-preprocessor">$1</span>');
    result = result.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="syntax-string">$1</span>');
    result = result.replace(/\b(\d+\.?\d*[fFlLuU]*)\b/g, '<span class="syntax-number">$1</span>');
    keywords.forEach(kw => {
        result = result.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="syntax-keyword">$1</span>');
    });
    types.forEach(type => {
        result = result.replace(new RegExp(`\\b(${type})\\b`, 'g'), '<span class="syntax-type">$1</span>');
    });
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
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        btnPlay.textContent = '▶ Play';
        btnPlay.classList.remove('playing');
    } else {
        btnPlay.textContent = '⏸ Pause';
        btnPlay.classList.add('playing');
        const delayMs = 1000 / playSpeed;
        autoPlayInterval = setInterval(() => {
            if (currentStepIndex < history.length - 1) {
                applyState(history[++currentStepIndex]);
            } else if (executionEngine) {
                const result = executionEngine.next();
                if (!result.done) {
                    history.push(result.value);
                    currentStepIndex++;
                    applyState(result.value);
                    if (['PROGRAM_END', 'ERROR'].includes(result.value.type)) {
                        clearInterval(autoPlayInterval); autoPlayInterval = null;
                        btnPlay.textContent = '▶ Play'; btnPlay.classList.remove('playing');
                    }
                } else {
                    clearInterval(autoPlayInterval); autoPlayInterval = null;
                    btnPlay.textContent = '▶ Play'; btnPlay.classList.remove('playing');
                }
            } else {
                clearInterval(autoPlayInterval); autoPlayInterval = null;
                btnPlay.textContent = '▶ Play'; btnPlay.classList.remove('playing');
            }
        }, delayMs);
    }
});

speedControl.addEventListener('input', (e) => {
    playSpeed = parseInt(e.target.value);
    speedDisplay.textContent = `${playSpeed}x`;
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval); autoPlayInterval = null;
        btnPlay.click(); btnPlay.click();
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

btnEdit.addEventListener('click', () => {
    executionView.style.display = 'none'; codeEditor.style.display = 'block';
    toggleButtons(false); executionEngine = null;
});

function applyState(state) {
    if (currentStepIndex >= 0) rebuildOutput();

    if (state.type === 'ERROR') {
        outputPanel.innerHTML += `<br><span style="color: #ff5252;">${state.message}</span>`;
        updateLineHighlights(null, state.previousLine);
        highlightASTNode(null); return;
    }
    if (state.type === 'TERMINAL_PRINT') return;
    if (state.memorySnapshot) state.memory.restoreSnapshot(state.memorySnapshot);
    if (state.memory) { renderMemory(state.memory); updateWatchPanel(state.memory); }

    if (state.type === 'PROGRAM_END') {
        outputPanel.innerHTML += `<br><strong style="color: #4caf50;">Fim do programa (Cód: ${state.exitCode})</strong>`;
        updateLineHighlights(null, state.previousLine);
        highlightASTNode(null);
    } else if (state.type === 'STEP') {
        updateLineHighlights(state.nextLine, state.previousLine);
        highlightASTNode(state.nextLine);
    }
}

function rebuildOutput() {
    outputPanel.innerHTML = '<em>Sistema pronto. Clique em "Próximo".</em>';
    for (let i = 0; i <= currentStepIndex; i++) {
        const step = history[i];
        if (step.type === 'TERMINAL_PRINT') outputPanel.innerHTML += `<div>> ${step.output}</div>`;
        else if (step.type === 'ERROR') outputPanel.innerHTML += `<br><span style="color: #ff5252;">${step.message}</span>`;
        else if (step.type === 'PROGRAM_END') outputPanel.innerHTML += `<br><strong style="color: #4caf50;">Fim do programa (Cód: ${step.exitCode})</strong>`;
    }
}

function highlightASTNode(line) {
    document.querySelectorAll('.ast-node-header.executing').forEach(h => h.classList.remove('executing'));
    if (!line || !astVisible) return;
    document.querySelectorAll('.ast-node-header').forEach(header => {
        if (header.dataset.line && parseInt(header.dataset.line) === line) {
            header.classList.add('executing');
            let parent = header.closest('.ast-node');
            while (parent) {
                parent.classList.remove('ast-collapsed');
                const toggle = parent.querySelector('.ast-toggle');
                if (toggle && toggle.textContent === '▶') toggle.textContent = '▼';
                parent = parent.parentElement.closest('.ast-node');
            }
            if (document.querySelector('.ast-node-header.executing') === header) {
                header.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════
// Memory Visualization — com suporte a structs
// ═══════════════════════════════════════════════════════════════════════

function renderMemory(memoryManager) {
    memoryVisualizer.innerHTML = '';
    if (!memoryManager || memoryManager.allocations.size === 0) return;

    memoryManager.allocations.forEach((meta, startAddress) => {
        if (!meta.active) return;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'memory-item';
        itemDiv.style.cursor = 'pointer';
        itemDiv.title = 'Clique com botão direito para observar';

        itemDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (meta.name && !meta.name.startsWith('"') && !meta.name.startsWith('malloc') && !meta.name.startsWith('(')) {
                watchedVariables.add(meta.name);
                updateWatchPanel(memoryManager);
            }
        });

        const regionBadge = `<span class="region-badge bg-${meta.region.toLowerCase()}">${meta.region}</span>`;

        // ── Struct rendering ──────────────────────────────────────────
        if (meta.isStruct) {
            let html = `<div><strong>${meta.name}</strong> ${regionBadge}`;
            html += ` <span style="color:#7e57c2; font-size:0.85em; font-weight:bold;">struct ${meta.structName}</span>`;
            html += `<br><span style="color:#666; font-size:0.8em;">(${meta.totalSize} bytes | Addr: ${startAddress})</span></div>`;

            html += `<div class="struct-fields-container" style="margin-top: 8px; border: 2px solid #7e57c2; border-radius: 6px; overflow: hidden;">`;
            html += `<div style="background: #ede7f6; padding: 4px 8px; font-size: 0.8em; font-weight: bold; color: #4a148c; border-bottom: 1px solid #ce93d8;">Campos da struct</div>`;

            for (const field of meta.fields) {
                const addr = startAddress + field.offset;

                if (field.ehArray) {
                    html += `<div style="padding: 6px 8px; border-bottom: 1px solid #e0e0e0;">`;
                    html += `<span style="color:#1976d2; font-weight:bold;">.${field.name}</span>`;
                    html += ` <span style="color:#888; font-size:0.8em;">(${field.type}[${field.totalLength}] offset:${field.offset})</span>`;
                    html += `<div class="array-container" style="margin-top: 4px;">`;
                    for (let k = 0; k < Math.min(field.totalLength, 32); k++) {
                        const cellAddr = addr + (k * TypeSystem.getSize(field.type));
                        const val = memoryManager.ram.has(cellAddr) ? memoryManager.ram.get(cellAddr) : null;
                        let display;
                        if (val === null) display = '<span class="uninitialized-memory">lixo</span>';
                        else if (val === '\0') display = '<span class="null-terminator">\\0</span>';
                        else if (field.type.includes('char') && typeof val === 'string') display = `'${val}'`;
                        else display = val;
                        html += `<div class="array-cell" title="RAM: ${cellAddr}"><span class="array-index">[${k}]</span>${display}</div>`;
                    }
                    if (field.totalLength > 32) html += `<div class="array-cell">...</div>`;
                    html += `</div></div>`;
                } else {
                    const val = memoryManager.ram.has(addr) ? memoryManager.ram.get(addr) : null;
                    const display = val === null ? '<span class="uninitialized-memory">lixo</span>' : val;
                    html += `<div style="padding: 6px 8px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">`;
                    html += `<span><span style="color:#1976d2; font-weight:bold;">.${field.name}</span> <span style="color:#888; font-size:0.8em;">(${field.type})</span></span>`;
                    html += `<span style="font-family: monospace; font-weight: bold; color: #2e7d32;">${display}</span>`;
                    html += `</div>`;
                }
            }
            html += `</div>`;
            itemDiv.innerHTML = html;
            itemDiv.style.borderLeftColor = '#7e57c2';
        }
        // ── Array rendering ───────────────────────────────────────────
        else if (meta.isArray) {
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
        }
        // ── Scalar rendering ──────────────────────────────────────────
        else {
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
        div.innerHTML = highlightSyntax(line);
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
        let value = 'não encontrada';
        let found = false;
        memoryManager.allocations.forEach((meta, addr) => {
            if (meta.active && meta.name === varName) {
                found = true;
                if (meta.isStruct) {
                    const fieldVals = meta.fields.map(f => {
                        const val = memoryManager.ram.has(addr + f.offset) ? memoryManager.ram.get(addr + f.offset) : '?';
                        return `${f.name}: ${val}`;
                    });
                    value = `{${fieldVals.join(', ')}}`;
                } else if (meta.isArray) {
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
    if (!isExec && autoPlayInterval) {
        clearInterval(autoPlayInterval); autoPlayInterval = null;
        btnPlay.textContent = '▶ Play'; btnPlay.classList.remove('playing');
    }
}

// ═══════════════════════════════════════════════════════════════════════
// AST Visualizer
// ═══════════════════════════════════════════════════════════════════════

function renderAST(ast) {
    astVisualizer.innerHTML = '';
    const rootDiv = document.createElement('div');
    rootDiv.className = 'ast-root';
    rootDiv.innerHTML = '🌳 Program AST';
    astVisualizer.appendChild(rootDiv);
    if (ast.body && ast.body.length > 0) {
        ast.body.forEach((node, index) => {
            astVisualizer.appendChild(createASTNode(node, `root-${index}`));
        });
    }
}

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
    if (node.line) headerDiv.dataset.line = node.line;
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
        Object.keys(node).forEach(key => {
            if (key === 'type' || key === 'line') return;
            const value = node[key];
            if (value && typeof value === 'object') {
                const propHeader = document.createElement('div');
                propHeader.style.marginTop = '5px';
                propHeader.innerHTML = `<span class="ast-property">${key}:</span>`;
                childrenDiv.appendChild(propHeader);
                if (Array.isArray(value)) {
                    value.forEach((item, index) => childrenDiv.appendChild(createASTNode(item, `${path}-${key}-${index}`)));
                } else {
                    childrenDiv.appendChild(createASTNode(value, `${path}-${key}`));
                }
            } else if (value !== null && value !== undefined) {
                const propDiv = document.createElement('div');
                propDiv.style.marginLeft = '20px';
                propDiv.innerHTML = `<span class="ast-property">${key}:</span> <span class="ast-value">${JSON.stringify(value)}</span>`;
                childrenDiv.appendChild(propDiv);
            }
        });
        nodeDiv.appendChild(childrenDiv);
        headerDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            nodeDiv.classList.toggle('ast-collapsed');
            toggle.textContent = nodeDiv.classList.contains('ast-collapsed') ? '▶' : '▼';
        });
    }
    return nodeDiv;
}

function hasASTChildren(node) {
    return Object.keys(node).some(key => {
        if (key === 'type' || key === 'line') return false;
        return node[key] && typeof node[key] === 'object';
    });
}

function getNodeDetails(node) {
    const details = [];
    if (node.name) details.push(`<span class="ast-value">"${node.name}"</span>`);
    if (node.structName) details.push(`<span class="ast-value">struct ${node.structName}</span>`);
    if (node.varName) details.push(`<span class="ast-value">${node.varName}</span>`);
    if (node.field) details.push(`<span class="ast-value">.${node.field}</span>`);
    if (node.operator) details.push(`<span class="ast-value">op: ${node.operator}</span>`);
    if (node.value !== undefined && node.type === 'Literal') details.push(`<span class="ast-value">= ${JSON.stringify(node.value)}</span>`);
    if (node.varType) details.push(`<span class="ast-property">type: ${node.varType}</span>`);
    if (node.returnType) details.push(`<span class="ast-property">returns: ${node.returnType}</span>`);
    if (node.ehSeta !== undefined) details.push(`<span class="ast-property">${node.ehSeta ? '->' : '.'}</span>`);
    if (node.line) details.push(`<span style="color: #999;">line ${node.line}</span>`);
    return details.length > 0 ? ' ' + details.join(' ') : '';
}

btnToggleAST.addEventListener('click', () => {
    astVisible = !astVisible;
    astPanel.style.display = astVisible ? 'flex' : 'none';
    btnToggleAST.textContent = astVisible ? '🌳 Ocultar AST' : '🌳 Mostrar AST';
});

btnExportAST.addEventListener('click', () => {
    if (!parsedAST) return alert('Nenhuma AST disponível!');
    const jsonStr = JSON.stringify(parsedAST, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ast.json'; a.click();
    URL.revokeObjectURL(url);
});

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

// ═══════════════════════════════════════════════════════════════════════
// Examples — Incluindo Structs, stdio, stdlib
// ═══════════════════════════════════════════════════════════════════════

const examples = {
    // ── Básicos ──────────────────────────────────────────────────────
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

    printf("Age: %d\\n", age);
    printf("Height: %f\\n", height);
    printf("Grade: %c\\n", grade);
    return 0;
}`,
    'basic-3': `#include <stdio.h>

int main() {
    int a = 10;
    int b = 3;

    printf("Soma: %d\\n", a + b);
    printf("Subtração: %d\\n", a - b);
    printf("Multiplicação: %d\\n", a * b);
    printf("Divisão: %d\\n", a / b);
    printf("Módulo: %d\\n", a % b);
    return 0;
}`,
    'basic-4': `#include <stdio.h>

int main() {
    int score = 85;

    if (score >= 90) {
        printf("Nota: A\\n");
    } else if (score >= 80) {
        printf("Nota: B\\n");
    } else if (score >= 70) {
        printf("Nota: C\\n");
    } else {
        printf("Nota: F\\n");
    }
    return 0;
}`,
    'basic-5': `#include <stdio.h>

int main() {
    int sum = 0;

    for (int i = 1; i <= 5; i++) {
        sum += i;
        printf("i=%d, soma=%d\\n", i, sum);
    }
    printf("Soma final: %d\\n", sum);
    return 0;
}`,
    'basic-6': `#include <stdio.h>

int main() {
    int countdown = 5;

    while (countdown > 0) {
        printf("Contagem: %d\\n", countdown);
        countdown--;
    }
    printf("Liftoff!\\n");
    return 0;
}`,
    'basic-7': `#include <stdio.h>

int main() {
    int numbers[5];

    numbers[0] = 10;
    numbers[1] = 20;
    numbers[2] = 30;
    numbers[3] = 40;
    numbers[4] = 50;

    for (int i = 0; i < 5; i++) {
        printf("numbers[%d] = %d\\n", i, numbers[i]);
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
    printf("Quadrado de %d = %d\\n", num, result);
    return 0;
}`,
    'basic-9': `#include <stdio.h>

int main() {
    int value = 42;
    int *ptr = &value;

    printf("Valor: %d\\n", value);
    printf("Endereço: %p\\n", ptr);
    printf("Desreferência: %d\\n", *ptr);

    *ptr = 100;
    printf("Novo valor: %d\\n", value);
    return 0;
}`,
    'basic-10': `#include <stdio.h>
#include <stdlib.h>

int main() {
    int *arr = (int*)malloc(12);

    arr[0] = 5;
    arr[1] = 10;
    arr[2] = 15;

    printf("arr[0] = %d\\n", arr[0]);
    printf("arr[1] = %d\\n", arr[1]);
    printf("arr[2] = %d\\n", arr[2]);

    free(arr);
    return 0;
}`,

    // ── Structs ──────────────────────────────────────────────────────
    'struct-1': `#include <stdio.h>

struct Point {
    int x;
    int y;
};

int main() {
    struct Point p;
    p.x = 10;
    p.y = 20;

    printf("Ponto: (%d, %d)\\n", p.x, p.y);

    int soma = p.x + p.y;
    printf("Soma: %d\\n", soma);
    return 0;
}`,
    'struct-2': `#include <stdio.h>

typedef struct {
    int x;
    int y;
} Ponto;

Ponto soma(Ponto a, Ponto b) {
    Ponto r;
    r.x = a.x + b.x;
    r.y = a.y + b.y;
    return r;
}

int main() {
    Ponto p1;
    p1.x = 3;
    p1.y = 4;

    Ponto p2;
    p2.x = 10;
    p2.y = 20;

    Ponto resultado = soma(p1, p2);
    printf("Resultado: (%d, %d)\\n", resultado.x, resultado.y);
    return 0;
}`,
    'struct-3': `#include <stdio.h>

struct Aluno {
    int idade;
    float nota;
    int matricula;
};

void imprime(struct Aluno *a) {
    printf("Matrícula: %d\\n", a->matricula);
    printf("Idade: %d\\n", a->idade);
    printf("Nota: %f\\n", a->nota);
}

int main() {
    struct Aluno aluno;
    aluno.matricula = 12345;
    aluno.idade = 20;
    aluno.nota = 9.5;

    printf("=== Dados do Aluno ===\\n");
    imprime(&aluno);

    return 0;
}`,
    'struct-4': `#include <stdio.h>

struct Retangulo {
    int largura;
    int altura;
};

int area(struct Retangulo r) {
    return r.largura * r.altura;
}

int perimetro(struct Retangulo r) {
    return 2 * (r.largura + r.altura);
}

int main() {
    struct Retangulo ret;
    ret.largura = 5;
    ret.altura = 3;

    printf("Retângulo %dx%d\\n", ret.largura, ret.altura);
    printf("Área: %d\\n", area(ret));
    printf("Perímetro: %d\\n", perimetro(ret));

    return 0;
}`,
    'struct-5': `#include <stdio.h>

typedef struct {
    int real;
    int imag;
} Complexo;

Complexo multiplicar(Complexo a, Complexo b) {
    Complexo r;
    r.real = a.real * b.real - a.imag * b.imag;
    r.imag = a.real * b.imag + a.imag * b.real;
    return r;
}

int main() {
    Complexo a;
    a.real = 3;
    a.imag = 2;

    Complexo b;
    b.real = 1;
    b.imag = 4;

    printf("a = %d + %di\\n", a.real, a.imag);
    printf("b = %d + %di\\n", b.real, b.imag);

    Complexo prod = multiplicar(a, b);
    printf("a * b = %d + %di\\n", prod.real, prod.imag);

    return 0;
}`,

    // ── stdio.h Avançado ─────────────────────────────────────────────
    'stdio-1': `#include <stdio.h>

int main() {
    // Width e precision no printf
    printf("Inteiros:\\n");
    printf("[%10d]\\n", 42);
    printf("[%-10d]\\n", 42);
    printf("[%+d]\\n", 42);
    printf("[%+d]\\n", -42);
    printf("[%05d]\\n", 42);

    printf("\\nFloats:\\n");
    printf("[%.2f]\\n", 3.14159);
    printf("[%10.4f]\\n", 3.14159);
    printf("[%-10.2f]\\n", 3.14159);

    printf("\\nHex/Octal:\\n");
    printf("Hex: %x\\n", 255);
    printf("HEX: %X\\n", 255);
    printf("Oct: %o\\n", 255);
    printf("Hex #: %#x\\n", 255);

    return 0;
}`,
    'stdio-2': `#include <stdio.h>

int main() {
    // puts e putchar
    puts("Usando puts() - adiciona newline automatico");

    printf("Letras: ");
    for (int i = 65; i <= 90; i++) {
        putchar(i);
    }
    putchar(10); // newline

    // sprintf
    int buf[64];
    int idade = 25;
    printf("Formatado em buffer!\\n");

    return 0;
}`,

    // ── stdlib.h ─────────────────────────────────────────────────────
    'stdlib-1': `#include <stdio.h>
#include <stdlib.h>

int main() {
    // calloc vs malloc
    int *a = (int*)malloc(20);
    int *b = (int*)calloc(5, 4);

    printf("malloc (sem zerar):\\n");
    a[0] = 10;
    a[1] = 20;
    printf("a[0]=%d, a[1]=%d\\n", a[0], a[1]);

    printf("\\ncalloc (zerado):\\n");
    printf("b[0]=%d, b[1]=%d, b[2]=%d\\n", b[0], b[1], b[2]);
    b[0] = 100;
    printf("Após b[0]=100: %d\\n", b[0]);

    free(a);
    free(b);
    return 0;
}`,
    'stdlib-2': `#include <stdio.h>
#include <stdlib.h>

int main() {
    // rand e srand
    srand(42);

    printf("Números pseudo-aleatórios (seed=42):\\n");
    for (int i = 0; i < 5; i++) {
        printf("  rand() = %d\\n", rand() % 100);
    }

    // atoi
    printf("\\natoi e abs:\\n");
    printf("atoi 123 = %d\\n", 123);
    printf("abs(-42) = %d\\n", abs(-42));
    printf("abs(42) = %d\\n", abs(42));

    return 0;
}`,

    // ── string.h ─────────────────────────────────────────────────────
    'string-1': `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int main() {
    // Alocando buffer para strings
    int *buf = (int*)malloc(64);

    // strcpy e strlen
    strcpy(buf, "Hello");
    printf("String: %s\\n", buf);
    printf("Tamanho: %d\\n", strlen(buf));

    // strcat
    strcat(buf, ", World!");
    printf("Concatenado: %s\\n", buf);
    printf("Novo tamanho: %d\\n", strlen(buf));

    // strcmp
    printf("\\nComparações:\\n");
    printf("strcmp abc, abd = %d\\n", strcmp("abc", "abd"));
    printf("strcmp abc, abc = %d\\n", strcmp("abc", "abc"));
    printf("strcmp abd, abc = %d\\n", strcmp("abd", "abc"));

    free(buf);
    return 0;
}`,

    // ── Switch/Case ──────────────────────────────────────────────────
    'switch-1': `#include <stdio.h>

int main() {
    int dia = 3;

    switch (dia) {
        case 1:
            printf("Segunda-feira\\n");
            break;
        case 2:
            printf("Terça-feira\\n");
            break;
        case 3:
            printf("Quarta-feira\\n");
            break;
        case 4:
            printf("Quinta-feira\\n");
            break;
        case 5:
            printf("Sexta-feira\\n");
            break;
        default:
            printf("Fim de semana!\\n");
            break;
    }

    return 0;
}`,

    // ── Operadores Bitwise ───────────────────────────────────────────
    'bitwise-1': `#include <stdio.h>

int main() {
    int a = 0b1010;
    int b = 0b1100;

    printf("a = %d (0b1010)\\n", a);
    printf("b = %d (0b1100)\\n", b);
    printf("a & b = %d (AND)\\n", a & b);
    printf("a | b = %d (OR)\\n", a | b);
    printf("a ^ b = %d (XOR)\\n", a ^ b);
    printf("~a = %d (NOT)\\n", ~a);
    printf("a << 2 = %d (shift left)\\n", a << 2);
    printf("b >> 1 = %d (shift right)\\n", b >> 1);

    return 0;
}`,

    // ── Ternário ─────────────────────────────────────────────────────
    'ternary-1': `#include <stdio.h>

int main() {
    int a = 10;
    int b = 20;

    int max = (a > b) ? a : b;
    int min = (a < b) ? a : b;

    printf("a = %d, b = %d\\n", a, b);
    printf("Máximo: %d\\n", max);
    printf("Mínimo: %d\\n", min);

    // Ternário aninhado
    int x = 15;
    char *cat = (x > 20) ? "grande" : (x > 10) ? "médio" : "pequeno";
    printf("%d é %s\\n", x, cat);

    return 0;
}`,

    // ── Escape sequences (mantidos) ──────────────────────────────────
    'escape-1': `#include <stdio.h>

int main() {
    printf("Line 1\\nLine 2\\nLine 3\\n");
    printf("Tab:\\tValor1\\tValor2\\n");
    printf("Backslash: \\\\\\n");
    printf("Aspas: \\"Hello\\"\\n");
    return 0;
}`,
    'escape-7': `#include <stdio.h>

int main() {
    int decimal = 255;
    int octal = 0377;
    int hex = 0xFF;
    int binary = 0b11111111;

    printf("Decimal: %d\\n", decimal);
    printf("Octal 0377: %d\\n", octal);
    printf("Hex 0xFF: %d\\n", hex);
    printf("Binary 0b11111111: %d\\n", binary);
    return 0;
}`,
};

examplesDropdown.addEventListener('change', (event) => {
    const selectedExample = event.target.value;
    if (selectedExample && examples[selectedExample]) {
        codeEditor.value = examples[selectedExample];
        examplesDropdown.value = '';
    }
});

// ═══════════════════════════════════════════════════════════════════════
// Keyboard Shortcuts
// ═══════════════════════════════════════════════════════════════════════

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
