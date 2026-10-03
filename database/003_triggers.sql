-- Trigger para atualizar a data de modificação (updated_at) nos pedidos
create or replace function update_updated_at_column()
returns trigger as $$
begin
    NEW.updated_at = now();
    return NEW;
end;
$$ language plpgsql;

create trigger set_pedidos_updated_at
before update on public.pedidos
for each row
execute function update_updated_at_column();

-- Trigger para registrar automaticamente o histórico de status
create or replace function registrar_historico_status()
returns trigger as $$
begin
    if (TG_OP = 'INSERT') or (OLD.status is distinct from NEW.status) then
        insert into public.historico_status (pedido_id, status_anterior, status_novo)
        values (NEW.id, case when TG_OP = 'INSERT' then null else OLD.status end, NEW.status);
    end if;
    return NEW;
end;
$$ language plpgsql;

create trigger tg_historico_status
after insert or update on public.pedidos
for each row
execute function registrar_historico_status();