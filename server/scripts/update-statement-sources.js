/**
 * Script to update existing statements with scraped metadata
 * Run this to backfill article_title, author, and other fields
 * from the actual source URLs
 * 
 * Usage: node scripts/update-statement-sources.js
 */

require('dotenv').config();
const db = require('../src/services/databaseService');
const newsService = require('../src/services/newsService');

async function updateStatementSources() {
  // Initialize database connection
  await db.connect();
  
  console.log('=== Updating Statement Sources ===\n');
  
  // Get all statements that have real URLs (not Google News) but missing metadata
  const statements = await db.all(`
    SELECT id, legislator_id, content, source_url, source_name, article_title, author
    FROM statements 
    WHERE source_url IS NOT NULL 
      AND source_url NOT LIKE '%example.com%'
      AND source_url NOT LIKE '%news.google.com%'
      AND source_url LIKE 'http%'
      AND (article_title IS NULL OR article_title = 'Google News')
    ORDER BY id ASC
    LIMIT 30
  `);
  
  console.log(`Found ${statements.length} statements to update\n`);
  
  if (statements.length === 0) {
    console.log('No statements need updating.');
    return;
  }
  
  let updated = 0;
  let failed = 0;
  
  for (const stmt of statements) {
    console.log(`\n[${stmt.id}] Scraping: ${stmt.source_url.substring(0, 70)}...`);
    
    try {
      const scraped = await newsService.scrapeArticle(stmt.source_url);
      
      if (scraped.success || scraped.title) {
        await db.run(`
          UPDATE statements 
          SET article_title = COALESCE(?, article_title),
              author = COALESCE(?, author),
              source_type = 'scraped'
          WHERE id = ?
        `, [scraped.title, scraped.author, stmt.id]);
        
        console.log(`  -> Updated: title="${(scraped.title || 'N/A').substring(0, 50)}", author="${scraped.author || 'N/A'}"`);
        updated++;
      } else {
        console.log(`  -> Scraping failed, skipping`);
        failed++;
      }
      
      // Rate limit - be nice to servers
      await new Promise(r => setTimeout(r, 800));
      
    } catch (error) {
      console.log(`  -> Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${statements.length}`);
  
  await db.close();
}

// Run
updateStatementSources()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
