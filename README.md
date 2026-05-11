# ENCCEJA 2020 - Aplicacao de Pratica

Aplicacao local para praticar 3 provas objetivas do ENCCEJA 2020:

- Ciencias da Natureza
- Linguagens
- Matematica

O usuario navega questao por questao, marca uma alternativa, confirma a resposta e recebe a correcao imediata com base no gabarito. Ao final, a aplicacao mostra um resumo da taxa de acerto geral e por prova.

## Requisitos

- Node.js `>=20.16.0 <21` ou `>=22.3.0`
- npm

Se quiser evitar incompatibilidade, use Node.js 22 LTS.

## Como subir localmente

### 1. Entrar na pasta do projeto

```bash
cd Encceja
```

### 2. Instalar as dependencias

```bash
npm install
```

### 3. Gerar a base de dados a partir dos PDFs

Esse passo:

- le os PDFs das provas e dos gabaritos
- extrai questoes e respostas
- gera o arquivo `public/data/exams.json`
- gera as imagens das paginas usadas na interface

```bash
npm run build:data
```

### 4. Subir o servidor local

```bash
npm run dev
```

O terminal vai exibir algo como:

```text
Aplicacao disponivel em http://localhost:3000
```

Abra essa URL no navegador.

## Fluxo rapido para outra pessoa

Se a pessoa receber o projeto completo, estes comandos bastam:

```bash
npm install
npm run build:data
npm run dev
```

## Estrutura principal

```text
Encceja/
  2020_PV_*.pdf                  # provas
  2020_GB_*.pdf                  # gabaritos
  public/
    index.html                   # pagina principal
    data/exams.json              # base gerada pelo script
    assets/pages/                # imagens das paginas das provas
    js/
      app.js
      modules/
        data-service.js
        quiz-store.js
        ui.js
    styles/
      main.css
  scripts/
    build-data.js                # extracao dos PDFs + geracao da base
  server.js                      # servidor local
  package.json
```

## Scripts disponiveis

### `npm run build:data`

Regenera a base da aplicacao a partir dos PDFs.

Use esse comando quando:

- trocar os arquivos PDF
- atualizar prova ou gabarito
- quiser recriar `public/data/exams.json` e as imagens

### `npm run dev`

Sobe o servidor local.

### `npm start`

Mesmo comportamento do `npm run dev`.

## Observacoes importantes

- A aplicacao usa os PDFs que estao na raiz do projeto.
- Se a porta `3000` estiver ocupada, o servidor tenta a proxima porta automaticamente.
- O progresso do usuario fica salvo no `localStorage` do navegador.
- Algumas questoes possuem figuras, graficos ou alternativas visuais. Nesses casos, a interface mostra a pagina original da prova ao lado da questao.

## Solucao de problemas

### PowerShell bloqueando `npm`

Em alguns ambientes Windows, o PowerShell pode bloquear `npm` por policy de execucao de script.

Se isso acontecer, rode:

```powershell
npm.cmd install
npm.cmd run build:data
npm.cmd run dev
```

### A aplicacao abriu, mas nao carregou as questoes

Verifique se o arquivo abaixo existe:

```text
public/data/exams.json
```

Se nao existir, rode:

```bash
npm run build:data
```

### Troquei os PDFs e quero atualizar tudo

Depois de substituir os PDFs na raiz do projeto, rode:

```bash
npm run build:data
```

## Como encerrar

Para parar o servidor local, volte ao terminal e pressione:

```text
Ctrl + C
```
