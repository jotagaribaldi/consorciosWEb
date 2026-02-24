const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/invite/gerente/:gerenteId – lista pública de grupos de um gerente (sem auth)
router.get('/gerente/:gerenteId', async (req, res) => {
    try {
        const { gerenteId } = req.params;

        // Info do gerente/admin dono dos grupos
        const gerenteRes = await pool.query(
            `SELECT id, nome, role FROM usuarios WHERE id = $1 AND role IN ('gerente','admin') AND ativo = TRUE`,
            [gerenteId]
        );
        if (gerenteRes.rows.length === 0)
            return res.status(404).json({ error: 'Gerente não encontrado' });

        // Grupos ativos do gerente com vagas
        const grupos = await pool.query(`
          SELECT g.id, g.nome, g.descricao, g.total_participantes, g.valor_premio,
            g.valor_cota_inicial, g.incremento_mensal, g.dia_pagamento, g.mes_inicio,
            g.status, g.invite_token,
            COUNT(p.id) AS total_participantes_atual
          FROM grupos g
          LEFT JOIN participantes p ON p.grupo_id = g.id
          WHERE g.gerente_id = $1 AND g.status != 'encerrado'
          GROUP BY g.id
          ORDER BY g.created_at DESC
        `, [gerenteId]);

        const gruposComVagas = grupos.rows.map(g => ({
            ...g,
            vagas_disponiveis: g.total_participantes - parseInt(g.total_participantes_atual),
        }));

        res.json({ gerente: gerenteRes.rows[0], grupos: gruposComVagas });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar grupos do gerente' });
    }
});

// POST /api/invite/gerente/:gerenteId/join/:grupoId – CONSORCIADO entra em um grupo via página do gerente
router.post('/gerente/:gerenteId/join/:grupoId', authenticate, authorize('consorciado'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { grupoId, gerenteId } = req.params;

        const grupoRes = await client.query(
            'SELECT * FROM grupos WHERE id = $1 AND gerente_id = $2',
            [grupoId, gerenteId]
        );
        if (grupoRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Grupo não encontrado' });
        }
        const grupo = grupoRes.rows[0];

        const jaParticipante = await client.query(
            'SELECT id FROM participantes WHERE grupo_id = $1 AND usuario_id = $2',
            [grupoId, req.user.id]
        );
        if (jaParticipante.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Você já é participante deste grupo' });
        }

        const countRes = await client.query('SELECT COUNT(*) FROM participantes WHERE grupo_id = $1', [grupoId]);
        if (parseInt(countRes.rows[0].count) >= grupo.total_participantes) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Grupo lotado' });
        }

        const parcelasGeradas = await client.query('SELECT COUNT(*) FROM parcelas WHERE grupo_id = $1', [grupoId]);
        if (parseInt(parcelasGeradas.rows[0].count) > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Parcelas já geradas. Não é possível entrar agora.' });
        }

        const result = await client.query(
            'INSERT INTO participantes (grupo_id, usuario_id, nome, email, telefone) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [grupoId, req.user.id, req.user.nome, req.user.email, req.body.telefone || null]
        );
        await client.query('COMMIT');
        res.status(201).json({
            message: `Você entrou no grupo "${grupo.nome}" com sucesso!`,
            participante: result.rows[0],
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao entrar no grupo' });
    } finally {
        client.release();
    }
});

router.get('/:token', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT g.id, g.nome, g.descricao, g.total_participantes, g.valor_premio,
        g.valor_cota_inicial, g.incremento_mensal, g.dia_pagamento, g.mes_inicio, g.status,
        u.nome AS gerente_nome,
        COUNT(p.id) AS total_participantes_atual
      FROM grupos g
      LEFT JOIN usuarios u ON u.id = g.gerente_id
      LEFT JOIN participantes p ON p.grupo_id = g.id
      WHERE g.invite_token = $1
      GROUP BY g.id, u.nome
    `, [req.params.token]);

        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Link de convite inválido ou expirado' });

        const grupo = result.rows[0];
        if (grupo.status === 'encerrado')
            return res.status(400).json({ error: 'Este consórcio já está encerrado' });

        const vagas = grupo.total_participantes - parseInt(grupo.total_participantes_atual);
        res.json({ ...grupo, vagas_disponiveis: vagas });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar dados do convite' });
    }
});

// POST /api/invite/:token/join – CONSORCIADO entra no grupo
router.post('/:token/join', authenticate, authorize('consorciado'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { token } = req.params;

        const grupoRes = await client.query(
            'SELECT * FROM grupos WHERE invite_token = $1', [token]
        );
        if (grupoRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Convite inválido' });
        }
        const grupo = grupoRes.rows[0];

        // Verificar se já é participante
        const jaParticipante = await client.query(
            'SELECT id FROM participantes WHERE grupo_id = $1 AND usuario_id = $2',
            [grupo.id, req.user.id]
        );
        if (jaParticipante.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Você já é participante deste grupo' });
        }

        // Verificar vagas
        const countRes = await client.query(
            'SELECT COUNT(*) FROM participantes WHERE grupo_id = $1', [grupo.id]
        );
        if (parseInt(countRes.rows[0].count) >= grupo.total_participantes) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Grupo já está com o número máximo de participantes' });
        }

        // Verificar se parcelas já foram geradas (não pode mais entrar após gerar)
        const parcelasGeradas = await client.query(
            'SELECT COUNT(*) FROM parcelas WHERE grupo_id = $1', [grupo.id]
        );
        if (parseInt(parcelasGeradas.rows[0].count) > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'As parcelas já foram geradas. Não é possível entrar agora.' });
        }

        const result = await client.query(`
      INSERT INTO participantes (grupo_id, usuario_id, nome, email, telefone)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [grupo.id, req.user.id, req.user.nome, req.user.email, req.body.telefone || null]);

        await client.query('COMMIT');
        res.status(201).json({
            message: `Você entrou no grupo "${grupo.nome}" com sucesso!`,
            participante: result.rows[0],
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao entrar no grupo' });
    } finally {
        client.release();
    }
});

module.exports = router;
