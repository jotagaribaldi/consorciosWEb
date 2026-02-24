const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/participantes/grupo/:grupoId
router.get('/grupo/:grupoId', async (req, res) => {
    try {
        const { grupoId } = req.params;
        const result = await pool.query(
            `SELECT p.*,
        COUNT(pa.id) FILTER (WHERE pa.status = 'pago') AS parcelas_pagas,
        COUNT(pa.id) FILTER (WHERE pa.status = 'pendente' AND pa.data_vencimento < CURRENT_DATE) AS parcelas_atrasadas,
        COUNT(pa.id) AS total_parcelas
       FROM participantes p
       LEFT JOIN parcelas pa ON pa.participante_id = p.id
       WHERE p.grupo_id = $1
       GROUP BY p.id
       ORDER BY p.ordem_sorteio NULLS LAST, p.id`,
            [grupoId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar participantes' });
    }
});

// POST /api/participantes - adicionar participante
router.post('/', async (req, res) => {
    try {
        const { grupo_id, nome, email, telefone } = req.body;

        // Verificar se grupo existe e numero de participantes não excedeu
        const grupoRes = await pool.query('SELECT * FROM grupos WHERE id = $1', [grupo_id]);
        if (grupoRes.rows.length === 0) return res.status(404).json({ error: 'Grupo não encontrado' });

        const countRes = await pool.query(
            'SELECT COUNT(*) FROM participantes WHERE grupo_id = $1', [grupo_id]
        );
        const count = parseInt(countRes.rows[0].count);
        if (count >= grupoRes.rows[0].total_participantes) {
            return res.status(400).json({ error: 'Número máximo de participantes atingido' });
        }

        const result = await pool.query(`
      INSERT INTO participantes (grupo_id, nome, email, telefone)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [grupo_id, nome, email, telefone]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao adicionar participante' });
    }
});

// PUT /api/participantes/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, telefone } = req.body;
        const result = await pool.query(`
      UPDATE participantes SET nome=$1, email=$2, telefone=$3
      WHERE id=$4 RETURNING *
    `, [nome, email, telefone, id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Participante não encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar participante' });
    }
});

// DELETE /api/participantes/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM participantes WHERE id = $1', [id]);
        res.json({ message: 'Participante removido' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao remover participante' });
    }
});

module.exports = router;
