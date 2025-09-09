# Plataforma Educacional — Monorepo

Sistema multi‑escola com papéis Admin (global), Diretor, Professor e Aluno — todos os dados de diretoria, professores e alunos ficam sempre vinculados a uma escola específica via `school_id`.

Componentes principais
- apps/backend: API Node.js (Express + Prisma + PostgreSQL)
- apps/web: SPA React + Vite
- packages/ui: componentes React compartilhados
- packages/config: configs base (tsconfig/eslint)
- infra: docker-compose (Postgres, Redis, MinIO)
- docs: rotas e exemplos de chamadas

Stack e decisões
- Banco: PostgreSQL com Prisma ORM; índices por `school_id` em todos os recursos escopados.
- Autenticação: JWT; admin global; memberships por escola com papéis `DIRECTOR|TEACHER|STUDENT`.
- Autorização: middlewares `requireAdmin` e `requireMembership(role?)` (Admin ignora escopo).
- Página Web: esqueleto com login/dashboard (exemplo).

Credenciais e Configuração Padrão (dev)
- Admin padrão criado no boot e no seed:
  - Email: `admin@local`
  - Senha: `senha`
- Variáveis de ambiente em `apps/backend/.env`:
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/edu_platform?schema=public`
  - `REDIS_URL=redis://localhost:6379`
  - `PORT=3000`
  - `JWT_SECRET=change-me`
  - `STORAGE_ENDPOINT=http://localhost:9000`
  - `STORAGE_ACCESS_KEY=minioadmin`
  - `STORAGE_SECRET_KEY=minioadmin`
  - `STORAGE_BUCKET=edu`
  - `ADMIN_EMAIL=admin@local`
  - `ADMIN_PASSWORD=senha`

**Inicialização Rápida (Docker Compose)**
- Requisitos: Docker + Docker Compose instalados.
- Subir serviços: `docker compose up -d`
- URLs:
  - Backend: `http://localhost:3000/health`
  - Frontend (Vite dev): `http://localhost:5173`
- Autenticação (dev):
  - Email: `admin@local`
  - Senha: `senha`
  - Ajustável em `docker-compose.yml` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`).

### Resetar o banco de dados

Use o script abaixo para recriar o banco do zero, aplicar as migrações e executar o seed padrão.

- Comando: `npm run db:reset`
- O que faz:
  - `docker compose down -v` (remove containers e volume do Postgres)
  - `docker compose up -d` (sobe db, backend e web)
  - Aguarda Postgres em `localhost:55432`
  - `prisma migrate deploy` e `prisma db seed`

Credenciais de acesso pós-seed:
- Admin: `admin@local` / `senha`
- Diretor: `diretor@local` / `secret`
- Professor: `professor@local` / `secret`
- Aluno: `aluno@local` / `secret`

**Inicialização Local (Sem Docker)**
- Backend:
  - `cp apps/backend/.env.example apps/backend/.env`
  - Ajuste `DATABASE_URL` se necessário (Postgres local)
  - `npm run db:generate`
  - `npm run db:migrate`
  - (opcional) `npm run db:seed`
  - `npm run dev:backend`
- Frontend:
  - `npm run dev:web`
  - Acesse `http://localhost:5173`
- Teste rápido: `curl http://localhost:3000/health` → `{ "ok": true }`

**Modo Dev com Hot Reload (Docker Compose)**
- O Compose está configurado com bind mounts para desenvolvimento:
  - Backend: mapeia `apps/backend/src` e `apps/backend/prisma` (hot reload via `tsx watch`).
  - Frontend: mapeia `apps/web`, `packages/ui` e `packages/config` (Vite com `CHOKIDAR_USEPOLLING=true`).
- Subir/atualizar:
  - `docker compose up -d web backend`
  - Se necessário rebuild: `docker compose build web backend && docker compose up -d web backend`
- Se o navegador mostrar interface antiga, use hard refresh (Ctrl+F5) ou janela anônima.

**Frontend (UI) — Navegação**
- Login: `http://localhost:5173/login` (redireciona ao painel após sucesso)
- Painel com layout moderno (sidebar + topbar com seleção de escola):
  - Dashboard: status e atalhos
  - Usuários: listagem com busca (nome/email)
  - Turmas: criar e listar
  - Disciplinas: criar e listar
  - Tarefas: criar (título, turma, disciplina, data) e listar
  - Avisos: criar (título, conteúdo, turma opcional) e listar
- O token é persistido no `localStorage`. A escola selecionada também.

**CORS e Variáveis**
- Backend aceita `CORS_ORIGIN` (padrão dev: `http://localhost:5173`).
- Frontend usa `VITE_API_URL` (padrão dev: `http://localhost:3000`).

**Banco de Dados**
- Postgres exposto em `localhost:55432` para ferramentas locais.
- Migrations: `npm run db:deploy`
- Seed: `npm run db:seed`

**Scripts Úteis (raiz)**
- `dev:backend`: inicia o backend em modo dev.
- `dev:web`: inicia o web em modo dev (Vite).
- `db:generate`: Prisma generate (backend).
- `db:migrate`: Prisma migrate (backend).
- `db:seed`: seed do banco (backend, opcional).
- `db:reset`: reseta banco, aplica migrações e roda seed.
- `dev:compose`: `docker compose up -d`.
- `dev:compose:down`: derruba os serviços do compose.
- `lint`: ESLint v9 (flat config) em todos os pacotes.
- `typecheck`: TypeScript em backend, web e ui.

**Exemplos de API (cURL)**
- Healthcheck (sem auth):
  - `curl http://localhost:3000/health`

- Login (Admin) → obter token JWT:
  - `curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@local","password":"senha"}'`
  - Copie o valor de `token` da resposta e use nas próximas chamadas:
    - `export TOKEN="<cole_o_token_aqui>"`
    - `export AUTH="Authorization: Bearer $TOKEN"`

- Criar escola (Admin):
  - `curl -s -X POST http://localhost:3000/admin/schools -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Escola Modelo"}'`
  - Liste escolas e capture o `id` (SCHOOL_ID):
    - `curl -s http://localhost:3000/admin/schools -H "$AUTH"`
    - `export SCHOOL_ID="<id_da_escola>"`

- Registrar usuário (rota de desenvolvimento, sem auth):
  - Diretor/professor/aluno podem ser criados assim (ajuste email/nome):
    - `curl -s -X POST http://localhost:3000/auth/dev-register -H 'Content-Type: application/json' -d '{"name":"Diretora","email":"diretora@local","password":"senha","isAdmin":false}'`
    - `curl -s -X POST http://localhost:3000/auth/dev-register -H 'Content-Type: application/json' -d '{"name":"Professor","email":"prof@local","password":"senha"}'`
    - `curl -s -X POST http://localhost:3000/auth/dev-register -H 'Content-Type: application/json' -d '{"name":"Aluno","email":"aluno@local","password":"senha"}'`

- Vínculo à escola (membership) — requer papel Admin ou Diretor no escopo:
  - Obtenha `userId` dos usuários acima (ex.: via banco ou criando uma rota de listagem de usuários global em dev). Para exemplo, suponha `USER_ID_PROF` e `USER_ID_ALUNO`.
  - `export USER_ID_PROF="<id_prof>"`
  - `export USER_ID_ALUNO="<id_aluno>"`
  - Tornar Diretora diretora da escola:
    - `curl -s -X POST http://localhost:3000/$SCHOOL_ID/members -H "$AUTH" -H 'Content-Type: application/json' -d '{"userId":"<id_diretora>","role":"DIRECTOR"}'`
  - Vincular professor e aluno:
    - `curl -s -X POST http://localhost:3000/$SCHOOL_ID/members -H "$AUTH" -H 'Content-Type: application/json' -d '{"userId":"'$USER_ID_PROF'","role":"TEACHER"}'`
    - `curl -s -X POST http://localhost:3000/$SCHOOL_ID/members -H "$AUTH" -H 'Content-Type: application/json' -d '{"userId":"'$USER_ID_ALUNO'","role":"STUDENT"}'`

- Listar usuários da escola (escopo):
  - `curl -s http://localhost:3000/$SCHOOL_ID/users -H "$AUTH"`

- Criar turma e disciplina (Diretor no escopo):
  - `curl -s -X POST http://localhost:3000/$SCHOOL_ID/classes -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"1A","year":2025}'`
  - `curl -s -X POST http://localhost:3000/$SCHOOL_ID/subjects -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Matemática"}'`

- Atribuir professor à turma/disciplina (Diretor):
  - Supondo `CLASS_ID` e `SUBJECT_ID` das criações acima:
    - `export CLASS_ID="<id_turma>"`
    - `export SUBJECT_ID="<id_disciplina>"`
    - `curl -s -X POST http://localhost:3000/$SCHOOL_ID/teaching-assignments -H "$AUTH" -H 'Content-Type: application/json' -d '{"teacherUserId":"'$USER_ID_PROF'","classId":"'$CLASS_ID'","subjectId":"'$SUBJECT_ID'"}'`

- Matricular aluno na turma (Diretor):
  - `curl -s -X POST http://localhost:3000/$SCHOOL_ID/enrollments -H "$AUTH" -H 'Content-Type: application/json' -d '{"studentUserId":"'$USER_ID_ALUNO'","classId":"'$CLASS_ID'"}'`

- Criar tarefa (Professor):
  - Autentique como professor para obter `TOKEN_PROF` e `AUTH_PROF`.
  - `curl -s -X POST http://localhost:3000/$SCHOOL_ID/assignments -H "$AUTH_PROF" -H 'Content-Type: application/json' -d '{"classId":"'$CLASS_ID'","subjectId":"'$SUBJECT_ID'","title":"Lista 1"}'`

- Submeter tarefa (Aluno):
  - Autentique como aluno para obter `TOKEN_ALUNO` e `AUTH_ALUNO`.
  - Suponha `ASSIGNMENT_ID` da criação acima:
    - `export ASSIGNMENT_ID="<id_tarefa>"`
    - `curl -s -X POST http://localhost:3000/$SCHOOL_ID/submissions -H "$AUTH_ALUNO" -H 'Content-Type: application/json' -d '{"assignmentId":"'$ASSIGNMENT_ID'"}'`

Observação: em ambiente de desenvolvimento as rotas de `/auth/dev-register` existem apenas para acelerar a criação de usuários e devem ser removidas ou protegidas em produção.

Como executar (local)
1) Infraestrutura: `cd infra && docker compose up -d`
2) Backend:
   - `cd apps/backend && cp .env.example .env`
   - `npx prisma generate`
   - `npx prisma migrate dev --name init`
   - (opcional) `npm run prisma:seed`
   - `npm run dev`
3) Frontend: `cd apps/web && npm run dev`
4) Testar rotas: veja `docs/API.http`

Fluxo básico
1) Login com admin (`admin@local`/`senha`) em `POST /auth/login` → token JWT
2) Criar escola em `POST /admin/schools` (Bearer)
3) Criar usuários (`/auth/dev-register`) e vincular a escolas com `POST /:schoolId/members`
4) Diretor cria turmas/disciplinas; professores recebem atribuições; alunos são matriculados
5) Professores criam tarefas; alunos enviam; professores avaliam; presenças registradas

Modelos de dados (núcleo)
- `schools`, `users (isAdmin, passwordHash)`, `memberships (role, status)`
- `classes`, `subjects`, `teaching_assignments`, `enrollments`
- `assignments`, `submissions`, `grades`, `attendance`
- `announcements`, `messages`, `stored_files`, `audit_logs`

Paginação, filtros e ordenação
- Todas as listagens aceitam `page`, `limit` e parâmetros de filtro (veja `docs/ROUTES.md`).
- Respostas trazem `meta: { page, limit, total, pages }`.

Segurança
- Autorização por middleware; Admin tem acesso global; validação de membership ativa por escola.
- Validação de inputs com Zod (payloads e query params de listagem).

Testes (backend)
- Pré‑requisitos: Postgres rodando e migrações aplicadas
- Rodar: `npm -w @edu/backend run test`

Lint e Typecheck
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`

CI (GitHub Actions)
- Workflow `.github/workflows/ci.yml`:
  - Job `lint-typecheck`: executa ESLint e typecheck em todos os pacotes
  - Job `backend-tests`: sobe Postgres, aplica schema Prisma e roda testes

Pastas
- `apps/backend/src` — API, módulos por domínio e middlewares
- `apps/web/src` — páginas e router
- `packages/ui/src` — componentes compartilhados
- `infra/docker-compose.yml` — Postgres/Redis/MinIO

Exemplos de rotas
- `docs/ROUTES.md` (parâmetros de cada endpoint)
- `docs/API.http` (requisições prontas)

Testes (backend)
- Pré-requisitos: Postgres em execução e migrações aplicadas (veja acima)
- Rodar testes: `npm -w @edu/backend run test`

Credenciais padrão (dev)
- Admin: `admin@local` / `senha`
  - Pode ser alterado por env: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
