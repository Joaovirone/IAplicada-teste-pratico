-- Somente usuários autenticados podem ler ou alterar os dados.
drop policy if exists "Acesso publico total clientes" on public.clientes;
drop policy if exists "Acesso publico total tecnicos" on public.tecnicos;
drop policy if exists "Acesso publico total produtos" on public.produtos;
drop policy if exists "Acesso publico total pedidos" on public.pedidos;
drop policy if exists "Acesso publico total itens_pedido" on public.itens_pedido;
drop policy if exists "Acesso publico total historico" on public.historico_status;

drop policy if exists "Acesso restrito clientes" on public.clientes;
drop policy if exists "Acesso restrito tecnicos" on public.tecnicos;
drop policy if exists "Acesso restrito produtos" on public.produtos;
drop policy if exists "Acesso restrito pedidos" on public.pedidos;
drop policy if exists "Acesso restrito itens_pedido" on public.itens_pedido;
drop policy if exists "Acesso restrito historico" on public.historico_status;

create policy "Acesso restrito clientes" on public.clientes for all to authenticated using (true) with check (true);
create policy "Acesso restrito tecnicos" on public.tecnicos for all to authenticated using (true) with check (true);
create policy "Acesso restrito produtos" on public.produtos for all to authenticated using (true) with check (true);
create policy "Acesso restrito pedidos" on public.pedidos for all to authenticated using (true) with check (true);
create policy "Acesso restrito itens_pedido" on public.itens_pedido for all to authenticated using (true) with check (true);
create policy "Acesso restrito historico" on public.historico_status for all to authenticated using (true) with check (true);