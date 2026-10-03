-- 1. Inserir Técnicos Obrigatórios
insert into public.tecnicos (id, nome, telefone, especialidade) values
('t1111111-1111-1111-1111-111111111111', 'Lucas', '11999999991', 'Câmeras e Sensores'),
('t2222222-2222-2222-2222-222222222222', 'Pedro', '11999999992', 'Fechaduras e Iluminação');

-- 2. Inserir 5 Clientes Mínimos
insert into public.clientes (id, nome, telefone, email, endereco) values
('c1111111-1111-1111-1111-111111111111', 'Ana Silva', '11988887777', 'ana@email.com', 'Rua das Flores, 123'),
('c2222222-2222-2222-2222-222222222222', 'Carlos Mendes', '11977776666', 'carlos@email.com', 'Av. Paulista, 1000 - Apto 45'),
('c3333333-3333-3333-3333-333333333333', 'Beatriz Costa', '11966665555', 'bia@email.com', 'Rua Augusta, 500'),
('c4444444-4444-4444-4444-444444444444', 'Fernando Souza', '11955554444', 'nando@email.com', 'Rua Oscar Freire, 200'),
('c5555555-5555-5555-5555-555555555555', 'Mariana Lopes', '11944443333', 'mari@email.com', 'Av. Faria Lima, 3000');

-- 3. Inserir 6 Produtos em 3 Categorias Diferentes
insert into public.produtos (id, nome, categoria, preco_unitario, descricao) values
('p1111111-1111-1111-1111-111111111111', 'Câmera IP Full HD', 'Segurança', 450.00, 'Câmera wi-fi com visão noturna'),
('p2222222-2222-2222-2222-222222222222', 'Sensor de Presença', 'Segurança', 180.00, 'Sensor infravermelho de teto'),
('p3333333-3333-3333-3333-333333333333', 'Lâmpada Smart RGB', 'Iluminação', 85.00, 'Lâmpada inteligente 10W conectada'),
('p4444444-4444-4444-4444-444444444444', 'Fita LED Smart 5m', 'Iluminação', 220.00, 'Fita LED controlada por voz'),
('p5555555-5555-5555-5555-555555555555', 'Fechadura Digital Touch', 'Automação', 890.00, 'Fechadura biométrica e senha'),
('p6666666-6666-6666-6666-666666666666', 'Assistente de Voz (Hub)', 'Automação', 350.00, 'Central de comando inteligente');

-- 4. Inserir 8 Pedidos em Diferentes Status
insert into public.pedidos (id, cliente_id, tecnico_id, status, data_instalacao, valor_total, forma_pagamento) values
('o1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', null, 'orcamento', null, 1080.00, null),
('o2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', null, 'aprovado', null, 890.00, 'PIX'),
('o3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 't1111111-1111-1111-1111-111111111111', 'agendado', now() + interval '2 days', 630.00, 'Cartão de Crédito'),
('o4444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', 't2222222-2222-2222-2222-222222222222', 'agendado', now() + interval '5 days', 1110.00, 'PIX'),
('o5555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555', 't1111111-1111-1111-1111-111111111111', 'em_andamento', now(), 450.00, 'Dinheiro'),
('o6666666-6666-6666-6666-666666666666', 'c1111111-1111-1111-1111-111111111111', 't2222222-2222-2222-2222-222222222222', 'concluido', now() - interval '1 day', 255.00, 'Cartão de Crédito'),
('o7777777-7777-7777-7777-777777777777', 'c2222222-2222-2222-2222-222222222222', 't1111111-1111-1111-1111-111111111111', 'concluido', now() - interval '3 days', 900.00, 'PIX'),
('o8888888-8888-8888-8888-888888888888', 'c3333333-3333-3333-3333-333333333333', null, 'cancelado', null, 350.00, null);

-- 5. Inserir os Itens de cada Pedido (Cálculos rigorosamente batendo com o valor_total)
insert into public.itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) values
-- Pedido 1 (Orçamento - R$ 1080): 2x Câmera (450) + 1x Sensor (180) -> Exemplo exato do PDF!
('o1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 2, 450.00),
('o1111111-1111-1111-1111-111111111111', 'p2222222-2222-2222-2222-222222222222', 1, 180.00),

-- Pedido 2 (Aprovado - R$ 890): 1x Fechadura
('o2222222-2222-2222-2222-222222222222', 'p5555555-5555-5555-5555-555555555555', 1, 890.00),

-- Pedido 3 (Agendado - R$ 630): 1x Câmera + 1x Sensor
('o3333333-3333-3333-3333-333333333333', 'p1111111-1111-1111-1111-111111111111', 1, 450.00),
('o3333333-3333-3333-3333-333333333333', 'p2222222-2222-2222-2222-222222222222', 1, 180.00),

-- Pedido 4 (Agendado - R$ 1110): 1x Fechadura + 1x Fita LED
('o4444444-4444-4444-4444-444444444444', 'p5555555-5555-5555-5555-555555555555', 1, 890.00),
('o4444444-4444-4444-4444-444444444444', 'p4444444-4444-4444-4444-444444444444', 1, 220.00),

-- Pedido 5 (Em andamento - R$ 450): 1x Câmera
('o5555555-5555-5555-5555-555555555555', 'p1111111-1111-1111-1111-111111111111', 1, 450.00),

-- Pedido 6 (Concluído - R$ 255): 3x Lâmpada Smart (85)
('o6666666-6666-6666-6666-666666666666', 'p3333333-3333-3333-3333-333333333333', 3, 85.00),

-- Pedido 7 (Concluído - R$ 900): 2x Câmera
('o7777777-7777-7777-7777-777777777777', 'p1111111-1111-1111-1111-111111111111', 2, 450.00),

-- Pedido 8 (Cancelado - R$ 350): 1x Assistente de Voz
('o8888888-8888-8888-8888-888888888888', 'p6666666-6666-6666-6666-666666666666', 1, 350.00);