const express = require('express');
const router = express.Router();
const db = require('../services/databaseService');

// GET /api/discrepancies - List all discrepancies
router.get('/', async (req, res) => {
  try {
    const { type, min_confidence, legislator_id, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT d.*, 
             l.name as legislator_name, l.party, l.chamber,
             b.bill_number, b.title as bill_title,
             s.content as statement_content, s.source_url, s.source_name, 
             s.article_title, s.author, s.published_date, s.is_direct_quote,
             v.vote, v.vote_type, v.vote_date
      FROM discrepancies d
      JOIN legislators l ON d.legislator_id = l.id
      JOIN bills b ON d.bill_id = b.id
      JOIN statements s ON d.statement_id = s.id
      JOIN votes v ON d.vote_id = v.id
      WHERE 1=1
    `;
    const params = [];
    
    if (type) {
      sql += ' AND d.discrepancy_type = ?';
      params.push(type);
    }
    
    if (min_confidence) {
      sql += ' AND d.confidence_score >= ?';
      params.push(parseInt(min_confidence));
    }
    
    if (legislator_id) {
      sql += ' AND d.legislator_id = ?';
      params.push(legislator_id);
    }
    
    sql += ' ORDER BY d.confidence_score DESC, d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const discrepancies = await db.all(sql, params);
    res.json(discrepancies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/discrepancies/:id - Get single discrepancy
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const discrepancy = await db.get(`
      SELECT d.*,
             l.name as legislator_name, l.party, l.chamber, l.district,
             b.bill_number, b.title as bill_title, b.summary as bill_summary, b.full_text_url,
             s.content as statement_content, s.source_url, s.source_name, 
             s.article_title, s.author, s.published_date, s.is_direct_quote,
             v.vote, v.vote_type, v.vote_date
      FROM discrepancies d
      JOIN legislators l ON d.legislator_id = l.id
      JOIN bills b ON d.bill_id = b.id
      JOIN statements s ON d.statement_id = s.id
      JOIN votes v ON d.vote_id = v.id
      WHERE d.id = ?
    `, [id]);
    
    if (!discrepancy) {
      return res.status(404).json({ error: 'Discrepancy not found' });
    }
    
    res.json(discrepancy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/discrepancies/review/:id - Mark as reviewed
router.post('/review/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { verdict, notes } = req.body;
    
    await db.run(`
      UPDATE discrepancies
      SET reviewed = 1, review_verdict = ?, explanation = COALESCE(?, explanation)
      WHERE id = ?
    `, [verdict, notes, id]);
    
    res.json({ message: 'Discrepancy reviewed', id, verdict });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
