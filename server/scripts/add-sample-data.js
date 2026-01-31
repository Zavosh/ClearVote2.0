#!/usr/bin/env node
/**
 * Add sample data for demonstration
 * This creates sample votes and statements for testing the UI
 */

require('dotenv').config();
const db = require('../src/services/databaseService');

const sampleData = {
  votes: [
    // AB-853 votes
    { legislator_id: 'ca-wiener', bill_id: 'ca-AB853', vote: 'yes', vote_type: 'passage' },
    { legislator_id: 'ca-wicks', bill_id: 'ca-AB853', vote: 'yes', vote_type: 'passage' },
    { legislator_id: 'ca-bauer-kahan', bill_id: 'ca-AB853', vote: 'yes', vote_type: 'passage' },
    { legislator_id: 'ca-low', bill_id: 'ca-AB853', vote: 'yes', vote_type: 'passage' },
    { legislator_id: 'ca-becker', bill_id: 'ca-AB853', vote: 'yes', vote_type: 'passage' },
    { legislator_id: 'ca-essayli', bill_id: 'ca-AB853', vote: 'no', vote_type: 'passage' },
    { legislator_id: 'ca-gallagher', bill_id: 'ca-AB853', vote: 'no', vote_type: 'passage' },
    { legislator_id: 'ca-dahle', bill_id: 'ca-AB853', vote: 'no', vote_type: 'passage' },
    { legislator_id: 'ca-wahab', bill_id: 'ca-AB853', vote: 'yes', vote_type: 'passage' },
    { legislator_id: 'ca-kalra', bill_id: 'ca-AB853', vote: 'yes', vote_type: 'passage' },
    
    // SB-53 votes
    { legislator_id: 'ca-wiener', bill_id: 'ca-SB53', vote: 'yes', vote_type: 'passage' },
    { legislator_id: 'ca-becker', bill_id: 'ca-SB53', vote: 'yes', vote_type: 'passage' },
    { legislator_id: 'ca-dahle', bill_id: 'ca-SB53', vote: 'no', vote_type: 'passage' },
    { legislator_id: 'ca-wahab', bill_id: 'ca-SB53', vote: 'yes', vote_type: 'passage' },
    
    // SB-1047 votes (vetoed bill)
    { legislator_id: 'ca-wiener', bill_id: 'ca-SB1047', vote: 'yes', vote_type: 'passage' },
    { legislator_id: 'ca-becker', bill_id: 'ca-SB1047', vote: 'yes', vote_type: 'passage' },
    { legislator_id: 'ca-dahle', bill_id: 'ca-SB1047', vote: 'no', vote_type: 'passage' },
    { legislator_id: 'ca-essayli', bill_id: 'ca-SB1047', vote: 'no', vote_type: 'passage' },
  ],
  
  statements: [
    {
      legislator_id: 'ca-wiener',
      content: 'I am committed to ensuring AI safety and transparency. We need strong regulations to protect Californians from the risks of unregulated artificial intelligence. AB-853 is a crucial step toward that goal.',
      source_url: 'https://example.com/wiener-statement',
      source_name: 'Sample News Source',
      published_date: '2024-01-15',
      topics: JSON.stringify(['AI', 'Safety', 'Transparency'])
    },
    {
      legislator_id: 'ca-essayli',
      content: 'I believe in protecting innovation and opposing burdensome regulations on the tech industry. California should be a place where AI companies can thrive without excessive government interference.',
      source_url: 'https://example.com/essayli-statement',
      source_name: 'Sample News Source',
      published_date: '2024-01-20',
      topics: JSON.stringify(['AI', 'Innovation', 'Business'])
    },
    {
      legislator_id: 'ca-wicks',
      content: 'As the author of AB-853, I strongly support AI transparency. The public deserves to know when they are interacting with AI systems and what data was used to train them.',
      source_url: 'https://example.com/wicks-statement',
      source_name: 'Sample News Source',
      published_date: '2024-02-01',
      topics: JSON.stringify(['AI', 'Transparency', 'Consumer Protection'])
    },
    {
      legislator_id: 'ca-dahle',
      content: 'We need to be careful about AI regulation. While safety is important, we cannot stifle innovation in California. I support a balanced approach that protects both consumers and businesses.',
      source_url: 'https://example.com/dahle-statement',
      source_name: 'Sample News Source',
      published_date: '2024-02-10',
      topics: JSON.stringify(['AI', 'Innovation', 'Balance'])
    },
    {
      legislator_id: 'ca-becker',
      content: 'AI safety is a bipartisan issue. We all want California to lead in responsible AI development. SB-53 provides the framework we need for safe and secure AI innovation.',
      source_url: 'https://example.com/becker-statement',
      source_name: 'Sample News Source',
      published_date: '2024-02-15',
      topics: JSON.stringify(['AI', 'Safety', 'Bipartisan'])
    },
    {
      legislator_id: 'ca-gallagher',
      content: 'I oppose heavy-handed AI regulations that will drive tech companies out of California. We need to support our tech industry, not burden it with more red tape.',
      source_url: 'https://example.com/gallagher-statement',
      source_name: 'Sample News Source',
      published_date: '2024-02-20',
      topics: JSON.stringify(['AI', 'Business', 'Opposition'])
    },
    {
      legislator_id: 'ca-wahab',
      content: 'Workers need protection from automated decision-making tools. AB-2930 would ensure human oversight in important employment decisions. I strongly support this worker protection bill.',
      source_url: 'https://example.com/wahab-statement',
      source_name: 'Sample News Source',
      published_date: '2024-03-01',
      topics: JSON.stringify(['Labor', 'AI', 'Worker Protection'])
    },
    {
      legislator_id: 'ca-bauer-kahan',
      content: 'Data privacy is fundamental. AB-2013 requires AI companies to disclose their training data sources, giving consumers the transparency they deserve about how AI systems are built.',
      source_url: 'https://example.com/bauer-kahan-statement',
      source_name: 'Sample News Source',
      published_date: '2024-03-05',
      topics: JSON.stringify(['AI', 'Privacy', 'Transparency'])
    }
  ]
};

async function addSampleData() {
  try {
    await db.connect();
    
    console.log('Adding sample votes...');
    for (const vote of sampleData.votes) {
      try {
        await db.run(`
          INSERT OR IGNORE INTO votes (legislator_id, bill_id, vote, vote_type, vote_date)
          VALUES (?, ?, ?, ?, date('now'))
        `, [vote.legislator_id, vote.bill_id, vote.vote, vote.vote_type]);
        console.log(`  ✓ Vote: ${vote.legislator_id} on ${vote.bill_id}`);
      } catch (err) {
        console.log(`  ⚠ Skipped: ${vote.legislator_id} on ${vote.bill_id}`);
      }
    }
    
    console.log('\nAdding sample statements...');
    for (const statement of sampleData.statements) {
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
        console.log(`  ✓ Statement from ${statement.legislator_id}`);
      } catch (err) {
        console.log(`  ⚠ Error: ${err.message}`);
      }
    }
    
    // Show summary
    const voteCount = await db.get('SELECT COUNT(*) as count FROM votes');
    const statementCount = await db.get('SELECT COUNT(*) as count FROM statements');
    
    console.log('\n✅ Sample data added!');
    console.log(`   ${voteCount.count} votes`);
    console.log(`   ${statementCount.count} statements`);
    
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

addSampleData();
