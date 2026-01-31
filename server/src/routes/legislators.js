const express = require('express');
const router = express.Router();
const db = require('../services/databaseService');

// GET /api/legislators - List all legislators
router.get('/', async (req, res) => {
  try {
    const { chamber, party, district, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT l.*,
        COUNT(DISTINCT d.id) as discrepancy_count,
        COUNT(DISTINCT s.id) as statement_count,
        SUM(CASE WHEN d.discrepancy_type = 'contradictory' THEN 1 ELSE 0 END) as contradictory_count,
        SUM(CASE WHEN d.discrepancy_type = 'nuanced' THEN 1 ELSE 0 END) as nuanced_count
      FROM legislators l
      LEFT JOIN discrepancies d ON l.id = d.legislator_id
      LEFT JOIN statements s ON l.id = s.legislator_id
      WHERE 1=1
    `;
    const params = [];
    
    if (chamber) {
      sql += ' AND l.chamber = ?';
      params.push(chamber);
    }
    
    if (party) {
      sql += ' AND l.party = ?';
      params.push(party);
    }
    
    if (district) {
      sql += ' AND l.district = ?';
      params.push(district);
    }
    
    sql += ' GROUP BY l.id ORDER BY l.name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const legislators = await db.all(sql, params);
    res.json(legislators);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/legislators/:id - Get single legislator with votes and discrepancies
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get legislator
    const legislator = await db.get('SELECT * FROM legislators WHERE id = ?', [id]);
    
    if (!legislator) {
      return res.status(404).json({ error: 'Legislator not found' });
    }
    
    // Get voting history
    const votes = await db.all(`
      SELECT v.*, b.bill_number, b.title, b.summary
      FROM votes v
      JOIN bills b ON v.bill_id = b.id
      WHERE v.legislator_id = ?
      ORDER BY v.vote_date DESC
    `, [id]);
    
    // Get all statements with their analysis status
    const statements = await db.all(`
      SELECT 
        s.*,
        d.id as discrepancy_id,
        d.discrepancy_type,
        d.confidence_score,
        d.explanation as analysis_explanation,
        d.bill_id,
        d.vote_summary,
        d.statement_summary,
        d.vote_id,
        b.bill_number,
        b.title as bill_title,
        v.vote,
        v.vote_type,
        v.vote_date
      FROM statements s
      LEFT JOIN discrepancies d ON s.id = d.statement_id
      LEFT JOIN bills b ON d.bill_id = b.id
      LEFT JOIN votes v ON d.vote_id = v.id
      WHERE s.legislator_id = ?
      ORDER BY s.published_date DESC
    `, [id]);
    
    // Get discrepancies
    const discrepancies = await db.all(`
      SELECT d.*, 
        s.content as statement_content, 
        s.source_url, 
        s.source_name, 
        s.published_date,
        b.bill_number, 
        b.title,
        v.vote,
        v.vote_type,
        v.vote_date
      FROM discrepancies d
      JOIN statements s ON d.statement_id = s.id
      JOIN bills b ON d.bill_id = b.id
      JOIN votes v ON d.vote_id = v.id
      WHERE d.legislator_id = ?
      ORDER BY d.created_at DESC
    `, [id]);
    
    // Get statement count
    const stats = await db.get(`
      SELECT 
        COUNT(DISTINCT s.id) as statement_count,
        COUNT(DISTINCT d.id) as discrepancy_count,
        SUM(CASE WHEN d.discrepancy_type = 'contradictory' THEN 1 ELSE 0 END) as contradictory_count
      FROM legislators l
      LEFT JOIN statements s ON l.id = s.legislator_id
      LEFT JOIN discrepancies d ON l.id = d.legislator_id
      WHERE l.id = ?
    `, [id]);
    
    res.json({
      ...legislator,
      statements,
      votes,
      discrepancies,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/legislators - Create new legislator
router.post('/', async (req, res) => {
  try {
    const { id, name, party, chamber, district, photo_url, twitter_handle, email } = req.body;
    
    await db.run(`
      INSERT INTO legislators (id, name, party, chamber, district, photo_url, twitter_handle, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, name, party, chamber, district, photo_url, twitter_handle, email]);
    
    res.status(201).json({ id, name, message: 'Legislator created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
