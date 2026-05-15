# Comanda Digital Integrada - Tempero de Maria

Protótipo funcional de baixa fidelidade para demonstrar um fluxo simples de comanda digital em restaurante:

Login -> Menu -> Garçom registra pedido -> Cozinha recebe pedido -> Caixa fecha conta.

## Objetivo

Demonstrar, em uma página web estática, como um restaurante pode registrar pedidos por mesa, acompanhar o preparo na cozinha e fechar a conta no caixa sem backend real.

## Funcionalidades

- Login simulado aceitando qualquer usuário e senha.
- Menu principal com módulos Garçom, Cozinha, Caixa e Reiniciar dados.
- Cadastro de pedidos por mesa com produtos, quantidade e observação.
- Persistência dos pedidos em `localStorage`.
- Painel da cozinha com alteração de status: Recebido, Em preparo e Pronto.
- Fechamento de conta por mesa com total automático e forma de pagamento.
- Arquivamento dos pedidos finalizados e registro de venda.
- QR Code apontando para o GitHub Pages do projeto.
- Layout responsivo para celular e desktop.

## Tecnologias usadas

- HTML5
- CSS3
- JavaScript puro
- localStorage
- GitHub Pages com GitHub Actions

## GitHub Pages

URL esperada:

https://albertomateus9.github.io/comanda-digital-tempero-maria/

## Rodar localmente

Abra o arquivo `index.html` no navegador ou use um servidor estático simples na raiz do projeto:

```bash
python -m http.server 8080
```

Depois acesse:

```text
http://localhost:8080
```

## Publicar no GitHub Pages

1. Envie os arquivos para a branch `main`.
2. No GitHub, abra `Settings > Pages`.
3. Em `Build and deployment`, selecione `GitHub Actions`.
4. Faça um push na branch `main`.
5. O workflow `.github/workflows/pages.yml` publicará os arquivos estáticos da raiz.

## QR Code do projeto

![QR Code do protótipo](assets/qrcode-site.png)
