const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { authenticate, authorize, requireGroupOwner } = require('../middleware/auth');

// GET /api/grupos – ADMIN vê todos; GERENTE vê só os seus
router.get('/', authenticate, async (req, res) => {
    try {
        let query = `
      SELECT g.*,
        u.nome AS gerente_nome,
        COUNT(DISTINCT p.id) AS total_participantes_atual,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.status = 'atrasado') AS total_inadimplentes,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.status = 'pago') AS total_pagos,
        COUNT(DISTINCT pa.id) AS total_parcelas
      FROM grupos g
      LEFT JOIN usuarios u ON u.id = g.gerente_id
      LEFT JOIN participantes p ON p.grupo_id = g.id
      LEFT JOIN parcelas pa ON pa.grupo_id = g.id
    `;
        const params = [];
        if (req.user.role === 'gerente') {
            query += ' WHERE g.gerente_id = $1';
            params.push(req.user.id);
        }
        query += ' GROUP BY g.id, u.nome ORDER BY g.created_at DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar grupos' });
    }
});

// GET /api/grupos/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const grupo = await pool.query(`
      SELECT g.*, u.nome AS gerente_nome
      FROM grupos g LEFT JOIN usuarios u ON u.id = g.gerente_id
      WHERE g.id = $1`, [id]);
        if (grupo.rows.length === 0) return res.status(404).json({ error: 'Grupo não encontrado' });

        // GERENTE só pode ver seus grupos
        if (req.user.role === 'gerente' && grupo.rows[0].gerente_id !== req.user.id)
            return res.status(403).json({ error: 'Acesso negado' });

        const participantes = await pool.query(
            'SELECT * FROM participantes WHERE grupo_id = $1 ORDER BY ordem_sorteio NULLS LAST, id', [id]
        );
        res.json({ ...grupo.rows[0], participantes: participantes.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar grupo' });
    }
});

// POST /api/grupos – ADMIN ou GERENTE
router.post('/', authenticate, authorize('admin', 'gerente'), async (req, res) => {
    try {
        const {
            nome, descricao, total_participantes, valor_premio,
            valor_cota_inicial, incremento_mensal, dia_pagamento, multa_atraso, mes_inicio
        } = req.body;
        const gerente_id = req.user.role === 'gerente' ? req.user.id : (req.body.gerente_id || req.user.id);
        const invite_token = uuidv4();

        const result = await pool.query(`
      INSERT INTO grupos (nome, descricao, total_participantes, valor_premio, valor_cota_inicial,
        incremento_mensal, dia_pagamento, multa_atraso, mes_inicio, gerente_id, invite_token)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [nome, descricao, total_participantes, valor_premio, valor_cota_inicial,
            incremento_mensal, dia_pagamento, multa_atraso, mes_inicio, gerente_id, invite_token]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar grupo' });
    }
});

// PUT /api/grupos/:id
router.put('/:id', authenticate, authorize('admin', 'gerente'), requireGroupOwner, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome, descricao, total_participantes, valor_premio,
            valor_cota_inicial, incremento_mensal, dia_pagamento, multa_atraso, mes_inicio, status
        } = req.body;

        const result = await pool.query(`
      UPDATE grupos SET nome=$1, descricao=$2, total_participantes=$3, valor_premio=$4,
        valor_cota_inicial=$5, incremento_mensal=$6, dia_pagamento=$7, multa_atraso=$8,
        mes_inicio=$9, status=$10 WHERE id=$11 RETURNING *
    `, [nome, descricao, total_participantes, valor_premio, valor_cota_inicial,
            incremento_mensal, dia_pagamento, multa_atraso, mes_inicio, status, id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Grupo não encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar grupo' });
    }
});

// DELETE /api/grupos/:id
router.delete('/:id', authenticate, authorize('admin', 'gerente'), requireGroupOwner, async (req, res) => {
    try {
        await pool.query('DELETE FROM grupos WHERE id = $1', [req.params.id]);
        res.json({ message: 'Grupo removido' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao remover grupo' });
    }
});

// GET /api/grupos/:id/invite – retorna o link de convite
router.get('/:id/invite', authenticate, authorize('admin', 'gerente'), requireGroupOwner, async (req, res) => {
    try {
        const result = await pool.query('SELECT invite_token, nome FROM grupos WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Grupo não encontrado' });
        const { invite_token, nome } = result.rows[0];
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.json({
            link: `${frontendUrl}/join/${invite_token}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(`Olá! Você foi convidado para participar do grupo de consórcio "${nome}"! Acesse o link para se cadastrar e entrar: ${frontendUrl}/join/${invite_token}`)}`,
            token: invite_token,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao gerar link' });
    }
});

// POST /api/grupos/:id/regenerate-invite – gerar novo token
router.post('/:id/regenerate-invite', authenticate, authorize('admin', 'gerente'), requireGroupOwner, async (req, res) => {
    try {
        const invite_token = uuidv4();
        await pool.query('UPDATE grupos SET invite_token = $1 WHERE id = $2', [invite_token, req.params.id]);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.json({
            link: `${frontendUrl}/join/${invite_token}`,
            token: invite_token,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao gerar novo token' });
    }
});

// POST /api/grupos/:id/gerar-parcelas
router.post('/:id/gerar-parcelas', authenticate, authorize('admin', 'gerente'), requireGroupOwner, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const grupoRes = await client.query('SELECT * FROM grupos WHERE id = $1', [id]);
        if (grupoRes.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Grupo não encontrado' }); }
        const grupo = grupoRes.rows[0];

        const existeRes = await client.query('SELECT COUNT(*) FROM parcelas WHERE grupo_id = $1', [id]);
        if (parseInt(existeRes.rows[0].count) > 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Parcelas já geradas' }); }

        const participantesRes = await client.query('SELECT * FROM participantes WHERE grupo_id = $1 ORDER BY id', [id]);
        const participantes = participantesRes.rows;
        if (participantes.length === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Adicione participantes antes' }); }

        const mesInicio = new Date(grupo.mes_inicio);
        const numMeses = grupo.total_participantes;

        for (const p of participantes) {
            for (let mes = 1; mes <= numMeses; mes++) {
                const mesRef = new Date(mesInicio);
                mesRef.setMonth(mesRef.getMonth() + (mes - 1));
                const dataVenc = new Date(mesRef.getFullYear(), mesRef.getMonth(), grupo.dia_pagamento);
                const valorCota = parseFloat(grupo.valor_cota_inicial) + (mes - 1) * parseFloat(grupo.incremento_mensal);
                await client.query(
                    `INSERT INTO parcelas (grupo_id, participante_id, numero_mes, mes_referencia, valor_cota, data_vencimento) VALUES ($1,$2,$3,$4,$5,$6)`,
                    [id, p.id, mes, mesRef.toISOString().slice(0, 10), valorCota.toFixed(2), dataVenc.toISOString().slice(0, 10)]
                );
            }
        }
        await client.query('COMMIT');
        res.json({ message: `Parcelas geradas para ${participantes.length} participantes × ${numMeses} meses` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao gerar parcelas' });
    } finally {
        client.release();
    }
});

// GET /api/grupos/:id/inadimplentes
router.get('/:id/inadimplentes', authenticate, authorize('admin', 'gerente'), requireGroupOwner, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT pa.*, p.nome AS participante_nome, p.telefone, p.email, g.multa_atraso
      FROM parcelas pa JOIN participantes p ON p.id = pa.participante_id JOIN grupos g ON g.id = pa.grupo_id
      WHERE pa.grupo_id = $1 AND pa.data_vencimento < CURRENT_DATE AND pa.status = 'pendente'
      ORDER BY pa.data_vencimento ASC
    `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar inadimplentes' });
    }
});

module.exports = router;
