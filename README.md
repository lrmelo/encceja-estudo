# ENCCEJA 2020 - Aplicação de Prática

Este projeto abre uma aplicação no navegador para praticar 3 provas do ENCCEJA 2020:

- Ciências da Natureza
- Linguagens
- Matemática

Funciona assim:

1. a pessoa abre a prova
2. marca a alternativa que considera correta
3. clica em confirmar
4. a aplicação informa se acertou ou errou
5. no final mostra o total de acertos e a taxa de aproveitamento

Também existe uma imagem da página original da prova ao lado da questão, o que ajuda quando a pergunta usa gráfico, figura, tabela ou diagrama.

---

## Antes de começar

Para usar este projeto no Windows, você precisa ter:

- Windows 10 ou Windows 11
- Node.js instalado no computador

### Como saber se o Node.js já está instalado

Abra o PowerShell e rode:

```powershell
node -v
```

Se aparecer um número de versão, por exemplo `v22.15.0`, pode continuar.

Se aparecer algo como "node não é reconhecido", será preciso instalar o Node.js primeiro.

### Qual versão instalar

Use de preferência o **Node.js 22 LTS**.

Depois de instalar, feche e abra o PowerShell novamente antes de continuar.

---

## Como abrir o projeto no Windows

Se o projeto já estiver baixado no seu computador:

1. abra a pasta do projeto
2. clique na barra de endereço da pasta
3. digite `powershell`
4. pressione `Enter`

Isso abre o PowerShell já dentro da pasta correta do projeto.

Você deve estar vendo algo parecido com isto:

```powershell
PS C:\Users\SeuNome\...\Encceja>
```

---

## Passo a passo para rodar a aplicação

### Passo 1 - Instalar as dependências

No Windows, use este comando:

```powershell
npm.cmd install
```

Esse passo baixa tudo o que a aplicação precisa para funcionar.

Pode demorar alguns minutos na primeira vez.

### Passo 2 - Gerar a base da aplicação

Agora rode:

```powershell
npm.cmd run build:data
```

Esse comando:

- lê os PDFs da prova
- lê os PDFs do gabarito
- monta as questões da aplicação
- cria as imagens das páginas usadas na interface

Quando terminar, a pasta `public/data` e a pasta `public/assets/pages` estarão prontas.

### Passo 3 - Iniciar a aplicação

Rode:

```powershell
npm.cmd run dev
```

Se estiver tudo certo, vai aparecer algo parecido com isto:

```text
Aplicação disponível em http://localhost:3000
```

### Passo 4 - Abrir no navegador

Copie e abra no navegador o endereço mostrado no terminal.

Normalmente será:

```text
http://localhost:3000
```

Se aparecer outra porta, como `3001` ou `3002`, abra exatamente a que apareceu no terminal.

---

## Resumo rápido

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

### Não feche o terminal enquanto estiver usando a aplicação

Se fechar o PowerShell, a aplicação para de funcionar.

### Não abra o `index.html` com duplo clique

Esta aplicação precisa ser aberta pelo servidor local.

Ou seja, o jeito certo é:

1. rodar `npm.cmd run dev`
2. abrir `http://localhost:3000` no navegador

### O progresso fica salvo no navegador

Se a pessoa responder algumas questões e fechar o navegador, ao abrir de novo o progresso pode continuar salvo.

---

## Quando você precisa rodar cada comando

### `npm.cmd install`

Use quando:

- for a primeira vez usando o projeto
- a pasta `node_modules` não existir
- alguém acabou de baixar o projeto do Git

### `npm.cmd run build:data`

Use quando:

- for a primeira vez montando a aplicação
- os PDFs tiverem sido trocados
- o arquivo `public/data/exams.json` não existir
- a aplicação abrir sem carregar as questões

### `npm.cmd run dev`

Use sempre que quiser abrir a aplicação.

---

## Quais arquivos não devem ser removidos

Para a aplicação funcionar, estes PDFs precisam continuar na pasta principal do projeto:

- `2020_GB_EM_ciencias_natureza.pdf`
- `2020_GB_EM_linguagens.pdf`
- `2020_GB_EM_matematica.pdf`
- `2020_PV_EM_ciencias_natureza.pdf`
- `2020_PV_EM_linguagens.pdf`
- `2020_PV_EM_matematica.pdf.pdf`

Se algum deles for apagado, renomeado ou movido, o comando `build:data` pode falhar.

---

## Problemas comuns no Windows

### 1. "npm não é reconhecido" ou "node não é reconhecido"

Isso normalmente significa que o Node.js não está instalado, ou foi instalado e o terminal antigo ainda está aberto.

O que fazer:

1. instale o Node.js 22 LTS
2. feche o PowerShell
3. abra o PowerShell novamente
4. teste:

```powershell
node -v
npm.cmd -v
```

Se os dois mostrarem número de versão, tente novamente.

---

### 2. Erro do PowerShell com `npm.ps1`

Exemplo do erro:

```text
npm : O arquivo C:\Program Files\nodejs\npm.ps1 não pode ser carregado...
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

### 3. A aplicação abriu, mas as questões não carregaram

Normalmente isso acontece quando a base ainda não foi gerada.

Rode:

```powershell
npm.cmd run build:data
```

Se continuar com problema, verifique se este arquivo existe:

```text
public/data/exams.json
```

E verifique também se os PDFs ainda estão na pasta principal do projeto.

---

### 4. O navegador não abre sozinho

Isso é normal.

Copie manualmente o endereço que apareceu no terminal, por exemplo:

```text
http://localhost:3000
```

Cole no navegador e pressione `Enter`.

---

### 5. `http://localhost:3000` não abriu

Veja o que o terminal mostrou depois de rodar:

```powershell
npm.cmd run dev
```

Se ele escreveu:

```text
Aplicação disponível em http://localhost:3001
```

então a porta correta é `3001`, não `3000`.

Abra exatamente o endereço mostrado.

---

### 6. Troquei os PDFs e quero atualizar a aplicação

Depois de trocar os PDFs, rode novamente:

```powershell
npm.cmd run build:data
```

Isso recria a base e as imagens da aplicação com os arquivos novos.

---

### 7. Fechei o terminal e a aplicação parou

Isso também é normal.

O servidor local roda dentro do terminal. Se o terminal for fechado, a aplicação sai do ar.

Basta abrir o PowerShell na pasta do projeto e rodar de novo:

```powershell
npm.cmd run dev
```

---

### 8. Quero zerar tudo e recomeçar

Existem duas formas:

### Pela própria aplicação

No resumo final existe a opção de reiniciar.

### Pelo navegador

Se quiser apagar o progresso salvo, limpe os dados do site no navegador ou abra a aplicação em janela anônima.

---

## Como encerrar a aplicação

Quando terminar de usar:

1. volte para a janela do PowerShell
2. pressione:

```text
Ctrl + C
```

3. se o terminal perguntar algo, confirme

---

## Estrutura básica do projeto

Você não precisa mexer nesses arquivos para usar a aplicação, mas eles são os principais:

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

Se a pessoa seguir esses passos nessa ordem, a aplicação deve funcionar normalmente no Windows.
