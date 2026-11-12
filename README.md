# IncludeLeads

Mini-CRM da Include. Backend com Node.js, TypeScript, Express e PostgreSQL.

## Como rodar

Requisitos: Node.js 22.13 ou superior, npm e PostgreSQL local ou Docker.

Na raiz do projeto:

```sh
cd backend
npm ci
```

Copie `.env.example` para `.env`, preencha `PGPASSWORD` e ajuste `PGHOST`, `PGPORT`, `PGUSER` e `PGDATABASE` conforme seu banco.

Preencha `JWT_SECRET` e `SETUP_TOKEN` com chaves diferentes. Execute este comando duas vezes e use um resultado em cada variável:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### Banco de dados

Escolha uma opção:

- **PostgreSQL local:** inicie o PostgreSQL e crie um banco com o nome definido em `PGDATABASE`, usando o pgAdmin ou outra ferramenta.
- **Docker:** com o Docker aberto e os valores do `.env.example` configurados, execute dentro de `backend`:

```sh
docker compose up -d postgres
```

Com o banco disponível, prepare as tabelas e inicie a API:

```sh
npm run db:init
npm run dev
```

O `db:init` prepara as tabelas sem apagar os usuários existentes. Execute na primeira configuração ou após novos ajustes SQL. No dia a dia, basta manter o banco ligado e rodar `npm run dev`.

Confira [http://localhost:3000/health](http://localhost:3000/health): deve retornar **200** com `{"status":"ok"}`. Se mudar `PORT` no `.env`, ajuste a URL.

## Testar no Insomnia

URL base: `http://localhost:3000`. Nos POSTs, selecione **Body → JSON**. Adicione os headers na aba **Headers**.

Para cadastrar o primeiro Gestor, envie `POST /auth/setup` com o header `X-Setup-Token` contendo somente o valor de `SETUP_TOKEN` do `.env` e este JSON:

```json
{
  "name": "Gestor Teste",
  "email": "gestor@example.com",
  "password": "SenhaTeste123!"
}
```

Depois, siga a sequência:

| Requisição            | O que enviar                                                                           | Esperado                                                    |
| --------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `POST /auth/setup`    | Header `X-Setup-Token` e JSON acima.                                                   | 201, perfil `GESTOR`. Só funciona quando não existe Gestor. |
| `POST /auth/login`    | JSON com `email` e `password` do cadastro.                                             | 200, com `token` e `user`.                                  |
| `GET /auth/me`        | Header `Authorization: Bearer SEU_TOKEN`.                                              | 200, dados do usuário autenticado.                          |
| `POST /auth/register` | JWT do Gestor no header `Authorization` e JSON com `name`, outro `email` e `password`. | 201, perfil `COMERCIAL`.                                    |

Faça login com o Comercial e tente cadastrar outro usuário: deve retornar **403**. Rota protegida sem JWT ou login com senha incorreta retorna **401**. E-mail duplicado ou novo `/auth/setup` com Gestor já existente retorna **409**.

O logout é feito pelo cliente removendo o JWT. O `.env` é local e está ignorado pelo Git. Depois de alterá-lo, reinicie a API.

### Leads

Execute `npm run db:init` após atualizar o backend. A migração adiciona a coluna opcional `contact_name` e mantém `contactName: null` nos leads que ainda não têm um nome de contato. Leads antigos continuam visíveis para o Gestor, que pode atribuí-los a um usuário Comercial com `PUT /leads/:id`. Se a migração apontar e-mails duplicados no índice `leads_email_unique_idx`, confira os registros indicados pela consulta abaixo e corrija os contatos antes de repetir `db:init`.

```sql
SELECT array_agg(id ORDER BY id) AS ids
FROM leads
WHERE NULLIF(btrim(email), '') IS NOT NULL
GROUP BY lower(btrim(email))
HAVING count(*) > 1;
```

No Insomnia, use o JSON de `backend/lead.example` no `POST /leads`. Substitua `responsibleUserId` pelo ID devolvido pelo cadastro de um Comercial e envie `Authorization: Bearer SEU_TOKEN`. O Gestor pode atribuir e transferir leads para qualquer Comercial. O Comercial pode cadastrar leads para si e consultar, editar ou excluir os que lhe foram atribuídos.

| Requisição | Cenário | Esperado |
| --- | --- | --- |
| `GET /leads` | JWT ausente, inválido ou expirado | `401` |
| `GET /leads` | JWT do Gestor | `200`, todos os leads |
| `GET /leads` | JWT do Comercial | `200`, somente os leads dele |
| `POST /leads` | `{}` ou responsável inexistente | `400` |
| `POST /leads` | Cadastro válido com `status: "fechado"` | `201`, status `prospeccao` |
| `POST /leads` ou `PUT /leads/:id` | E-mail de outro lead, mesmo com capitalização diferente | `409` |
| `GET /leads/:id` | JWT do responsável e ID existente | `200`, lead com `origem` e `contactName` |
| `PUT /leads/abc` | ID inválido | `400` |
| `PUT /leads/999999` | ID válido que não existe | `404` |
| `PUT /leads/:id` ou `DELETE /leads/:id` | Comercial tenta acessar lead de outro responsável | `403` |
| `PUT /leads/:id` | E-mail atual e nova `origem` | `200`, origem atualizada |
| `DELETE /leads/:id` | Gestor ou responsável pelo lead | `204` |

O cadastro exige `name`, `responsibleUserId` e pelo menos um `email` ou `phone`. O `PUT` atualiza somente os campos enviados. Envie `null` para limpar um campo opcional e preserve pelo menos um contato. A API aceita também `nome` e `telefone` e devolve esses campos junto com `name` e `phone`. Deixe `status` fora do `PUT`.

`name` é o nome da empresa e `contactName` é o nome do contato principal. `contactName` é opcional. A API remove espaços nas extremidades e responde com `400` se o valor for vazio ou não for texto nem `null`. No `PUT`, omitir o campo mantém o valor atual; enviar `{"contactName": null}` limpa o nome do contato.

Exemplo de corpo para `POST /leads`:

```json
{
  "name": "Atlas Energia",
  "contactName": "Mariana Souza",
  "email": "mariana@atlas.example",
  "segmento": "Energia",
  "origem": "Indicação",
  "responsibleUserId": 2
}
```

Para trocar o contato, envie a `PUT /leads/42`:

```json
{ "contactName": "Carlos Lima" }
```

O `POST /leads` (`201`), o `PUT /leads/:id` (`200`) e o `GET /leads/:id` (`200`) retornam um objeto Lead. `GET /leads` (`200`) retorna uma lista de objetos com o mesmo formato. Por exemplo, `GET /leads/42` depois da edição pode retornar:

```json
{
  "id": 42,
  "name": "Atlas Energia",
  "nome": "Atlas Energia",
  "contactName": "Carlos Lima",
  "email": "mariana@atlas.example",
  "phone": null,
  "telefone": null,
  "status": "prospeccao",
  "outcome": null,
  "stageChangedAt": "2026-11-11T20:00:00.000Z",
  "segmento": "Energia",
  "origem": "Indicação",
  "responsavel": "Comercial Teste",
  "responsibleUserId": 2,
  "lastContact": null
}
```

`GET /leads?search=carlos&segmento=energia` pode retornar uma lista com esse lead. `search` procura um trecho do nome da empresa ou do contato principal, sem diferenciar maiúsculas e minúsculas. Pode ser combinado com `origem`, `segmento` e `ultimoContato` (`AAAA-MM-DD`, no fuso de São Paulo). A busca respeita o acesso de cada perfil: o Gestor vê todos os leads, e o Comercial vê somente os atribuídos a ele.

### Movimentar um lead no funil

Envie `PATCH /leads/:id/stage` com `Authorization: Bearer SEU_TOKEN` e `Content-Type: application/json`. O Gestor pode mover qualquer lead. O Comercial pode mover os leads atribuídos a ele.

| `stage` | Coluna no Kanban | `outcome` |
| --- | --- | --- |
| `prospeccao` | Prospecção | Omitir ou enviar `null` |
| `primeiro_contato` | Primeiro Contato | Omitir ou enviar `null` |
| `reuniao_agendada` | Reunião Agendada | Omitir ou enviar `null` |
| `proposta_enviada` | Proposta Enviada | Omitir ou enviar `null` |
| `fechado` | Fechado / Perdido | `GANHO` ou `PERDIDO`, obrigatório |

Para mover o lead a uma etapa aberta, inclusive ao reabrir um lead, envie o corpo abaixo. O desfecho salvo será `null`.

```json
{ "stage": "primeiro_contato" }
```

Para fechar como ganho, envie o corpo abaixo. Para fechar como perdido, use `"outcome": "PERDIDO"`.

```json
{ "stage": "fechado", "outcome": "GANHO" }
```

A API aceita `status` no lugar de `stage` e `desfecho` no lugar de `outcome`. Se enviar os dois nomes do mesmo campo, os valores devem ser iguais. Rótulos visuais e valores legados de etapa retornam `400`.

O `200` devolve o lead atualizado com o mesmo formato de `GET /leads/:id`. Use `status` para escolher a coluna e `outcome` para exibir o desfecho. O exemplo abaixo mostra os campos usados pelo funil.

```json
{
  "id": 42,
  "status": "fechado",
  "outcome": "GANHO",
  "stageChangedAt": "2026-11-11T20:00:00.000Z",
  "lastContact": null,
  "responsibleUserId": 7
}
```

`stageChangedAt` avança quando `status` muda. Repetir a mesma etapa retorna `200` e preserva a data, inclusive ao corrigir o desfecho de um lead fechado. `lastContact` reflete a data da interação mais recente e permanece igual durante a movimentação. Em requisições simultâneas, prevalece a última gravação confirmada pelo banco.

| HTTP | Quando acontece |
| --- | --- |
| `400` | ID, JSON, etapa ou desfecho inválido, aliases divergentes ou combinação incompatível |
| `401` | JWT ausente, inválido ou expirado |
| `403` | Comercial tenta mover um lead atribuído a outra pessoa |
| `404` | Lead inexistente ou excluído durante a requisição |
| `409` | A atribuição mudou durante a gravação. Recarregue o lead antes de tentar de novo. |

### Migrar etapas de um banco anterior

`db:init` normaliza fechamentos legados com desfecho explícito e preserva `stageChangedAt`. Status desconhecidos e combinações inválidas de etapa e desfecho fazem a migração reverter. Nos bancos com as etapas antigas, consulte quais leads exigem revisão.

```sql
SELECT id, nome, lower(btrim(status)) AS etapa_atual, stage_changed_at
FROM leads
WHERE lower(btrim(status)) IN ('qualificacao', 'proposta', 'negociacao')
ORDER BY id;
```

Confirme a etapa de cada lead pelo histórico comercial. Por exemplo, para o lead 42 com proposta comprovadamente enviada, salve a decisão no arquivo `lead-stage-review.json`.

```json
[
  { "id": 42, "from": "proposta", "to": "proposta_enviada" }
]
```

Inclua uma entrada por lead listado na consulta. Use em `from` a etapa atual e em `to` uma das quatro etapas abertas válidas. No diretório `backend`, execute a migração com o arquivo revisado.

```sh
npm run db:init -- --lead-stage-review ./lead-stage-review.json
```

O banco confere as origens e aplica todas as mudanças de etapa junto com a nova restrição. Registros sem revisão, IDs inexistentes, duplicados ou etapas divergentes impedem a migração. Bancos novos e bancos já atualizados podem usar `npm run db:init`.

### Kanban

Com a API rodando e o banco preparado, execute `npm ci` e `npm run dev` no diretório `frontend`. O login e o Kanban usam `http://localhost:3000` por padrão. Para outra URL, defina `VITE_API_URL` em `frontend/.env.local`. Use o seletor do cartão para mover o lead ou escolher o desfecho ao fechar.

### Dashboard

```http
GET /dashboard
Authorization: Bearer SEU_TOKEN
```

O Gestor recebe métricas de todos os leads, incluindo os que ainda não têm responsável. O Comercial recebe métricas dos leads atribuídos a ele. JWT ausente, inválido ou expirado retorna `401`.

A resposta `200 OK` tem este formato.

```json
{
  "totalLeads": 14,
  "inProgress": 11,
  "closed": 3,
  "won": 2,
  "lost": 1,
  "conversionRate": 14.3,
  "closedConversionRate": 66.7,
  "byStage": {
    "prospeccao": 3,
    "primeiro_contato": 3,
    "reuniao_agendada": 3,
    "proposta_enviada": 2,
    "fechado": 3
  }
}
```

| Campo | Significado |
| --- | --- |
| `totalLeads` | Total de leads visíveis para o usuário |
| `inProgress` | Leads nas etapas abertas (`totalLeads - closed`) |
| `closed` | Leads com `status = fechado` |
| `won` | Leads fechados com `outcome = GANHO` |
| `lost` | Leads fechados com `outcome = PERDIDO` |
| `conversionRate` | Conversão geral (`won / totalLeads × 100`) |
| `closedConversionRate` | Conversão sobre encerrados (`won / closed × 100`) |
| `byStage` | Contagem por etapa, incluindo etapas com zero leads |

As taxas são números arredondados a uma casa decimal. Se o denominador for zero, a taxa correspondente retorna `0`. A reabertura passa a contar o lead na etapa aberta e atualiza as taxas na próxima consulta.

### Testes de integração

No diretório `backend`, configure as variáveis `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` e `PGDATABASE` do ambiente de teste. Use um usuário PostgreSQL com permissão para criar bancos. Execute `npm run test:integration`. O teste cria e remove seus próprios bancos temporários e usa credenciais fictícias na API.
