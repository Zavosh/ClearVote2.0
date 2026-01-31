const express = require('express');
const router = express.Router();
const db = require('../services/databaseService');
const analysisService = require('../services/analysisService');

// Smart matching based on topics
const topicMatches = {
  'ca-AB853': ['transparency', 'AI', 'artificial intelligence', 'accountability', 'consumer protection'],
  'ca-SB53': ['AI safety', 'artificial intelligence', 'safety', 'testing', 'secure'],
  'ca-SB1047': ['AI safety', 'artificial intelligence', 'safety', 'innovation', 'whistleblower'],
  'ca-AB2013': ['transparency', 'data', 'training data', 'privacy', 'disclosure'],
  'ca-AB2930': ['automated', 'employment', 'worker', 'labor', 'decision']
};

// POST /api/analyze/legislator/:id - Analyze all statements for a legislator
router.post('/legislator/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get legislator
    const legislator = await db.get('SELECT * FROM legislators WHERE id = ?', [id]);
    if (!legislator) {
      return res.status(404).json({ error: 'Legislator not found' });
    }
    
    // Get all statements and votes for this legislator
    const statements = await db.all('SELECT * FROM statements WHERE legislator_id = ?', [id]);
    const votes = await db.all('SELECT v.*, b.bill_number, b.title, b.summary, b.id as bill_id FROM votes v JOIN bills b ON v.bill_id = b.id WHERE v.legislator_id = ?', [id]);
    const bills = await db.all('SELECT * FROM bills');
    
    if (statements.length === 0 || votes.length === 0) {
      return res.json({ 
        message: 'No statements or votes to analyze', 
        analyzed: 0,
        legislator: legislator.name 
      });
    }
    
    const results = [];
    
    // For each statement, find matching votes
    for (const statement of statements) {
      for (const vote of votes) {
        // Check if already analyzed
        const existing = await db.get(`
          SELECT * FROM discrepancies 
          WHERE statement_id = ? AND vote_id = ?
        `, [statement.id, vote.id]);
        
        if (existing) continue;
        
        // Smart matching based on topic intersection
        const bill = bills.find(b => b.id === vote.bill_id);
        const billTopics = JSON.parse(bill.topics || '[]');
        const statementTopics = JSON.parse(statement.topics || '[]');
        const statementLower = statement.content.toLowerCase();
        
        let shouldAnalyze = false;

        // 1. Check if statement mentions bill number
        const mentionsBill = statementLower.includes(bill.bill_number.toLowerCase()) ||
                            statementLower.includes(bill.bill_number.replace('-', '').toLowerCase());
        
        if (mentionsBill) {
          shouldAnalyze = true;
        } else if (statementTopics.length > 0) {
          // 2. Strict Topic Intersection
          const hasCommonTopic = statementTopics.some(sTopic => 
            billTopics.some(bTopic => {
              const s = sTopic.toLowerCase();
              const b = bTopic.toLowerCase();
              return s === b || s.includes(b) || b.includes(s);
            })
          );
          if (hasCommonTopic) shouldAnalyze = true;
        } else {
          // 3. Fallback: Content keyword matching
          const topicKeywords = topicMatches[bill.id] || billTopics.map(t => t.toLowerCase());
          const mentionsTopic = topicKeywords.some(keyword => statementLower.includes(keyword.toLowerCase()));
          if (mentionsTopic) shouldAnalyze = true;
        }
        
        // Analyze if there's a potential match
        if (shouldAnalyze) {
          try {
            const analysis = await analysisService.analyzePair(
              { ...statement, published_date: statement.published_date },
              { ...vote, vote_date: vote.vote_date },
              bill
            );
            
            // Skip if analysis returned null (not relevant)
            if (!analysis) {
              console.log(`Skipped: Statement not relevant to ${bill.bill_number}`);
              continue;
            }
            
            // Save discrepancy
            const result = await db.run(`
              INSERT INTO discrepancies 
              (legislator_id, statement_id, bill_id, vote_id, discrepancy_type, 
               confidence_score, explanation, statement_summary, vote_summary, requires_review)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              id,
              statement.id,
              bill.id,
              vote.id,
              analysis.discrepancy_type,
              analysis.confidence_score,
              analysis.explanation,
              analysis.statement_summary,
              analysis.vote_summary,
              analysis.requires_review
            ]);
            
            results.push({
              discrepancy_id: result.id,
              type: analysis.discrepancy_type,
              confidence: analysis.confidence_score
            });
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (err) {
            console.error('Analysis error:', err.message);
          }
        }
      }
    }
    
    res.json({
      message: `Analyzed ${results.length} statement-vote pairs`,
      legislator: legislator.name,
      analyzed: results.length,
      results
    });
  } catch (error) {
    console.error('Error in analyze:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analyze/all - Run full analysis
router.post('/all', async (req, res) => {
  try {
    // Get all legislators
    const legislators = await db.all('SELECT * FROM legislators');
    
    const allResults = [];
    for (const legislator of legislators) {
      try {
        // Get statements for this legislator
        const statements = await db.all(`
          SELECT s.*, b.id as bill_id
          FROM statements s
          JOIN bills b ON s.content LIKE '%' || b.bill_number || '%'
          WHERE s.legislator_id = ?
        `, [legislator.id]);
        
        for (const statement of statements) {
          const vote = await db.get(`
            SELECT * FROM votes 
            WHERE legislator_id = ? AND bill_id = ?
          `, [legislator.id, statement.bill_id]);
          
          if (!vote) continue;
          
          // Check if already analyzed
          const existing = await db.get(`
            SELECT * FROM discrepancies 
            WHERE statement_id = ? AND bill_id = ?
          `, [statement.id, statement.bill_id]);
          
          if (existing) continue;
          
          // Analyze
          const bill = await db.get('SELECT * FROM bills WHERE id = ?', [statement.bill_id]);
          const analysis = await analysisService.analyzePair(statement, vote, bill);
          
          // Skip if not relevant
          if (!analysis) {
            console.log(`Skipped: Statement not relevant to ${bill.bill_number}`);
            continue;
          }
          
          await db.run(`
            INSERT INTO discrepancies 
            (legislator_id, statement_id, bill_id, vote_id, discrepancy_type, 
             confidence_score, explanation, statement_summary, vote_summary, requires_review)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            legislator.id, statement.id, statement.bill_id, vote.id,
            analysis.discrepancy_type, analysis.confidence_score, analysis.explanation,
            analysis.statement_summary, analysis.vote_summary, analysis.requires_review
          ]);
          
          allResults.push({
            legislator: legislator.name,
            type: analysis.discrepancy_type,
            confidence: analysis.confidence_score
          });
        }
      } catch (err) {
        console.error('Error analyzing legislator', legislator.id, err.message);
      }
    }
    
    res.json({
      message: `Full analysis complete`,
      total_analyzed: allResults.length,
      results: allResults
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
