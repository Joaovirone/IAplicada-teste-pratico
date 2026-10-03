-- Políticas para acesso público total (leitura, inserção, atualização e exclusão)
create policy "Acesso publico total clientes" on public.clientes for all to anon using (true) with check (true);
create policy "Acesso publico total tecnicos" on public.tecnicos for all to anon using (true) with check (true);
create policy "Acesso publico total produtos" on public.produtos for all to anon using (true) with check (true);
create policy "Acesso publico total pedidos" on public.pedidos for all to anon using (true) with check (true);
create policy "Acesso publico total itens_pedido" on public.itens_pedido for all to anon using (true) with check (true);
create policy "Acesso publico total historico" on public.historico_status for all to anon using (true) with check (true);