# ENCCEJA 2020 - Aplicacao de Pratica

Este projeto abre uma aplicacao no navegador para praticar 3 provas do ENCCEJA 2020:

- Ciencias da Natureza
- Linguagens
- Matematica

Funciona assim:

1. a pessoa abre a prova
2. marca a alternativa que considera correta
3. clica em confirmar
4. a aplicacao informa se acertou ou errou
5. no final mostra o total de acertos e a taxa de aproveitamento

Tambem existe uma imagem da pagina original da prova ao lado da questao, o que ajuda quando a pergunta usa grafico, figura, tabela ou diagrama.

---

## Antes de comecar

Para usar este projeto no Windows, voce precisa ter:

- Windows 10 ou Windows 11
- Node.js instalado no computador

### Como saber se o Node.js ja esta instalado

Abra o PowerShell e rode:

```powershell
node -v
```

Se aparecer um numero de versao, por exemplo `v22.15.0`, pode continuar.

Se aparecer algo como "node nao e reconhecido", sera preciso instalar o Node.js primeiro.

### Qual versao instalar

Use de preferencia o **Node.js 22 LTS**.

Depois de instalar, feche e abra o PowerShell novamente antes de continuar.

---

## Como abrir o projeto no Windows

Se o projeto ja estiver baixado no seu computador:

1. abra a pasta do projeto
2. clique na barra de endereco da pasta
3. digite `powershell`
4. pressione `Enter`

Isso abre o PowerShell ja dentro da pasta correta do projeto.

Voce deve estar vendo algo parecido com isto:

```powershell
PS C:\Users\SeuNome\...\Encceja>
```

---

## Passo a passo para rodar a aplicacao

### Passo 1 - Instalar as dependencias

No Windows, use este comando:

```powershell
npm.cmd install
```

Esse passo baixa tudo o que a aplicacao precisa para funcionar.

Pode demorar alguns minutos na primeira vez.

### Passo 2 - Gerar a base da aplicacao

Agora rode:

```powershell
npm.cmd run build:data
```

Esse comando:

- le os PDFs da prova
- le os PDFs do gabarito
- monta as questoes da aplicacao
- cria as imagens das paginas usadas na interface

Quando terminar, a pasta `public/data` e a pasta `public/assets/pages` estarao prontas.

### Passo 3 - Iniciar a aplicacao

Rode:

```powershell
npm.cmd run dev
```

Se estiver tudo certo, vai aparecer algo parecido com isto:

```text
Aplicacao disponivel em http://localhost:3000
```

### Passo 4 - Abrir no navegador

Copie e abra no navegador o endereco mostrado no terminal.

Normalmente sera:

```text
http://localhost:3000
```

Se aparecer outra porta, como `3001` ou `3002`, abra exatamente a que apareceu no terminal.

---

## Resumo rapido

Se quiser apenas copiar e colar os comandos principais:

```powershell
npm.cmd install
npm.cmd run build:data
npm.cmd run dev
```

Depois abra no navegador:

```text
http://localhost:3000
```

Ou a porta que aparecer no terminal.

---

## Importante

### Nao feche o terminal enquanto estiver usando a aplicacao

Se fechar o PowerShell, a aplicacao para de funcionar.

### Nao abra o `index.html` com duplo clique

Esta aplicacao precisa ser aberta pelo servidor local.

Ou seja, o jeito certo e:

1. rodar `npm.cmd run dev`
2. abrir `http://localhost:3000` no navegador

### O progresso fica salvo no navegador

Se a pessoa responder algumas questoes e fechar o navegador, ao abrir de novo o progresso pode continuar salvo.

---

## Quando voce precisa rodar cada comando

### `npm.cmd install`

Use quando:

- for a primeira vez usando o projeto
- a pasta `node_modules` nao existir
- alguem acabou de baixar o projeto do Git

### `npm.cmd run build:data`

Use quando:

- for a primeira vez montando a aplicacao
- os PDFs tiverem sido trocados
- o arquivo `public/data/exams.json` nao existir
- a aplicacao abrir sem carregar as questoes

### `npm.cmd run dev`

Use sempre que quiser abrir a aplicacao.

---

## Quais arquivos nao devem ser removidos

Para a aplicacao funcionar, estes PDFs precisam continuar na pasta principal do projeto:

- `2020_GB_EM_ciencias_natureza.pdf`
- `2020_GB_EM_linguagens.pdf`
- `2020_GB_EM_matematica.pdf`
- `2020_PV_EM_ciencias_natureza.pdf`
- `2020_PV_EM_linguagens.pdf`
- `2020_PV_EM_matematica.pdf.pdf`

Se algum deles for apagado, renomeado ou movido, o comando `build:data` pode falhar.

---

## Problemas comuns no Windows

### 1. "npm nao e reconhecido" ou "node nao e reconhecido"

Isso normalmente significa que o Node.js nao esta instalado, ou foi instalado e o terminal antigo ainda esta aberto.

O que fazer:

1. instale o Node.js 22 LTS
2. feche o PowerShell
3. abra o PowerShell novamente
4. teste:

```powershell
node -v
npm.cmd -v
```

Se os dois mostrarem numero de versao, tente novamente.

---

### 2. Erro do PowerShell com `npm.ps1`

Exemplo do erro:

```text
npm : O arquivo C:\Program Files\nodejs\npm.ps1 nao pode ser carregado...
```

Isso acontece porque o PowerShell bloqueia scripts `.ps1` em alguns computadores.

Por isso, neste projeto, prefira usar:

```powershell
npm.cmd install
npm.cmd run build:data
npm.cmd run dev
```

Em vez de:

```powershell
npm install
npm run build:data
npm run dev
```

`npm.cmd` resolve esse problema na maioria dos casos.

---

### 3. A aplicacao abriu, mas as questoes nao carregaram

Normalmente isso acontece quando a base ainda nao foi gerada.

Rode:

```powershell
npm.cmd run build:data
```

Se continuar com problema, verifique se este arquivo existe:

```text
public/data/exams.json
```

E verifique tambem se os PDFs ainda estao na pasta principal do projeto.

---

### 4. O navegador nao abre sozinho

Isso e normal.

Copie manualmente o endereco que apareceu no terminal, por exemplo:

```text
http://localhost:3000
```

Cole no navegador e pressione `Enter`.

---

### 5. `http://localhost:3000` nao abriu

Veja o que o terminal mostrou depois de rodar:

```powershell
npm.cmd run dev
```

Se ele escreveu:

```text
Aplicacao disponivel em http://localhost:3001
```

entao a porta correta e `3001`, nao `3000`.

Abra exatamente o endereco mostrado.

---

### 6. Troquei os PDFs e quero atualizar a aplicacao

Depois de trocar os PDFs, rode novamente:

```powershell
npm.cmd run build:data
```

Isso recria a base e as imagens da aplicacao com os arquivos novos.

---

### 7. Fechei o terminal e a aplicacao parou

Isso tambem e normal.

O servidor local roda dentro do terminal. Se o terminal for fechado, a aplicacao sai do ar.

Basta abrir o PowerShell na pasta do projeto e rodar de novo:

```powershell
npm.cmd run dev
```

---

### 8. Quero zerar tudo e recomecar

Existem duas formas:

### Pela propria aplicacao

No resumo final existe a opcao de reiniciar.

### Pelo navegador

Se quiser apagar o progresso salvo, limpe os dados do site no navegador ou abra a aplicacao em janela anonima.

---

## Como encerrar a aplicacao

Quando terminar de usar:

1. volte para a janela do PowerShell
2. pressione:

```text
Ctrl + C
```

3. se o terminal perguntar algo, confirme

---

## Estrutura basica do projeto

Voce nao precisa mexer nesses arquivos para usar a aplicacao, mas eles sao os principais:

```text
Encceja/
  2020_PV_*.pdf
  2020_GB_*.pdf
  public/
    index.html
    data/exams.json
    assets/pages/
    js/
    styles/
  scripts/
    build-data.js
  server.js
  package.json
```

---

## Comandos principais

```powershell
npm.cmd install
npm.cmd run build:data
npm.cmd run dev
```

Se a pessoa seguir esses passos nessa ordem, a aplicacao deve funcionar normalmente no Windows.
