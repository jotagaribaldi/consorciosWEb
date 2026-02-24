const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/dashboard – ADMIN vê tudo; GERENTE vê só seus grupos; CONSORCIADO vê seus dados
router.get('/', authenticate, async (req, res) => {
  try {
    await pool.query(`UPDATE parcelas SET status = 'atrasado' WHERE status = 'pendente' AND data_vencimento < CURRENT_DATE`);

    if (req.user.role === 'consorciado') {
      // Dashboard CONSORCIADO: seus grupos e parcelas
      const grupos = await pool.query(`
        SELECT g.id, g.nome, g.valor_premio, g.status, p.ordem_sorteio, p.mes_contemplado,
          COUNT(pa.id) FILTER (WHERE pa.status='pago') AS parcelas_pagas,
          COUNT(pa.id) FILTER (WHERE pa.status='atrasado') AS parcelas_atrasadas,
          COUNT(pa.id) AS total_parcelas,
          COALESCE(SUM(pa.valor_cota) FILTER (WHERE pa.status='pago'),0) AS valor_pago
        FROM participantes p
        JOIN grupos g ON g.id = p.grupo_id
        LEFT JOIN parcelas pa ON pa.participante_id = p.id
        WHERE p.usuario_id = $1
        GROUP BY g.id, p.ordem_sorteio, p.mes_contemplado
      `, [req.user.id]);

      return res.json({
        tipo: 'consorciado',
        grupos: grupos.rows,
      });
    }

    // ADMIN ou GERENTE
    const whereGerente = req.user.role === 'gerente' ? `AND g.gerente_id = ${req.user.id}` : '';

    const stats = await pool.query(`
      SELECT
        COUNT(DISTINCT g.id) AS total_grupos,
        COUNT(DISTINCT g.id) FILTER (WHERE g.status='ativo') AS grupos_ativos,
        COUNT(DISTINCT p.id) AS total_participantes,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.status='pago') AS parcelas_pagas,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.status='atrasado') AS parcelas_atrasadas,
        COUNT(DISTINCT pa.id) FILTER (WHERE pa.status='pendente') AS parcelas_pendentes,
        COALESCE(SUM(pa.valor_cota + pa.valor_multa) FILTER (WHERE pa.status='pago'),0) AS total_arrecadado,
        COALESCE(SUM(pa.valor_cota) FILTER (WHERE pa.status IN ('pendente','atrasado')),0) AS total_a_receber
      FROM grupos g
      LEFT JOIN participantes p ON p.grupo_id = g.id
      LEFT JOIN parcelas pa ON pa.grupo_id = g.id
      WHERE 1=1 ${whereGerente.replace('AND g.', 'AND g.')}
    `);

    const gruposRecentes = await pool.query(`
      SELECT g.id, g.nome, g.total_participantes, g.valor_premio, g.status,
        COUNT(DISTINCT p.id) AS participantes_atuais,
        COUNT(pa.id) FILTER (WHERE pa.status='atrasado') AS inadimplentes
      FROM grupos g
      LEFT JOIN participantes p ON p.grupo_id = g.id
      LEFT JOIN parcelas pa ON pa.grupo_id = g.id
      WHERE g.status='ativo' ${req.user.role === 'gerente' ? `AND g.gerente_id = ${req.user.id}` : ''}
      GROUP BY g.id ORDER BY g.created_at DESC LIMIT 5
    `);

    res.json({
      tipo: req.user.role,
      ...stats.rows[0],
      grupos_recentes: gruposRecentes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

module.exports = router;
