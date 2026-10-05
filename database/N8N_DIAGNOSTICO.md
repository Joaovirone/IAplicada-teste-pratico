# Diagnóstico do n8n.cloud — 04/10/2026

## Constatado na instância

- Os três workflows estão publicados. O de orçamento tinha alterações de rascunho ainda não publicadas.
- A credencial PostgreSQL estava usando o pooler transacional, porta 6543.
  Consultas SELECT funcionaram, mas os gatilhos Postgres dependem de LISTEN
  e de uma sessão persistente. Usar Session pooler, porta 5432.
- O Postgres Trigger de orçamento entrega a linha em `payload`. O IF original
  procurava `$json.status` e a consulta procurava `$json.cliente_id` na raiz.
- O mapeamento de data do orçamento procurava `data_pedido`, mas o banco usa
  `created_at`. O teste anterior usava um formato de dados diferente do evento real.
- O faturamento escuta `pedidos_status_change` em modo Advanced. A consulta aos
  triggers de `public.pedidos` encontrou somente o trigger de INSERT criado pelo
  n8n, `set_pedidos_updated_at` e `tg_historico_status`. Nenhuma dessas funções
  menciona o canal esperado pelo faturamento.
- A agenda original não filtrava status e convertia `timestamptz` para data/hora
  sem definir o fuso. Isso podia incluir pedidos de outros status/dias e exibir UTC.

## Agenda corrigida e publicada

Mantidos Google Sheets e 08h, conforme escolha explícita do usuário.

```sql
WITH limites AS (
  SELECT (now() AT TIME ZONE 'America/Maceio')::date + 1 AS dia
)
SELECT
  p.id AS pedido_id,
  c.nome AS cliente_nome,
  c.endereco AS cliente_endereco,
  COALESCE(t.nome, 'Técnico não definido') AS tecnico_nome,
  to_char(p.data_instalacao AT TIME ZONE 'America/Maceio', 'DD/MM/YYYY') AS data,
  to_char(p.data_instalacao AT TIME ZONE 'America/Maceio', 'HH24:MI') AS horario
FROM public.pedidos p
JOIN public.clientes c ON c.id = p.cliente_id
LEFT JOIN public.tecnicos t ON t.id = p.tecnico_id
CROSS JOIN limites l
WHERE p.status = 'agendado'
  AND p.data_instalacao >= (l.dia::timestamp AT TIME ZONE 'America/Maceio')
  AND p.data_instalacao < ((l.dia + 1)::timestamp AT TIME ZONE 'America/Maceio')
ORDER BY p.data_instalacao, t.nome;
```

Validação real: consulta executada com sucesso. Sem pedidos elegíveis naquele
momento, `Always Output Data` produziu item vazio e o IF `pedido_id exists`
encaminhou para False Branch. Não foi executado o node que grava no Sheets.

## Orçamento — correções preparadas no editor

Filtro: `{{ ($json.payload ?? $json).status }}` igual a `orcamento`.
O fallback mantém compatibilidade com o webhook de testes já existente.

```sql
SELECT c.nome,
       $2::numeric AS valor_total,
       to_char($3::timestamptz AT TIME ZONE 'America/Maceio',
               'DD/MM/YYYY HH24:MI') AS data_pedido
FROM public.clientes c
WHERE c.id = $1::uuid;
```

Query Parameters:

```javascript
{{ [($json.payload ?? $json).cliente_id,
    ($json.payload ?? $json).valor_total,
    ($json.payload ?? $json).created_at ?? ($json.payload ?? $json).data_pedido] }}
```

Mapeamento: Cliente = `$json.nome`; Valor Total = `Number($json.valor_total)`;
Data = `$json.data_pedido`.

## Faturamento

O arquivo `005_n8n_status_notify.sql` é uma proposta para suprir o canal ausente.
Sua criação local não significa que foi aplicado ao banco. A aplicação depende
de autorização, pois o usuário havia limitado alterações SQL a arquivos locais.

Após a conexão em modo Session e o trigger serem configurados, reiniciar os
ouvintes dos workflows publicados para que usem a conexão correta.

## Validação final pendente

1. Confirmar a conexão na porta 5432.
2. Publicar as correções do orçamento e reiniciar os ouvintes.
3. Aplicar o SQL de faturamento somente após autorização.
4. Criar um pedido de teste pela aplicação e conferir a execução de produção.
5. Concluir um pedido pelo fluxo normal e conferir a linha no Sheets.
6. Atualizar um pedido já concluído e conferir que não aparece outra linha.

Os testes devem usar dados de teste e destinos autorizados. Não repetir Append Row
às cegas: reexecução pode duplicar uma linha. LISTEN/NOTIFY não recupera eventos
ocorridos enquanto o n8n estiver desconectado.
