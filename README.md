# SmartLar Hub

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Configuração do Supabase

Crie um arquivo `.env` local na raiz antes de iniciar o app. Todos os arquivos
`.env` e `.env.*` são ignorados pelo Git. Configure também estas variáveis no
provedor de hospedagem antes do build:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO-PRINCIPAL.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA_PRINCIPAL
SUPABASE_URL=https://SEU-PROJETO-PRINCIPAL.supabase.co
SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA_PRINCIPAL
VITE_CATALOG_SUPABASE_URL=https://SEU-PROJETO-COMERCIAL.supabase.co
VITE_CATALOG_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA_COMERCIAL
```

O cliente principal gerado pelo Lovable usa `VITE_SUPABASE_*` no navegador e
`SUPABASE_*` no servidor. O módulo separado `src/lib/product-catalog.ts` usa
`VITE_CATALOG_SUPABASE_*` para o banco comercial externo, compartilhado pelas
telas de produtos, clientes e pedidos. Preserve essa separação se os projetos
Supabase forem diferentes. Reinicie o servidor de desenvolvimento após editar
as variáveis.

Use somente uma chave pública **publishable** ou a chave legada **anon** nas
variáveis `VITE_*`: elas ficam disponíveis no JavaScript enviado ao navegador.
Senhas do banco, `service_role` e chaves `sb_secret_*` não devem ser usadas no
frontend nem adicionadas ao repositório. O módulo administrativo gerado, caso
seja utilizado em funções de servidor, lê `SUPABASE_SERVICE_ROLE_KEY`
exclusivamente no servidor; esta tela de clientes não precisa dessa chave.

As permissões de acesso continuam sendo controladas pelas políticas RLS do
Supabase. O script `database/002_rls.sql` concede acesso anônimo completo para a
demonstração; use apenas dados fictícios enquanto essas políticas estiverem
ativas. Antes de usar dados reais, configure autenticação e políticas restritas.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
