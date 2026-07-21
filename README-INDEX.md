# Ajustes da página inicial

## Arquivos

- `index.html`: substitua o arquivo atual.
- `script.js`: substitua o arquivo atual. Ele preserva a integração dos recados e remove o zero à esquerda apenas dos dias.
- `index-ajustes.css`: adicione este novo arquivo na raiz do projeto. O `index.html` já está configurado para carregá-lo depois de `styles.css`.

## Alterações realizadas

1. A contagem de dias passa a exibir `17`, e não `017`.
2. Horas, minutos e segundos continuam com dois dígitos, como `09` e `05`.
3. Data, horário e local foram reunidos em um único bloco.
4. As numerações `01`, `02` e `03` foram removidas.
5. O botão `Abrir no mapa` foi incorporado ao mesmo bloco.
6. Foi preservado o botão `Ver mensagens para o casal` e a exibição do nome de quem deixou o recado.
7. O aviso do formulário foi atualizado para informar que o nome também poderá aparecer no site.

Não é necessário executar novo SQL no Supabase para esta alteração.
