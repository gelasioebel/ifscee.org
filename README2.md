# IFSCee

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-blue)](https://github.com/)
[![HTML](https://img.shields.io/badge/html-5-orange)](https://developer.mozilla.org/)
[![CSS](https://img.shields.io/badge/css-3-blue)](https://developer.mozilla.org/)
[![JavaScript](https://img.shields.io/badge/javascript-ES6-yellow)](https://developer.mozilla.org/)
[![License](https://img.shields.io/badge/license-ver%20LICENSE-lightgrey)](LICENSE)

O **IFSCee** é um projeto web organizado em camadas, com foco em interface visual, processamento de entrada, documentação técnica e preservação histórica do desenvolvimento.

---

## Visão geral

O repositório reúne:

- a **aplicação principal**;
- recursos visuais compartilhados;
- documentação formal e acadêmica;
- versões anteriores ou paralelas;
- automação de publicação.

A estrutura do projeto foi pensada para facilitar manutenção, testes, evolução e consulta.

---

## Estrutura do projeto

### Raiz
- `index.html` — página inicial do projeto
- `README.md` — visão geral do repositório
- `LICENSE` — licença de uso

### `src/`
- `style.css` — estilos globais
- `Lexend/` — arquivos da fonte utilizada na interface

### `documentation/`
Materiais de apoio, como:

- diagramas;
- relatórios;
- apresentações;
- arquivos em PDF, DOCX e PPTX.

### `ifscee/`
Aplicação principal do projeto.

### `ifscee001/`
Versão anterior, paralela ou histórica, com:

- exemplos;
- testes;
- guias;
- changelog;
- documentação complementar.

### `.github/workflows/`
Automação de publicação e deploy.

---

## Funcionalidades

- interface web com layout personalizado;
- separação entre visual e lógica;
- processamento de entrada por etapas;
- documentação técnica e acadêmica;
- histórico de evolução do projeto;
- publicação automatizada.

---

## Como executar

Como este é um projeto web estático, você pode abrir a página principal diretamente em um navegador.

### Opção 1: abrir localmente
1. Baixe ou clone o repositório.
2. Abra o arquivo `index.html` no navegador.

### Opção 2: usar servidor local
Se preferir, rode um servidor local simples para evitar limitações de abertura direta de arquivos.

Exemplo com Node.js:

```bash
npx serve .
```

Ou com qualquer servidor estático de sua preferência.

---

## Como alterar o projeto

### Interface
Edite principalmente:

- `index.html`
- `src/style.css`
- `ifscee/index.html`
- `ifscee/style.css`

### Lógica de processamento
Edite:

- `ifscee/lexer.js`
- `ifscee/parser.js`
- `ifscee/preprocessor.js`
- `ifscee/interpreter.js`

### Interação com o usuário
Edite:

- `ifscee/ui-controller.js`

### Documentação
Consulte e atualize:

- `MANUAL.md`
- `ifscee/Project Manual.md`
- `ifscee/IFSCee.md`
- arquivos dentro de `documentation/`

---

## Fluxo esperado

De forma simplificada, o projeto funciona assim:

1. o usuário acessa a página principal;
2. a interface é carregada;
3. os estilos são aplicados;
4. a entrada é preparada;
5. a análise léxica identifica tokens;
6. o parser organiza a estrutura;
7. o interpretador executa a lógica;
8. o resultado é exibido.

---

## Documentação

Para uma explicação detalhada da estrutura do repositório, consulte:

- `MANUAL.md`
- `ifscee/Project Manual.md`
- `documentation/`

---

## Boas práticas adotadas

Este projeto segue uma organização que favorece:

- separação de responsabilidades;
- manutenção mais fácil;
- documentação clara;
- histórico preservado;
- automação de publicação;
- reutilização de recursos.

---

## Licença

Consulte o arquivo [`LICENSE`](LICENSE) para ver os termos de uso do projeto.

---

## Autor

Projeto idealizado e desenvolvido por **Gelasio Ebel Junior**.