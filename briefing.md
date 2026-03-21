# MODELO DE ANÁLISE – VISÃO FINANCEIRA POR EMPREENDIMENTO
CS Empreendimentos

## Objetivo da análise
Dar ao dono da empresa visão clara, rápida e filtrável da situação financeira por empreendimento, sabendo:
quanto foi gasto, com o quê, quanto entrou, quanto ainda vai entrar, qual é o saldo, e a situação financeira de cada cliente.

## PRINCÍPIO DA ANÁLISE
👉 Nada fica em um relatório gigante só. A análise é dividida em blocos lógicos, todos filtráveis, que juntos dão a visão completa.
O usuário escolhe empreendimento, escolhe período e navega pelos blocos conforme a dúvida dele.

### BLOCO 1 – VISÃO GERAL DO EMPREENDIMENTO (Painel principal)
Pergunta: “Como está financeiramente esse empreendimento?”
Dados: Empreendimento, Entradas, Saídas, Período.
Indicadores: Total gasto no período, Total gasto acumulado, Total recebido no período, Total recebido acumulado, Saldo financeiro do empreendimento, Valor ainda a receber (em aberto), Valor já pago pelos clientes.
Filtros: Empreendimento, Período, Status.

### BLOCO 2 – ANÁLISE DE GASTOS
Pergunta: “Com o que estou gastando dinheiro nesse empreendimento?”
Dados: Empreendimento, Saídas financeiras, Categorias, Fornecedores, Datas.
Visualizações: Gastos por categoria, Ranking de categorias, Evolução de gastos no tempo.

### BLOCO 3 – ANÁLISE DE ENTRADAS
Pergunta: “Quanto entrou, quanto ainda vai entrar e quando?”
Indicadores: Total já recebido, Total em aberto, Total previsto, Percentual já recebido.
Visualizações: Entradas por período, Entradas realizadas x previstas, Evolução do recebimento.

### BLOCO 4 – FLUXO FINANCEIRO
Pergunta: “Financeiramente, esse empreendimento está positivo ou negativo?”
Visualizações: Fluxo de caixa do período, Saldo projetado, Saldo realizado, Comparação entre meses.

### BLOCO 5 – VISÃO POR CLIENTE
Pergunta: “Como está o financeiro de um cliente específico?”
Indicadores: Valor total do contrato, Valor já pago, Valor em aberto, Percentual pago.
Visualizações: Linha do tempo de pagamentos, Tabela detalhada de parcelas, Status financeiro do cliente.

### BLOCO  6 – DETALHAMENTO
Tabela detalhada com: Data, Descrição, Categoria, Fornecedor, Valor, Status.

## FAIXAS DE INFORMAÇÃO CONTÍNUA (BREAKING NEWS)
Faixa superior: Visão estratégica (empreendimento, saldo, etc).
Faixa inferior: Alertas operacionais (vencidos, contas a vencer).

## TECH STACK
- React
- Vite
- Tailwind CSS
- Apache ECharts (echarts, echarts-for-react)
- Framer Motion
- Lucide React (Ícones)
- Dark mode, visual cinematográfico.
