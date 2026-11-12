import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { URL } from 'node:url';
import { Pool } from 'pg';

function initializeDatabase(database, expectedCode = 0, args = []) {
  const command = process.env.npm_execpath
    ? [process.env.npm_execpath, 'run', 'db:init', '--']
    : ['--import', 'tsx', 'src/scripts/init-database.ts'];
  const result = spawnSync(process.execPath, [...command, ...args], {
    env: { ...process.env, PGDATABASE: database },
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  assert.equal(result.status, expectedCode, result.stdout + result.stderr);
  return result.stderr;
}

async function withDatabase(admin, run) {
  const database = 'includeleads_test_' + randomUUID().replaceAll('-', '');
  await admin.query('CREATE DATABASE ' + database);
  try {
    await run(database);
  } finally {
    await admin.query('DROP DATABASE ' + database);
  }
}

async function testUpgrade(database) {
  const legacy = new Pool({ database });
  try {
    await legacy.query(
      await readFile(new URL('../database/users.sql', import.meta.url), 'utf8'),
    );
    await legacy.query(`
      INSERT INTO users (name, email, password_hash)
      VALUES ('Comercial legado', 'legacy@example.test', 'fixture');
      CREATE TABLE leads (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        nome TEXT, email TEXT, telefone TEXT, status TEXT DEFAULT 'prospeccao',
        segmento TEXT, responsavel TEXT, origem TEXT,
        responsible_user_id INTEGER REFERENCES users (id),
        last_contact TIMESTAMPTZ
      );
      INSERT INTO leads (nome, email, status, responsible_user_id, last_contact)
      VALUES
        ('Lead legado', 'lead@example.test', 'Fechado/Ganho', 1, '2025-02-15T18:00:00Z'),
        ('Sem contato', NULL, NULL, 1, '2025-02-15T18:00:00Z'),
        ('Fechamento a conferir', 'closed@example.test', 'fechado', 1, NULL);
    `);
    await legacy.query(
      await readFile(
        new URL('../database/interactions.sql', import.meta.url),
        'utf8',
      ),
    );
    await legacy.query(`
      INSERT INTO interactions (lead_id, user_id, annotation, interaction_date)
      VALUES (1, 1, 'Primeira interação', '2025-01-10T10:00:00Z'),
             (1, 1, 'Contato mais recente', '2025-01-11T10:00:00Z');
    `);

    assert.match(
      initializeDatabase(database, 1),
      /leads_stage_outcome_v2_check/,
    );
    const before = await legacy.query('SELECT * FROM leads ORDER BY id');
    assert.equal(before.rows[0].status, 'Fechado/Ganho');
    assert.equal(
      before.rows[0].last_contact.toISOString(),
      '2025-02-15T18:00:00.000Z',
    );
    assert.equal(before.rows[2].status, 'fechado');
    assert.equal(Object.hasOwn(before.rows[0], 'outcome'), false);
    assert.equal(Object.hasOwn(before.rows[0], 'contact_name'), false);

    await legacy.query(
      "UPDATE leads SET status = 'Fechado/Perdido' WHERE id = 3",
    );
    initializeDatabase(database);
    const query = `
      SELECT id, nome, email, status, outcome, stage_changed_at, last_contact,
             responsible_user_id, contact_name FROM leads ORDER BY id
    `;
    const { rows } = await legacy.query(query);
    assert.deepEqual(
      rows.map((row) => [
        row.id,
        row.status,
        row.outcome,
        row.stage_changed_at,
      ]),
      [
        [1, 'fechado', 'GANHO', null],
        [2, 'prospeccao', null, null],
        [3, 'fechado', 'PERDIDO', null],
      ],
    );
    assert.equal(rows[0].nome, 'Lead legado');
    assert.equal(rows[0].email, 'lead@example.test');
    assert.equal(rows[0].responsible_user_id, 1);
    assert.deepEqual(
      rows.map((row) => row.contact_name),
      [null, null, null],
    );
    assert.equal(
      rows[0].last_contact.toISOString(),
      '2025-01-11T10:00:00.000Z',
    );
    assert.equal(rows[1].last_contact, null);
    assert.equal(
      (await legacy.query('SELECT id FROM interactions')).rowCount,
      2,
    );

    initializeDatabase(database);
    assert.deepEqual((await legacy.query(query)).rows, rows);
    const moved = await legacy.query(
      "UPDATE leads SET status = 'primeiro_contato' WHERE id = 2 RETURNING status",
    );
    assert.equal(moved.rows[0].status, 'primeiro_contato');
  } finally {
    await legacy.end();
  }
}

async function testStageReview(database) {
  initializeDatabase(database);
  const legacy = new Pool({ database });
  const directory = await mkdtemp(join(tmpdir(), 'includeleads-stage-review-'));
  const reviewFile = join(directory, 'review.json');
  try {
    await legacy.query(`
      ALTER TABLE leads DROP CONSTRAINT leads_stage_outcome_v2_check,
        ADD CONSTRAINT leads_stage_outcome_check CHECK (
          (status IN ('prospeccao', 'qualificacao', 'proposta', 'negociacao') AND outcome IS NULL)
          OR (status = 'fechado' AND outcome IS NOT NULL AND outcome IN ('GANHO', 'PERDIDO'))
        );
      INSERT INTO leads (nome, telefone, status, outcome, stage_changed_at, last_contact)
      VALUES
        ('Contato confirmado', '1001', 'qualificacao', NULL, '2025-03-01T10:00:00Z', NULL),
        ('Proposta entregue', '1002', 'proposta', NULL, '2025-03-02T10:00:00Z', '2025-03-01T14:00:00Z'),
        ('Reunião confirmada', '1003', 'negociacao', NULL, '2025-03-03T10:00:00Z', NULL),
        ('Fechamento registrado', '1004', 'fechado', 'GANHO', '2025-03-04T10:00:00Z', NULL);
    `);
    const query = 'SELECT * FROM leads ORDER BY id';
    const before = (await legacy.query(query)).rows;
    const decisions = [
      { id: 1, from: 'qualificacao', to: 'primeiro_contato' },
      { id: 2, from: 'proposta', to: 'proposta_enviada' },
      { id: 3, from: 'negociacao', to: 'reuniao_agendada' },
    ];
    assert.match(initializeDatabase(database, 1), /sem revisão/);
    assert.deepEqual((await legacy.query(query)).rows, before);

    const args = ['--lead-stage-review', reviewFile];
    await writeFile(reviewFile, JSON.stringify(decisions.slice(0, 2)));
    assert.match(initializeDatabase(database, 1, args), /sem revisão/);
    await writeFile(
      reviewFile,
      JSON.stringify([
        ...decisions.slice(0, 2),
        { ...decisions[2], from: 'proposta' },
      ]),
    );
    assert.match(initializeDatabase(database, 1, args), /origem divergente/);
    assert.deepEqual((await legacy.query(query)).rows, before);

    await writeFile(reviewFile, JSON.stringify(decisions));
    initializeDatabase(database, 0, args);
    const stagesById = new Map(decisions.map(({ id, to }) => [id, to]));
    const expected = before.map((lead) => ({
      ...lead,
      status: stagesById.get(lead.id) ?? lead.status,
    }));
    assert.deepEqual((await legacy.query(query)).rows, expected);
    initializeDatabase(database);
    assert.deepEqual((await legacy.query(query)).rows, expected);
  } finally {
    await legacy.end();
    await rm(reviewFile, { force: true });
    await rmdir(directory);
  }
}

async function testApi(database, t) {
  initializeDatabase(database);
  initializeDatabase(database);
  process.env.PGDATABASE = database;
  process.env.JWT_SECRET = randomUUID();
  process.env.SETUP_TOKEN = randomUUID();
  process.env.JWT_EXPIRES_IN = '1h';
  const { default: appModule } = await import('../dist/app.js');
  const { pool } = await import('../dist/config/database.js');
  const server = appModule.default.listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    async function request(
      method,
      path,
      expected,
      { body, token, headers } = {},
    ) {
      const response = await globalThis.fetch(base + path, {
        method,
        headers: {
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = response.status === 204 ? null : await response.json();
      assert.equal(
        response.status,
        expected,
        method + ' ' + path + ' ' + JSON.stringify(result),
      );
      return result;
    }

    const password = 'SenhaTeste123!';
    const manager = { name: 'Gestor', email: 'gestor@example.test', password };
    const seller = {
      name: 'Comercial',
      email: 'comercial@example.test',
      password,
    };
    const other = {
      name: 'Outro Comercial',
      email: 'outro@example.test',
      password,
    };
    await request('POST', '/auth/setup', 201, {
      body: manager,
      headers: { 'X-Setup-Token': process.env.SETUP_TOKEN },
    });
    const { token: managerToken } = await request('POST', '/auth/login', 200, {
      body: manager,
    });
    const { user: owner } = await request('POST', '/auth/register', 201, {
      body: seller,
      token: managerToken,
    });
    const { user: otherOwner } = await request('POST', '/auth/register', 201, {
      body: other,
      token: managerToken,
    });
    const { token } = await request('POST', '/auth/login', 200, {
      body: seller,
    });
    const { token: otherToken } = await request('POST', '/auth/login', 200, {
      body: other,
    });
    const leadBody = {
      name: 'Atlas Energia',
      contactName: '  Mariana Souza  ',
      email: 'lead@example.test',
      origem: 'Indicação',
      segmento: 'Energia',
      responsibleUserId: owner.id,
    };
    const lead = await request('POST', '/leads', 201, {
      token,
      body: leadBody,
    });
    const path = '/leads/' + lead.id;
    const stagePath = path + '/stage';
    const interactionsPath = path + '/interactions';
    const move = (body, expected = 200, actor = token) =>
      request('PATCH', stagePath, expected, { body, token: actor });

    async function assertSavedContact(id, contactName) {
      const { rows } = await pool.query(
        'SELECT contact_name FROM leads WHERE id = $1',
        [id],
      );
      assert.deepEqual(rows, [{ contact_name: contactName }]);
    }

    await t.test(
      'cria, valida e devolve o nome do contato principal',
      async () => {
        assert.equal(lead.contactName, 'Mariana Souza');
        await assertSavedContact(lead.id, 'Mariana Souza');
        assert.deepEqual(await request('GET', path, 200, { token }), lead);
        assert.deepEqual(await request('GET', '/leads', 200, { token }), [
          lead,
        ]);

        for (const contactName of ['', '   ', 42, 'Nome\0inválido']) {
          await request('POST', '/leads', 400, {
            token,
            body: {
              ...leadBody,
              email: 'validation@example.test',
              contactName,
            },
          });
          await request('PUT', path, 400, { token, body: { contactName } });
        }
        await request('POST', '/leads', 400, {
          token,
          body: { ...leadBody, email: null },
        });
        await assertSavedContact(lead.id, 'Mariana Souza');
      },
    );

    await t.test('JWT, escopo por responsável e códigos HTTP', async () => {
      const current = await request('GET', '/auth/me', 200, { token });
      assert.equal(current.user.id, owner.id);
      await request('POST', '/auth/login', 401, {
        body: { ...seller, password: 'SenhaErrada123!' },
      });
      await request('POST', '/auth/register', 403, { body: seller, token });
      await request('PATCH', stagePath, 401, {
        body: { stage: 'primeiro_contato' },
      });
      await move({ stage: 'primeiro_contato' }, 401, 'token-invalido');
      await move({ stage: 'primeiro_contato' }, 403, otherToken);
      await request('PATCH', '/leads/2147483647/stage', 404, {
        token,
        body: { stage: 'primeiro_contato' },
      });
      await request('PATCH', '/leads/abc/stage', 400, {
        token,
        body: { stage: 'primeiro_contato' },
      });
      const users = await request('GET', '/users/commercial', 200, {
        token: managerToken,
      });
      assert.equal(users.length, 2);
      assert.ok(users.some((user) => user.id === owner.id));
      assert.ok(users.every((user) => !Object.hasOwn(user, 'passwordHash')));
      await request('GET', '/users/commercial', 403, { token });
    });

    const contactDate = '2025-01-10T13:30:00.000Z';
    let current = lead;
    async function assertMovement(
      body,
      status,
      outcome,
      lastContact,
      actor = token,
    ) {
      await setTimeout(5);
      const updated = await move(body, 200, actor);
      assert.equal(updated.id, lead.id);
      assert.equal(updated.responsibleUserId, owner.id);
      assert.equal(updated.status, status);
      assert.equal(updated.outcome, outcome);
      assert.equal(updated.contactName, lead.contactName);
      assert.equal(updated.lastContact, lastContact);
      assert.ok(
        Date.parse(updated.stageChangedAt) > Date.parse(current.stageChangedAt),
      );
      assert.equal(Object.hasOwn(updated, 'passwordHash'), false);
      current = updated;
    }

    await t.test(
      'funil completo, interação, GANHO, reabertura e PERDIDO',
      async () => {
        assert.equal(lead.status, 'prospeccao');
        assert.equal(lead.outcome, null);
        assert.equal(lead.lastContact, null);
        assert.ok(Number.isFinite(Date.parse(lead.stageChangedAt)));
        await assertMovement(
          { stage: 'primeiro_contato' },
          'primeiro_contato',
          null,
          null,
        );
        await request('POST', interactionsPath, 201, {
          token,
          body: {
            annotation: 'Contato inicial',
            interactionDate: contactDate,
            type: 'ligacao',
          },
        });
        const afterInteraction = await request('GET', path, 200, { token });
        assert.equal(afterInteraction.contactName, lead.contactName);
        assert.equal(afterInteraction.lastContact, contactDate);
        assert.equal(afterInteraction.stageChangedAt, current.stageChangedAt);
        await assertMovement(
          { status: 'reuniao_agendada' },
          'reuniao_agendada',
          null,
          contactDate,
          managerToken,
        );
        await assertMovement(
          { stage: 'proposta_enviada', outcome: null },
          'proposta_enviada',
          null,
          contactDate,
        );
        await assertMovement(
          { stage: 'fechado', outcome: 'GANHO' },
          'fechado',
          'GANHO',
          contactDate,
        );
        await assertMovement(
          { stage: 'primeiro_contato' },
          'primeiro_contato',
          null,
          contactDate,
        );
        await assertMovement(
          { status: 'fechado', desfecho: 'PERDIDO' },
          'fechado',
          'PERDIDO',
          contactDate,
        );
        const repeated = await move({
          stage: 'fechado',
          status: 'fechado',
          outcome: 'PERDIDO',
          desfecho: 'PERDIDO',
        });
        assert.deepEqual(repeated, current);
        const reclassified = await move({
          stage: 'fechado',
          outcome: 'GANHO',
        });
        assert.equal(reclassified.stageChangedAt, current.stageChangedAt);
        assert.equal(reclassified.lastContact, contactDate);
        assert.equal(reclassified.outcome, 'GANHO');
        current = reclassified;
      },
    );

    await t.test('rejeita estados impossíveis na API e no banco', async () => {
      for (const body of [
        undefined,
        {},
        [],
        { stage: '' },
        { stage: null },
        { stage: 'etapa_inexistente' },
        { stage: 'qualificacao' },
        { stage: 'proposta' },
        { stage: 'negociacao' },
        { stage: 'fechado' },
        { stage: 'fechado', outcome: '' },
        { stage: 'fechado', outcome: 'INVALIDO' },
        { stage: 'reuniao_agendada', outcome: 'GANHO' },
        { stage: 'reuniao_agendada', outcome: 'PERDIDO' },
        { stage: 'Fechado/Ganho', outcome: 'GANHO' },
        { stage: 'Fechado/Perdido', outcome: 'PERDIDO' },
        { stage: 'reuniao_agendada', status: 'proposta_enviada' },
        { stage: 'fechado', outcome: 'GANHO', desfecho: 'PERDIDO' },
      ]) {
        const error = await move(body, 400);
        assert.equal(typeof error.message, 'string');
      }
      assert.deepEqual(await request('GET', path, 200, { token }), current);
      for (const [status, outcome] of [
        ['fechado', null],
        ['fechado', 'INVALIDO'],
        ['reuniao_agendada', 'GANHO'],
        ['Fechado/Perdido', 'GANHO'],
        ['inexistente', null],
        ['qualificacao', null],
        ['proposta', null],
        ['negociacao', null],
      ]) {
        await assert.rejects(
          pool.query(
            'UPDATE leads SET status = $1, outcome = $2 WHERE id = $3',
            [status, outcome, lead.id],
          ),
          { code: '23514', constraint: 'leads_stage_outcome_v2_check' },
        );
      }
    });

    await t.test(
      'movimentações concorrentes mantêm etapa, desfecho e datas coerentes',
      async () => {
        const duplicateMoves = await Promise.all([
          move({ stage: 'proposta_enviada' }),
          move({ stage: 'proposta_enviada' }, 200, managerToken),
        ]);
        assert.deepEqual(duplicateMoves[0], duplicateMoves[1]);
        assert.equal(duplicateMoves[0].outcome, null);
        const [won, lost] = await Promise.all([
          move({ stage: 'fechado', outcome: 'GANHO' }),
          move({ stage: 'fechado', outcome: 'PERDIDO' }, 200, managerToken),
        ]);
        assert.equal(won.outcome, 'GANHO');
        assert.equal(lost.outcome, 'PERDIDO');
        assert.equal(won.stageChangedAt, lost.stageChangedAt);
        assert.equal(won.lastContact, contactDate);
        assert.equal(lost.lastContact, contactDate);
        const saved = await request('GET', path, 200, { token });
        assert.ok(
          [won, lost].some((result) => result.outcome === saved.outcome),
        );
        assert.equal(saved.status, 'fechado');
      },
    );

    await t.test(
      'busca empresa ou contato e respeita o responsável',
      async () => {
        const otherLead = await request('POST', '/leads', 201, {
          token: managerToken,
          body: {
            name: 'Norte Tecnologia',
            contactName: 'Mariana !%_',
            phone: '84999990002',
            responsibleUserId: otherOwner.id,
          },
        });
        const search = async (term, actor = managerToken) => {
          const leads = await request(
            'GET',
            '/leads?search=' + encodeURIComponent(term),
            200,
            { token: actor },
          );
          return leads.map(({ id }) => id);
        };
        assert.deepEqual(await search('atlas'), [lead.id]);
        assert.deepEqual(await search('SOUZA'), [lead.id]);
        assert.deepEqual(await search('mArIaNa'), [otherLead.id, lead.id]);
        assert.deepEqual(await search('mariana', token), [lead.id]);
        assert.deepEqual(await search('mariana', otherToken), [otherLead.id]);
        assert.deepEqual(await search('atlas', otherToken), []);
        assert.deepEqual(await search('inexistente'), []);
        for (const symbol of ['!', '%', '_']) {
          assert.deepEqual(await search(symbol), [otherLead.id]);
        }
        await request('DELETE', '/leads/' + otherLead.id, 204, {
          token: managerToken,
        });
      },
    );

    await t.test(
      'regressão de CRUD, filtros combinados, interações e exclusão',
      async () => {
        await request('POST', '/leads', 409, { token, body: leadBody });
        for (const key of ['stage', 'status']) {
          await request('PUT', path, 400, {
            token,
            body: { [key]: 'primeiro_contato', origem: 'Alteração inválida' },
          });
        }
        const withOrigin = await request('PUT', path, 200, {
          token,
          body: { origem: 'Indicação Direta' },
        });
        assert.equal(withOrigin.contactName, lead.contactName);
        await request('POST', interactionsPath, 201, {
          token,
          body: {
            annotation: 'Contato anterior',
            interactionDate: '2025-01-08T12:00:00Z',
          },
        });
        const history = await request('GET', interactionsPath, 200, { token });
        assert.equal(history.length, 2);
        assert.equal(history[0].interactionDate, contactDate);
        assert.equal(
          (await request('GET', path, 200, { token })).lastContact,
          contactDate,
        );
        const filterPath = '/leads?search=mariana';
        const filters = [
          ['origem', 'indicacao%20direta', 'outra'],
          ['segmento', 'energia', 'outro'],
          ['ultimoContato', '2025-01-10', '2025-01-08'],
        ];
        const combined = filters.reduce(
          (url, [key, value]) => url + '&' + key + '=' + value,
          filterPath,
        );
        for (const actor of [managerToken, token, otherToken]) {
          const filtered = await request('GET', combined, 200, {
            token: actor,
          });
          assert.deepEqual(
            filtered.map((item) => item.id),
            actor === otherToken ? [] : [lead.id],
          );
        }
        for (const [key, value, mismatch] of filters) {
          const url = combined.replace(
            `&${key}=${value}`,
            `&${key}=${mismatch}`,
          );
          assert.deepEqual(
            await request('GET', url, 200, { token: managerToken }),
            [],
          );
        }

        const body = { contactName: '  Carlos Lima  ' };
        await request('PUT', path, 403, { token: otherToken, body });
        await assertSavedContact(lead.id, lead.contactName);
        const edited = await request('PUT', path, 200, { token, body });
        assert.equal(edited.contactName, 'Carlos Lima');
        assert.equal(edited.stageChangedAt, withOrigin.stageChangedAt);
        assert.equal(edited.lastContact, contactDate);
        await assertSavedContact(lead.id, 'Carlos Lima');
        assert.deepEqual(await request('GET', path, 200, { token }), edited);
        assert.deepEqual(await request('GET', filterPath, 200, { token }), []);
        const cleared = await request('PUT', path, 200, {
          token,
          body: { contactName: null },
        });
        assert.equal(cleared.contactName, null);
        await assertSavedContact(lead.id, null);

        await request('DELETE', path, 403, { token: otherToken });
        await request('DELETE', path, 204, { token });
        await request('GET', path, 404, { token });
        const remaining = await pool.query(
          'SELECT id FROM interactions WHERE lead_id = $1',
          [lead.id],
        );
        assert.equal(remaining.rowCount, 0);
      },
    );

    await t.test('Dashboard com JWT, escopo e métricas do funil', async () => {
      const emptyStages = {
        prospeccao: 0,
        primeiro_contato: 0,
        reuniao_agendada: 0,
        proposta_enviada: 0,
        fechado: 0,
      };
      async function assertDashboard(actor, { byStage, ...metrics } = {}) {
        const result = await request('GET', '/dashboard', 200, {
          token: actor,
        });
        assert.deepEqual(result, {
          totalLeads: 0,
          inProgress: 0,
          closed: 0,
          won: 0,
          lost: 0,
          conversionRate: 0,
          closedConversionRate: 0,
          ...metrics,
          byStage: { ...emptyStages, ...byStage },
        });
        assert.equal(result.won + result.lost, result.closed);
      }
      const createDashboardLead = (responsibleUserId, actor = managerToken) =>
        request('POST', '/leads', 201, {
          token: actor,
          body: {
            name: 'Lead do Dashboard',
            phone: '84999990000',
            responsibleUserId,
          },
        });
      const changeStage = (id, body, actor = managerToken) =>
        request('PATCH', `/leads/${id}/stage`, 200, { token: actor, body });

      await request('GET', '/dashboard', 401);
      await request('GET', '/dashboard', 401, { token: 'token-invalido' });
      await assertDashboard(managerToken);
      await assertDashboard(token);

      const { id, contactName } = await createDashboardLead(owner.id, token);
      assert.equal(contactName, null);
      await assertDashboard(managerToken, {
        totalLeads: 1,
        inProgress: 1,
        byStage: { prospeccao: 1 },
      });
      await assertDashboard(otherToken);

      await changeStage(id, { stage: 'fechado', outcome: 'GANHO' }, token);
      await assertDashboard(token, {
        totalLeads: 1,
        closed: 1,
        won: 1,
        conversionRate: 100,
        closedConversionRate: 100,
        byStage: { fechado: 1 },
      });

      const reopened = await changeStage(
        id,
        { stage: 'primeiro_contato' },
        token,
      );
      assert.equal(reopened.outcome, null);
      await assertDashboard(token, {
        totalLeads: 1,
        inProgress: 1,
        byStage: { primeiro_contato: 1 },
      });

      await changeStage(id, { stage: 'fechado', outcome: 'PERDIDO' }, token);
      await assertDashboard(token, {
        totalLeads: 1,
        closed: 1,
        lost: 1,
        byStage: { fechado: 1 },
      });

      for (const [responsibleUserId, stage, quantity, outcome] of [
        [owner.id, 'prospeccao', 2],
        [owner.id, 'primeiro_contato', 1],
        [owner.id, 'reuniao_agendada', 1],
        [owner.id, 'fechado', 1, 'GANHO'],
        [otherOwner.id, 'primeiro_contato', 2],
        [otherOwner.id, 'reuniao_agendada', 2],
        [otherOwner.id, 'proposta_enviada', 2],
        [otherOwner.id, 'fechado', 1, 'GANHO'],
      ]) {
        for (let index = 0; index < quantity; index += 1) {
          const lead = await createDashboardLead(responsibleUserId);
          if (stage !== 'prospeccao') {
            await changeStage(lead.id, { stage, outcome });
          }
        }
      }
      const {
        rows: [legacyLead],
      } = await pool.query(
        'INSERT INTO leads (nome, telefone) VALUES ($1, $2) RETURNING id',
        ['Lead legado sem responsável', '84999990001'],
      );
      const legacy = await request('GET', '/leads/' + legacyLead.id, 200, {
        token: managerToken,
      });
      assert.equal(legacy.contactName, null);

      await assertDashboard(managerToken, {
        totalLeads: 14,
        inProgress: 11,
        closed: 3,
        won: 2,
        lost: 1,
        conversionRate: 14.3,
        closedConversionRate: 66.7,
        byStage: {
          prospeccao: 3,
          primeiro_contato: 3,
          reuniao_agendada: 3,
          proposta_enviada: 2,
          fechado: 3,
        },
      });
      await assertDashboard(token, {
        totalLeads: 6,
        inProgress: 4,
        closed: 2,
        won: 1,
        lost: 1,
        conversionRate: 16.7,
        closedConversionRate: 50,
        byStage: {
          prospeccao: 2,
          primeiro_contato: 1,
          reuniao_agendada: 1,
          fechado: 2,
        },
      });
      await assertDashboard(otherToken, {
        totalLeads: 7,
        inProgress: 6,
        closed: 1,
        won: 1,
        conversionRate: 14.3,
        closedConversionRate: 100,
        byStage: {
          primeiro_contato: 2,
          reuniao_agendada: 2,
          proposta_enviada: 2,
          fechado: 1,
        },
      });
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await pool.end();
  }
}

test('integração do funil com PostgreSQL', async (t) => {
  const admin = new Pool({ database: process.env.PGDATABASE || 'postgres' });
  try {
    await t.test(
      'atualiza banco legado, preserva dados e reverte migração ambígua',
      () => withDatabase(admin, testUpgrade),
    );
    await t.test(
      'migra etapas legadas somente com revisão completa por lead',
      () => withDatabase(admin, testStageReview),
    );
    await t.test(
      'inicializa banco novo, reexecuta db:init e testa a API',
      (api) => withDatabase(admin, (database) => testApi(database, api)),
    );
  } finally {
    await admin.end();
  }
});
