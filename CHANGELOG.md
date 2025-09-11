# Changelog

## v0.2.0 — Subscriptions, Billing, Teacher & Student UX (2025-09-11)

### Added
- Billing & Payments
  - Admin: percentual da plataforma e provedor (Stripe/Mercado Pago) com métricas.
  - Stripe Connect (checkout de assinatura e avulso com split), Mercado Pago (Preference + Preapproval). 
  - Webhooks Stripe (checkout, payment_intent, invoice) e MP (lookup + assinatura opcional).
  - Ledger: lançamentos de taxa/repasse, conciliação, export CSV/Excel, série temporal (GMV/líquidos) e PDF mensal.
  - Loja: split em múltiplos checkouts (sequenciamento automático); simulação em dev.
- Subscriptions: ativação/renovação (recorrentes), listagem/cancelamento/retomar.
- Orders: listagem, detalhe, cancelamento, reembolso parcial/total (inclui split proporcional); recibo PDF.
- Teacher Experience
  - Painel do Professor (correção rápida com comentário, próximas tarefas, envio de mensagem com anexo, links para Diário/Relatório).
  - Diário: pré-preenchimento, “marcar todos” e salvamento em lote.
  - Rubricas: criação/associação a tarefas e avaliação por critério, export de feedbacks por tarefa (CSV/Excel).
  - Relatório do Professor: médias, presença, export CSV/Excel e gráficos simples.
  - Minhas Submissões (professor): lista com link para avaliar.
- Student Experience
  - Meu Painel (/me): tarefas pendentes, último feedback, aulas recentes e gráfico de pendências por prazo.
  - Minhas Entregas: busca + CSV e detalhe com feedback por rubrica.
  - Minhas Notas: exibe comentários e link para ver feedback.
- Mensagens
  - Contador real de “não lidas” (MessageRead) e marcação (item e global); badge no menu e polling.

### Changed
- Tarefas: professor só cria/edita/exclui nas turmas/disciplinas atribuídas.
- Dashboard: redireciona alunos para /me e professores para /teacher.
- Financeiro: filtros ampliados, paginação, export CSV/Excel (página/total), líquidos e conciliação por produto/período.

### Notes
- Rodar migrações Prisma (novos modelos/colunas):
  - `npm -w @edu/backend run prisma:generate`
  - `npm -w @edu/backend run prisma:migrate`
- Seeds de volume: `npm -w @edu/backend run seed:finance`
