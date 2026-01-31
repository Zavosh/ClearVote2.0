#!/usr/bin/env node
/**
 * Run AI analysis on all statement-vote pairs
 */

require('dotenv').config();
const db = require('../src/services/databaseService');
const analysisService = require('../src/services/analysisService');

async function analyzeAll() {
  try {
    await db.connect();
    
    console.log('Running AI analysis on statement-vote pairs...\n');
    
    // Get all statement-vote pairs that haven't been analyzed
    const pairs = await db.all(`
      SELECT 
        s.id as statement_id,
        s.legislator_id,
        s.content as statement_content,
        s.published_date,
        v.id as vote_id,
        v.vote,
        v.vote_type,
        v.vote_date,
        b.id as bill_id,
        b.bill_number,
        b.title,
        b.summary
      FROM statements s
      JOIN votes v ON s.legislator_id = v.legislator_id
      JOIN bills b ON v.bill_id = b.id
      WHERE s.content LIKE '%' || b.bill_number || '%'
        OR s.content LIKE '%' || REPLACE(b.bill_number, '-', '') || '%'
        OR s.content LIKE '%' || REPLACE(b.bill_number, '-', ' ') || '%'
      AND NOT EXISTS (
        SELECT 1 FROM discrepancies d 
        WHERE d.statement_id = s.id AND d.bill_id = b.id
      )
    `);
    
    console.log(`Found ${pairs.length} pairs to analyze\n`);
    
    let analyzed = 0;
    let contradictory = 0;
    let nuanced = 0;
    let consistent = 0;
    
    for (const pair of pairs) {
      try {
        console.log(`Analyzing: ${pair.bill_number} for legislator ${pair.legislator_id}`);
        
        const statement = {
          id: pair.statement_id,
          content: pair.statement_content,
          published_date: pair.published_date
        };
        
        const vote = {
          id: pair.vote_id,
          vote: pair.vote,
          vote_type: pair.vote_type,
          vote_date: pair.vote_date
        };
        
        const bill = {
          id: pair.bill_id,
          bill_number: pair.bill_number,
          title: pair.title,
          summary: pair.summary
        };
        
        const analysis = await analysisService.analyzePair(statement, vote, bill);
        
        // Save discrepancy
        await db.run(`
          INSERT INTO discrepancies 
          (legislator_id, statement_id, bill_id, vote_id, discrepancy_type, 
           confidence_score, explanation, statement_summary, vote_summary, requires_review)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          pair.legislator_id,
          pair.statement_id,
          pair.bill_id,
          pair.vote_id,
          analysis.discrepancy_type,
          analysis.confidence_score,
          analysis.explanation,
          analysis.statement_summary,
          analysis.vote_summary,
          analysis.requires_review
        ]);
        
        analyzed++;
        
        if (analysis.discrepancy_type === 'contradictory') contradictory++;
        else if (analysis.discrepancy_type === 'nuanced') nuanced++;
        else consistent++;
        
        console.log(`  ✓ ${analysis.discrepancy_type} (confidence: ${analysis.confidence_score})`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`  ✗ Error: ${error.message}`);
      }
    }
    
    console.log('\n✅ Analysis complete!');
    console.log(`   Total analyzed: ${analyzed}`);
    console.log(`   Contradictory: ${contradictory}`);
    console.log(`   Nuanced: ${nuanced}`);
    console.log(`   Consistent: ${consistent}`);
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

analyzeAll();
