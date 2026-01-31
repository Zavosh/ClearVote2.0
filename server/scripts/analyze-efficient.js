#!/usr/bin/env node
/**
 * Efficient analysis using semantic pre-filtering
 * Only analyzes statement-bill pairs that are semantically related
 */

require('dotenv').config();
const db = require('../src/services/databaseService');
const semanticService = require('../src/services/semanticService');
const analysisService = require('../src/services/analysisService');

async function efficientAnalysis() {
  try {
    await db.connect();
    
    console.log('🚀 Starting efficient semantic analysis...\n');
    
    // Get all statements with semantic metadata
    const statements = await db.all(`
      SELECT * FROM statements 
      WHERE semantic_keywords IS NOT NULL AND semantic_keywords != ''
    `);
    
    console.log(`Found ${statements.length} enriched statements`);
    
    if (statements.length === 0) {
      console.log('⚠️  No enriched statements found. Run enrich-statements.js first!');
      process.exit(1);
    }
    
    // Get all bills and votes
    const bills = await db.all('SELECT * FROM bills');
    const votes = await db.all(`
      SELECT v.*, b.bill_number, b.title, b.summary, b.topics 
      FROM votes v 
      JOIN bills b ON v.bill_id = b.id
    `);
    
    console.log(`Found ${bills.length} bills and ${votes.length} votes\n`);
    
    let totalPairs = 0;
    let matched = 0;
    let analyzed = 0;
    let skipped = 0;
    
    // For each statement
    for (const statement of statements) {
      const legislatorVotes = votes.filter(v => v.legislator_id === statement.legislator_id);
      
      if (legislatorVotes.length === 0) {
        console.log(`⏭️  No votes for legislator ${statement.legislator_id}`);
        continue;
      }
      
      // Parse semantic metadata
      const statementMetadata = {
        policy_area: statement.policy_area,
        topics: JSON.parse(statement.topics || '[]'),
        keywords: JSON.parse(statement.semantic_keywords || '[]'),
        positions: JSON.parse(statement.key_positions || '[]')
      };
      
      console.log(`\n📄 Statement ${statement.id}: "${statement.content.substring(0, 80)}..."`);
      console.log(`   Policy: ${statementMetadata.policy_area}`);
      console.log(`   Topics: ${statementMetadata.topics.slice(0, 3).join(', ')}`);
      
      // Check each bill for semantic match
      for (const vote of legislatorVotes) {
        totalPairs++;
        
        const bill = bills.find(b => b.id === vote.bill_id);
        if (!bill) continue;
        
        // Check if already analyzed
        const existing = await db.get(`
          SELECT * FROM discrepancies 
          WHERE statement_id = ? AND vote_id = ?
        `, [statement.id, vote.id]);
        
        if (existing) {
          console.log(`   ⏭️  Already analyzed: ${bill.bill_number}`);
          continue;
        }
        
        // EFFICIENT: Use semantic matching to filter
        const matchResult = semanticService.matchesbill(statementMetadata, bill);
        
        if (!matchResult.matches) {
          console.log(`   ⊘  Skip ${bill.bill_number}: ${matchResult.reason}`);
          skipped++;
          continue;
        }
        
        console.log(`   ✓ Match ${bill.bill_number}: ${matchResult.reason} (confidence: ${matchResult.confidence})`);
        matched++;
        
        // Now do the expensive AI analysis
        try {
          console.log(`   🔍 Running AI analysis...`);
          
          const analysis = await analysisService.analyzePair(
            { ...statement, published_date: statement.published_date },
            { ...vote, vote_date: vote.vote_date },
            bill
          );
          
          // Skip if AI says not relevant
          if (!analysis) {
            console.log(`   ⏭️  AI: Not relevant`);
            continue;
          }
          
          // Save discrepancy
          await db.run(`
            INSERT INTO discrepancies 
            (legislator_id, statement_id, bill_id, vote_id, discrepancy_type, 
             confidence_score, explanation, statement_summary, vote_summary, requires_review)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            statement.legislator_id,
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
          
          const emoji = analysis.discrepancy_type === 'contradictory' ? '🔴' :
                       analysis.discrepancy_type === 'nuanced' ? '🟡' : '🟢';
          
          console.log(`   ${emoji} ${analysis.discrepancy_type.toUpperCase()} (score: ${analysis.confidence_score})`);
          analyzed++;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`   ❌ Error: ${error.message}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Efficient analysis complete!');
    console.log(`   Total pairs considered: ${totalPairs}`);
    console.log(`   Semantic matches: ${matched} (${Math.round(matched/totalPairs*100)}%)`);
    console.log(`   Skipped by filter: ${skipped} (${Math.round(skipped/totalPairs*100)}%)`);
    console.log(`   AI analyses run: ${analyzed}`);
    console.log(`   💰 API calls saved: ${totalPairs - analyzed} (~${Math.round((1-analyzed/totalPairs)*100)}% reduction)`);
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

efficientAnalysis();
