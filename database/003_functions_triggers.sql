-- O corpo da função é executado como uma única transação pelo PostgreSQL:
-- qualquer falha ao inserir um item desfaz também a criação do pedido.
create or replace function public.criar_pedido_completo(
    p_cliente_id uuid,
    p_valor_total numeric,
    p_observacoes text,
    p_itens jsonb
)
returns uuid
language plpgsql
as $$
declare
    v_pedido_id uuid;
    v_item jsonb;
begin
    -- Inserir o pedido (status 'orcamento' é padrão da tabela)
    insert into public.pedidos (cliente_id, valor_total, observacoes)
    values (p_cliente_id, p_valor_total, p_observacoes)
    returning id into v_pedido_id;

    -- Percorrer o array JSON e inserir todos os itens vinculados ao pedido gerado
    for v_item in select * from jsonb_array_elements(p_itens)
    loop
        insert into public.itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
        values (
            v_pedido_id,
            (v_item->>'produto_id')::uuid,
            (v_item->>'quantidade')::integer,
            (v_item->>'preco_unitario')::numeric
        );
    end loop;

    -- Se algo falhar acima, o banco cancela tudo (Rollback automático). Se der certo, retorna o ID.
    return v_pedido_id;
end;
$$;

-- Trigger para atualizar a data de modificação (updated_at) nos pedidos
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    NEW.updated_at = now();
    return NEW;
end;
$$ language plpgsql;

drop trigger if exists set_pedidos_updated_at on public.pedidos;
create trigger set_pedidos_updated_at
before update on public.pedidos
for each row
execute function public.update_updated_at_column();

-- Trigger para registrar automaticamente o histórico de status
create or replace function public.registrar_historico_status()
returns trigger as $$
begin
    if (TG_OP = 'INSERT') or (OLD.status is distinct from NEW.status) then
        insert into public.historico_status (pedido_id, status_anterior, status_novo)
        values (NEW.id, case when TG_OP = 'INSERT' then null else OLD.status end, NEW.status);
    end if;
    return NEW;
end;
$$ language plpgsql;

drop trigger if exists tg_historico_status on public.pedidos;
create trigger tg_historico_status
after insert or update on public.pedidos
for each row
execute function public.registrar_historico_status();