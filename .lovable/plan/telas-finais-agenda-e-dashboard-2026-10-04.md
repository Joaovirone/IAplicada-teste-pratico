# Telas finais — Agenda e Dashboard

## Objetivo
Concluir o sistema com uma agenda operacional por técnico e uma visão inicial de indicadores para Rafael, usando os pedidos já existentes.

## O que será construído

### Agenda dos Técnicos
- Substituir a tela provisória por um seletor de técnico carregado da tabela `tecnicos`.
- Exibir somente pedidos do técnico escolhido nos estados `agendado` ou `em_andamento`.
- Mostrar data de instalação, cliente, endereço e estado atual, com estados de carregamento, erro e lista vazia.
- Permitir apenas os avanços `agendado → em_andamento → concluido` diretamente na agenda.
- Antes de cada atualização, conferir o estado persistido e aplicar a alteração condicionada ao estado atual, impedindo saltos, retornos e conflitos.

### Dashboard do Rafael
- Substituir a tela provisória por quatro indicadores calculados a partir de `pedidos`:
  - total de pedidos criados no mês atual;
  - valor total faturado em pedidos concluídos;
  - valor a receber em pedidos aprovados, agendados ou em andamento;
  - quantidade de pedidos aprovados aguardando agendamento.
- Exibir as instalações agendadas entre hoje e os próximos 7 dias, com cliente, endereço, técnico e data.
- Exibir os orçamentos aguardando aprovação, com cliente, data e valor.
- Incluir carregamento, erro com nova tentativa e estados vazios sem inventar dados.

## Detalhes técnicos
- Manter o cliente público externo já isolado no módulo de pedidos.
- Centralizar a regra de avanço de status em um módulo compartilhado para que Gestão de Pedidos e Agenda usem a mesma validação.
- Usar consultas relacionais com clientes e técnicos e calcular os indicadores no frontend a partir do resultado atual.
- Preservar a sidebar, os componentes e os tokens visuais existentes, com metadados próprios em cada rota.

## Validação
- Conferir os quatro indicadores contra os dados retornados.
- Conferir a janela de 7 dias, inclusive os limites inicial e final.
- Testar Lucas e Pedro, filtragem por estado e estados vazios.
- Testar os dois avanços permitidos pela Agenda e confirmar bloqueio de transições inválidas.
- Verificar as duas telas em desktop e mobile, sem erros no navegador.
