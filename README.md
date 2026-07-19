# O Futuro de Victor & Luana

Front-end estático e responsivo para uma vitrine de presentes de casamento com estética retrô-futurista.

## Como abrir

Abra o arquivo `index.html` no navegador. Para uma visualização mais fiel, também é possível iniciar um servidor local na pasta:

```bash
python -m http.server 8000
```

Depois, acesse `http://localhost:8000`.

## Personalização rápida

No início de `app.js`, altere:

```js
const WEDDING_DATE = "2026-10-10T12:00:00-03:00";
```

Os presentes de demonstração ficam no array `gifts`, também em `app.js`.

## O que já funciona

- contagem regressiva;
- filtros por categoria;
- cards com anel orbital de progresso;
- selo automático para itens completos;
- modal de contribuição;
- mural de recados;
- persistência local no navegador via `localStorage`;
- responsividade para celular, tablet e desktop.

## Importante

Esta versão não processa pagamentos. O formulário apenas simula a experiência e atualiza os valores localmente no navegador. Para produção, será necessário conectar o formulário a um backend e a um meio de pagamento.
