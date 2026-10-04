# Tela 3 — Catálogo de Produtos

## Objetivo
Criar a tela principal do catálogo conectada à tabela `produtos`, com leitura, cadastro e edição exclusiva de preço.

## Interface
- Cabeçalho com título, resumo da quantidade de itens e botão **Cadastrar Produto**.
- Produtos separados visualmente por categoria, com contador e cartões de leitura rápida.
- Estados claros para carregamento, lista vazia e falha de conexão.
- Modal de cadastro com nome, categoria, preço unitário e descrição.
- Modal compacto de edição que permite alterar somente o preço unitário.
- Layout adaptado para computador e celular.

## Comportamento
- Buscar `id`, `nome`, `categoria`, `preco_unitario` e `descricao` ao abrir a página.
- Ordenar os produtos por categoria e nome antes de agrupá-los.
- Ao cadastrar, validar os campos, inserir o registro e recarregar a lista.
- Ao editar, validar o preço, atualizar apenas `preco_unitario` pelo `id` e refletir o novo valor imediatamente.
- Exibir mensagens de sucesso ou erro sem expor dados sensíveis.

## Detalhes técnicos
- Usar o cliente Supabase com a URL e chave pública fornecidas.
- Validar os formulários com Zod e aplicar limites de tamanho.
- Manter a integração totalmente no frontend, conforme solicitado.
- Adicionar metadados próprios da página para título e compartilhamento.
