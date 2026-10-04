# SmartLar Hub

Sistema web para apoiar a gestão de clientes, produtos e pedidos de uma empresa
de automação residencial. O projeto usa Supabase como backend e banco de dados,
e prevê automações com n8n para acompanhar orçamentos e instalações.

## Tecnologias

- [TanStack Start](https://tanstack.com/start)
- [React](https://react.dev/) e [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) — autenticação e persistência
- [n8n](https://n8n.io/) — automações e integrações

## Requisitos

- Node.js e npm
- Acesso a um projeto Supabase
- Docker Compose, caso queira executar a aplicação e uma instância local do
  n8n em containers

## Executar localmente

Clone o repositório, instale as dependências e inicie o servidor de
desenvolvimento:

```sh
git clone <URL_DO_REPOSITORIO>
cd <PASTA_DO_REPOSITORIO>
npm install
npm run dev
```

O Vite exibirá no terminal o endereço local da aplicação.

Scripts disponíveis:

```sh
npm run dev       # servidor de desenvolvimento
npm run build     # build de produção
npm run preview   # visualizar o build localmente
npm run lint      # análise estática com ESLint
npm test          # testes automatizados
```

## Configuração do Supabase

Crie um arquivo `.env` na raiz do projeto. Não envie esse arquivo ao Git: os
arquivos `.env` e `.env.*` estão incluídos no `.gitignore`.

```dotenv
VITE_SUPABASE_URL=https://SEU_PROJETO_PRINCIPAL.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA_DO_PROJETO_PRINCIPAL
SUPABASE_URL=https://SEU_PROJETO_PRINCIPAL.supabase.co
SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA_DO_PROJETO_PRINCIPAL

VITE_CATALOG_SUPABASE_URL=https://SEU_PROJETO_COMERCIAL.supabase.co
VITE_CATALOG_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA_DO_PROJETO_COMERCIAL
```

O cliente Supabase principal utiliza `VITE_SUPABASE_*`. O catálogo comercial,
consumido pelo módulo `src/lib/product-catalog.ts`, utiliza
`VITE_CATALOG_SUPABASE_*`. Se ambos os módulos devem usar o mesmo projeto,
configure os dois pares de variáveis com os dados desse projeto. Se forem
projetos diferentes, mantenha cada URL e chave associadas ao projeto correto.

As variáveis com prefixo `VITE_` são incorporadas ao código entregue ao
navegador. Use nelas somente chaves públicas do tipo **publishable** ou, em
projetos que ainda usem as chaves legadas, **anon**. Nunca coloque senha do
banco, `service_role` ou chave `sb_secret_*` em variáveis `VITE_*` ou no código
do frontend.

O login das telas que usam o catálogo comercial deve autenticar usuários no
projeto Supabase indicado por `VITE_CATALOG_SUPABASE_URL`. Para que as consultas
respeitem as políticas RLS, os usuários precisam existir no Auth desse projeto
e a sessão autenticada deve estar ativa.

Após alterar as variáveis de ambiente, reinicie o servidor de desenvolvimento.
Em um build de produção, gere novamente o bundle depois de alterar variáveis
`VITE_*`.

## Banco de dados

Os scripts SQL versionados estão em [`database/`](./database/). Para preparar
um banco novo, aplique-os nesta ordem, por meio do Supabase SQL Editor ou de uma
ferramenta PostgreSQL:

1. [`001_tabelas.sql`](./database/001_tabelas.sql) — tabelas, relacionamentos,
   índices e ativação de RLS.
2. [`002_rls.sql`](./database/002_rls.sql) — políticas para o papel
   `authenticated`.
3. [`003_functions_triggers.sql`](./database/003_functions_triggers.sql) —
   função transacional `criar_pedido_completo` e triggers de atualização e
   histórico de status.
4. [`004_data_seed_1.sql`](./database/004_data_seed_1.sql) — dados de exemplo
   para desenvolvimento e demonstração.

O script de tabelas usa `CREATE TABLE IF NOT EXISTS`; ele não migra nem
sincroniza automaticamente uma tabela que já exista com uma estrutura
diferente. Para alterar um banco existente, compare o schema atual e aplique
migrações explícitas antes de executar os demais scripts.

As políticas de `002_rls.sql` permitem operações às sessões autenticadas e não
concedem acesso ao papel `anon`. Ajuste as políticas de acordo com as regras de
acesso do ambiente antes de disponibilizar o sistema. O seed contém dados
fictícios e deve ser usado somente em ambientes de desenvolvimento ou
demonstração.

## Automações com n8n

Para a entrega do teste prático, a opção recomendada é o
[n8n.cloud](https://n8n.io/cloud/). Com o workflow hospedado, ele pode receber
eventos do Supabase e executar agendamentos sem depender de um computador local
ligado.

As automações previstas são:

- **Novo orçamento:** detectar um pedido criado com status `orcamento` e
  encaminhar cliente, valor e data para um destino externo.
- **Instalações do dia seguinte:** consultar pedidos `agendado` e enviar um
  resumo com cliente, endereço, técnico e horário.
- **Bônus — faturamento:** registrar pedidos que mudaram para `concluido`.

Configure as credenciais do Supabase e dos serviços de destino no cofre de
credenciais do n8n. Evite inserir senhas ou chaves privadas diretamente em
nodes, expressões, arquivos versionados ou dados enviados ao navegador. Para
receber eventos em produção, use a URL de produção do Webhook do n8n.cloud e
proteja o endpoint com autenticação ou um segredo compartilhado.

### n8n local para desenvolvimento

O arquivo [`compose.yaml`](./compose.yaml) também permite executar a aplicação
e uma instância local do n8n. Essa opção é conveniente para configuração e
testes locais, mas não substitui o n8n.cloud na entrega: endpoints em
`localhost` não ficam normalmente acessíveis aos webhooks do Supabase hospedado
na nuvem.

Com as variáveis de ambiente configuradas no `.env`, inicie os serviços:

```sh
docker compose up --build -d
```

Por padrão, a aplicação fica disponível em `http://localhost:3000` e o n8n em
`http://localhost:5678`. Para alterar as portas publicadas no computador, use
`APP_PORT` e `N8N_PORT` no `.env`.

O Compose inicia a aplicação e o n8n, mas **não** inicia um banco PostgreSQL
local: os clientes continuam apontando para os projetos Supabase configurados.
Os dados e as configurações da instância local do n8n são persistidos no volume
Docker `n8n_data`.

## Segurança

- Não versione arquivos `.env`, senhas, tokens ou chaves privadas.
- Use apenas chaves públicas no frontend; mantenha segredos exclusivamente no
  servidor ou nas credenciais protegidas do serviço que os utiliza.
- Mantenha RLS habilitado e conceda acesso apenas aos papéis e operações
  necessários.
- Antes de publicar o sistema, revise as políticas RLS e restrinja o acesso de
  cada papel aos dados que ele realmente precisa.
