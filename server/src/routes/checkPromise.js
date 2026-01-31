const express = require('express');
const router = express.Router();
const db = require('../services/databaseService');
const analysisService = require('../services/analysisService');

// POST /api/check-promise - Check a campaign promise against voting record
router.post('/', async (req, res) => {
  try {
    const { legislator_id, promise, bill_id } = req.body;

    if (!legislator_id || !promise || !bill_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: legislator_id, promise, bill_id' 
      });
    }

    // Get legislator info
    const legislator = await db.get(
      'SELECT * FROM legislators WHERE id = ?', 
      [legislator_id]
    );

    if (!legislator) {
      return res.status(404).json({ error: 'Legislator not found' });
    }

    // Get bill info
    const bill = await db.get(
      'SELECT * FROM bills WHERE id = ?', 
      [bill_id]
    );

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Get the vote
    const vote = await db.get(
      'SELECT * FROM votes WHERE legislator_id = ? AND bill_id = ?',
      [legislator_id, bill_id]
    );

    if (!vote) {
      return res.status(404).json({ 
        error: 'No voting record found for this legislator and bill' 
      });
    }

    // Create a statement object from the promise
    const statement = {
      id: 'manual-' + Date.now(),
      content: promise,
      published_date: new Date().toISOString().split('T')[0],
      source_name: 'User Input'
    };

    // Run AI analysis
    const analysis = await analysisService.analyzePair(statement, vote, bill);

    res.json({
      legislator: {
        id: legislator.id,
        name: legislator.name,
        party: legislator.party,
        chamber: legislator.chamber,
        district: legislator.district
      },
      bill: {
        id: bill.id,
        bill_number: bill.bill_number,
        title: bill.title,
        summary: bill.summary
      },
      vote: {
        id: vote.id,
        vote: vote.vote,
        vote_type: vote.vote_type,
        vote_date: vote.vote_date
      },
      analysis: {
        discrepancy_type: analysis.discrepancy_type,
        confidence_score: analysis.confidence_score,
        explanation: analysis.explanation,
        statement_summary: analysis.statement_summary,
        vote_summary: analysis.vote_summary,
        requires_review: analysis.requires_review
      }
    });

  } catch (error) {
    console.error('Error checking promise:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
