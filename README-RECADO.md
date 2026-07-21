# Integração dos recados — Victor & Luana

## Arquivos deste pacote

- `script.js`: substitui o arquivo atual da página inicial. Passa a exibir nome + mensagem, usa o mural unificado e cria automaticamente o botão **Ver mensagens para o casal** junto aos botões do topo.
- `presentes.js`: substitui o arquivo atual da lista de presentes. O mural passa a usar a mesma função pública da página inicial.
- `presentes.css`: substitui o arquivo atual e destaca o nome do autor em fonte diferenciada.
- `presentes.html`: cópia de conferência da versão usada como base; não recebeu alteração estrutural nesta integração.
- `admin-recados.html`: nova página privada, separada do painel principal, para aprovar ou retirar recados enviados tanto pela confirmação quanto pela lista de presentes.
- `migracao-recados.sql`: alteração do banco e criação da função unificada `listar_recados_publicos()`.

## Ordem recomendada

1. Faça backup do repositório e do banco.
2. Execute `migracao-recados.sql` no SQL Editor do Supabase.
3. Substitua `script.js`, `presentes.js` e `presentes.css` no repositório.
4. Adicione `admin-recados.html` na raiz do projeto.
5. `presentes.html` só precisa ser substituído se você quiser manter exatamente a cópia incluída no pacote.
6. Faça o commit e aguarde a publicação do Cloudflare Pages.
7. Entre em `admin-recados.html`, aprove alguns recados e confira as duas páginas.

## Comportamento da moderação

- Recados da confirmação de presença podem ser aprovados diretamente.
- Recados da lista de presentes só podem ser publicados depois de o pagamento estar com `status = confirmado`.
- O mesmo conjunto de recados aprovados aparece na página inicial e na página de presentes.
- O nome da pessoa passa a aparecer junto da mensagem.

## Observação sobre privacidade

O texto antigo do formulário de RSVP diz que o recado pode aparecer anonimamente. Como agora o nome será exibido, recomenda-se alterar essa frase no `index.html` para:

> O recado e seu nome poderão aparecer no site depois da aprovação dos noivos.
