-- Proposta de integração com o workflow "Pedidos Concluídos para Google Sheets".
-- NÃO aplicado automaticamente ao Supabase. Revisar antes de executar.
-- O Postgres Trigger do n8n deve usar Session pooler (5432) e escutar
-- o canal pedidos_status_change em modo Advanced.
-- LISTEN/NOTIFY entrega eventos aos ouvintes conectados após o COMMIT;
-- não é uma fila durável e não reenvia eventos perdidos durante indisponibilidade.

begin;

create or replace function public.notificar_pedido_status_n8n()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
    perform pg_catalog.pg_notify(
        'pedidos_status_change',
        pg_catalog.json_build_object(
            'old_status', OLD.status,
            'new', pg_catalog.json_build_object(
                'id', NEW.id,
                'cliente_id', NEW.cliente_id,
                'status', NEW.status,
                'valor_total', NEW.valor_total,
                -- Limite defensivo para manter o payload abaixo de 8 KB.
                -- Observações e demais textos livres não são transmitidos.
                'forma_pagamento', pg_catalog.left(NEW.forma_pagamento, 512),
                'updated_at', NEW.updated_at
            )
        )::text
    );
    return NEW;
end;
$$;

-- Substitui somente o trigger desta integração; preserva histórico/updated_at.
drop trigger if exists tg_n8n_pedido_status on public.pedidos;
create trigger tg_n8n_pedido_status
after update on public.pedidos
for each row
when (OLD.status is distinct from NEW.status)
execute function public.notificar_pedido_status_n8n();

commit;
