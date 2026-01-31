const express = require('express');
const router = express.Router();
const db = require('../services/databaseService');
const newsService = require('../services/newsService');

// GET /api/statements - List all statements
router.get('/', async (req, res) => {
  try {
    const { legislator_id, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT s.*, l.name as legislator_name
      FROM statements s
      JOIN legislators l ON s.legislator_id = l.id
      WHERE 1=1
    `;
    const params = [];
    
    if (legislator_id) {
      sql += ' AND s.legislator_id = ?';
      params.push(legislator_id);
    }
    
    sql += ' ORDER BY s.is_direct_quote DESC, s.published_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const statements = await db.all(sql, params);
    res.json(statements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/statements/fetch/:legislatorId - Fetch news for a legislator
router.post('/fetch/:legislatorId', async (req, res) => {
  try {
    const { legislatorId } = req.params;
    
    // Get legislator info
    const legislator = await db.get('SELECT * FROM legislators WHERE id = ?', [legislatorId]);
    if (!legislator) {
      return res.status(404).json({ error: 'Legislator not found' });
    }
    
    // Fetch news
    const articles = await newsService.searchForLegislator(legislator.name);
    
    // Process articles and extract statements (with quote detection)
    const processedStatements = newsService.processArticlesForStatements(articles, legislator.name);
    
    // Save statements
    const savedStatements = [];
    for (const statement of processedStatements) {
      try {
        await db.run(`
          INSERT INTO statements (legislator_id, content, source_url, source_name, article_title, author, published_date, topics, source_type, is_direct_quote)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          legislatorId,
          statement.content,
          statement.source_url,
          statement.source_name,
          statement.article_title,
          statement.author,
          statement.published_date,
          JSON.stringify(statement.topics || []),
          statement.source_type || 'news',
          statement.is_direct_quote ? 1 : 0
        ]);
        savedStatements.push(statement);
      } catch (err) {
        // Duplicate or error, skip
        console.log('Skipping duplicate or error:', err.message);
      }
    }
    
    res.json({
      message: `Fetched ${savedStatements.length} statements for ${legislator.name}`,
      count: savedStatements.length,
      directQuotes: savedStatements.filter(s => s.is_direct_quote).length,
      statements: savedStatements
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/statements - Manually add a statement
router.post('/', async (req, res) => {
  try {
    const { legislator_id, content, source_url, source_name, published_date, topics } = req.body;
    
    const result = await db.run(`
      INSERT INTO statements (legislator_id, content, source_url, source_name, published_date, topics)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [legislator_id, content, source_url, source_name, published_date, JSON.stringify(topics || [])]);
    
    res.status(201).json({
      id: result.id,
      message: 'Statement added'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
