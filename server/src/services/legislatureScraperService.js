const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Service for scraping California Legislature website
 * URL: https://leginfo.legislature.ca.gov
 */
class LegislatureScraperService {
  constructor() {
    this.baseUrl = 'https://leginfo.legislature.ca.gov/faces';
  }

  /**
   * Build bill ID for URL
   * @param {string} session - e.g., '20232024'
   * @param {string} billType - e.g., 'AB', 'SB'
   * @param {string} billNumber - e.g., '853'
   */
  buildBillId(session, billType, billNumber) {
    return `${session}${billType}${billNumber}`;
  }

  /**
   * Scrape bill information
   */
  async scrapeBill(session, billType, billNumber) {
    const billId = this.buildBillId(session, billType, billNumber);
    const url = `${this.baseUrl}/billNavClient.xhtml?bill_id=${billId}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Extract bill info
      const title = $('span#bill_title').text().trim() || 
                    $('h1').first().text().trim() ||
                    'Title not found';
      
      const summary = $('div#bill_digest').text().trim() ||
                      $('div.bill_summary').text().trim() ||
                      '';
      
      const status = $('span#bill_status').text().trim() || 'Unknown';
      
      return {
        id: `ca-${billType}${billNumber}`,
        bill_number: `${billType}-${billNumber}`,
        title,
        summary,
        session,
        status: this.normalizeStatus(status),
        full_text_url: `${this.baseUrl}/billTextClient.xhtml?bill_id=${billId}`
      };
    } catch (error) {
      console.error(`Error scraping bill ${billType}-${billNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Scrape voting records for a bill
   */
  async scrapeBillVotes(session, billType, billNumber) {
    const billId = this.buildBillId(session, billType, billNumber);
    const url = `${this.baseUrl}/billVotesClient.xhtml?bill_id=${billId}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const votes = [];
      
      // Find all vote sections
      $('div.voteSection, div[id^="vote"]').each((i, elem) => {
        const $section = $(elem);
        
        // Extract vote metadata
        const dateText = $section.find('span.date, td.date').first().text().trim();
        const location = $section.find('span.location, td.location').first().text().trim();
        const motion = $section.find('span.motion, td.motion').first().text().trim();
        const result = $section.find('span.result, td.result').first().text().trim();
        
        // Extract vote counts
        const ayesMatch = $section.text().match(/Ayes:\s*(\d+)/);
        const noesMatch = $section.text().match(/Noes:\s*(\d+)/);
        const nvrMatch = $section.text().match(/NVR:\s*(\d+)/);
        
        // Extract individual votes - look for name lists
        const ayesText = $section.find('td:contains("Ayes:")').next().text() ||
                        $section.text().match(/Ayes:\s*([^.]+)/)?.[1] || '';
        const noesText = $section.find('td:contains("Noes:")').next().text() ||
                        $section.text().match(/Noes:\s*([^.]+)/)?.[1] || '';
        const nvrText = $section.find('td:contains("NVR:")').next().text() ||
                       $section.text().match(/NVR:\s*([^.]+)/)?.[1] || '';
        
        // Parse individual names
        const ayes = this.parseNames(ayesText);
        const noes = this.parseNames(noesText);
        const nvrs = this.parseNames(nvrText);
        
        // Determine vote type
        let voteType = 'passage';
        if (motion && motion.toLowerCase().includes('committee')) {
          voteType = 'committee';
        } else if (motion && motion.toLowerCase().includes('amendment')) {
          voteType = 'amendment';
        }
        
        votes.push({
          date: this.parseDate(dateText),
          location,
          motion,
          result: result.includes('PASS') ? 'passed' : 'failed',
          vote_type: voteType,
          counts: {
            ayes: parseInt(ayesMatch?.[1]) || ayes.length,
            noes: parseInt(noesMatch?.[1]) || noes.length,
            nvr: parseInt(nvrMatch?.[1]) || nvrs.length
          },
          individual_votes: {
            ayes,
            noes,
            nvrs
          }
        });
      });
      
      return votes;
    } catch (error) {
      console.error(`Error scraping votes for ${billType}-${billNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse names from text
   */
  parseNames(text) {
    if (!text) return [];
    return text
      .split(/,\s*/)
      .map(name => name.trim())
      .filter(name => name.length > 0 && name.length < 50);
  }

  /**
   * Parse date from text
   */
  parseDate(dateText) {
    if (!dateText) return null;
    
    // Try various formats
    const formats = [
      /(\d{2})\/(\d{2})\/(\d{2})/,  // MM/DD/YY
      /(\d{2})\/(\d{2})\/(\d{4})/,  // MM/DD/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // M-D-YYYY
    ];
    
    for (const format of formats) {
      const match = dateText.match(format);
      if (match) {
        let year = match[3];
        if (year.length === 2) {
          year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        }
        return `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
      }
    }
    
    return null;
  }

  /**
   * Normalize status text
   */
  normalizeStatus(status) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('chaptered') || statusLower.includes('signed')) {
      return 'chaptered';
    } else if (statusLower.includes('veto')) {
      return 'vetoed';
    } else if (statusLower.includes('failed') || statusLower.includes('defeated')) {
      return 'failed';
    } else if (statusLower.includes('committee')) {
      return 'in_committee';
    }
    return 'active';
  }

  /**
   * Get all votes for a specific legislator on a bill
   */
  async getLegislatorVoteOnBill(legislatorName, session, billType, billNumber) {
    const votes = await this.scrapeBillVotes(session, billType, billNumber);
    
    const legislatorVotes = [];
    
    for (const vote of votes) {
      let voteCast = null;
      
      if (vote.individual_votes.ayes.some(name => 
        name.toLowerCase().includes(legislatorName.toLowerCase()) ||
        legislatorName.toLowerCase().includes(name.toLowerCase())
      )) {
        voteCast = 'yes';
      } else if (vote.individual_votes.noes.some(name => 
        name.toLowerCase().includes(legislatorName.toLowerCase()) ||
        legislatorName.toLowerCase().includes(name.toLowerCase())
      )) {
        voteCast = 'no';
      } else if (vote.individual_votes.nvrs.some(name => 
        name.toLowerCase().includes(legislatorName.toLowerCase()) ||
        legislatorName.toLowerCase().includes(name.toLowerCase())
      )) {
        voteCast = 'not_voting';
      }
      
      if (voteCast) {
        legislatorVotes.push({
          ...vote,
          vote: voteCast
        });
      }
    }
    
    return legislatorVotes;
  }
}

module.exports = new LegislatureScraperService();
