const express = require('express');
const router = express.Router();
const db = require('../services/databaseService');

// GET /api/bills - List all bills
router.get('/', async (req, res) => {
  try {
    const { status, session, limit = 50, offset = 0 } = req.query;
    
    let sql = 'SELECT * FROM bills WHERE 1=1';
    const params = [];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    if (session) {
      sql += ' AND session = ?';
      params.push(session);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const bills = await db.all(sql, params);
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bills/:id - Get single bill with all votes
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get bill
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [id]);
    
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    // Get all votes
    const votes = await db.all(`
      SELECT v.*, l.name as legislator_name, l.party, l.chamber
      FROM votes v
      JOIN legislators l ON v.legislator_id = l.id
      WHERE v.bill_id = ?
      ORDER BY l.chamber, l.name
    `, [id]);
    
    // Get vote counts
    const voteCounts = await db.all(`
      SELECT vote, COUNT(*) as count
      FROM votes
      WHERE bill_id = ?
      GROUP BY vote
    `, [id]);
    
    // Get related discrepancies
    const discrepancies = await db.all(`
      SELECT d.*, l.name as legislator_name, s.content as statement_content
      FROM discrepancies d
      JOIN legislators l ON d.legislator_id = l.id
      JOIN statements s ON d.statement_id = s.id
      WHERE d.bill_id = ?
      ORDER BY d.confidence_score DESC
    `, [id]);
    
    res.json({
      ...bill,
      votes,
      vote_counts: voteCounts.reduce((acc, curr) => {
        acc[curr.vote] = curr.count;
        return acc;
      }, {}),
      discrepancies
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bills - Create new bill
router.post('/', async (req, res) => {
  try {
    const { id, bill_number, title, summary, session, status, topics, full_text_url } = req.body;
    
    await db.run(`
      INSERT INTO bills (id, bill_number, title, summary, session, status, topics, full_text_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, bill_number, title, summary, session, status, JSON.stringify(topics || []), full_text_url]);
    
    res.status(201).json({ id, bill_number, message: 'Bill created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
