const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Service for fetching news and statements about legislators
 * Uses Bing News API and NewsAPI with article scraping
 */
class NewsService {
  constructor() {
    this.newsApiKey = process.env.NEWSAPI_KEY;
    this.bingApiKey = process.env.BING_NEWS_KEY;
    this.newsApiBaseUrl = 'https://newsapi.org/v2';
    this.bingBaseUrl = 'https://api.bing.microsoft.com/v7.0/news/search';
    
    // Common user agent for scraping
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Search Bing News API - returns direct article URLs
   */
  async searchBingNews(legislatorName, options = {}) {
    if (!this.bingApiKey) {
      console.log('Bing News API key not configured, skipping');
      return [];
    }

    try {
      const query = `"${legislatorName}" California legislature`;
      
      const response = await axios.get(this.bingBaseUrl, {
        params: {
          q: query,
          count: options.limit || 20,
          mkt: 'en-US',
          freshness: options.freshness || 'Month',
          sortBy: 'Relevance'
        },
        headers: {
          'Ocp-Apim-Subscription-Key': this.bingApiKey
        },
        timeout: 10000
      });

      if (!response.data.value) {
        return [];
      }

      return response.data.value.map(article => ({
        title: article.name,
        description: article.description,
        content: article.description, // Bing only provides description, will scrape for full
        url: article.url, // Direct URL!
        source: article.provider?.[0]?.name || 'Unknown',
        publishedAt: article.datePublished,
        author: null,
        urlToImage: article.image?.thumbnail?.contentUrl,
        topics: this.extractTopics(article.name + ' ' + article.description),
        needsScraping: true
      }));
    } catch (error) {
      console.error('Bing News API error:', error.message);
      return [];
    }
  }

  /**
   * Search for news about a legislator using NewsAPI
   */
  async searchNewsAPI(legislatorName, options = {}) {
    if (!this.newsApiKey) {
      console.log('NewsAPI key not configured, skipping');
      return [];
    }

    try {
      const query = `"${legislatorName}" California legislature`;
      const daysBack = options.daysBack || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysBack);

      const response = await axios.get(`${this.newsApiBaseUrl}/everything`, {
        params: {
          q: query,
          language: 'en',
          sortBy: 'relevancy',
          from: fromDate.toISOString().split('T')[0],
          pageSize: options.limit || 20,
          apiKey: this.newsApiKey
        }
      });

      return response.data.articles.map(article => ({
        title: article.title,
        description: article.description,
        content: article.content, // Note: truncated on free tier
        url: article.url, // Direct URL
        source: article.source.name,
        publishedAt: article.publishedAt,
        author: article.author,
        urlToImage: article.urlToImage,
        topics: this.extractTopics(article.title + ' ' + article.description),
        needsScraping: true // Flag to scrape for full content
      }));
    } catch (error) {
      console.error('NewsAPI error:', error.message);
      return [];
    }
  }

  /**
   * Search DuckDuckGo News (no API key required, direct URLs)
   */
  async searchDuckDuckGoNews(legislatorName, options = {}) {
    try {
      const query = encodeURIComponent(`${legislatorName} California legislature`);
      const url = `https://html.duckduckgo.com/html/?q=${query}&t=h_&iar=news&ia=news`;

      const response = await axios.get(url, {
        headers: { 
          'User-Agent': this.userAgent,
          'Accept': 'text/html'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const articles = [];

      // Parse DDG results
      $('.result').each((i, el) => {
        if (i >= (options.limit || 15)) return false;
        
        const $el = $(el);
        const titleEl = $el.find('.result__title a');
        const snippetEl = $el.find('.result__snippet');
        
        let articleUrl = titleEl.attr('href');
        // DDG uses redirect URLs, extract actual URL
        if (articleUrl && articleUrl.includes('uddg=')) {
          const match = articleUrl.match(/uddg=([^&]+)/);
          if (match) {
            articleUrl = decodeURIComponent(match[1]);
          }
        }
        
        if (articleUrl && !articleUrl.includes('duckduckgo.com')) {
          articles.push({
            title: titleEl.text().trim(),
            description: snippetEl.text().trim(),
            content: snippetEl.text().trim(),
            url: articleUrl,
            source: this.extractDomain(articleUrl),
            publishedAt: null,
            author: null,
            topics: this.extractTopics(titleEl.text()),
            needsScraping: true
          });
        }
      });

      return articles;
    } catch (error) {
      console.error('DuckDuckGo News error:', error.message);
      return [];
    }
  }

  /**
   * Extract domain from URL for source name
   */
  extractDomain(url) {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Scrape article content from a URL
   */
  async scrapeArticle(url) {
    try {
      const response = await axios.get(url, {
        headers: { 
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 15000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      // Remove script, style, and nav elements
      $('script, style, nav, footer, header, aside, .ad, .advertisement, .social-share, .comments, [role="navigation"], .sidebar').remove();

      // Try to get article metadata
      const title = $('meta[property="og:title"]').attr('content') 
        || $('title').text() 
        || $('h1').first().text();
      
      const author = $('meta[name="author"]').attr('content')
        || $('meta[property="article:author"]').attr('content')
        || $('[rel="author"]').first().text()
        || $('[class*="author"]').first().text()
        || $('[class*="byline"]').first().text()
        || null;
      
      const publishedDate = $('meta[property="article:published_time"]').attr('content')
        || $('meta[name="date"]').attr('content')
        || $('time[datetime]').attr('datetime')
        || null;

      // Extract main article content - try multiple selectors
      let content = '';
      const contentSelectors = [
        'article',
        '[role="article"]',
        '.article-content',
        '.article-body',
        '.story-body',
        '.post-content',
        '.entry-content',
        '.content-body',
        'main',
        '#article-body',
        '.article__body',
        '.story-content',
        '.news-article'
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.find('p').map((_, el) => $(el).text().trim()).get().join('\n\n');
          if (content.length > 200) break;
        }
      }

      // Fallback: get all paragraphs
      if (content.length < 200) {
        content = $('p').map((_, el) => $(el).text().trim())
          .get()
          .filter(p => p.length > 50)
          .join('\n\n');
      }

      // Clean up the content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

      return {
        title: title?.trim() || null,
        author: this.cleanAuthor(author),
        publishedDate,
        content: content.substring(0, 10000), // Limit content size
        success: content.length > 100
      };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      return {
        title: null,
        author: null,
        publishedDate: null,
        content: '',
        success: false
      };
    }
  }

  /**
   * Clean author name
   */
  cleanAuthor(author) {
    if (!author) return null;
    return author
      .replace(/^by\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100) || null;
  }

  /**
   * Small delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enrich articles with scraped content
   */
  async enrichArticles(articles, legislatorName) {
    const enriched = [];
    
    for (const article of articles) {
      try {
        // Scrape full article content
        if (article.needsScraping || !article.content || article.content.length < 500) {
          console.log(`Scraping article: ${article.url.substring(0, 60)}...`);
          const scraped = await this.scrapeArticle(article.url);
          
          if (scraped.success) {
            enriched.push({
              ...article,
              title: scraped.title || article.title,
              author: scraped.author || article.author,
              content: scraped.content,
              publishedAt: scraped.publishedDate || article.publishedAt,
              wasScraped: true
            });
            console.log(`  -> Scraped ${scraped.content.length} chars`);
          } else {
            // Still include with original data but mark as not fully scraped
            enriched.push({
              ...article,
              wasScraped: false
            });
            console.log(`  -> Scraping failed, using original data`);
          }
        } else {
          enriched.push({
            ...article,
            wasScraped: false
          });
        }
        
        // Rate limiting - be nice to servers
        await this.delay(500);
        
      } catch (error) {
        console.error(`Error enriching article: ${error.message}`);
        enriched.push(article); // Keep original on error
      }
    }
    
    return enriched;
  }

  /**
   * Search for a legislator using available sources, then enrich with scraping
   */
  async searchForLegislator(legislatorName, options = {}) {
    console.log(`\n=== Searching news for: ${legislatorName} ===`);
    
    let articles = [];
    
    // Try Bing News first (best direct URLs)
    const bingArticles = await this.searchBingNews(legislatorName, options);
    console.log(`Bing News returned ${bingArticles.length} articles`);
    articles = [...bingArticles];
    
    // Try NewsAPI if we have a key
    const newsApiArticles = await this.searchNewsAPI(legislatorName, options);
    console.log(`NewsAPI returned ${newsApiArticles.length} articles`);
    
    // Merge and deduplicate by title similarity
    const seenTitles = new Set(articles.map(a => a.title?.toLowerCase().substring(0, 50)));
    for (const article of newsApiArticles) {
      const titleKey = article.title?.toLowerCase().substring(0, 50);
      if (!seenTitles.has(titleKey)) {
        articles.push(article);
        seenTitles.add(titleKey);
      }
    }
    
    // If still lacking results, try DuckDuckGo
    if (articles.length < 5) {
      const ddgArticles = await this.searchDuckDuckGoNews(legislatorName, options);
      console.log(`DuckDuckGo News returned ${ddgArticles.length} articles`);
      
      for (const article of ddgArticles) {
        const titleKey = article.title?.toLowerCase().substring(0, 50);
        if (!seenTitles.has(titleKey)) {
          articles.push(article);
          seenTitles.add(titleKey);
        }
      }
    }

    console.log(`Total unique articles: ${articles.length}`);
    
    // Enrich articles with scraped content
    if (options.scrape !== false && articles.length > 0) {
      articles = await this.enrichArticles(articles.slice(0, 10), legislatorName); // Limit to 10 for performance
    }

    // Sort by date
    articles.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    return articles;
  }

  /**
   * Extract relevant topics from text
   * Improved with context awareness to reduce false positives
   */
  extractTopics(text) {
    if (!text) return [];
    const topics = [];
    const textLower = text.toLowerCase();

    const topicKeywords = {
      'AI': ['artificial intelligence', 'machine learning', 'ai model', 'ai system', 'neural network', 'deep learning', 'ai technology', 'ai development'],
      'Technology': ['technology regulation', 'tech policy', 'digital infrastructure', 'internet governance', 'cybersecurity'],
      'Privacy': ['privacy protection', 'data protection', 'personal data', 'surveillance', 'data privacy', 'privacy rights'],
      'Transparency': ['transparency requirement', 'government transparency', 'public records', 'disclosure requirement', 'open government'],
      'Human Trafficking': ['human trafficking', 'sex trafficking', 'labor trafficking', 'trafficking victims', 'exploitation'],
      'Housing': ['housing policy', 'affordable housing', 'homeless', 'homelessness', 'rent control', 'housing crisis'],
      'Healthcare': ['healthcare policy', 'health insurance', 'medical care', 'healthcare system', 'health coverage'],
      'Education': ['education policy', 'school funding', 'university', 'student loan', 'education system'],
      'Environment': ['climate change', 'environmental policy', 'green energy', 'renewable energy', 'emissions reduction', 'climate policy'],
      'Labor': ['labor rights', 'worker rights', 'union', 'wage policy', 'employment law', 'workplace regulation'],
      'Criminal Justice': ['criminal justice', 'police reform', 'prison reform', 'sentencing', 'law enforcement'],
      'Immigration': ['immigration policy', 'immigration reform', 'border policy', 'asylum policy', 'immigration law']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      // Require at least 2 keyword matches OR a very specific phrase match
      const matches = keywords.filter(keyword => textLower.includes(keyword.toLowerCase())).length;
      
      if (matches >= 2) {
        topics.push(topic);
      } else if (matches === 1) {
        // For single match, require a more specific/longer phrase (10+ chars)
        const hasLongMatch = keywords.some(kw => 
          kw.length >= 10 && textLower.includes(kw.toLowerCase())
        );
        if (hasLongMatch) {
          topics.push(topic);
        }
      }
    }

    return topics;
  }

  /**
   * Normalize quotation marks in text
   * Converts curly quotes to straight quotes for consistent parsing
   */
  normalizeQuotes(text) {
    return text
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')  // Various double quotes
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")  // Various single quotes
      .replace(/[\u00AB\u00BB]/g, '"');  // Guillemets
  }

  /**
   * Extract direct quotes from article content
   * Returns both the quote and attribution context
   */
  extractQuotes(content, legislatorName) {
    if (!content || content.length < 50) return [];

    // Normalize quotation marks for consistent matching
    const normalizedContent = this.normalizeQuotes(content);
    
    const quotes = [];
    const nameParts = legislatorName.split(' ');
    const lastName = nameParts[nameParts.length - 1];
    const firstName = nameParts[0];
    
    // Escape special regex characters in names
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeLastName = escapeRegex(lastName);
    const safeFullName = escapeRegex(legislatorName);
    
    // Name patterns to match various formats
    const namePatterns = `(?:${safeFullName}|${safeLastName}|Sen\\.?\\s*${safeLastName}|Senator\\s*${safeLastName}|Assemblymember\\s*${safeLastName}|Asm\\.?\\s*${safeLastName}|State\\s+Sen\\.?\\s*${safeLastName})`;
    
    // Verbs that indicate speech/statements
    const speechVerbs = '(?:said|stated|announced|declared|explained|added|noted|wrote|told|argued|emphasized|replied|responded|continued|mentioned|suggested|claimed|insisted|acknowledged|admitted|warned|predicted|promised|vowed|maintained|asserted|contended|tweeted|posted)';
    
    // Various patterns to match quotes attributed to the legislator
    const patterns = [
      // "Quote" said/stated LastName (most common news format)
      new RegExp(`"([^"]{20,500})"[^.]*?${speechVerbs}\\s+${namePatterns}`, 'gi'),
      
      // "Quote," LastName said/stated
      new RegExp(`"([^"]{20,500}),"\\s*${namePatterns}\\s+${speechVerbs}`, 'gi'),
      
      // LastName said/stated "Quote" (attribution before quote)
      new RegExp(`${namePatterns}\\s+${speechVerbs}[^"]{0,50}"([^"]{20,500})"`, 'gi'),
      
      // LastName: "Quote" (colon format often used in interviews)
      new RegExp(`${namePatterns}:\\s*"([^"]{20,500})"`, 'gi'),
      
      // According to LastName, "Quote"
      new RegExp(`[Aa]ccording to ${namePatterns}[^"]{0,30}"([^"]{20,500})"`, 'gi'),
      
      // In a statement/tweet, LastName said "Quote"  
      new RegExp(`[Ii]n a (?:statement|press release|tweet|post|letter|memo|speech|interview)[^"]{0,60}${namePatterns}[^"]{0,40}"([^"]{20,500})"`, 'gi'),
      
      // LastName replied/responded that/: "Quote"
      new RegExp(`${namePatterns}\\s+(?:replied|responded)[^"]{0,30}"([^"]{20,500})"`, 'gi'),
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(normalizedContent)) !== null) {
        const quote = match[1]?.trim();
        if (quote && quote.length >= 20 && quote.length <= 1000) {
          // Avoid duplicates and substrings
          const isDuplicate = quotes.some(q => 
            q.quote === quote || 
            (q.quote.includes(quote) && q.quote.length < quote.length * 1.5) || 
            (quote.includes(q.quote) && quote.length < q.quote.length * 1.5)
          );
          if (!isDuplicate) {
            quotes.push({
              quote: quote,
              isDirectQuote: true
            });
          }
        }
      }
    }

    return quotes;
  }

  /**
   * Process articles and extract relevant statements
   */
  processArticlesForStatements(articles, legislatorName) {
    const statements = [];
    
    for (const article of articles) {
      const fullContent = [article.title, article.description, article.content]
        .filter(Boolean)
        .join('\n\n');
      
      // Try to extract direct quotes
      const quotes = this.extractQuotes(fullContent, legislatorName);
      
      if (quotes.length > 0) {
        // Add each direct quote as a separate statement
        for (const { quote } of quotes) {
          statements.push({
            content: quote,
            source_url: article.url,
            source_name: article.source,
            article_title: article.title,
            author: article.author,
            published_date: article.publishedAt,
            topics: article.topics,
            source_type: article.wasScraped ? 'scraped' : 'api',
            is_direct_quote: true
          });
        }
      } else {
        // If no direct quotes found, use the article content as context
        // Only if it mentions the legislator significantly
        const mentionCount = (fullContent.match(new RegExp(legislatorName.split(' ').pop(), 'gi')) || []).length;
        
        if (mentionCount >= 2 && fullContent.length > 200) {
          // Use a summary of the article content
          const summary = fullContent.substring(0, 1000);
          statements.push({
            content: summary,
            source_url: article.url,
            source_name: article.source,
            article_title: article.title,
            author: article.author,
            published_date: article.publishedAt,
            topics: article.topics,
            source_type: article.wasScraped ? 'scraped' : 'api',
            is_direct_quote: false
          });
        }
      }
    }
    
    return statements;
  }
}

module.exports = new NewsService();
