# IFSCee

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-blue)](https://github.com/)
[![HTML5](https://img.shields.io/badge/html-5-orange)](https://developer.mozilla.org/)
[![CSS3](https://img.shields.io/badge/css-3-blue)](https://developer.mozilla.org/)
[![JavaScript](https://img.shields.io/badge/javascript-ES6-yellow)](https://developer.mozilla.org/)
[![License](https://img.shields.io/badge/license-ver%20LICENSE-lightgrey)](LICENSE)

O **IFSCee** é um projeto web estruturado em camadas, voltado à organização de interface, processamento de entrada, documentação técnica e preservação histórica do desenvolvimento.

---

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Objetivos](#objetivos)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Como executar](#como-executar)
- [Como contribuir](#como-contribuir)
- [Fluxo de funcionamento](#fluxo-de-funcionamento)
- [Deploy](#deploy)
- [Documentação](#documentação)
- [Ferramentas de apoio ao desenvolvimento](#ferramentas-de-apoio-ao-desenvolvimento)
- [Boas práticas adotadas](#boas-práticas-adotadas)
- [Créditos](#créditos)
- [Licença](#licença)

---

## Sobre o projeto

O IFSCee reúne, em um único repositório, os principais elementos necessários para a construção, manutenção e evolução de uma aplicação web com foco didático e técnico.

O projeto inclui:

- a **aplicação principal**;
- a **interface visual**;
- os **estilos compartilhados**;
- a **lógica de processamento**;
- a **documentação formal e acadêmica**;
- versões **anteriores ou paralelas** para consulta histórica;
- e a **automação de publicação**.

A estrutura do repositório mostra uma preocupação clara com organização, clareza e rastreabilidade. Isso significa que o projeto não foi montado apenas para “funcionar”, mas também para ser entendido, mantido, evoluído e documentado com consistência.

---

## Objetivos

O projeto foi organizado para atender aos seguintes objetivos:

1. **Separar responsabilidades de forma clara**
   - interface;
   - estilo;
   - processamento;
   - documentação;
   - automação.

2. **Facilitar a manutenção**
   - reduzir acoplamento entre partes do sistema;
   - manter os arquivos em locais previsíveis;
   - permitir alterações com menor risco de impacto lateral.

3. **Apoiar o aprendizado e a evolução técnica**
   - documentação detalhada;
   - histórico de versões;
   - exemplos e testes;
   - estrutura que favorece leitura e compreensão.

4. **Possibilitar publicação automática**
   - uso de workflow para deploy;
   - atualização consistente da versão publicada;
   - redução de tarefas repetitivas.

5. **Preservar o histórico do desenvolvimento**
   - uso de uma pasta com versão anterior ou paralela;
   - documentação de mudanças;
   - registro de decisões e melhorias.

---

## Tecnologias utilizadas

O projeto utiliza tecnologias e práticas típicas de aplicações web modernas e organizadas por responsabilidade:

- **HTML5** — estrutura da interface;
- **CSS3** — estilização e composição visual;
- **JavaScript** — lógica da aplicação e processamento;
- **GitHub Actions** — automação de build/deploy;
- **GitHub Pages / servidor remoto** — publicação do projeto.

---

## Estrutura do projeto

A organização do repositório pode ser compreendida da seguinte forma.

### Raiz do projeto
Contém os arquivos mais visíveis e importantes para entrada, consulta e configuração básica.

- `index.html` — página inicial do projeto
- `README.md` — visão geral do repositório
- `LICENSE` — licença de uso

### `src/`
Contém recursos compartilhados entre páginas e versões.

- `src/style.css` — estilos globais
- `src/Lexend/` — arquivos da fonte usada na interface

### `documentation/`
Pasta destinada a materiais formais e acadêmicos.

Pode incluir:

- diagramas;
- fluxogramas;
- relatórios;
- apresentações;
- arquivos exportados em PDF, DOCX e PPTX.

### `ifscee/`
Versão principal da aplicação, com a interface e a lógica central.

### `ifscee001/`
Versão anterior, paralela ou histórica, contendo:

- exemplos;
- testes;
- guias;
- changelog;
- documentos de apoio;
- arquivos de desenvolvimento e validação.

### `.github/workflows/`
Pasta de automação do GitHub Actions.

- `static.yml` — workflow de publicação e deploy

---

## Funcionalidades

O projeto apresenta, em sua estrutura, funcionalidades e capacidades como:

- interface web personalizada;
- separação entre visual e lógica;
- processamento de entrada por etapas;
- documentação técnica e acadêmica;
- preservação do histórico do projeto;
- automação de publicação;
- materiais de apoio para estudo e manutenção.

Dependendo da versão ou pasta analisada, o projeto também pode conter ferramentas voltadas à navegação, interpretação, testes e visualização de estruturas internas.

---

## Como executar

Como este é um projeto web estático, há mais de uma forma de executá-lo.

### Opção 1: abrir diretamente no navegador
Essa é a forma mais simples.

1. Baixe ou clone o repositório.
2. Localize o arquivo `index.html`.
3. Abra o arquivo em um navegador moderno.

### Opção 2: usar um servidor local
Essa opção é recomendada quando você quer evitar limitações de abertura direta de arquivos locais.

Exemplos:
- Usando Python:
  ```bash
  python -m http.server
  ```
- Usando Node.js:
  ```bash
  npx serve .
  ```


ou, se preferir outro servidor estático:
```bash
 python -m http.server 8000
```

Depois, abra o endereço exibido no terminal.

### Observação importante
Se houver caminhos relativos entre arquivos, um servidor local costuma oferecer uma experiência mais confiável do que abrir o HTML diretamente com duplo clique.

---

## Como contribuir

Contribuições são bem-vindas. Para manter o projeto organizado, algumas boas práticas são recomendadas.

### Antes de alterar
- leia o `README.md`;
- consulte o `MANUAL.md`;
- verifique o conteúdo da pasta `documentation/`;
- observe a organização das pastas `ifscee/` e `ifscee001/`.

### Ao fazer mudanças
- mantenha a separação entre interface, lógica e documentação;
- altere apenas o que for necessário para a tarefa;
- preserve o estilo geral do projeto;
- evite misturar mudanças visuais com mudanças lógicas em uma única edição, quando isso dificultar a revisão;
- revise o impacto da alteração nas outras partes do sistema.

### Depois de alterar
- teste localmente;
- atualize a documentação, se houver mudança de comportamento;
- revise exemplos e testes, se necessário;
- envie alterações com descrição clara e objetiva.

### Sugestão de fluxo de contribuição
1. criar uma branch;
2. implementar a alteração;
3. testar o comportamento;
4. revisar documentação relacionada;
5. abrir um pull request com explicação clara.

---

## Fluxo de funcionamento

De forma simplificada, o funcionamento esperado do projeto segue este caminho:

1. o usuário acessa a página principal;
2. a interface é carregada;
3. os estilos são aplicados;
4. a entrada é preparada;
5. a análise léxica identifica tokens;
6. o parser organiza a estrutura;
7. o interpretador executa ou processa a lógica;
8. o controlador da interface mostra o resultado.

Esse fluxo é característico de sistemas que trabalham com linguagem, comandos, regras ou processamento estrutural em etapas.

---

## Deploy

O projeto possui automação de publicação por meio de workflow, o que permite atualização consistente da versão online.

### O que a automação pode fazer
- publicar conteúdo estático;
- enviar arquivos para GitHub Pages;
- copiar conteúdo para um servidor remoto;
- reduzir tarefas manuais de publicação;
- manter a versão online alinhada ao repositório.

### Vantagens
- menos risco de erro humano;
- mais consistência;
- mais rapidez na atualização;
- melhor repetibilidade do processo.

---

## Documentação

A documentação do projeto foi organizada para atender tanto a leitura rápida quanto a consulta detalhada.

### Arquivos e pastas recomendados
- `MANUAL.md`
- `ifscee/Project Manual.md`
- `ifscee/IFSCee.md`
- `documentation/`

### O que você encontra na documentação
- visão geral da estrutura;
- explicação das pastas;
- descrição dos arquivos;
- materiais acadêmicos;
- relatórios;
- diagramas;
- apresentações;
- histórico do desenvolvimento.

### Quando consultar
- antes de alterar o projeto;
- ao entender a organização do repositório;
- ao revisar funcionalidades;
- ao estudar a evolução da aplicação;
- ao preparar apresentações ou relatórios.

---

## Ferramentas de apoio ao desenvolvimento

Este projeto foi desenvolvido com apoio de ferramentas de IA, incluindo **Claude Code Pro**, **Gemini Pro** e **ChatGPT**.

Essas ferramentas foram usadas como um verdadeiro **copiloto de desenvolvimento**, em vez de uma muleta para respostas prontas.

### Uso consciente dessas ferramentas
A proposta não foi substituir o raciocínio lógico, nem terceirizar completamente a tomada de decisão. Em vez disso, elas foram usadas para:

- esclarecer dúvidas;
- fornecer feedback imediato sobre erros de sintaxe;
- sugerir caminhos lógicos para implementar soluções;
- acelerar o aprendizado;
- ajudar a validar ideias;
- permitir foco maior em problemas mais complexos;
- estimular análise crítica do código gerado.

### Benefício principal
Esse tipo de uso ajuda a desenvolver autonomia técnica, porque a IA participa do processo de aprendizagem e desenvolvimento, mas não substitui a capacidade de:

- entender o problema;
- questionar a solução proposta;
- validar a correção do código;
- reconhecer limitações;
- tomar decisões de engenharia com responsabilidade.

Em resumo, as ferramentas foram tratadas como apoio inteligente, não como atalho para evitar pensamento.

---

## Boas práticas adotadas

A organização deste projeto favorece várias boas práticas importantes:

- separação clara de responsabilidades;
- documentação acessível e completa;
- histórico preservado;
- estrutura previsível;
- manutenção facilitada;
- automação de deploy;
- reutilização de recursos;
- foco em aprendizado contínuo.

### Em termos práticos, isso significa:
- menos improviso;
- mais legibilidade;
- menos risco de regressão;
- maior facilidade para novas contribuições;
- mais clareza para quem entra no projeto depois.

---

## Créditos

### Desenvolvimento
Projeto idealizado e desenvolvido por **Gelasio Ebel Junior**.

### Apoio técnico e de aprendizagem
Ferramentas de apoio utilizadas de forma complementar ao processo de desenvolvimento:

- **Claude Code Pro**
- **Gemini Pro**
- **ChatGPT**

Essas ferramentas ajudaram como copilotos de raciocínio, feedback e aprendizado, sempre com foco em aumentar a autonomia do desenvolvimento.

---

## Licença

Consulte o arquivo [`LICENSE`](LICENSE) para conhecer os termos de uso do projeto.

---

## Observação final

Se você estiver chegando agora no repositório, o melhor caminho é:

1. ler este `README.md`;
2. abrir o `MANUAL.md`;
3. revisar a pasta `documentation/`;
4. observar a estrutura de `ifscee/` e `ifscee001/`;
5. explorar a aplicação com calma.

Essa sequência costuma dar uma visão boa, organizada e confiável do projeto inteiro.

