/**
 * IFSCee - Preprocessor
 * Fase 1: Processamento de diretivas (#define, #ifdef, #include, etc.)
 * 
 * Atualmente: Versão simplificada que remove comentários e processa #define básico
 */

class IFSCeePreprocessor {
    constructor(codigoFonte) {
        this.codigoFonte = codigoFonte;
        this.macros = new Map();
        this.pilhaCondicional = [];
        this.linhas = codigoFonte.split('\n');
    }

    /**
     * Processa o código fonte
     * Remove diretivas, expande macros e retorna código limpo
     */
    processar() {
        let saida = [];
        let ignorandoLinhas = false;

        for (let i = 0; i < this.linhas.length; i++) {
            const linha = this.linhas[i];
            const linhaLimpa = linha.trim();

            // Processar diretivas (#define, #ifdef, #include, etc.)
            if (linhaLimpa.startsWith('#')) {
                const resultado = this.processarDiretiva(linhaLimpa);
                
                if (resultado.tipo === 'ignorar') {
                    continue; // Pular essa linha
                } else if (resultado.tipo === 'condicional') {
                    ignorandoLinhas = resultado.ignorar;
                    continue;
                } else if (resultado.tipo === 'include') {
                    // Placeholder: Simular include embutido
                    continue;
                }
            }

            // Se não estamos ignorando, adicionar a linha (com macros expandidas)
            if (!ignorandoLinhas) {
                saida.push(this.expandirMacros(linha));
            }
        }

        return saida.join('\n');
    }

    /**
     * Processa uma diretiva individual
     */
    processarDiretiva(diretiva) {
        if (diretiva.startsWith('#define')) {
            return this.processarDefine(diretiva);
        } else if (diretiva.startsWith('#ifdef')) {
            return this.processarIfdef(diretiva);
        } else if (diretiva.startsWith('#ifndef')) {
            return this.processarIfndef(diretiva);
        } else if (diretiva.startsWith('#else')) {
            return { tipo: 'condicional', ignorar: !this.pilhaCondicional[this.pilhaCondicional.length - 1] };
        } else if (diretiva.startsWith('#endif')) {
            this.pilhaCondicional.pop();
            return { tipo: 'ignorar' };
        } else if (diretiva.startsWith('#include')) {
            return { tipo: 'include' };
        }

        return { tipo: 'ignorar' };
    }

    /**
     * Processa #define
     */
    processarDefine(diretiva) {
        // Exemplo: #define PI 3.14159
        const partes = diretiva.replace('#define', '').trim().split(/\s+/);
        const nome = partes[0];
        const valor = partes.slice(1).join(' ');

        this.macros.set(nome, valor);
        return { tipo: 'ignorar' };
    }

    /**
     * Processa #ifdef
     */
    processarIfdef(diretiva) {
        const nome = diretiva.replace('#ifdef', '').trim();
        const existe = this.macros.has(nome);
        this.pilhaCondicional.push(existe);
        return { tipo: 'condicional', ignorar: !existe };
    }

    /**
     * Processa #ifndef
     */
    processarIfndef(diretiva) {
        const nome = diretiva.replace('#ifndef', '').trim();
        const existe = this.macros.has(nome);
        this.pilhaCondicional.push(!existe);
        return { tipo: 'condicional', ignorar: existe };
    }

    /**
     * Expande macros em uma linha
     */
    expandirMacros(linha) {
        let resultado = linha;

        for (const [nome, valor] of this.macros.entries()) {
            // Substituir macro por seu valor (respeitando word boundaries)
            const regex = new RegExp(`\\b${this.escaparRegex(nome)}\\b`, 'g');
            resultado = resultado.replace(regex, valor);
        }

        return resultado;
    }

    /**
     * Escapa caracteres especiais para regex
     */
    escaparRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
