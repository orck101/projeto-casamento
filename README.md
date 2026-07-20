# Convite digital — Victor & Luana

Site do convite e da lista de presentes do casamento de Victor e Luana.

## Conteúdo

- `index.html`: convite digital, detalhes do almoço e confirmação de presença.
- `styles.css`: identidade visual inspirada no convite impresso.
- `script.js`: contagem regressiva, menu, animações e formulário RSVP.
- `presentes.html`: catálogo futurístico e fluxo de pagamento via Pix.
- `presentes.js`: integração com o Supabase, geração do Pix e mural de recados.
- `admin.html`: painel privado para confirmações, presentes e pagamentos.
- `assets/`: fotografias otimizadas e elementos botânicos.

## Confirmação de presença

O formulário grava as respostas na tabela `confirmacoes` do Supabase. Os dados ficam disponíveis no painel privado, incluindo responsável, telefone, acompanhantes, número de adultos, crianças e recado.

## Data configurada

`08/08/2026 às 13h`, fuso horário de Brasília. A data está na constante `WEDDING_DATE`, no início de `script.js`.

## Abrir localmente

Abra `index.html` em um navegador. Para testar em servidor local:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Módulo da lista de presentes

A página `presentes.html` contém a lista futurística conectada ao Supabase:

- catálogo com 12 presentes e três categorias;
- progresso circular em formato de órbita;
- formulário de contribuição com valores sugeridos e valor livre;
- mural de recados;
- atualização do progresso após a confirmação do pagamento;
- geração de QR Code e código Pix Copia e Cola;
- resumo e aviso opcional aos noivos pelo WhatsApp;
- layout responsivo para celular e computador.

### Pagamentos

O convidado escolhe uma invenção, informa o valor e gera um Pix com o valor preenchido. O pagamento é concluído somente quando ele confirma a operação no aplicativo do próprio banco. O site não solicita senha, cartão ou qualquer dado bancário.

Cada contribuição é registrada inicialmente como `pendente`. Depois de conferir o recebimento no banco, Victor ou Luana confirma o pagamento no painel privado. Somente as contribuições confirmadas atualizam o valor arrecadado.
