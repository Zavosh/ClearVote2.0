const OpenAI = require('openai');

/**
 * Service for AI-powered analysis of statement vs vote discrepancies
 */
class AnalysisService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({ apiKey });
    this.model = 'gpt-4o-mini'; // Fast and affordable model
  }

  /**
   * System prompt for political analysis
   */
  getSystemPrompt() {
    return `You are a nonpartisan political analyst specializing in comparing politicians' 
public statements with their voting records. Your analysis must be:
- Factual and evidence-based
- Aware of procedural context (amendments, procedural votes)
- Clear about uncertainty when context is insufficient
- Objective and unbiased

You will analyze statement/vote pairs and determine if there's a discrepancy.

Important considerations:
- Cloture votes (to end debate) are NOT votes on the bill itself
- "Motion to recommit" votes are often procedural objections
- Votes against omnibus bills may oppose unrelated provisions
- Party-line votes may reflect caucus strategy, not personal position
- Bills that were significantly amended may have changed intent

Respond ONLY with valid JSON matching the required schema.`;
  }

  /**
   * Format the analysis prompt
   */
  formatPrompt(statement, vote, bill) {
    return `
## Political Statement
<statement>
${statement.content}
</statement>

<statement_metadata>
- Speaker: Legislator
- Date: ${statement.published_date || 'Unknown'}
- Source: ${statement.source_name || 'Unknown'}
</statement_metadata>

## Voting Record
<vote>
- Bill: ${bill.bill_number} - ${bill.title}
- Vote: ${vote.vote.toUpperCase()} (${vote.vote_type})
- Date: ${vote.vote_date || 'Unknown'}
- Bill Summary: ${bill.summary || 'No summary available'}
</vote>

## Analysis Instructions
1. **Extract Core Claim**: What specific policy position does the statement imply?
2. **Analyze Vote Context**: Was this a final passage vote or procedural? Were there amendments?
3. **Compare Positions**: Does the vote align with or contradict the stated position?
4. **Assess Discrepancy**: Determine if this is CONSISTENT, NUANCED (context explains it), or CONTRADICTORY
5. **Confidence Level**: Rate 1-5 based on available context and clarity

Respond in JSON format with these fields:
- statement_summary: Brief summary of what the statement claims
- vote_summary: Brief summary of what the vote represents
- discrepancy_type: "consistent", "nuanced", or "contradictory"
- confidence_score: Integer 1-5 (5 = very confident)
- explanation: Detailed explanation of your analysis
- requires_review: Boolean, true if confidence < 3 or context is unclear
`;
  }

  /**
   * Check if statement is actually relevant to the bill (pre-analysis filter)
   */
  async checkRelevance(statement, bill) {
    try {
      const relevancePrompt = `You are a relevance checker. Determine if this statement is DIRECTLY related to the given bill.

## Statement:
${statement.content}

## Bill:
${bill.bill_number} - ${bill.title}
${bill.summary || 'No summary available'}

## Task:
Determine if the statement discusses the same topic/policy area as the bill.
- "relevant": The statement directly discusses the bill's topic or policy area
- "not_relevant": The statement is about a completely different topic

Respond ONLY with valid JSON:
{
  "is_relevant": true or false,
  "reason": "Brief explanation of why it is or isn't relevant"
}

Examples of NOT relevant:
- Statement about dairy nutrition vs AI transparency bill
- Statement about healthcare vs housing bill
- Statement about immigration vs education bill

Be strict - only mark as relevant if they discuss the SAME policy area.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a relevance checker for political statements and bills. Be strict and only match statements that are directly related to the bill topic.' },
          { role: 'user', content: relevancePrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      return {
        is_relevant: result.is_relevant === true,
        reason: result.reason || 'No reason provided'
      };
    } catch (error) {
      console.error('Relevance check error:', error.message);
      // On error, assume relevant to not block analysis (conservative approach)
      return { is_relevant: true, reason: 'Error during relevance check' };
    }
  }

  /**
   * Analyze a statement-vote pair
   */
  async analyzePair(statement, vote, bill) {
    try {
      // STEP 1: Pre-filter for relevance
      const relevanceCheck = await this.checkRelevance(statement, bill);
      
      if (!relevanceCheck.is_relevant) {
        console.log(`Skipping analysis - not relevant: ${relevanceCheck.reason}`);
        return null; // Return null to indicate no analysis should be saved
      }

      // STEP 2: Proceed with full analysis if relevant
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.formatPrompt(statement, vote, bill);

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      // Validate and normalize response
      return {
        statement_summary: analysis.statement_summary || 'No summary available',
        vote_summary: analysis.vote_summary || 'No summary available',
        discrepancy_type: this.validateDiscrepancyType(analysis.discrepancy_type),
        confidence_score: this.validateConfidence(analysis.confidence_score),
        explanation: analysis.explanation || 'No explanation provided',
        requires_review: analysis.requires_review || analysis.confidence_score < 3
      };
    } catch (error) {
      console.error('Analysis error:', error.message);
      
      // Return safe default on error
      return {
        statement_summary: 'Analysis failed',
        vote_summary: 'Analysis failed',
        discrepancy_type: 'nuanced',
        confidence_score: 1,
        explanation: `Error during analysis: ${error.message}`,
        requires_review: true
      };
    }
  }

  /**
   * Validate discrepancy type
   */
  validateDiscrepancyType(type) {
    const validTypes = ['consistent', 'nuanced', 'contradictory'];
    if (validTypes.includes(type?.toLowerCase())) {
      return type.toLowerCase();
    }
    return 'nuanced'; // Default to nuanced if unclear
  }

  /**
   * Validate confidence score
   */
  validateConfidence(score) {
    const num = parseInt(score);
    if (isNaN(num) || num < 1 || num > 5) {
      return 1; // Default to low confidence if invalid
    }
    return num;
  }

  /**
   * Batch analyze multiple pairs
   */
  async analyzeBatch(pairs) {
    const results = [];
    
    for (const pair of pairs) {
      try {
        const analysis = await this.analyzePair(
          pair.statement,
          pair.vote,
          pair.bill
        );
        
        results.push({
          pair_id: pair.id,
          ...analysis
        });
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Batch analysis error for pair', pair.id, error.message);
        results.push({
          pair_id: pair.id,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = new AnalysisService();
