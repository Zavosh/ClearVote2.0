const OpenAI = require('openai');

/**
 * Service for extracting semantic metadata from statements
 * This reduces AI calls by analyzing each statement once and storing metadata
 */
class SemanticService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({ apiKey });
    this.model = 'gpt-4o-mini'; // Cheapest and fastest OpenAI model
  }

  /**
   * Analyze a statement and extract semantic metadata
   * Returns: topics, keywords, policy area, key positions
   */
  async analyzeStatement(statement) {
    try {
      const prompt = `Analyze this political statement and extract semantic metadata.

Statement: "${statement.content}"

Extract the following information:

1. **Policy Areas**: What broad policy areas does this discuss? (e.g., "AI regulation", "healthcare", "housing", "immigration")
2. **Specific Topics**: What specific topics are mentioned? (e.g., "AI transparency", "model training data", "consumer protection")
3. **Keywords**: Important keywords and phrases (e.g., "artificial intelligence", "accountability", "disclosure requirements")
4. **Key Positions**: What positions or stances does the speaker take? (e.g., "supports AI regulation", "opposes government oversight", "wants transparency requirements")

Be specific and accurate. Only include information that is clearly present in the statement.

Respond in JSON format:
{
  "policy_area": "main policy domain (single phrase)",
  "topics": ["topic1", "topic2", "topic3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "positions": ["position1", "position2"]
}`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a political analyst specializing in semantic analysis of political statements.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const metadata = JSON.parse(response.choices[0].message.content);

      return {
        policy_area: metadata.policy_area || null,
        topics: Array.isArray(metadata.topics) ? metadata.topics : [],
        keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
        positions: Array.isArray(metadata.positions) ? metadata.positions : []
      };
    } catch (error) {
      console.error('Semantic analysis error:', error.message);
      return {
        policy_area: null,
        topics: [],
        keywords: [],
        positions: []
      };
    }
  }

  /**
   * Check if a statement matches a bill based on semantic metadata
   * This is a fast pre-filter that avoids expensive AI analysis
   */
  matchesbill(statementMetadata, bill) {
    const billTopics = JSON.parse(bill.topics || '[]');
    const billSummary = (bill.summary || '').toLowerCase();
    const billTitle = (bill.title || '').toLowerCase();
    
    // 1. Check policy area match
    if (statementMetadata.policy_area) {
      const policyArea = statementMetadata.policy_area.toLowerCase();
      if (billTitle.includes(policyArea) || billSummary.includes(policyArea)) {
        return { matches: true, reason: 'policy_area', confidence: 0.9 };
      }
    }

    // 2. Check topic overlap
    const statementTopics = statementMetadata.topics.map(t => t.toLowerCase());
    const billTopicsLower = billTopics.map(t => t.toLowerCase());
    
    const topicOverlap = statementTopics.filter(st => 
      billTopicsLower.some(bt => st.includes(bt) || bt.includes(st))
    );
    
    if (topicOverlap.length >= 1) {
      return { matches: true, reason: 'topic_overlap', confidence: 0.8 };
    }

    // 3. Check keyword match with bill summary
    const keywordMatches = statementMetadata.keywords.filter(kw => 
      billSummary.includes(kw.toLowerCase()) || billTitle.includes(kw.toLowerCase())
    );
    
    if (keywordMatches.length >= 2) {
      return { matches: true, reason: 'keyword_match', confidence: 0.7 };
    }

    // 4. Check if bill number is mentioned in keywords
    const billNumber = bill.bill_number.toLowerCase();
    const mentionsBill = statementMetadata.keywords.some(kw => 
      kw.toLowerCase().includes(billNumber) || 
      kw.toLowerCase().includes(billNumber.replace('-', ''))
    );
    
    if (mentionsBill) {
      return { matches: true, reason: 'bill_mention', confidence: 1.0 };
    }

    return { matches: false, reason: 'no_match', confidence: 0 };
  }

  /**
   * Batch analyze multiple statements in a single API call
   * More efficient - reduces API calls by analyzing 3-4 statements at once
   */
  async batchAnalyzeStatements(statements) {
    if (statements.length === 0) return [];
    
    try {
      // Build prompt for multiple statements
      let prompt = `Analyze these ${statements.length} political statements and extract semantic metadata for EACH one.

For each statement, extract:
1. **Policy Area**: Main policy domain (single phrase)
2. **Topics**: Specific topics mentioned
3. **Keywords**: Important keywords and phrases
4. **Positions**: What stances/positions does the speaker take?

`;

      statements.forEach((stmt, idx) => {
        prompt += `\n## Statement ${idx + 1} (ID: ${stmt.id})
"${stmt.content}"

`;
      });

      prompt += `\nRespond in JSON format as an array:
[
  {
    "statement_id": ${statements[0].id},
    "policy_area": "main policy domain",
    "topics": ["topic1", "topic2"],
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "positions": ["position1", "position2"]
  }
  // ... one object for each statement with its statement_id
]`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a political analyst specializing in semantic analysis of political statements.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      // OpenAI might return {results: [...]} or just [...]
      const resultsArray = Array.isArray(result) ? result : (result.results || result.statements || []);
      
      // Map results back to statements
      return statements.map(stmt => {
        const found = resultsArray.find(r => r.statement_id === stmt.id) || {};
        return {
          statement_id: stmt.id,
          policy_area: found.policy_area || null,
          topics: Array.isArray(found.topics) ? found.topics : [],
          keywords: Array.isArray(found.keywords) ? found.keywords : [],
          positions: Array.isArray(found.positions) ? found.positions : [],
          success: true
        };
      });
      
    } catch (error) {
      console.error('Batch semantic analysis error:', error.message);
      // Return empty results for all statements on error
      return statements.map(stmt => ({
        statement_id: stmt.id,
        policy_area: null,
        topics: [],
        keywords: [],
        positions: [],
        success: false,
        error: error.message
      }));
    }
  }

  /**
   * Batch analyze multiple statements (legacy method - now uses batching internally)
   */
  async batchAnalyze(statements) {
    const results = [];
    const batchSize = 4; // Process 4 statements per API call
    
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize);
      
      try {
        console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1} (${batch.length} statements)...`);
        
        const batchResults = await this.batchAnalyzeStatements(batch);
        results.push(...batchResults);
        
        // Longer delay between batches to respect rate limits
        if (i + batchSize < statements.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Error processing batch:`, error.message);
        // Add error results for this batch
        batch.forEach(stmt => {
          results.push({
            statement_id: stmt.id,
            success: false,
            error: error.message,
            policy_area: null,
            topics: [],
            keywords: [],
            positions: []
          });
        });
      }
    }
    
    return results;
  }
}

module.exports = new SemanticService();
