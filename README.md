# SmartLar Hub

Aplicação web para gestão de clientes, produtos, técnicos, pedidos e agenda de
instalações de uma empresa de automação residencial. O frontend é feito com
TanStack Start, React e TypeScript; os dados e a autenticação usam Supabase; e
as automações operacionais são executadas no n8n.

## Visão geral da arquitetura

```text
Navegador
  ├── Frontend SmartLar Hub (TanStack Start / React)
  │     ├── Supabase Auth — sessão do usuário
  │     └── Supabase Data API — clientes, produtos, técnicos e pedidos
  │            └── PostgreSQL — tabelas, RLS, RPC e triggers
  │
  └── n8n (n8n.cloud recomendado para operação)
        ├── PostgreSQL Session Pooler — eventos e consultas
        └── Google Sheets / e-mail — destinos das automações
```

O frontend e o n8n não compartilham um banco local. Ambos se conectam a
projetos Supabase hospedados. O arquivo [`compose.yaml`](./compose.yaml) inicia
a aplicação e, opcionalmente, uma instância local do n8n; ele **não** sobe uma
instância PostgreSQL.

### Como a aplicação se conecta ao Supabase

Há dois clientes Supabase com finalidades distintas:

1. O cliente gerado em `src/integrations/supabase/client.ts` usa
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no navegador. No
   servidor, usa `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`.
2. O cliente comercial em `src/lib/product-catalog.ts` usa
   `VITE_CATALOG_SUPABASE_URL` e
   `VITE_CATALOG_SUPABASE_PUBLISHABLE_KEY`. O alias `ordersClient` também aponta
   para esse cliente. Portanto, as telas de clientes, produtos, técnicos,
   pedidos e agenda usam o projeto comercial configurado nesse segundo par.

O login também usa o Supabase Auth do projeto comercial. As chamadas do
frontend incluem a chave pública e a sessão do usuário; o PostgreSQL aplica as
políticas RLS conforme o papel/JWT recebido. As telas dependem de uma sessão
autenticada e de políticas compatíveis com as operações necessárias.

Existe ainda um cliente administrativo em
`src/integrations/supabase/client.server.ts`. Ele usa
`SUPABASE_SERVICE_ROLE_KEY` somente no servidor para operações administrativas
que importem esse módulo. A chave ignora RLS e nunca pode ser enviada ao
navegador. Não é a credencial utilizada pelas telas normais do frontend.

Se o projeto principal e o projeto comercial forem o mesmo, configure ambos os
pares de URL/chave para o mesmo projeto. Se forem projetos distintos, confirme
que as tabelas consultadas pelas telas existem no projeto comercial e que as
chaves estão associadas às URLs corretas.

## Executar com Docker Compose

### Requisitos

- Docker Engine com Compose v2 (`docker compose`)
- Projeto Supabase configurado

### 1. Clonar e configurar o ambiente

```sh
git clone https://github.com/Joaovirone/IAplicada-teste-pratico.git
cd IAplicada-teste-pratico
```

Crie `.env` na raiz do repositório. O arquivo não é versionado pelo Git.
Para facilitar a avaliação, abaixo estão os valores públicos dos projetos
Supabase usados nos testes. O projeto principal e o catálogo comercial são
distintos; mantenha cada URL e chave no respectivo bloco:

```dotenv
# Projeto Supabase principal
SUPABASE_PROJECT_ID=sbawywqrkvtpquslwgvk
SUPABASE_URL=https://sbawywqrkvtpquslwgvk.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_HOKym5Diz-rkk7_QSyUTAA_vPFvPhfJ
VITE_SUPABASE_PROJECT_ID=sbawywqrkvtpquslwgvk
VITE_SUPABASE_URL=https://sbawywqrkvtpquslwgvk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_HOKym5Diz-rkk7_QSyUTAA_vPFvPhfJ

# Projeto comercial usado pelas telas de clientes, produtos, técnicos e pedidos.
VITE_CATALOG_SUPABASE_URL=https://zhtjjdqydauljvbjqyux.supabase.co
VITE_CATALOG_SUPABASE_PUBLISHABLE_KEY=sb_publishable_NCix1VyTM3kLZMGnyf2vUA_6Ko79O9D

# Portas publicadas na máquina local (opcionais; estes são os valores padrão)
APP_PORT=3000
N8N_PORT=5678
```

`SUPABASE_PROJECT_ID` e `VITE_SUPABASE_PROJECT_ID` identificam o projeto, mas
não são consumidos atualmente pelo Compose ou pelos clientes da aplicação.
`SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` são usados no servidor pelo
cliente Supabase principal; as variáveis `VITE_SUPABASE_*` são usadas pelo
frontend. O Compose exige as quatro variáveis `VITE_*` de URL e chave durante
o build. As variáveis `VITE_CATALOG_SUPABASE_*` configuram o cliente comercial
que as telas de negócio utilizam.

As chaves `sb_publishable_*` são chaves públicas de cliente, não senhas nem
chaves administrativas. Como as variáveis `VITE_*` ficam visíveis no bundle do
navegador e este README está no repositório, use esses projetos somente para
teste/demonstração. O controle de acesso deve continuar no Supabase Auth e nas
políticas RLS; não coloque senhas PostgreSQL, `service_role` ou `sb_secret_*`
neste arquivo. Se uma operação administrativa server-side exigir uma chave de
serviço, configure `SUPABASE_SERVICE_ROLE_KEY` apenas no ambiente privado do
servidor — nunca em `VITE_*`.

### 2. Iniciar a aplicação e o n8n local

```sh
docker compose up --build -d
```

Endereços locais padrão:

| Serviço | Endereço | Porta padrão |
| --- | --- | ---: |
| SmartLar Hub | [http://localhost:3000](http://localhost:3000) | `3000` |
| Editor n8n local | [http://localhost:5678](http://localhost:5678) | `5678` |

Se a porta estiver ocupada, altere `APP_PORT` ou `N8N_PORT` no `.env`. Por
exemplo, `APP_PORT=3100` publica o frontend em `http://localhost:3100`, sem
alterar a porta interna `3000` do container.

O Compose constrói o frontend como um servidor Node de produção e publica a
porta `3000`. Os valores `VITE_*` são passados como argumentos de build e ficam
incorporados ao bundle do navegador. Portanto, após alterar esses valores,
reconstrua a imagem:

```sh
docker compose up --build -d app
```

As variáveis sem prefixo `VITE_` são entregues ao servidor pelo `env_file` do
Compose. Para acompanhar os logs:

```sh
docker compose logs -f app
docker compose logs -f n8n
```

Para parar os serviços sem apagar os dados persistidos:

```sh
docker compose down
```

As credenciais e configurações do n8n local são mantidas no volume Docker
`n8n_data`. Não use `docker compose down -v` se quiser preservar esse volume.

### Desenvolvimento sem container

Para executar somente o frontend com Vite:

```sh
npm install
npm run dev
```

O Vite escolhe e informa o endereço disponível no terminal. Essa execução não
inicia o n8n nem altera os dados do Supabase. Para testes, o projeto também
disponibiliza:

```sh
npm run build
npm run preview
npm run lint
npm test
```

## Preparar o Supabase

Os scripts SQL estão em [`database/`](./database/). Em um banco novo, aplique
os arquivos na ordem:

1. [`001_tabelas.sql`](./database/001_tabelas.sql): cria tabelas,
   relacionamentos, índices e habilita RLS.
2. [`002_rls.sql`](./database/002_rls.sql): cria políticas para
   `authenticated`; não concede políticas ao papel `anon`.
3. [`003_functions_triggers.sql`](./database/003_functions_triggers.sql):
   instala a RPC `criar_pedido_completo` e triggers de `updated_at` e histórico
   de status.
4. [`004_data_seed_1.sql`](./database/004_data_seed_1.sql): popula dados
   fictícios para desenvolvimento e demonstração.

Execute os scripts no SQL Editor do projeto Supabase correto — em especial, o
projeto comercial usado pelas telas. `CREATE TABLE IF NOT EXISTS` não migra
automaticamente tabelas existentes para uma definição diferente. Em ambientes
com dados, revise o schema e aplique migrações controladas; não rode seed de
demonstração sobre dados reais sem revisar seus efeitos.

## Integração com n8n

O n8n conecta-se diretamente ao PostgreSQL do Supabase para observar eventos e
executar consultas. Para o node **Postgres Trigger**, use a conexão **Session
Pooler** do Supabase, normalmente na porta `5432`. O **Transaction Pooler**,
normalmente na porta `6543`, pode encerrar ou reutilizar sessões e não é
adequado para um listener PostgreSQL de longa duração (`LISTEN`).

Obtenha host, database, usuário, senha, porta e exigências de SSL em **Supabase
→ Connect**. Cadastre esses dados como uma credencial Postgres no n8n. Não
confunda a chave API `service_role` com uma senha PostgreSQL: ela não autentica
uma conexão direta ao banco. Uma conexão Postgres também não ignora RLS
automaticamente; isso depende da role PostgreSQL e dos privilégios efetivos.
Use uma credencial de banco com o menor privilégio necessário e proteja-a no
cofre de credenciais do n8n.

Para produção, o [n8n.cloud](https://n8n.io/cloud/) é recomendado: ele mantém
workflows e agendamentos ativos sem depender de um computador local ligado. O
n8n local do Compose é útil para desenvolvimento. Se usar triggers Postgres
locais, ele também precisa alcançar o banco Supabase pela conexão de rede. Um
webhook hospedado no Supabase não consegue chamar `localhost` no computador do
desenvolvedor; nesse caso, use uma URL pública protegida ou mantenha o workflow
hospedado no n8n.cloud.

### Workflows previstos

1. **Novo orçamento:** observar inserções em `public.pedidos`, filtrar status
   `orcamento`, consultar o cliente relacionado e enviar nome, valor e data
   para Google Sheets ou outro destino.
2. **Agenda do dia seguinte:** executar diariamente, consultar pedidos com
   status `agendado` para amanhã, incluindo cliente, endereço, técnico e
   horário, e enviar o resumo.
3. **Bônus — faturamento:** ao mudar um pedido para `concluido`, registrar
   data, cliente, valor e forma de pagamento em Google Sheets.

Em um node **Postgres Trigger**, a tabela é `public.pedidos`; use o payload
recebido pelo trigger para filtrar `status` e buscar os dados complementares em
`public.clientes` e `public.tecnicos`. Para a agenda, a consulta deve delimitar
o dia de amanhã no fuso configurado, não comparar timestamps por igualdade.
Configure o fuso do workflow e do node Schedule de maneira consistente.

O script [`005_n8n_status_notify.sql`](./database/005_n8n_status_notify.sql) é
uma proposta de trigger `LISTEN/NOTIFY` para a automação de faturamento. Ele
não é aplicado pelos scripts base: revise-o e aplique-o explicitamente ao banco
antes de configurar o Postgres Trigger para escutar o canal
`pedidos_status_change`. `LISTEN/NOTIFY` não é uma fila durável: eventos
publicados enquanto o workflow está desconectado não são reentregues.

### Estado da integração documentado

O arquivo [`database/N8N_DIAGNOSTICO.md`](./database/N8N_DIAGNOSTICO.md)
registra a verificação de 04/10/2026. Naquele diagnóstico, a consulta diária
corrigida estava publicada e validada no PostgreSQL, mas não havia pedidos
elegíveis naquele teste; o node de gravação no Sheets não foi executado. As
correções do fluxo de orçamento ainda precisavam ser publicadas, e a proposta
SQL da notificação de mudança de status não tinha sido aplicada ao Supabase.
Antes de considerar a integração pronta, confirme o estado atual no n8n e
execute testes de produção controlados para os dois workflows obrigatórios.

## Estrutura relevante do repositório

```text
src/
  routes/                 Telas e rotas do SmartLar Hub
  components/             Componentes compartilhados da interface
  lib/                    Clientes e regras compartilhadas de negócio
  integrations/supabase/  Clientes Supabase e tipos
database/                 Schema, políticas, funções, seed e integração n8n
compose.yaml              App e n8n local
Dockerfile                Build e runtime da aplicação
```

As telas incluem dashboard, login, clientes, produtos, técnicos, pedidos, novo
pedido e agenda. O fluxo de novo pedido chama a RPC `criar_pedido_completo` para
criar o pedido e seus itens em uma operação transacional. As triggers mantêm
`updated_at` e registram mudanças de status no histórico.

## Segurança

- Os arquivos `.env` e `.env.*` são ignorados pelo Git; não os versione.
- Valores `VITE_*` são públicos após o build. Use somente URL e chave
  `publishable` (ou a chave legada `anon`) nessas variáveis.
- Mantenha `SUPABASE_SERVICE_ROLE_KEY` e credenciais PostgreSQL apenas no
  servidor ou no cofre de credenciais do n8n.
- RLS limita o acesso feito com as credenciais públicas; revise suas políticas
  para cada papel e ambiente.
- Use dados fictícios nos seeds de demonstração e valide o impacto antes de
  executar SQL em produção.
