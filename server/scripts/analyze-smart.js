#!/usr/bin/env node
/**
 * Run AI analysis with smart topic-based matching
 */

require('dotenv').config();
const db = require('../src/services/databaseService');
const analysisService = require('../src/services/analysisService');

// Define which statements should match which bills based on topics
const topicMatches = {
  'ca-AB853': ['transparency', 'AI', 'artificial intelligence', 'accountability', 'consumer protection'],
  'ca-SB53': ['AI safety', 'artificial intelligence', 'safety', 'testing', 'secure'],
  'ca-SB1047': ['AI safety', 'artificial intelligence', 'safety', 'innovation', 'whistleblower'],
  'ca-AB2013': ['transparency', 'data', 'training data', 'privacy', 'disclosure'],
  'ca-AB2930': ['automated', 'employment', 'worker', 'labor', 'decision']
};

async function analyzeSmart() {
  try {
    await db.connect();
    
    console.log('Running smart AI analysis on statement-vote pairs...\n');
    
    // Get all statements and votes
    const statements = await db.all('SELECT * FROM statements');
    const votes = await db.all('SELECT v.*, b.bill_number, b.title, b.summary, b.id as bill_id FROM votes v JOIN bills b ON v.bill_id = b.id');
    const bills = await db.all('SELECT * FROM bills');
    
    console.log(`Found ${statements.length} statements and ${votes.length} votes\n`);
    
    let analyzed = 0;
    let contradictory = 0;
    let nuanced = 0;
    let consistent = 0;
    
    // For each legislator, find their statements and votes
    const legislators = [...new Set(statements.map(s => s.legislator_id))];
    
    for (const legislatorId of legislators) {
      const legislatorStatements = statements.filter(s => s.legislator_id === legislatorId);
      const legislatorVotes = votes.filter(v => v.legislator_id === legislatorId);
      
      for (const statement of legislatorStatements) {
        for (const vote of legislatorVotes) {
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
          let matchReason = '';

          // 1. Check if statement mentions bill number (Highest priority)
          const mentionsBill = statementLower.includes(bill.bill_number.toLowerCase()) ||
                              statementLower.includes(bill.bill_number.replace('-', '').toLowerCase());
          
          if (mentionsBill) {
            shouldAnalyze = true;
            matchReason = 'bill#';
          } else if (statementTopics.length > 0) {
            // 2. Strict Topic Intersection (if statement has topics)
            const hasCommonTopic = statementTopics.some(sTopic => 
              billTopics.some(bTopic => {
                const s = sTopic.toLowerCase();
                const b = bTopic.toLowerCase();
                return s === b || s.includes(b) || b.includes(s);
              })
            );
            
            if (hasCommonTopic) {
              shouldAnalyze = true;
              matchReason = 'topic';
            }
          } else {
            // 3. Fallback: Content keyword matching (only if statement has NO topics)
            const topicKeywords = topicMatches[bill.id] || billTopics.map(t => t.toLowerCase());
            const mentionsTopic = topicKeywords.some(keyword => statementLower.includes(keyword.toLowerCase()));
            
            if (mentionsTopic) {
              shouldAnalyze = true;
              matchReason = 'keyword';
            }
          }
          
          // Analyze if there's a potential match
          if (shouldAnalyze) {
            try {
              console.log(`Analyzing: ${bill.bill_number} for ${legislatorId} (match: ${matchReason})`);
              
              const analysis = await analysisService.analyzePair(
                { ...statement, published_date: statement.published_date },
                { ...vote, vote_date: vote.vote_date },
                bill
              );
              
              // Skip if not relevant
              if (!analysis) {
                console.log(`  ⏭️  SKIPPED - Not relevant to ${bill.bill_number}`);
                continue;
              }
              
              // Save discrepancy
              await db.run(`
                INSERT INTO discrepancies 
                (legislator_id, statement_id, bill_id, vote_id, discrepancy_type, 
                 confidence_score, explanation, statement_summary, vote_summary, requires_review)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                legislatorId,
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
              
              analyzed++;
              
              if (analysis.discrepancy_type === 'contradictory') {
                contradictory++;
                console.log(`  🔴 CONTRADICTORY (confidence: ${analysis.confidence_score})`);
              } else if (analysis.discrepancy_type === 'nuanced') {
                nuanced++;
                console.log(`  🟡 NUANCED (confidence: ${analysis.confidence_score})`);
              } else {
                consistent++;
                console.log(`  🟢 CONSISTENT (confidence: ${analysis.confidence_score})`);
              }

              if (analyzed >= 10) {
                console.log('\nReached limit of 10 analyses for quick preview.');
                break;
              }
              
              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 300));
              
            } catch (error) {
              console.error(`  ✗ Error: ${error.message}`);
            }
          }
        }
        if (analyzed >= 10) break;
      }
      if (analyzed >= 10) break;
    }
    
    console.log('\n✅ Smart analysis complete!');
    console.log(`   Total analyzed: ${analyzed}`);
    console.log(`   🔴 Contradictory: ${contradictory}`);
    console.log(`   🟡 Nuanced: ${nuanced}`);
    console.log(`   🟢 Consistent: ${consistent}`);
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

analyzeSmart();
