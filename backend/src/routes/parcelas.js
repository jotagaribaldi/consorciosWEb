const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/parcelas/grupo/:grupoId
router.get('/grupo/:grupoId', authenticate, async (req, res) => {
    try {
        const { grupoId } = req.params;
        const { participante_id, status } = req.query;

        // Atualizar status atrasado
        await pool.query(
            `UPDATE parcelas SET status = 'atrasado' WHERE grupo_id = $1 AND status = 'pendente' AND data_vencimento < CURRENT_DATE`,
            [grupoId]
        );

        let query = `
      SELECT pa.*, p.nome AS participante_nome, g.multa_atraso AS multa_padrao
      FROM parcelas pa
      JOIN participantes p ON p.id = pa.participante_id
      JOIN grupos g ON g.id = pa.grupo_id
      WHERE pa.grupo_id = $1
    `;
        const params = [grupoId];
        let i = 2;

        // CONSORCIADO só vê suas próprias parcelas
        if (req.user.role === 'consorciado') {
            query += ` AND p.usuario_id = $${i++}`;
            params.push(req.user.id);
        } else if (participante_id) {
            query += ` AND pa.participante_id = $${i++}`;
            params.push(participante_id);
        }

        if (status) { query += ` AND pa.status = $${i++}`; params.push(status); }
        query += ' ORDER BY pa.numero_mes, p.nome';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar parcelas' });
    }
});

// PUT /api/parcelas/:id/pagar – ADMIN ou GERENTE
router.put('/:id/pagar', authenticate, authorize('admin', 'gerente'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { data_pagamento, observacao } = req.body;
        const hoje = data_pagamento || new Date().toISOString().slice(0, 10);

        const parcelaRes = await client.query(
            `SELECT pa.*, g.multa_atraso FROM parcelas pa JOIN grupos g ON g.id = pa.grupo_id WHERE pa.id = $1`,
            [id]
        );
        if (parcelaRes.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Parcela não encontrada' }); }
        if (parcelaRes.rows[0].status === 'pago') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Parcela já paga' }); }

        // GERENTE só pode pagar parcelas de seus grupos
        if (req.user.role === 'gerente') {
            const ownerCheck = await client.query('SELECT gerente_id FROM grupos WHERE id = $1', [parcelaRes.rows[0].grupo_id]);
            if (ownerCheck.rows[0]?.gerente_id !== req.user.id) {
                await client.query('ROLLBACK');
                return res.status(403).json({ error: 'Acesso negado' });
            }
        }

        const parcela = parcelaRes.rows[0];
        const multa = new Date(hoje) > new Date(parcela.data_vencimento) ? parseFloat(parcela.multa_atraso) : 0;

        const result = await client.query(
            `UPDATE parcelas SET status = 'pago', data_pagamento = $1, valor_multa = $2, observacao = $3 WHERE id = $4 RETURNING *`,
            [hoje, multa, observacao || null, id]
        );
        await client.query('COMMIT');
        res.json({ ...result.rows[0], multa_aplicada: multa > 0 });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao registrar pagamento' });
    } finally {
        client.release();
    }
});

// PUT /api/parcelas/:id/cancelar – ADMIN ou GERENTE
router.put('/:id/cancelar', authenticate, authorize('admin', 'gerente'), async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE parcelas SET status = 'pendente', data_pagamento = NULL, valor_multa = 0, observacao = NULL WHERE id = $1 AND status = 'pago' RETURNING *`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Parcela não encontrada ou não está paga' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao estornar pagamento' });
    }
});

// GET /api/parcelas/inadimplentes/todos
router.get('/inadimplentes/todos', authenticate, authorize('admin', 'gerente'), async (req, res) => {
    try {
        await pool.query(`UPDATE parcelas SET status = 'atrasado' WHERE status = 'pendente' AND data_vencimento < CURRENT_DATE`);

        let query = `
      SELECT pa.*, p.nome AS participante_nome, p.telefone, p.email,
             g.nome AS grupo_nome, g.multa_atraso
      FROM parcelas pa
      JOIN participantes p ON p.id = pa.participante_id
      JOIN grupos g ON g.id = pa.grupo_id
      WHERE pa.status = 'atrasado'
    `;
        const params = [];
        if (req.user.role === 'gerente') {
            query += ' AND g.gerente_id = $1';
            params.push(req.user.id);
        }
        query += ' ORDER BY pa.data_vencimento ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar inadimplentes' });
    }
});

// GET /api/parcelas/minhas – CONSORCIADO vê suas parcelas de todos os grupos
router.get('/minhas', authenticate, authorize('consorciado'), async (req, res) => {
    try {
        await pool.query(`UPDATE parcelas SET status = 'atrasado' WHERE status = 'pendente' AND data_vencimento < CURRENT_DATE`);
        const result = await pool.query(`
      SELECT pa.*, p.nome AS participante_nome, g.nome AS grupo_nome, g.multa_atraso,
             p.ordem_sorteio, p.mes_contemplado
      FROM parcelas pa
      JOIN participantes p ON p.id = pa.participante_id
      JOIN grupos g ON g.id = pa.grupo_id
      WHERE p.usuario_id = $1
      ORDER BY g.nome, pa.numero_mes
    `, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar suas parcelas' });
    }
});

module.exports = router;
