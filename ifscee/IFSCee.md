# IFSCee

IFSCee é um projeto web organizado em camadas, com foco em interface, processamento de entrada, documentação e evolução histórica do sistema.

Este repositório reúne:

- a aplicação principal;
- recursos visuais compartilhados;
- documentação técnica e acadêmica;
- versões anteriores ou paralelas;
- automação de publicação.

---

## Visão geral

A estrutura do projeto foi pensada para separar claramente:

- **interface visual**;
- **estilos e recursos gráficos**;
- **lógica de processamento**;
- **documentação**;
- **testes e histórico**;
- **deploy automatizado**.

Essa organização facilita manutenção, evolução e consulta do projeto por novos colaboradores, avaliadores e interessados.

---

## Estrutura principal

### Raiz do projeto
Contém os arquivos principais de entrada e documentação geral.

- `index.html` — página inicial do projeto
- `README.md` — visão geral do repositório
- `LICENSE` — licença de uso

### `src/`
Recursos compartilhados do projeto.

- `src/style.css` — estilos globais
- `src/Lexend/` — arquivos relacionados à fonte utilizada na interface

### `documentation/`
Materiais formais e acadêmicos.

Pode conter:

- diagramas;
- fluxogramas;
- relatórios;
- apresentações;
- arquivos em PDF, DOCX e PPTX.

### `ifscee/`
Aplicação principal do projeto.

Contém os arquivos centrais da interface e da lógica:

- `index.html`
- `style.css`
- `lexer.js`
- `parser.js`
- `preprocessor.js`
- `interpreter.js`
- `ui-controller.js`
- `IFSCee.md`
- `Project Manual.md`

### `ifscee001/`
Versão anterior, paralela ou histórica do projeto.

Inclui:

- documentação complementar;
- exemplos;
- testes;
- histórico de mudanças;
- arquivos de apoio ao desenvolvimento.

### `.github/workflows/`
Automação de publicação.

- `static.yml` — workflow de deploy

---

## Como navegar no projeto

### Para alterar a interface
Consulte principalmente:

- `index.html`
- `src/style.css`
- `ifscee/index.html`
- `ifscee/style.css`
- `ifscee/ui-controller.js`

### Para alterar a lógica de processamento
Consulte:

- `ifscee/lexer.js`
- `ifscee/parser.js`
- `ifscee/preprocessor.js`
- `ifscee/interpreter.js`

### Para consultar documentação
Consulte:

- `documentation/`
- `ifscee/IFSCee.md`
- `ifscee/Project Manual.md`
- `ifscee001/README.md`
- `ifscee001/QUICKSTART.md`
- `ifscee001/CHANGELOG.md`

### Para estudar histórico e evolução
Consulte:

- `ifscee001/`
- `ifscee001/ideia-inicial/`
- `ifscee001/sprint1/`
- `ifscee001/testes/`

### Para ajustar publicação automática
Consulte:

- `.github/workflows/static.yml`

---

## Fluxo lógico esperado

De forma simplificada, o funcionamento do projeto segue este caminho:

1. o usuário acessa a página principal;
2. a interface é carregada;
3. os estilos são aplicados;
4. a entrada, se houver, é preparada;
5. o analisador léxico processa os tokens;
6. o parser organiza a estrutura;
7. o interpretador executa ou processa a lógica;
8. o resultado é exibido ao usuário.

---

## Documentação

Para uma explicação mais completa da estrutura do repositório, consulte:

- `MANUAL.md`
- `ifscee/Project Manual.md`
- arquivos dentro de `documentation/`

---

## Boas práticas adotadas

Este projeto segue uma organização que favorece:

- separação de responsabilidades;
- manutenção mais fácil;
- documentação clara;
- preservação do histórico;
- automação de publicação;
- reutilização de recursos.

---

## Observação

Este repositório pode conter versões diferentes do projeto com propósitos distintos.  
Se houver dúvida sobre qual pasta editar, prefira:

- `ifscee/` para a versão principal;
- `ifscee001/` para histórico, testes e referência;
- `documentation/` para materiais formais.

---

## Licença

Consulte o arquivo `LICENSE` para conhecer os termos de uso do projeto.