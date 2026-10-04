begin;

-- Técnicos obrigatórios.
insert into public.tecnicos (id, nome, telefone, especialidade) values
  ('20000000-0000-4000-8000-000000000001', 'Lucas', '11999999991', 'Câmeras e Sensores'),
  ('20000000-0000-4000-8000-000000000002', 'Pedro', '11999999992', 'Fechaduras e Iluminação')
on conflict (id) do update set
  nome = excluded.nome,
  telefone = excluded.telefone,
  especialidade = excluded.especialidade;

-- Cinco clientes.
insert into public.clientes (id, nome, telefone, email, endereco) values
  ('10000000-0000-4000-8000-000000000001', 'Ana Silva', '11988887777', 'ana@email.com', 'Rua das Flores, 123'),
  ('10000000-0000-4000-8000-000000000002', 'Carlos Mendes', '11977776666', 'carlos@email.com', 'Av. Paulista, 1000 - Apto 45'),
  ('10000000-0000-4000-8000-000000000003', 'Beatriz Costa', '11966665555', 'bia@email.com', 'Rua Augusta, 500'),
  ('10000000-0000-4000-8000-000000000004', 'Fernando Souza', '11955554444', 'nando@email.com', 'Rua Oscar Freire, 200'),
  ('10000000-0000-4000-8000-000000000005', 'Mariana Lopes', '11944443333', 'mari@email.com', 'Av. Faria Lima, 3000')
on conflict (id) do update set
  nome = excluded.nome,
  telefone = excluded.telefone,
  email = excluded.email,
  endereco = excluded.endereco;

-- Seis produtos em três categorias.
insert into public.produtos (id, nome, categoria, preco_unitario, descricao, ativo) values
  ('30000000-0000-4000-8000-000000000001', 'Câmera IP Full HD', 'Segurança', 450.00, 'Câmera wi-fi com visão noturna', true),
  ('30000000-0000-4000-8000-000000000002', 'Sensor de Presença', 'Segurança', 180.00, 'Sensor infravermelho de teto', true),
  ('30000000-0000-4000-8000-000000000003', 'Lâmpada Smart RGB', 'Iluminação', 85.00, 'Lâmpada inteligente 10W conectada', true),
  ('30000000-0000-4000-8000-000000000004', 'Fita LED Smart 5m', 'Iluminação', 220.00, 'Fita LED controlada por voz', true),
  ('30000000-0000-4000-8000-000000000005', 'Fechadura Digital Touch', 'Automação', 890.00, 'Fechadura biométrica e senha', true),
  ('30000000-0000-4000-8000-000000000006', 'Assistente de Voz (Hub)', 'Automação', 350.00, 'Central de comando inteligente', true)
on conflict (id) do update set
  nome = excluded.nome,
  categoria = excluded.categoria,
  preco_unitario = excluded.preco_unitario,
  descricao = excluded.descricao,
  ativo = excluded.ativo;

-- O valor de cada pedido corresponde à soma de seus itens.
insert into public.pedidos
  (id, cliente_id, tecnico_id, status, data_instalacao, valor_total, forma_pagamento)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', null, 'orcamento', null, 1080.00, null),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', null, 'aprovado', null, 890.00, 'PIX'),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'agendado', now() + interval '2 days', 630.00, 'Cartão de Crédito'),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'agendado', now() + interval '5 days', 1110.00, 'PIX'),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'em_andamento', now(), 450.00, 'Dinheiro'),
  ('40000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'concluido', now() - interval '1 day', 255.00, 'Cartão de Crédito'),
  ('40000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'concluido', now() - interval '3 days', 900.00, 'PIX'),
  ('40000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000003', null, 'cancelado', null, 350.00, null)
on conflict (id) do update set
  cliente_id = excluded.cliente_id,
  tecnico_id = excluded.tecnico_id,
  status = excluded.status,
  data_instalacao = excluded.data_instalacao,
  valor_total = excluded.valor_total,
  forma_pagamento = excluded.forma_pagamento;

-- Itens dos oito pedidos. O subtotal usa o DEFAULT da tabela: quantidade * preco_unitario.
insert into public.itens_pedido (id, pedido_id, produto_id, quantidade, preco_unitario) values
  -- Pedido 1: 2 câmeras (R$ 900) + 1 sensor (R$ 180) = R$ 1.080.
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 2, 450.00),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 1, 180.00),
  -- Pedido 2: 1 fechadura = R$ 890.
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000005', 1, 890.00),
  -- Pedido 3: 1 câmera + 1 sensor = R$ 630.
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 1, 450.00),
  ('50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 1, 180.00),
  -- Pedido 4: 1 fechadura + 1 fita LED = R$ 1.110.
  ('50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000005', 1, 890.00),
  ('50000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 1, 220.00),
  -- Pedido 5: 1 câmera = R$ 450.
  ('50000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 1, 450.00),
  -- Pedido 6: 3 lâmpadas = R$ 255.
  ('50000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000003', 3, 85.00),
  -- Pedido 7: 2 câmeras = R$ 900.
  ('50000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000001', 2, 450.00),
  -- Pedido 8: 1 hub = R$ 350.
  ('50000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000006', 1, 350.00)
on conflict (id) do update set
  pedido_id = excluded.pedido_id,
  produto_id = excluded.produto_id,
  quantidade = excluded.quantidade,
  preco_unitario = excluded.preco_unitario,
  subtotal = excluded.subtotal;

commit;
