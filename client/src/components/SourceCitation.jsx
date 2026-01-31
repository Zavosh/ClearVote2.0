function SourceCitation({ 
  sourceName, 
  sourceUrl, 
  publishedDate, 
  articleTitle,
  author,
  isDirectQuote,
  showDetails = false,
  className = '' 
}) {
  // Don't show if no source info at all
  if (!sourceName && !sourceUrl) return null;
  
  // Don't show "Unknown Source" - it's not helpful
  if (sourceName === 'Unknown Source' && !sourceUrl) return null;

  // Format date if it's a full timestamp
  const formatDate = (date) => {
    if (!date) return null;
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return date;
    }
  };

  // Extract domain from URL for display if no source name
  const getDomainFromUrl = (url) => {
    if (!url) return null;
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      // Capitalize first letter and get clean domain name
      const parts = hostname.split('.');
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    } catch {
      return null;
    }
  };

  // Get full domain for display
  const getFullDomain = (url) => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return null;
    }
  };

  const formattedDate = formatDate(publishedDate);
  const displaySource = sourceName || getDomainFromUrl(sourceUrl) || 'Source';
  const fullDomain = getFullDomain(sourceUrl);
  
  // Check if URL looks like a real article (not a placeholder)
  const isRealUrl = sourceUrl && !sourceUrl.includes('example.com') && sourceUrl.startsWith('http');
  
  // Check if we have verified source metadata (title was scraped successfully)
  const hasVerifiedMetadata = articleTitle && articleTitle !== 'Google News';

  // Compact view (default)
  if (!showDetails) {
    return (
      <div className={`text-sm flex items-center gap-2 flex-wrap ${className}`}>
        <span className="text-gray-500">Source:</span>
        {isRealUrl ? (
          <a 
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium bg-blue-50 px-2 py-1 rounded transition-colors"
            title={articleTitle || "View original source"}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {displaySource}
          </a>
        ) : (
          <span className="font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
            {displaySource}
          </span>
        )}
        {isDirectQuote && (
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium" title="This is a direct quote from the legislator">
            Direct Quote
          </span>
        )}
        {formattedDate && (
          <span className="text-gray-400">• {formattedDate}</span>
        )}
      </div>
    );
  }

  // Detailed view
  return (
    <div className={`bg-gray-50 rounded-lg p-3 border border-gray-200 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Article Title - show URL domain as fallback */}
          {hasVerifiedMetadata ? (
            <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
              {articleTitle}
            </h4>
          ) : isRealUrl ? (
            <h4 className="font-medium text-gray-600 mb-1 flex items-center gap-2">
              <span className="italic">Article from {displaySource}</span>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded" title="Title could not be verified from source">
                Unverified
              </span>
            </h4>
          ) : (
            <h4 className="font-medium text-gray-500 mb-1 italic">
              Source: {displaySource}
            </h4>
          )}
          
          {/* Source & Author */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2 flex-wrap">
            {fullDomain && (
              <span className="font-medium text-gray-700">{fullDomain}</span>
            )}
            {author && (
              <>
                {fullDomain && <span className="text-gray-400">•</span>}
                <span>by {author.replace(/^by\s+/i, '').substring(0, 50)}</span>
              </>
            )}
            {formattedDate && (
              <>
                <span className="text-gray-400">•</span>
                <span>{formattedDate}</span>
              </>
            )}
          </div>
          
          {/* Quote indicator */}
          {isDirectQuote && (
            <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded w-fit mb-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Direct quote from legislator
            </div>
          )}
        </div>
        
        {/* Link Button - show for real URLs, indicate if unverified */}
        {isRealUrl && (
          <a 
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasVerifiedMetadata 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={hasVerifiedMetadata ? "Open verified source article" : "Open source (may require login or be unavailable)"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {hasVerifiedMetadata ? 'View Source' : 'Try Source'}
          </a>
        )}
      </div>
      
      {/* Source reliability note */}
      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
        {hasVerifiedMetadata ? (
          <>
            <span className="font-medium text-green-600">Verified:</span> Source article accessible. Click to read the full article.
          </>
        ) : isRealUrl ? (
          <>
            <span className="font-medium text-yellow-600">Note:</span> Source may be paywalled or unavailable. Original URL provided for reference.
          </>
        ) : (
          <>
            <span className="font-medium">Note:</span> Source information provided for reference.
          </>
        )}
      </div>
    </div>
  );
}

export default SourceCitation;