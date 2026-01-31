#!/usr/bin/env node
/**
 * Add explicit contradiction examples for demo
 */

require('dotenv').config();
const db = require('../src/services/databaseService');

const contradictionStatements = [
  // Bill Essayli - says he supports transparency but voted NO on AB-853 (AI Transparency)
  {
    legislator_id: 'ca-essayli',
    content: 'I strongly support transparency in government and believe the public has a right to know how AI systems work. We need more accountability, not less. I will always vote for measures that increase transparency and protect consumers.',
    source_url: 'https://example.com/essayli-transparency',
    source_name: 'Campaign Statement',
    published_date: '2024-03-01',
    topics: JSON.stringify(['Transparency', 'AI', 'Government'])
  },
  
  // Brian Dahle - says he supports AI safety but voted NO on SB-53 (AI Safety Act)
  {
    legislator_id: 'ca-dahle',
    content: 'California needs to lead on AI safety. We must ensure that large AI systems are tested and safe before deployment. Public safety should be our top priority when it comes to new technology.',
    source_url: 'https://example.com/dahle-ai-safety',
    source_name: 'Press Release',
    published_date: '2024-02-15',
    topics: JSON.stringify(['AI', 'Safety', 'Technology'])
  },
  
  // James Gallagher - says he opposes regulation but then supports some
  {
    legislator_id: 'ca-gallagher',
    content: 'I consistently oppose burdensome government regulations on businesses. We need to let the free market work and reduce red tape, especially for our tech industry.',
    source_url: 'https://example.com/gallagher-regulation',
    source_name: 'Interview',
    published_date: '2024-01-20',
    topics: JSON.stringify(['Business', 'Regulation', 'Tech'])
  },
  
  // Add more votes for better coverage
];

const additionalVotes = [
  // More votes on SB-53
  { legislator_id: 'ca-wicks', bill_id: 'ca-SB53', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-bauer-kahan', bill_id: 'ca-SB53', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-low', bill_id: 'ca-SB53', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-wahab', bill_id: 'ca-SB53', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-kalra', bill_id: 'ca-SB53', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-gallagher', bill_id: 'ca-SB53', vote: 'no', vote_type: 'passage' },
  { legislator_id: 'ca-essayli', bill_id: 'ca-SB53', vote: 'no', vote_type: 'passage' },
  
  // Votes on SB-1047 (vetoed bill)
  { legislator_id: 'ca-wicks', bill_id: 'ca-SB1047', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-bauer-kahan', bill_id: 'ca-SB1047', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-low', bill_id: 'ca-SB1047', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-wahab', bill_id: 'ca-SB1047', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-kalra', bill_id: 'ca-SB1047', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-gallagher', bill_id: 'ca-SB1047', vote: 'no', vote_type: 'passage' },
  
  // Votes on AB-2013
  { legislator_id: 'ca-wiener', bill_id: 'ca-AB2013', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-wicks', bill_id: 'ca-AB2013', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-bauer-kahan', bill_id: 'ca-AB2013', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-low', bill_id: 'ca-AB2013', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-becker', bill_id: 'ca-AB2013', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-wahab', bill_id: 'ca-AB2013', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-kalra', bill_id: 'ca-AB2013', vote: 'yes', vote_type: 'passage' },
  { legislator_id: 'ca-essayli', bill_id: 'ca-AB2013', vote: 'no', vote_type: 'passage' },
  { legislator_id: 'ca-gallagher', bill_id: 'ca-AB2013', vote: 'no', vote_type: 'passage' },
  { legislator_id: 'ca-dahle', bill_id: 'ca-AB2013', vote: 'no', vote_type: 'passage' },
];

async function addContradictionData() {
  try {
    await db.connect();
    
    console.log('Adding contradiction statements...');
    for (const statement of contradictionStatements) {
      try {
        await db.run(`
          INSERT INTO statements (legislator_id, content, source_url, source_name, published_date, topics)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          statement.legislator_id,
          statement.content,
          statement.source_url,
          statement.source_name,
          statement.published_date,
          statement.topics
        ]);
        console.log(`  ✓ Contradiction statement for ${statement.legislator_id}`);
      } catch (err) {
        console.log(`  ⚠ Error: ${err.message}`);
      }
    }
    
    console.log('\nAdding additional votes...');
    for (const vote of additionalVotes) {
      try {
        await db.run(`
          INSERT OR IGNORE INTO votes (legislator_id, bill_id, vote, vote_type, vote_date)
          VALUES (?, ?, ?, ?, date('now'))
        `, [vote.legislator_id, vote.bill_id, vote.vote, vote.vote_type]);
        console.log(`  ✓ Vote: ${vote.legislator_id} on ${vote.bill_id} = ${vote.vote}`);
      } catch (err) {
        console.log(`  ⚠ Error: ${err.message}`);
      }
    }
    
    // Show summary
    const statementCount = await db.get('SELECT COUNT(*) as count FROM statements');
    const voteCount = await db.get('SELECT COUNT(*) as count FROM votes');
    
    console.log('\n✅ Contradiction data added!');
    console.log(`   ${statementCount.count} total statements`);
    console.log(`   ${voteCount.count} total votes`);
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

addContradictionData();
