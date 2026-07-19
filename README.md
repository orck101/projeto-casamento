# Convite digital — Victor & Luana

Primeiro módulo do site do casamento.

## Conteúdo

- `index.html`: convite digital completo.
- `styles.css`: identidade visual inspirada no convite impresso.
- `script.js`: contagem regressiva, menu, animações e formulário RSVP.
- `presentes.html`: página provisória para o próximo módulo.
- `assets/`: fotografias otimizadas e elementos botânicos.

## Confirmação de presença

O formulário monta uma mensagem estruturada e abre o WhatsApp no número `(12) 99136-0571`. O convidado precisa tocar em **Enviar** para concluir. Uma cópia também é gravada no `localStorage` do próprio navegador apenas para teste; isso não funciona como banco de dados central.

## Data configurada

`08/08/2026 às 13h`, fuso horário de Brasília. A data está na constante `WEDDING_DATE`, no início de `script.js`.

## Abrir localmente

Abra `index.html` em um navegador. Para testar em servidor local:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Módulo da lista de presentes

A página `presentes.html` agora contém o protótipo completo da lista futurística:

- catálogo com 12 presentes e três categorias;
- progresso circular em formato de órbita;
- filtros por categoria;
- formulário de contribuição com valores sugeridos e valor livre;
- mural de recados;
- atualização simulada do progresso por `localStorage`;
- resumo e envio da intenção de presente pelo WhatsApp;
- layout responsivo para celular e computador.

### Pagamentos

A página está em modo de demonstração e não realiza cobranças. Para exibir uma chave Pix no resumo, edite o início de `presentes.js`:

```js
const CONFIG = {
  whatsapp: "5512991360571",
  pixKey: "SUA_CHAVE_PIX",
  pixHolder: "Victor & Luana"
};
```

Para uso real, o registro do presente e a atualização dos valores devem ser conectados a um banco de dados e confirmados somente após a validação do pagamento.
