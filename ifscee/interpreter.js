/**
 * Type System - Handles C type information and conversions
 * Supports structs, pointers, arrays, and all primitive types
 */
class TypeSystem {
    static structDefs = new Map(); // Global struct definitions

    static getSize(typeStr) {
        if (!typeStr) return 4;
        if (typeStr.includes('*')) return 8;
        // Struct type
        if (typeStr.startsWith('struct ')) {
            const structName = typeStr.replace('struct ', '').replace(/\s*\*/g, '').trim();
            const def = this.structDefs.get(structName);
            if (def) return def.totalSize;
            return 4; // fallback
        }
        if (typeStr.includes('double') || typeStr.includes('long long')) return 8;
        if (typeStr.includes('int') || typeStr.includes('float') || typeStr.includes('long')) return 4;
        if (typeStr.includes('short')) return 2;
        if (typeStr.includes('char') || typeStr.includes('_Bool')) return 1;
        return 4;
    }

    static isFloat(typeStr) {
        return typeStr ? (typeStr.includes('float') || typeStr.includes('double')) : false;
    }

    static isConst(typeStr) {
        return typeStr ? typeStr.includes('const') : false;
    }

    static isStruct(typeStr) {
        return typeStr ? typeStr.startsWith('struct ') && !typeStr.includes('*') : false;
    }

    static isStructPtr(typeStr) {
        return typeStr ? typeStr.startsWith('struct ') && typeStr.includes('*') : false;
    }

    static pegaStructName(typeStr) {
        if (!typeStr) return null;
        return typeStr.replace('struct ', '').replace(/\s*\*/g, '').trim();
    }

    static cast(value, typeStr) {
        if (value === null || value === undefined) return null;
        if (!typeStr) return value;
        if (typeStr.includes('_Bool')) return (value !== 0 && value !== false) ? 1 : 0;
        if (this.isStruct(typeStr)) return value; // Structs não recebem cast simples
        if (!this.isFloat(typeStr) && !typeStr.includes('*')) return Math.trunc(value);
        return value;
    }

    /**
     * Registra uma definição de struct.
     * Calcula offsets e tamanho total dos campos.
     */
    static registraStruct(name, fields) {
        let offset = 0;
        const layoutFields = [];

        for (const field of fields) {
            const fieldSize = field.ehArray
                ? this.getSize(field.fieldType) * field.totalLength
                : this.getSize(field.fieldType);

            layoutFields.push({
                name: field.name,
                type: field.fieldType,
                offset,
                size: fieldSize,
                ehArray: field.ehArray || false,
                arraySizes: field.arraySizes || [],
                totalLength: field.totalLength || 1,
            });
            offset += fieldSize;
        }

        const def = { name, fields: layoutFields, totalSize: offset };
        this.structDefs.set(name, def);
        return def;
    }

    static pegaStructDef(name) {
        return this.structDefs.get(name);
    }

    static pegaCampo(structName, fieldName) {
        const def = this.structDefs.get(structName);
        if (!def) throw new Error(`⚠️ STRUCT NÃO DEFINIDA: '${structName}' não foi declarada.`);
        const field = def.fields.find(f => f.name === fieldName);
        if (!field) {
            const available = def.fields.map(f => f.name).join(', ');
            throw new Error(`⚠️ CAMPO NÃO ENCONTRADO: '${fieldName}' não existe em 'struct ${structName}'.\n💡 Campos disponíveis: ${available}`);
        }
        return field;
    }
}

/**
 * Memory Manager - Simulates RAM with Stack, Heap, and Read-Only Data segments
 */
class MemoryManager {
    constructor() {
        this.ram = new Map();
        this.stackPointer = 1000; this.heapPointer = 5000; this.rodataPointer = 10000;
        this.allocations = new Map();
    }

    allocateStack(name, rawValue, typeStr) {
        const byteSize = TypeSystem.getSize(typeStr);
        const address = this.stackPointer; this.stackPointer += byteSize;
        const castedValue = TypeSystem.cast(rawValue, typeStr);
        this.ram.set(address, castedValue);
        this.allocations.set(address, { region: 'STACK', name, type: typeStr, byteSize, active: true, isConst: TypeSystem.isConst(typeStr) });
        return address;
    }

    freeStackRange(start, end) {
        for (let a = start; a < end; a++) {
            this.ram.delete(a);
            if (this.allocations.has(a)) this.allocations.get(a).active = false;
        }
        this.stackPointer = start;
    }

    allocateArray(name, dimensions, totalLength, typeStr) {
        const start = this.stackPointer; const byteSize = TypeSystem.getSize(typeStr);
        for (let i = 0; i < totalLength; i++) this.ram.set(start + (i * byteSize), null);
        this.stackPointer += (totalLength * byteSize);
        this.allocations.set(start, { region: 'STACK', name, type: typeStr, isArray: true, dimensions, totalLength, byteSize, active: true, isConst: TypeSystem.isConst(typeStr) });
        return start;
    }

    /**
     * Aloca uma struct na stack.
     * Cria slots individuais para cada campo.
     */
    allocateStruct(name, structName, typeStr) {
        const def = TypeSystem.pegaStructDef(structName);
        if (!def) throw new Error(`⚠️ STRUCT NÃO DEFINIDA: '${structName}'.`);

        const start = this.stackPointer;

        // Aloca memória para cada campo
        for (const field of def.fields) {
            if (field.ehArray) {
                for (let i = 0; i < field.totalLength; i++) {
                    this.ram.set(start + field.offset + (i * TypeSystem.getSize(field.type)), null);
                }
            } else {
                this.ram.set(start + field.offset, null);
            }
        }

        this.stackPointer += def.totalSize;
        this.allocations.set(start, {
            region: 'STACK', name, type: typeStr,
            isStruct: true, structName,
            fields: def.fields.map(f => ({ ...f })),
            totalSize: def.totalSize,
            byteSize: def.totalSize,
            active: true,
            isConst: TypeSystem.isConst(typeStr)
        });
        return start;
    }

    allocateHeap(size) {
        const start = this.heapPointer;
        for (let i = 0; i < size; i++) this.ram.set(this.heapPointer++, null);
        this.allocations.set(start, {
            region: 'HEAP', name: `malloc(${size})`, type: 'void*',
            isArray: true, dimensions: [size], totalLength: size,
            byteSize: 1, active: true
        });
        return start;
    }

    allocateHeapTyped(size, typeName) {
        const start = this.heapPointer;
        for (let i = 0; i < size; i++) this.ram.set(this.heapPointer++, null);
        this.allocations.set(start, {
            region: 'HEAP', name: `malloc(${size})`, type: typeName || 'void*',
            isArray: true, dimensions: [size], totalLength: size,
            byteSize: 1, active: true
        });
        return start;
    }

    freeHeapRange(address) {
        const meta = this.allocations.get(address);
        if (meta && meta.region === 'HEAP') {
            meta.active = false;
            for (let i = 0; i < meta.totalLength; i++) this.ram.delete(address + i);
        }
    }

    allocateStringLiteral(strValue) {
        const start = this.rodataPointer;
        for (let i = 0; i < strValue.length; i++) this.ram.set(this.rodataPointer++, strValue[i]);
        this.ram.set(this.rodataPointer++, '\0');
        this.allocations.set(start, {
            region: 'RODATA', name: `"${strValue.length > 20 ? strValue.substring(0, 20) + '...' : strValue}"`,
            type: 'char', isArray: true,
            dimensions: [strValue.length + 1], totalLength: strValue.length + 1,
            byteSize: 1, active: true
        });
        return start;
    }

    read(address) {
        if (!this.ram.has(address)) {
            const meta = this.getAllocationInfo(address);
            throw new Error(`⚠️ SEGMENTATION FAULT: Leitura no endereço ${address} (0x${address.toString(16).toUpperCase()})\n${meta}`);
        }
        return this.ram.get(address);
    }

    write(address, value) {
        if (!this.ram.has(address)) {
            const meta = this.getAllocationInfo(address);
            throw new Error(`⚠️ SEGMENTATION FAULT: Escrita no endereço ${address} (0x${address.toString(16).toUpperCase()})\n${meta}`);
        }
        this.ram.set(address, value);
    }

    /**
     * Lê uma string C (terminada em '\0') da RAM
     */
    readString(address) {
        let str = '';
        let currentAddr = address;
        let safety = 0;
        while (safety++ < 65536) {
            if (!this.ram.has(currentAddr)) break;
            const ch = this.ram.get(currentAddr++);
            if (ch === '\0' || ch === null || ch === undefined) break;
            str += ch;
        }
        return str;
    }

    /**
     * Escreve uma string C na RAM (com '\0' terminador)
     */
    writeString(address, str) {
        for (let i = 0; i < str.length; i++) {
            this.ram.set(address + i, str[i]);
        }
        this.ram.set(address + str.length, '\0');
    }

    getAllocationInfo(address) {
        let nearest = null;
        let minDistance = Infinity;
        for (const [addr, meta] of this.allocations) {
            if (meta.active) {
                const distance = Math.abs(address - addr);
                if (distance < minDistance) { minDistance = distance; nearest = { addr, meta }; }
            }
        }
        if (nearest) {
            const offset = address - nearest.addr;
            return `Endereço mais próximo: ${nearest.meta.name} em ${nearest.addr} (offset: ${offset >= 0 ? '+' : ''}${offset} bytes)`;
        }
        return 'Nenhuma alocação próxima encontrada.';
    }

    createSnapshot() {
        return {
            ram: new Map(this.ram),
            stackPointer: this.stackPointer,
            heapPointer: this.heapPointer,
            rodataPointer: this.rodataPointer,
            allocations: new Map(
                Array.from(this.allocations.entries()).map(([addr, meta]) => [
                    addr,
                    {
                        ...meta,
                        dimensions: meta.dimensions ? [...meta.dimensions] : undefined,
                        fields: meta.fields ? meta.fields.map(f => ({ ...f })) : undefined,
                    }
                ])
            )
        };
    }

    restoreSnapshot(snapshot) {
        this.ram = new Map(snapshot.ram);
        this.stackPointer = snapshot.stackPointer;
        this.heapPointer = snapshot.heapPointer;
        this.rodataPointer = snapshot.rodataPointer;
        this.allocations = new Map(
            Array.from(snapshot.allocations.entries()).map(([addr, meta]) => [
                addr,
                {
                    ...meta,
                    dimensions: meta.dimensions ? [...meta.dimensions] : undefined,
                    fields: meta.fields ? meta.fields.map(f => ({ ...f })) : undefined,
                }
            ])
        );
    }
}

/**
 * Environment (Symbol Table / Stack Frame)
 */
class Environment {
    constructor(memory, parent = null) {
        this.memory = memory; this.symbols = new Map(); this.parent = parent;
        this.basePointer = this.memory.stackPointer;
    }
    define(name, value, type = 'int') { this.symbols.set(name, this.memory.allocateStack(name, value, type)); }
    defineStruct(name, structName, typeStr) {
        const addr = this.memory.allocateStruct(name, structName, typeStr);
        this.symbols.set(name, addr);
        return addr;
    }
    get(name) {
        const symbolData = this.resolveAddress(name);
        if (typeof symbolData === 'object') return symbolData;
        const meta = this.memory.allocations.get(symbolData);
        if (meta && meta.isArray) return symbolData;
        if (meta && meta.isStruct) return symbolData; // Retorna endereço base da struct
        return this.memory.read(symbolData);
    }
    resolveAddress(name) {
        if (this.symbols.has(name)) return this.symbols.get(name);
        if (this.parent !== null) return this.parent.resolveAddress(name);
        const allVars = this.getAllVariableNames();
        const similar = allVars.filter(v => this.levenshtein(v, name) <= 2).slice(0, 3);
        const suggestion = similar.length > 0 ? `\n💡 Você quis dizer: ${similar.join(', ')}?` : '';
        throw new Error(`⚠️ VARIÁVEL NÃO DECLARADA: '${name}' não foi declarada neste escopo.${suggestion}`);
    }
    getAllVariableNames() {
        const names = Array.from(this.symbols.keys());
        if (this.parent !== null) names.push(...this.parent.getAllVariableNames());
        return names;
    }
    levenshtein(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
                else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
        return matrix[b.length][a.length];
    }
    destroy() { this.memory.freeStackRange(this.basePointer, this.memory.stackPointer); }
}

/**
 * IFSCee Interpreter - Executa a AST passo a passo
 */
class IFSCeeInterpreter {
    constructor(ast) {
        this.ast = ast;
        this.memory = new MemoryManager();
        this.globalScope = new Environment(this.memory);
        this.lastLine = null;
        this.callStack = [];
        this.maxCallStackDepth = 1000;
        this.typedefs = new Map();
        this.randSeed = 42; // Seed padrão do rand()
        TypeSystem.structDefs = new Map(); // Reset entre execuções
        this.registerBuiltIns();
    }

    // ═══════════════════════════════════════════════════════════════════
    // Built-in Functions Registration
    // ═══════════════════════════════════════════════════════════════════

    registerBuiltIns() {
        const self = this;

        // ─── stdlib.h ────────────────────────────────────────────────
        this.globalScope.symbols.set('malloc', { type: 'BuiltIn', execute: function*(args, i) {
            if (args[0] <= 0) return 0; // NULL
            return i.memory.allocateHeap(args[0]);
        }});

        this.globalScope.symbols.set('calloc', { type: 'BuiltIn', execute: function*(args, i) {
            const n = args[0] || 0;
            const size = args[1] || 0;
            const total = n * size;
            if (total <= 0) return 0;
            const addr = i.memory.allocateHeap(total);
            // calloc zera a memória
            for (let j = 0; j < total; j++) i.memory.write(addr + j, 0);
            return addr;
        }});

        this.globalScope.symbols.set('realloc', { type: 'BuiltIn', execute: function*(args, i) {
            const oldAddr = args[0] || 0;
            const newSize = args[1] || 0;
            if (oldAddr === 0) return i.memory.allocateHeap(newSize);
            if (newSize === 0) { i.memory.freeHeapRange(oldAddr); return 0; }

            const oldMeta = i.memory.allocations.get(oldAddr);
            const oldSize = oldMeta ? oldMeta.totalLength : 0;
            const newAddr = i.memory.allocateHeap(newSize);

            // Copia dados antigos
            const copyLen = Math.min(oldSize, newSize);
            for (let j = 0; j < copyLen; j++) {
                if (i.memory.ram.has(oldAddr + j)) {
                    i.memory.ram.set(newAddr + j, i.memory.ram.get(oldAddr + j));
                }
            }

            i.memory.freeHeapRange(oldAddr);
            return newAddr;
        }});

        this.globalScope.symbols.set('free', { type: 'BuiltIn', execute: function*(args, i) {
            if (args[0] && args[0] !== 0) i.memory.freeHeapRange(args[0]);
            return null;
        }});

        this.globalScope.symbols.set('atoi', { type: 'BuiltIn', execute: function*(args, i) {
            const str = typeof args[0] === 'number' ? i.memory.readString(args[0]) : String(args[0]);
            const match = str.trim().match(/^[+-]?\d+/);
            return match ? parseInt(match[0], 10) : 0;
        }});

        this.globalScope.symbols.set('atof', { type: 'BuiltIn', execute: function*(args, i) {
            const str = typeof args[0] === 'number' ? i.memory.readString(args[0]) : String(args[0]);
            return parseFloat(str) || 0.0;
        }});

        this.globalScope.symbols.set('atol', { type: 'BuiltIn', execute: function*(args, i) {
            const str = typeof args[0] === 'number' ? i.memory.readString(args[0]) : String(args[0]);
            const match = str.trim().match(/^[+-]?\d+/);
            return match ? parseInt(match[0], 10) : 0;
        }});

        this.globalScope.symbols.set('abs', { type: 'BuiltIn', execute: function*(args) {
            return Math.abs(args[0] || 0);
        }});

        this.globalScope.symbols.set('rand', { type: 'BuiltIn', execute: function*(args, i) {
            // LCG: mesmos parâmetros do glibc
            self.randSeed = (1103515245 * self.randSeed + 12345) & 0x7FFFFFFF;
            return self.randSeed;
        }});

        this.globalScope.symbols.set('srand', { type: 'BuiltIn', execute: function*(args) {
            self.randSeed = args[0] || 0;
            return null;
        }});

        this.globalScope.symbols.set('exit', { type: 'BuiltIn', execute: function*(args, i) {
            const code = args[0] || 0;
            yield { type: 'PROGRAM_END', exitCode: code, previousLine: self.lastLine, memory: i.memory };
            throw new Error(`__EXIT_${code}__`);
        }});

        // ─── stdio.h ─────────────────────────────────────────────────

        // printf completo com width, precision, flags, length modifiers
        this.globalScope.symbols.set('printf', { type: 'BuiltIn', execute: function*(args, i) {
            if (args.length === 0) return 0;
            const output = self.formatPrintf(args, i);
            yield { type: 'TERMINAL_PRINT', output };
            return output.length;
        }});

        this.globalScope.symbols.set('sprintf', { type: 'BuiltIn', execute: function*(args, i) {
            if (args.length < 2) return 0;
            const bufAddr = args[0];
            const fmtArgs = args.slice(1);
            const output = self.formatPrintf(fmtArgs, i, true); // true = raw (sem <br>)
            i.memory.writeString(bufAddr, output);
            return output.length;
        }});

        this.globalScope.symbols.set('snprintf', { type: 'BuiltIn', execute: function*(args, i) {
            if (args.length < 3) return 0;
            const bufAddr = args[0];
            const maxLen = args[1];
            const fmtArgs = args.slice(2);
            let output = self.formatPrintf(fmtArgs, i, true);
            if (output.length >= maxLen) output = output.substring(0, maxLen - 1);
            i.memory.writeString(bufAddr, output);
            return output.length;
        }});

        this.globalScope.symbols.set('fprintf', { type: 'BuiltIn', execute: function*(args, i) {
            // fprintf(stream, format, ...) - ignora stream, imprime no terminal
            if (args.length < 2) return 0;
            const fmtArgs = args.slice(1);
            const output = self.formatPrintf(fmtArgs, i);
            yield { type: 'TERMINAL_PRINT', output };
            return output.length;
        }});

        this.globalScope.symbols.set('puts', { type: 'BuiltIn', execute: function*(args, i) {
            const str = typeof args[0] === 'number' ? i.memory.readString(args[0]) : String(args[0] || '');
            yield { type: 'TERMINAL_PRINT', output: str + '<br>' };
            return str.length + 1;
        }});

        this.globalScope.symbols.set('putchar', { type: 'BuiltIn', execute: function*(args) {
            const ch = typeof args[0] === 'number' ? String.fromCharCode(args[0]) : args[0];
            yield { type: 'TERMINAL_PRINT', output: ch === '\n' ? '<br>' : ch };
            return args[0];
        }});

        // scanf básico (não-interativo, retorna 0)
        this.globalScope.symbols.set('scanf', { type: 'BuiltIn', execute: function*(args, i) {
            yield { type: 'TERMINAL_PRINT', output: '<em style="color:#ffaa00;">[scanf não suportado interativamente]</em>' };
            return 0;
        }});

        // ─── string.h ────────────────────────────────────────────────

        this.globalScope.symbols.set('strlen', { type: 'BuiltIn', execute: function*(args, i) {
            const str = typeof args[0] === 'number' ? i.memory.readString(args[0]) : String(args[0] || '');
            return str.length;
        }});

        this.globalScope.symbols.set('strcpy', { type: 'BuiltIn', execute: function*(args, i) {
            const dest = args[0];
            const src = typeof args[1] === 'number' ? i.memory.readString(args[1]) : String(args[1] || '');
            i.memory.writeString(dest, src);
            return dest;
        }});

        this.globalScope.symbols.set('strncpy', { type: 'BuiltIn', execute: function*(args, i) {
            const dest = args[0];
            let src = typeof args[1] === 'number' ? i.memory.readString(args[1]) : String(args[1] || '');
            const n = args[2] || 0;
            if (src.length > n) src = src.substring(0, n);
            i.memory.writeString(dest, src);
            // Preenche com '\0' até n
            for (let j = src.length + 1; j < n; j++) {
                if (i.memory.ram.has(dest + j)) i.memory.write(dest + j, '\0');
            }
            return dest;
        }});

        this.globalScope.symbols.set('strcat', { type: 'BuiltIn', execute: function*(args, i) {
            const dest = args[0];
            const destStr = i.memory.readString(dest);
            const src = typeof args[1] === 'number' ? i.memory.readString(args[1]) : String(args[1] || '');
            i.memory.writeString(dest, destStr + src);
            return dest;
        }});

        this.globalScope.symbols.set('strncat', { type: 'BuiltIn', execute: function*(args, i) {
            const dest = args[0];
            const destStr = i.memory.readString(dest);
            let src = typeof args[1] === 'number' ? i.memory.readString(args[1]) : String(args[1] || '');
            const n = args[2] || 0;
            if (src.length > n) src = src.substring(0, n);
            i.memory.writeString(dest, destStr + src);
            return dest;
        }});

        this.globalScope.symbols.set('strcmp', { type: 'BuiltIn', execute: function*(args, i) {
            const a = typeof args[0] === 'number' ? i.memory.readString(args[0]) : String(args[0] || '');
            const b = typeof args[1] === 'number' ? i.memory.readString(args[1]) : String(args[1] || '');
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        }});

        this.globalScope.symbols.set('strncmp', { type: 'BuiltIn', execute: function*(args, i) {
            let a = typeof args[0] === 'number' ? i.memory.readString(args[0]) : String(args[0] || '');
            let b = typeof args[1] === 'number' ? i.memory.readString(args[1]) : String(args[1] || '');
            const n = args[2] || 0;
            a = a.substring(0, n); b = b.substring(0, n);
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        }});

        this.globalScope.symbols.set('strchr', { type: 'BuiltIn', execute: function*(args, i) {
            const str = typeof args[0] === 'number' ? i.memory.readString(args[0]) : '';
            const ch = typeof args[1] === 'number' ? String.fromCharCode(args[1]) : args[1];
            const idx = str.indexOf(ch);
            return idx >= 0 ? args[0] + idx : 0; // NULL se não encontrou
        }});

        this.globalScope.symbols.set('strstr', { type: 'BuiltIn', execute: function*(args, i) {
            const haystack = typeof args[0] === 'number' ? i.memory.readString(args[0]) : '';
            const needle = typeof args[1] === 'number' ? i.memory.readString(args[1]) : '';
            const idx = haystack.indexOf(needle);
            return idx >= 0 ? args[0] + idx : 0;
        }});

        this.globalScope.symbols.set('memcpy', { type: 'BuiltIn', execute: function*(args, i) {
            const dest = args[0]; const src = args[1]; const n = args[2] || 0;
            for (let j = 0; j < n; j++) {
                if (i.memory.ram.has(src + j)) {
                    i.memory.ram.set(dest + j, i.memory.ram.get(src + j));
                }
            }
            return dest;
        }});

        this.globalScope.symbols.set('memmove', { type: 'BuiltIn', execute: function*(args, i) {
            const dest = args[0]; const src = args[1]; const n = args[2] || 0;
            // Copia para buffer temporário primeiro
            const buf = [];
            for (let j = 0; j < n; j++) buf.push(i.memory.ram.has(src + j) ? i.memory.ram.get(src + j) : null);
            for (let j = 0; j < n; j++) i.memory.ram.set(dest + j, buf[j]);
            return dest;
        }});

        this.globalScope.symbols.set('memset', { type: 'BuiltIn', execute: function*(args, i) {
            const addr = args[0]; const val = args[1] || 0; const n = args[2] || 0;
            for (let j = 0; j < n; j++) {
                if (i.memory.ram.has(addr + j)) i.memory.write(addr + j, val & 0xFF);
                else i.memory.ram.set(addr + j, val & 0xFF);
            }
            return addr;
        }});

        this.globalScope.symbols.set('memcmp', { type: 'BuiltIn', execute: function*(args, i) {
            const a = args[0]; const b = args[1]; const n = args[2] || 0;
            for (let j = 0; j < n; j++) {
                const va = i.memory.ram.has(a + j) ? i.memory.ram.get(a + j) : 0;
                const vb = i.memory.ram.has(b + j) ? i.memory.ram.get(b + j) : 0;
                if (va < vb) return -1;
                if (va > vb) return 1;
            }
            return 0;
        }});

        // ─── math.h ──────────────────────────────────────────────────
        const mathFns = {
            'sin': Math.sin, 'cos': Math.cos, 'tan': Math.tan,
            'asin': Math.asin, 'acos': Math.acos, 'atan': Math.atan,
            'exp': Math.exp, 'log': Math.log, 'log10': Math.log10,
            'sqrt': Math.sqrt, 'ceil': Math.ceil, 'floor': Math.floor,
            'fabs': Math.abs, 'round': Math.round,
        };
        for (const [name, fn] of Object.entries(mathFns)) {
            this.globalScope.symbols.set(name, { type: 'BuiltIn', execute: function*(args) { return fn(args[0] || 0); } });
        }
        this.globalScope.symbols.set('pow', { type: 'BuiltIn', execute: function*(args) { return Math.pow(args[0] || 0, args[1] || 0); } });
        this.globalScope.symbols.set('atan2', { type: 'BuiltIn', execute: function*(args) { return Math.atan2(args[0] || 0, args[1] || 0); } });
        this.globalScope.symbols.set('fmod', { type: 'BuiltIn', execute: function*(args) { return (args[0] || 0) % (args[1] || 1); } });

        // ─── ctype.h ─────────────────────────────────────────────────
        this.globalScope.symbols.set('isalpha', { type: 'BuiltIn', execute: function*(args) { const c = args[0] || 0; return ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) ? 1 : 0; } });
        this.globalScope.symbols.set('isdigit', { type: 'BuiltIn', execute: function*(args) { const c = args[0] || 0; return (c >= 48 && c <= 57) ? 1 : 0; } });
        this.globalScope.symbols.set('isspace', { type: 'BuiltIn', execute: function*(args) { const c = args[0] || 0; return (c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12) ? 1 : 0; } });
        this.globalScope.symbols.set('isalnum', { type: 'BuiltIn', execute: function*(args) { const c = args[0] || 0; return ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) ? 1 : 0; } });
        this.globalScope.symbols.set('isupper', { type: 'BuiltIn', execute: function*(args) { const c = args[0] || 0; return (c >= 65 && c <= 90) ? 1 : 0; } });
        this.globalScope.symbols.set('islower', { type: 'BuiltIn', execute: function*(args) { const c = args[0] || 0; return (c >= 97 && c <= 122) ? 1 : 0; } });
        this.globalScope.symbols.set('toupper', { type: 'BuiltIn', execute: function*(args) { const c = args[0] || 0; return (c >= 97 && c <= 122) ? c - 32 : c; } });
        this.globalScope.symbols.set('tolower', { type: 'BuiltIn', execute: function*(args) { const c = args[0] || 0; return (c >= 65 && c <= 90) ? c + 32 : c; } });
    }

    // ═══════════════════════════════════════════════════════════════════
    // printf formatter completo
    // ═══════════════════════════════════════════════════════════════════

    formatPrintf(args, interp, raw = false) {
        if (args.length === 0) return '';
        const readStr = (address) => interp.memory.readString(address);

        let formatString = typeof args[0] === 'number' ? readStr(args[0]) : String(args[0]);
        let output = '';
        let argIndex = 1;

        for (let j = 0; j < formatString.length; j++) {
            const ch = formatString[j];

            if (ch === '%' && j + 1 < formatString.length) {
                j++; // avança past '%'

                // Parse flags
                let flags = '';
                while ('-+0 #'.includes(formatString[j])) { flags += formatString[j++]; }

                // Parse width
                let width = '';
                if (formatString[j] === '*') { width = args[argIndex++] || 0; j++; }
                else { while (formatString[j] >= '0' && formatString[j] <= '9') { width += formatString[j++]; } }
                width = width ? parseInt(width) : 0;

                // Parse precision
                let precision = -1;
                if (formatString[j] === '.') {
                    j++;
                    let precStr = '';
                    if (formatString[j] === '*') { precision = args[argIndex++] || 0; j++; }
                    else { while (formatString[j] >= '0' && formatString[j] <= '9') { precStr += formatString[j++]; } }
                    if (precStr) precision = parseInt(precStr);
                    else if (precision === -1) precision = 0;
                }

                // Parse length modifier
                let length = '';
                if (formatString[j] === 'h') { length = 'h'; j++; if (formatString[j] === 'h') { length = 'hh'; j++; } }
                else if (formatString[j] === 'l') { length = 'l'; j++; if (formatString[j] === 'l') { length = 'll'; j++; } }
                else if (formatString[j] === 'z') { length = 'z'; j++; }
                else if (formatString[j] === 'L') { length = 'L'; j++; }

                const specifier = formatString[j];
                const value = args[argIndex] !== undefined ? args[argIndex] : 0;
                let formatted = '';

                switch (specifier) {
                    case 'd': case 'i': {
                        formatted = String(Math.trunc(Number(value)));
                        if (flags.includes('+') && Number(value) >= 0) formatted = '+' + formatted;
                        else if (flags.includes(' ') && Number(value) >= 0) formatted = ' ' + formatted;
                        argIndex++; break;
                    }
                    case 'u': {
                        formatted = String(Math.trunc(Number(value)) >>> 0);
                        argIndex++; break;
                    }
                    case 'o': {
                        formatted = (Math.trunc(Number(value)) >>> 0).toString(8);
                        if (flags.includes('#') && formatted[0] !== '0') formatted = '0' + formatted;
                        argIndex++; break;
                    }
                    case 'x': {
                        formatted = (Math.trunc(Number(value)) >>> 0).toString(16);
                        if (flags.includes('#') && Number(value) !== 0) formatted = '0x' + formatted;
                        argIndex++; break;
                    }
                    case 'X': {
                        formatted = (Math.trunc(Number(value)) >>> 0).toString(16).toUpperCase();
                        if (flags.includes('#') && Number(value) !== 0) formatted = '0X' + formatted;
                        argIndex++; break;
                    }
                    case 'f': case 'F': {
                        const prec = precision >= 0 ? precision : 6;
                        formatted = Number(value).toFixed(prec);
                        if (flags.includes('+') && Number(value) >= 0) formatted = '+' + formatted;
                        argIndex++; break;
                    }
                    case 'e': {
                        const prec = precision >= 0 ? precision : 6;
                        formatted = Number(value).toExponential(prec);
                        argIndex++; break;
                    }
                    case 'E': {
                        const prec = precision >= 0 ? precision : 6;
                        formatted = Number(value).toExponential(prec).toUpperCase();
                        argIndex++; break;
                    }
                    case 'g': case 'G': {
                        const prec = precision >= 0 ? precision : 6;
                        const f = Number(value);
                        const exp = Math.floor(Math.log10(Math.abs(f || 1)));
                        formatted = (exp < -4 || exp >= prec)
                            ? f.toExponential(prec - 1)
                            : f.toPrecision(prec);
                        // Remove trailing zeros
                        if (formatted.includes('.') && !flags.includes('#')) {
                            formatted = formatted.replace(/\.?0+$/, '');
                        }
                        if (specifier === 'G') formatted = formatted.toUpperCase();
                        argIndex++; break;
                    }
                    case 'c': {
                        formatted = typeof value === 'number' ? String.fromCharCode(value) : String(value);
                        argIndex++; break;
                    }
                    case 's': {
                        formatted = typeof value === 'number' ? readStr(value) : String(value);
                        if (precision >= 0 && formatted.length > precision) {
                            formatted = formatted.substring(0, precision);
                        }
                        argIndex++; break;
                    }
                    case 'p': {
                        formatted = '0x' + Number(value).toString(16).toUpperCase();
                        argIndex++; break;
                    }
                    case 'n': {
                        // %n escreve a quantidade de chars já impressos
                        if (typeof value === 'number' && value > 0) {
                            interp.memory.write(value, output.length);
                        }
                        argIndex++; break;
                    }
                    case '%': {
                        formatted = '%';
                        break;
                    }
                    default: {
                        formatted = '%' + specifier;
                    }
                }

                // Apply width padding
                if (width > 0 && formatted.length < width) {
                    const padChar = flags.includes('0') && !flags.includes('-') ? '0' : ' ';
                    if (flags.includes('-')) {
                        formatted = formatted.padEnd(width, ' ');
                    } else {
                        // Para números com sinal e zero-padding, o sinal vai antes do padding
                        if (padChar === '0' && (formatted[0] === '-' || formatted[0] === '+')) {
                            formatted = formatted[0] + formatted.substring(1).padStart(width - 1, '0');
                        } else {
                            formatted = formatted.padStart(width, padChar);
                        }
                    }
                }

                output += formatted;
            }
            else if (ch === '\n') { output += raw ? '\n' : '<br>'; }
            else if (ch === '\t') { output += raw ? '\t' : '&nbsp;&nbsp;&nbsp;&nbsp;'; }
            else if (ch === '\r') { /* ignorado em HTML */ }
            else if (ch === '\0') { break; }
            else { output += ch; }
        }
        return output;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Array helper
    // ═══════════════════════════════════════════════════════════════════

    getFlatOffset(dimensions, indices, line) {
        if (indices.length > dimensions.length) {
            throw new Error(`[Linha ${line}] ⚠️ ERRO DE INDEXAÇÃO: ${indices.length} dimensões para array de ${dimensions.length}.\n💡 Verifique os colchetes [].`);
        }
        let flatOffset = 0;
        for (let i = 0; i < indices.length; i++) {
            if (indices[i] < 0 || indices[i] >= dimensions[i]) {
                throw new Error(`[Linha ${line}] ⚠️ ARRAY OUT OF BOUNDS: Índice [${indices[i]}] na dimensão ${i}.\nLimites: 0 a ${dimensions[i] - 1}`);
            }
            let chunk = indices[i];
            for (let j = i + 1; j < dimensions.length; j++) chunk *= dimensions[j];
            flatOffset += chunk;
        }
        return flatOffset;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Main execution loop
    // ═══════════════════════════════════════════════════════════════════

    *interpret() {
        try {
            yield* this.visit(this.ast, this.globalScope);
        } catch (e) {
            if (e.message && e.message.startsWith('__EXIT_')) {
                return; // exit() chamado
            }
            yield { type: 'ERROR', message: e.message, previousLine: this.lastLine };
        }
    }

    *visit(node, env) {
        if (!node) return null;

        const stepNodes = ['VariableDeclaration', 'ArrayDeclaration', 'StructDeclaration',
            'AssignmentExpression', 'ReturnStatement', 'CallExpression', 'IfStatement',
            'WhileStatement', 'ForStatement', 'DoWhileStatement', 'SwitchStatement',
            'BreakStatement', 'ContinueStatement'];

        if (stepNodes.includes(node.type)) {
            const memorySnapshot = this.memory.createSnapshot();
            yield { type: 'STEP', nextLine: node.line, previousLine: this.lastLine, memory: this.memory, memorySnapshot };
            this.lastLine = node.line;
        }

        switch (node.type) {
            case 'Program': return yield* this.visitProgram(node, env);
            case 'FunctionDeclaration': return yield* this.visitFunctionDeclaration(node, env);
            case 'VariableDeclaration': return yield* this.visitVariableDeclaration(node, env);
            case 'ArrayDeclaration': return yield* this.visitArrayDeclaration(node, env);
            case 'StructDefinition': return yield* this.visitStructDefinition(node, env);
            case 'StructDeclaration': return yield* this.visitStructDeclaration(node, env);
            case 'StructDefAndDecl': {
                yield* this.visitStructDefinition(node.definition, env);
                return yield* this.visitStructDeclaration(node.declaration, env);
            }
            case 'TypedefDeclaration': return yield* this.visitTypedef(node, env);
            case 'AssignmentExpression': return yield* this.visitAssignment(node, env);
            case 'UnaryExpression': return yield* this.visitUnary(node, env);
            case 'IndexExpression': return yield* this.visitIndex(node, env);
            case 'MemberExpression': return yield* this.visitMemberExpression(node, env);
            case 'CallExpression': return yield* this.visitCall(node, env);
            case 'BinaryExpression': return yield* this.visitBinary(node, env);
            case 'TernaryExpression': return yield* this.visitTernary(node, env);
            case 'ReturnStatement': return yield* this.visitReturn(node, env);
            case 'IfStatement': return yield* this.visitIf(node, env);
            case 'WhileStatement': return yield* this.visitWhile(node, env);
            case 'DoWhileStatement': return yield* this.visitDoWhile(node, env);
            case 'ForStatement': return yield* this.visitFor(node, env);
            case 'SwitchStatement': return yield* this.visitSwitch(node, env);
            case 'BreakStatement': return { type: 'BREAK' };
            case 'ContinueStatement': return { type: 'CONTINUE' };
            case 'Literal': return this.visitLiteral(node);
            case 'Identifier': return env.get(node.name);
            case 'CompoundLiteral': return yield* this.visitCompoundLiteral(node, env);
            default: throw new Error(`Nó AST não implementado: ${node.type}`);
        }
    }

    *visitProgram(node, env) {
        // Primeiro passo: registra structs e typedefs, depois funções
        for (const s of node.body) {
            if (s.type === 'StructDefinition') yield* this.visit(s, env);
            if (s.type === 'TypedefDeclaration') yield* this.visit(s, env);
            if (s.type === 'StructDefAndDecl') yield* this.visitStructDefinition(s.definition, env);
        }
        for (const s of node.body) {
            if (s.type === 'FunctionDeclaration') yield* this.visit(s, env);
        }
        // Depois: variáveis globais e structs
        for (const s of node.body) {
            if (s.type === 'StructDeclaration' || s.type === 'VariableDeclaration' || s.type === 'ArrayDeclaration') {
                yield* this.visit(s, env);
            }
            if (s.type === 'StructDefAndDecl') yield* this.visitStructDeclaration(s.declaration, env);
        }

        let main;
        try { main = env.get('main'); } catch (e) {
            throw new Error("⚠️ ERRO FATAL: Função 'main' não encontrada.\n💡 Todo programa C precisa de: int main() { ... }");
        }
        if (!main || main.type !== 'FunctionDeclaration') {
            throw new Error("⚠️ ERRO FATAL: 'main' não é uma função válida.");
        }
        const r = yield* this.visitBlock(main.body, new Environment(this.memory, env));
        const exitCode = (r && r.type === 'RETURN') ? r.value : 0;
        yield { type: 'PROGRAM_END', exitCode, previousLine: this.lastLine, memory: this.memory };
        return exitCode;
    }

    *visitFunctionDeclaration(node, env) { env.symbols.set(node.name, node); return null; }

    *visitBlock(statements, env) {
        for (const s of statements) {
            const r = yield* this.visit(s, env);
            if (r && (r.type === 'RETURN' || r.type === 'BREAK' || r.type === 'CONTINUE')) return r;
        }
        return null;
    }

    // ─── Struct handling ─────────────────────────────────────────────

    *visitStructDefinition(node, env) {
        const fields = [];
        for (const f of node.fields) {
            let totalLength = 1;
            const arraySizes = [];
            if (f.ehArray && f.arraySizes) {
                for (const sizeExpr of f.arraySizes) {
                    const size = yield* this.visit(sizeExpr, env);
                    arraySizes.push(size);
                    totalLength *= size;
                }
            }
            fields.push({
                name: f.name,
                fieldType: f.fieldType,
                ehArray: f.ehArray || false,
                arraySizes,
                totalLength,
            });
        }
        TypeSystem.registraStruct(node.structName, fields);
        return null;
    }

    *visitStructDeclaration(node, env) {
        const structName = node.structName;

        // Ponteiro para struct?
        if (node.varType && node.varType.includes('*')) {
            let val = null;
            if (node.initExpression) val = yield* this.visit(node.initExpression, env);
            env.define(node.varName, val, node.varType);
            const memorySnapshot = this.memory.createSnapshot();
            yield { type: 'MEM_UPDATE', memory: this.memory, memorySnapshot };
            return null;
        }

        const addr = env.defineStruct(node.varName, structName, node.varType);

        // Inicialização
        if (node.initExpression) {
            if (node.initExpression.type === 'StructInitializer') {
                yield* this.initStructFromInitializer(addr, structName, node.initExpression, env);
            } else {
                // Copiar de outra struct (atribuição)
                const srcAddr = yield* this.visit(node.initExpression, env);
                yield* this.copyStruct(addr, srcAddr, structName);
            }
        }

        const memorySnapshot = this.memory.createSnapshot();
        yield { type: 'MEM_UPDATE', memory: this.memory, memorySnapshot };
        return null;
    }

    *initStructFromInitializer(baseAddr, structName, initNode, env) {
        const def = TypeSystem.pegaStructDef(structName);
        if (!def) throw new Error(`Struct '${structName}' não definida.`);

        let fieldIdx = 0;
        for (const item of initNode.values) {
            let field;
            if (item.designator) {
                // Designated: .campo = valor
                field = def.fields.find(f => f.name === item.designator);
                if (!field) throw new Error(`Campo '${item.designator}' não existe em struct ${structName}.`);
                fieldIdx = def.fields.indexOf(field);
            } else {
                // Positional
                if (fieldIdx >= def.fields.length) break;
                field = def.fields[fieldIdx];
            }

            const value = yield* this.visit(item.value, env);

            if (field.ehArray && typeof value === 'number') {
                // String literal para char array
                const str = this.memory.readString(value);
                for (let k = 0; k < str.length && k < field.totalLength; k++) {
                    this.memory.write(baseAddr + field.offset + k, str[k]);
                }
                if (str.length < field.totalLength) {
                    this.memory.write(baseAddr + field.offset + str.length, '\0');
                }
            } else {
                const castedVal = TypeSystem.cast(value, field.type);
                this.memory.write(baseAddr + field.offset, castedVal);
            }
            fieldIdx++;
        }
    }

    *copyStruct(destAddr, srcAddr, structName) {
        const def = TypeSystem.pegaStructDef(structName);
        if (!def) return;
        for (const field of def.fields) {
            if (field.ehArray) {
                const elemSize = TypeSystem.getSize(field.type);
                for (let i = 0; i < field.totalLength; i++) {
                    const val = this.memory.ram.has(srcAddr + field.offset + (i * elemSize))
                        ? this.memory.ram.get(srcAddr + field.offset + (i * elemSize)) : null;
                    this.memory.ram.set(destAddr + field.offset + (i * elemSize), val);
                }
            } else {
                const val = this.memory.ram.has(srcAddr + field.offset) ? this.memory.ram.get(srcAddr + field.offset) : null;
                this.memory.ram.set(destAddr + field.offset, val);
            }
        }
    }

    *visitMemberExpression(node, env) {
        if (node.ehSeta) {
            // ptr->campo: primeiro pega o endereço armazenado no ponteiro
            const ptrAddr = yield* this.visit(node.object, env);
            if (ptrAddr === 0 || ptrAddr === null) {
                throw new Error(`[Linha ${node.line}] ⚠️ NULL POINTER DEREFERENCE: Tentativa de acessar campo '${node.field}' via ponteiro nulo.\n💡 Inicialize o ponteiro com malloc() antes de usar ->.`);
            }
            // Descobre o tipo struct
            const structName = this.resolveStructNameFromExpr(node.object, env);
            const field = TypeSystem.pegaCampo(structName, node.field);
            return this.memory.read(ptrAddr + field.offset);
        } else {
            // obj.campo: pega o endereço base da struct
            const baseAddr = this.resolveStructAddress(node.object, env);
            const structName = this.resolveStructNameFromExpr(node.object, env);
            const field = TypeSystem.pegaCampo(structName, node.field);

            if (field.ehArray) {
                return baseAddr + field.offset; // Retorna endereço do array
            }
            return this.memory.read(baseAddr + field.offset);
        }
    }

    /**
     * Resolve o endereço base de uma expressão struct (para . access)
     */
    resolveStructAddress(expr, env) {
        if (expr.type === 'Identifier') {
            return env.resolveAddress(expr.name);
        }
        if (expr.type === 'MemberExpression') {
            if (expr.ehSeta) {
                // ptr->campo → endereço armazenado no ponteiro
                const ptrAddr = env.resolveAddress(expr.object.name || '');
                return this.memory.read(ptrAddr);
            }
            const parentAddr = this.resolveStructAddress(expr.object, env);
            const parentStructName = this.resolveStructNameFromExpr(expr.object, env);
            const field = TypeSystem.pegaCampo(parentStructName, expr.field);
            return parentAddr + field.offset;
        }
        return env.resolveAddress(expr.name || '');
    }

    /**
     * Resolve o nome da struct de uma expressão
     */
    resolveStructNameFromExpr(expr, env) {
        if (expr.type === 'Identifier') {
            const addr = env.resolveAddress(expr.name);
            const meta = this.memory.allocations.get(addr);
            if (meta && meta.isStruct) return meta.structName;
            if (meta && meta.type) {
                // Ponteiro para struct
                const typeStr = meta.type;
                if (typeStr.startsWith('struct ')) {
                    return TypeSystem.pegaStructName(typeStr);
                }
            }
            // Tenta resolver via typedef ou tipo do ponteiro
            const val = env.get(expr.name);
            if (typeof val === 'number') {
                // Pode ser ponteiro: procura pela meta do ponteiro
                if (meta && meta.type && meta.type.includes('struct')) {
                    return TypeSystem.pegaStructName(meta.type);
                }
            }
            throw new Error(`⚠️ '${expr.name}' não é uma struct conhecida.`);
        }
        if (expr.type === 'UnaryExpression' && expr.operator === '*') {
            // *ptr — a struct apontada
            return this.resolveStructNameFromExpr(expr.argument, env);
        }
        if (expr.type === 'MemberExpression') {
            // Resolve tipo do campo
            const parentStructName = this.resolveStructNameFromExpr(expr.object, env);
            const field = TypeSystem.pegaCampo(parentStructName, expr.field);
            if (field.type.startsWith('struct ')) return TypeSystem.pegaStructName(field.type);
        }
        throw new Error(`Não foi possível determinar o tipo struct da expressão.`);
    }

    /**
     * Resolve o endereço de um MemberExpression como l-value (para atribuição)
     */
    *resolveMemberAddress(node, env) {
        if (node.ehSeta) {
            const ptrVal = yield* this.visit(node.object, env);
            if (ptrVal === 0 || ptrVal === null) {
                throw new Error(`[Linha ${node.line}] ⚠️ NULL POINTER DEREFERENCE via '->'.`);
            }
            const structName = this.resolveStructNameFromExpr(node.object, env);
            const field = TypeSystem.pegaCampo(structName, node.field);
            return ptrVal + field.offset;
        } else {
            const baseAddr = this.resolveStructAddress(node.object, env);
            const structName = this.resolveStructNameFromExpr(node.object, env);
            const field = TypeSystem.pegaCampo(structName, node.field);
            return baseAddr + field.offset;
        }
    }

    *visitTypedef(node, env) {
        if (node.ehStruct && node.structDef) {
            yield* this.visitStructDefinition(node.structDef, env);
        }
        this.typedefs.set(node.newName, node.originalType);
        return null;
    }

    *visitCompoundLiteral(node, env) {
        // (Type){...} — usado principalmente com structs
        if (node.castType && node.castType.startsWith('struct ') && node.initializer) {
            const structName = TypeSystem.pegaStructName(node.castType);
            const def = TypeSystem.pegaStructDef(structName);
            if (!def) throw new Error(`Struct '${structName}' não definida para compound literal.`);

            // Aloca temporário na stack
            const addr = this.memory.allocateStruct('__compound_lit', structName, node.castType);
            this.memory.allocations.get(addr).name = '(compound literal)';

            yield* this.initStructFromInitializer(addr, structName, node.initializer, env);
            return addr; // Retorna endereço base
        }
        return null;
    }

    // ─── Standard visit methods ──────────────────────────────────────

    *visitVariableDeclaration(node, env) {
        let val = null;
        if (node.initExpression) val = yield* this.visit(node.initExpression, env);
        env.define(node.name, val, node.varType);
        const memorySnapshot = this.memory.createSnapshot();
        yield { type: 'MEM_UPDATE', memory: this.memory, memorySnapshot };
        return null;
    }

    *visitArrayDeclaration(node, env) {
        const dimensions = []; let totalLength = 1;
        for (let expr of node.sizeExpressions) {
            const size = yield* this.visit(expr, env);
            if (size <= 0) throw new Error(`[Linha ${node.line}] ⚠️ TAMANHO DE ARRAY INVÁLIDO: ${size}`);
            dimensions.push(size); totalLength *= size;
        }
        env.symbols.set(node.name, this.memory.allocateArray(node.name, dimensions, totalLength, node.varType));
        const memorySnapshot = this.memory.createSnapshot();
        yield { type: 'MEM_UPDATE', memory: this.memory, memorySnapshot };
        return null;
    }

    *visitAssignment(node, env) {
        const rightVal = yield* this.visit(node.right, env);
        let addr, meta;

        if (node.left.type === 'Identifier') {
            addr = env.resolveAddress(node.left.name);
            meta = this.memory.allocations.get(addr);

            // Struct assignment: copia campo a campo
            if (meta && meta.isStruct && typeof rightVal === 'number') {
                yield* this.copyStruct(addr, rightVal, meta.structName);
                const memorySnapshot = this.memory.createSnapshot();
                yield { type: 'MEM_UPDATE', memory: this.memory, memorySnapshot };
                return addr;
            }
        } else if (node.left.type === 'MemberExpression') {
            addr = yield* this.resolveMemberAddress(node.left, env);
        } else if (node.left.type === 'UnaryExpression' && node.left.operator === '*') {
            addr = yield* this.visit(node.left.argument, env);
        } else if (node.left.type === 'IndexExpression') {
            const base = yield* this.visit(node.left.arrayObject, env);
            const indices = [];
            for (let expr of node.left.indexExpressions) indices.push(yield* this.visit(expr, env));
            meta = this.memory.allocations.get(base);
            let flatOffset = meta && meta.isArray ? this.getFlatOffset(meta.dimensions, indices, node.line) : indices[0];
            const bSize = meta ? meta.byteSize : 4;
            addr = base + (flatOffset * bSize);
        } else throw new Error(`[Linha ${node.line}] L-value inválido.`);

        if (meta && meta.isConst) {
            throw new Error(`[Linha ${node.line}] ⚠️ ERRO DE CONSTANTE: '${meta.name}' é const.`);
        }

        let finalVal = rightVal;
        if (node.operator !== '=') {
            const currentVal = this.memory.read(addr);
            switch (node.operator) {
                case '+=': finalVal = currentVal + rightVal; break;
                case '-=': finalVal = currentVal - rightVal; break;
                case '*=': finalVal = currentVal * rightVal; break;
                case '/=': finalVal = Math.floor(currentVal / rightVal); break;
                case '%=': finalVal = currentVal % rightVal; break;
                case '&=': finalVal = currentVal & rightVal; break;
                case '|=': finalVal = currentVal | rightVal; break;
                case '^=': finalVal = currentVal ^ rightVal; break;
                case '<<=': finalVal = currentVal << rightVal; break;
                case '>>=': finalVal = currentVal >> rightVal; break;
            }
        }
        const castedVal = meta ? TypeSystem.cast(finalVal, meta.type) : finalVal;
        this.memory.write(addr, castedVal);
        const memorySnapshot = this.memory.createSnapshot();
        yield { type: 'MEM_UPDATE', memory: this.memory, memorySnapshot };
        return castedVal;
    }

    *visitUnary(node, env) {
        if (node.operator === 'sizeof') {
            if (node.argument.type === 'TypeName') return TypeSystem.getSize(node.argument.value);
            else if (node.argument.type === 'Identifier') {
                const addr = env.resolveAddress(node.argument.name); const meta = this.memory.allocations.get(addr);
                if (meta && meta.isStruct) return meta.totalSize;
                return meta ? (meta.isArray ? meta.totalLength * meta.byteSize : meta.byteSize) : 4;
            }
            return 4;
        }
        if (node.operator === '&') {
            if (node.argument.type === 'Identifier') return env.resolveAddress(node.argument.name);
            if (node.argument.type === 'MemberExpression') return yield* this.resolveMemberAddress(node.argument, env);
            throw new Error(`[Linha ${node.line}] Operador & requer um l-value.`);
        }
        if (node.operator === '*') {
            const addr = yield* this.visit(node.argument, env);
            if (!addr || addr === 0) {
                throw new Error(`[Linha ${node.line}] ⚠️ NULL POINTER DEREFERENCE.`);
            }
            return this.memory.read(addr);
        }
        if (node.operator === '!') {
            const val = yield* this.visit(node.argument, env);
            return (val === 0 || val === false) ? 1 : 0;
        }
        if (node.operator === '~') {
            const val = yield* this.visit(node.argument, env);
            return ~val;
        }
        if (node.operator === '++' || node.operator === '--') {
            let addr;
            if (node.argument.type === 'Identifier') {
                addr = env.resolveAddress(node.argument.name);
            } else if (node.argument.type === 'MemberExpression') {
                addr = yield* this.resolveMemberAddress(node.argument, env);
            } else {
                throw new Error(`[Linha ${node.line}] ++ e -- requerem l-value.`);
            }
            let val = this.memory.read(addr);
            val = node.operator === '++' ? val + 1 : val - 1;
            this.memory.write(addr, val);
            const memorySnapshot = this.memory.createSnapshot();
            yield { type: 'MEM_UPDATE', memory: this.memory, memorySnapshot };
            return val;
        }
    }

    *visitIndex(node, env) {
        const base = yield* this.visit(node.arrayObject, env);
        const meta = this.memory.allocations.get(base);
        const indices = [];
        for (let expr of node.indexExpressions) indices.push(yield* this.visit(expr, env));

        if (meta && meta.isArray) {
            const flatOffset = this.getFlatOffset(meta.dimensions, indices, node.line);
            const addr = base + (flatOffset * meta.byteSize);
            if (indices.length < meta.dimensions.length) return addr;
            return this.memory.read(addr);
        } else {
            if (indices.length > 1) throw new Error(`Indexação múltipla em ponteiro simples não suportada.`);
            const bSize = meta ? meta.byteSize : 4;
            return this.memory.read(base + (indices[0] * bSize));
        }
    }

    *visitCall(node, env) {
        const name = node.callee.name || (node.callee.type === 'Identifier' ? node.callee.name : null);
        const args = [];
        for (const a of node.arguments) args.push(yield* this.visit(a, env));

        let func;
        try { func = env.get(name); } catch (e) {
            throw new Error(`[Linha ${node.line}] ⚠️ FUNÇÃO NÃO DECLARADA: '${name}'.`);
        }

        if (func.type === 'BuiltIn') return yield* func.execute(args, this);

        if (func.type === 'FunctionDeclaration') {
            if (this.callStack.length >= this.maxCallStackDepth) {
                const trace = this.callStack.slice(-5).map(f => `  → ${f.name}()`).join('\n');
                throw new Error(`[Linha ${node.line}] ⚠️ STACK OVERFLOW (${this.callStack.length} chamadas).\n${trace}`);
            }

            this.callStack.push({ name, line: node.line, args });
            const funcEnv = new Environment(this.memory, this.globalScope);

            for (let i = 0; i < func.params.length; i++) {
                const paramType = func.params[i].type;
                const argVal = args[i] !== undefined ? args[i] : null;

                // Se o parâmetro eh struct (por valor), faz cópia
                if (TypeSystem.isStruct(paramType)) {
                    const structName = TypeSystem.pegaStructName(paramType);
                    const destAddr = funcEnv.defineStruct(func.params[i].name, structName, paramType);
                    if (typeof argVal === 'number') {
                        yield* this.copyStruct(destAddr, argVal, structName);
                    }
                } else {
                    funcEnv.define(func.params[i].name, argVal, paramType);
                }
            }

            const result = yield* this.visitBlock(func.body, funcEnv);

            // Se retornou struct por valor, copia os dados antes de destruir o frame
            let returnValue = null;
            if (result && result.type === 'RETURN') {
                returnValue = result.value;
                // Verifica se o valor retornado é endereço de struct local
                if (typeof returnValue === 'number' && returnValue >= funcEnv.basePointer && returnValue < this.memory.stackPointer) {
                    const meta = this.memory.allocations.get(returnValue);
                    if (meta && meta.isStruct) {
                        // Copia a struct para fora do frame antes de destruir
                        const structName = meta.structName;
                        const def = TypeSystem.pegaStructDef(structName);
                        const tempData = new Map();
                        for (const field of def.fields) {
                            const addr = returnValue + field.offset;
                            if (this.memory.ram.has(addr)) {
                                tempData.set(field.offset, this.memory.ram.get(addr));
                            }
                        }
                        // Destrói frame
                        funcEnv.destroy();
                        this.callStack.pop();
                        // Realoca struct no escopo do chamador
                        const newAddr = this.memory.allocateStruct('__ret_' + name, structName, 'struct ' + structName);
                        for (const [offset, val] of tempData) {
                            this.memory.ram.set(newAddr + offset, val);
                        }
                        return newAddr;
                    }
                }
            }

            funcEnv.destroy();
            this.callStack.pop();

            if (returnValue !== null) return returnValue;
            return null;
        }

        throw new Error(`[Linha ${node.line}] ⚠️ '${name}' não é função.`);
    }

    *visitBinary(node, env) {
        // Short-circuit para && e ||
        if (node.operator === '&&') {
            const l = yield* this.visit(node.left, env);
            if (l === 0 || l === false) return 0;
            const r = yield* this.visit(node.right, env);
            return (r !== 0 && r !== false) ? 1 : 0;
        }
        if (node.operator === '||') {
            const l = yield* this.visit(node.left, env);
            if (l !== 0 && l !== false) return 1;
            const r = yield* this.visit(node.right, env);
            return (r !== 0 && r !== false) ? 1 : 0;
        }

        const l = yield* this.visit(node.left, env);
        const r = yield* this.visit(node.right, env);

        switch (node.operator) {
            case '+': return l + r;
            case '-': return l - r;
            case '*': return l * r;
            case '/':
                if (r === 0) throw new Error(`[Linha ${node.line}] ⚠️ DIVISÃO POR ZERO.`);
                return (Number.isInteger(l) && Number.isInteger(r)) ? Math.trunc(l / r) : l / r;
            case '%': return l % r;
            case '==': return l === r ? 1 : 0;
            case '!=': return l !== r ? 1 : 0;
            case '<': return l < r ? 1 : 0;
            case '>': return l > r ? 1 : 0;
            case '<=': return l <= r ? 1 : 0;
            case '>=': return l >= r ? 1 : 0;
            case '&': return l & r;
            case '|': return l | r;
            case '^': return l ^ r;
            case '<<': return l << r;
            case '>>': return l >> r;
        }
    }

    *visitTernary(node, env) {
        const cond = yield* this.visit(node.condition, env);
        if (cond !== 0 && cond !== false) {
            return yield* this.visit(node.consequent, env);
        } else {
            return yield* this.visit(node.alternate, env);
        }
    }

    *visitReturn(node, env) {
        const ret = yield* this.visit(node.argument, env);
        return { type: 'RETURN', value: ret };
    }

    *visitIf(node, env) {
        const cond = yield* this.visit(node.condition, env);
        if (cond !== 0 && cond !== false) {
            const bEnv = new Environment(this.memory, env);
            const r = yield* this.visitBlock(node.consequent, bEnv); bEnv.destroy();
            if (r) return r;
        } else if (node.alternate) {
            const bEnv = new Environment(this.memory, env);
            const r = yield* this.visitBlock(node.alternate, bEnv); bEnv.destroy();
            if (r) return r;
        }
        return null;
    }

    *visitWhile(node, env) {
        while (true) {
            yield { type: 'STEP', nextLine: node.line, previousLine: this.lastLine, memory: this.memory };
            this.lastLine = node.line;
            const cond = yield* this.visit(node.condition, env); if (!cond) break;
            const bEnv = new Environment(this.memory, env);
            const r = yield* this.visitBlock(node.body, bEnv); bEnv.destroy();
            if (r && r.type === 'RETURN') return r;
            if (r && r.type === 'BREAK') break;
        }
        return null;
    }

    *visitDoWhile(node, env) {
        do {
            const bEnv = new Environment(this.memory, env);
            const r = yield* this.visitBlock(node.body, bEnv); bEnv.destroy();
            if (r && r.type === 'RETURN') return r;
            if (r && r.type === 'BREAK') break;
            yield { type: 'STEP', nextLine: node.line, previousLine: this.lastLine, memory: this.memory };
            this.lastLine = node.line;
        } while (yield* this.visit(node.condition, env));
        return null;
    }

    *visitFor(node, env) {
        const forEnv = new Environment(this.memory, env);
        if (node.init) yield* this.visit(node.init, forEnv);
        while (true) {
            yield { type: 'STEP', nextLine: node.line, previousLine: this.lastLine, memory: this.memory };
            this.lastLine = node.line;
            if (node.condition) { const cond = yield* this.visit(node.condition, forEnv); if (!cond) break; }
            const bodyEnv = new Environment(this.memory, forEnv);
            const r = yield* this.visitBlock(node.body, bodyEnv); bodyEnv.destroy();
            if (r && r.type === 'RETURN') { forEnv.destroy(); return r; }
            if (r && r.type === 'BREAK') break;
            if (node.increment) yield* this.visit(node.increment, forEnv);
        }
        forEnv.destroy(); return null;
    }

    *visitSwitch(node, env) {
        const memorySnapshot = this.memory.createSnapshot();
        const val = yield* this.visit(node.discriminant, env);
        let matched = false;
        let fell = false; // fall-through

        for (const c of node.cases) {
            if (!fell && c.test !== null) {
                const caseVal = yield* this.visit(c.test, env);
                if (val === caseVal) matched = true;
            }
            if (c.test === null && !matched) {
                // default: executa se nenhum case bateu
                matched = true;
            }

            if (matched || fell) {
                fell = true;
                const bEnv = new Environment(this.memory, env);
                const r = yield* this.visitBlock(c.consequent, bEnv);
                bEnv.destroy();
                if (r && r.type === 'BREAK') { fell = false; break; }
                if (r && r.type === 'RETURN') return r;
            }
        }
        return null;
    }

    visitLiteral(node) {
        if (node.rawType === 'STRING') return this.memory.allocateStringLiteral(node.value);
        return node.value;
    }
}
