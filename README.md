# Jasmine & Pedro — planejador de casamento

Aplicação web para organizar o planejamento do casamento: tarefas, fornecedores, cronograma e informações do dia. A interface se adapta a celulares e pode ser instalada como PWA.

## Recursos

- Painel com progresso do planejamento e próximos itens.
- Checklist de tarefas com prazos, responsáveis e status.
- Cadastro de fornecedores e informações de contato.
- Cronograma do dia do casamento.
- Armazenamento local quando o Supabase não está configurado.
- Sincronização e atualizações em tempo real com Supabase.
- Login, recuperação de senha e permissões para administradores e cerimonialistas.

## Tecnologias

- React e TypeScript
- Vite e Tailwind CSS
- Supabase (Auth, Database e Realtime)
- Lucide Icons

## Executar localmente

Requer Node.js e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

No Windows PowerShell, copie o arquivo de exemplo com:

```powershell
Copy-Item .env.example .env.local
```

Sem as credenciais do Supabase, o app usa dados locais no navegador. Para ativar o backend, preencha `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICAVEL
VITE_ENABLE_AUTH=true
```

Use somente a chave publicável no frontend. Nunca coloque `service_role` ou outros segredos em variáveis `VITE_*`; elas são incorporadas ao código entregue ao navegador. `.env.local` está excluído pelo `.gitignore`.

## Configurar o Supabase

1. Crie um projeto Supabase e configure a URL e a chave publicável em `.env.local`.
2. Execute `supabase/schema.sql` no SQL Editor para criar a tabela de estado do planejador.
3. Revise `supabase/migrations/20261103_add_roles_and_lock_planner.sql`: ela contém os e-mails iniciais dos administradores. Troque-os pelos e-mails corretos antes de executar.
4. Crie os usuários administradores no Supabase Auth com os mesmos e-mails definidos na migration de papéis.
5. Aplique `20261103_add_roles_and_lock_planner.sql`, `20261104_enable_planner_realtime.sql` e `20261106_close_temporary_anonymous_planner_access.sql`, nessa ordem. A primeira migration associa os usuários que já existem.
6. Defina `VITE_ENABLE_AUTH=true` para ativar o fluxo de login.

`20261105_allow_anonymous_planner_temporarily.sql` abre temporariamente leitura e edição anônimas do estado do planejador. Não a aplique em uma instalação nova. A migration seguinte remove essas permissões; confirme as políticas e permissões efetivas no Supabase antes de colocar o app em uso.

## Scripts

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # verificação TypeScript e build de produção
npm run preview  # pré-visualizar o build localmente
```
