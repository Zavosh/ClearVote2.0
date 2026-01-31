import { useState } from 'react';
import { Link } from 'react-router-dom';
import SourceCitation from './SourceCitation';

function EvidenceCard({ discrepancy, onReportIssue }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const d = discrepancy;

  const getTypeBadge = (type) => {
    switch (type) {
      case 'contradictory': return 'bg-red-100 text-red-800 border-red-300';
      case 'nuanced': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'consistent': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVoteBadge = (vote) => {
    if (vote === 'yes') return 'bg-green-200 text-green-800 border-green-400';
    if (vote === 'no') return 'bg-red-200 text-red-800 border-red-400';
    return 'bg-gray-200 text-gray-800 border-gray-400';
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/discrepancies/${d.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReport = (type) => {
    if (onReportIssue) {
      onReportIssue(d.id, type);
    }
  };

  // Extract key points from explanation for bullet display
  const getKeyPoints = (explanation) => {
    if (!explanation) return [];
    // Split by periods and filter out short/empty sentences
    return explanation
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 150)
      .slice(0, 3);
  };

  const keyPoints = getKeyPoints(d.explanation);

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 transition-all duration-200 ${
      d.discrepancy_type === 'contradictory' ? 'border-red-500' : 
      d.discrepancy_type === 'nuanced' ? 'border-yellow-500' : 'border-green-500'
    }`}>
      {/* Collapsed View */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Header Row */}
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`px-2 py-1 rounded text-xs font-medium border ${getTypeBadge(d.discrepancy_type)}`}>
                {d.discrepancy_type?.toUpperCase()}
              </span>
              <span className={`text-sm font-bold ${getConfidenceColor(d.confidence_score)}`}>
                Confidence: {d.confidence_score}/5
              </span>
              {d.requires_review === true && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                  ⚠️ Review
                </span>
              )}
            </div>

            {/* Legislator & Bill */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Link 
                to={`/legislators/${d.legislator_id}`} 
                className="font-semibold text-blue-900 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {d.legislator_name}
              </Link>
              <span>•</span>
              <Link 
                to={`/bills/${d.bill_id}`} 
                className="text-blue-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {d.bill_number}
              </Link>
            </div>

            {/* Vote Summary */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-lg font-bold text-sm border-2 ${getVoteBadge(d.vote)}`}>
                VOTED {d.vote?.toUpperCase()}
              </span>
              <span className="text-sm text-gray-600">{d.vote_date}</span>
            </div>
          </div>

          {/* Open Comparison Button */}
          <button
            className="flex-shrink-0 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Close
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Open Comparison
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded View - Side by Side Evidence */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Claim Side */}
            <div className="p-4 bg-blue-50 border-b md:border-b-0 md:border-r border-gray-200">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <h3 className="font-semibold text-blue-900">Public Claim</h3>
                </div>
                {d.is_direct_quote && (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                    Direct Quote
                  </span>
                )}
              </div>
              
              <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-800 mb-3">
                "{d.statement_content}"
              </blockquote>
              
              <SourceCitation 
                sourceName={d.source_name}
                sourceUrl={d.source_url}
                publishedDate={d.published_date}
                articleTitle={d.article_title}
                author={d.author}
                isDirectQuote={d.is_direct_quote}
                showDetails={true}
                className="mt-3"
              />
              
              {d.statement_summary && (
                <div className="mt-3 text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                  <span className="font-medium">Summary:</span> {d.statement_summary}
                </div>
              )}
            </div>

            {/* Vote Side */}
            <div className="p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="font-semibold text-gray-900">Vote Record</h3>
              </div>
              
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-4 py-2 rounded-lg font-bold text-lg border-2 ${getVoteBadge(d.vote)}`}>
                  {d.vote?.toUpperCase() || 'VOTE'}
                </span>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {d.vote_type ? d.vote_type.charAt(0).toUpperCase() + d.vote_type.slice(1) : 'Floor Vote'}
                  </div>
                  <div className="text-gray-500">{d.vote_date || 'Date not recorded'}</div>
                </div>
              </div>
              
              {d.vote_summary && (
                <div className="text-sm text-gray-600 bg-white p-2 rounded">
                  <span className="font-medium">Context:</span> {d.vote_summary}
                </div>
              )}
            </div>
          </div>

          {/* Why Flagged Section */}
          <div className="p-4 bg-purple-50 border-t border-gray-200">
            <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Why This Was Flagged
            </h3>
            <ul className="space-y-1 text-sm text-gray-700">
              {keyPoints.length > 0 ? (
                keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>{d.explanation}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReport('mismatch');
                }}
                className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Report mismatch
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReport('incorrect');
                }}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                This is wrong
              </button>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLink();
              }}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy link to this check
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EvidenceCard;