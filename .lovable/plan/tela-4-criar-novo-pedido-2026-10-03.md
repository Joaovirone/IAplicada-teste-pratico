# Tela 4 — Criar Novo Pedido

## Formulário
- Substituir a tela provisória de Novo Pedido por um formulário completo.
- Carregar clientes e produtos do catálogo externo já conectado.
- Permitir escolher um cliente existente ou cadastrá-lo sem sair da tela.
- Permitir adicionar vários produtos, ajustar quantidades e remover linhas.

## Cálculos
- Usar o preço atual de cada produto selecionado.
- Recalcular o subtotal de cada linha conforme a quantidade muda.
- Exibir o valor total do orçamento em tempo real.

## Salvamento
- Validar cliente, itens, quantidades e observações antes do envio.
- Criar o pedido com status `orcamento`, valor total e observações.
- Inserir todos os itens vinculados ao identificador do pedido criado.
- Em caso de falha nos itens, remover o pedido incompleto para evitar registros órfãos.
- Redirecionar para Gestão de Pedidos e exibir uma confirmação de sucesso.

## Validação
- Testar carregamento, seleção, cálculo, cadastro rápido de cliente e navegação após salvar.
