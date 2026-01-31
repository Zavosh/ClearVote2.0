import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import TabNavigation from '../components/TabNavigation';
import EvidenceCard from '../components/EvidenceCard';

function LegislatorDetailPage() {
  const { id } = useParams();
  const [legislator, setLegislator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('contradictions');

  useEffect(() => {
    fetchLegislator();
  }, [id]);

  // Auto-analyze when legislator data loads and has unchecked statements
  useEffect(() => {
    if (legislator && legislator.statements) {
      const uncheckedStatements = legislator.statements.filter(s => !s.discrepancy_type);
      if (uncheckedStatements.length > 0 && !analyzing) {
        // Automatically analyze unchecked statements
        handleAnalyze();
      }
    }
  }, [legislator]);

  const fetchLegislator = async () => {
    try {
      setLoading(true);
      const data = await api.getLegislator(id);
      setLegislator(data);
    } catch (error) {
      console.error('Error fetching legislator:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      await api.analyzeLegislator(id);
      await fetchLegislator();
    } catch (error) {
      console.error('Error analyzing:', error);
      alert('Analysis failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getVoteBadge = (vote) => {
    if (vote === 'yes') return 'bg-green-100 text-green-800';
    if (vote === 'no') return 'bg-red-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!legislator) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Legislator not found</h2>
        <Link to="/legislators" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to list
        </Link>
      </div>
    );
  }

  // Categorize statements
  const contradictions = (legislator.statements || []).filter(s => s.discrepancy_type === 'contradictory');
  const consistent = (legislator.statements || []).filter(s => s.discrepancy_type === 'consistent');
  const nuanced = (legislator.statements || []).filter(s => s.discrepancy_type === 'nuanced');

  // Tab configuration
  const tabs = [
    { id: 'contradictions', label: 'Contradictions', icon: '❌', count: contradictions.length },
    { id: 'consistent', label: 'Consistent', icon: '✅', count: consistent.length },
    { id: 'nuanced', label: 'Nuanced', icon: '⚠️', count: nuanced.length },
    { id: 'claims', label: 'All Claims', icon: '📝', count: legislator.statements?.length || 0 },
    { id: 'votes', label: 'Votes', icon: '🗳️', count: legislator.votes?.length || 0 },
    { id: 'sources', label: 'Sources', icon: '🔗', count: legislator.sources?.length || 0 }
  ];

  const tabCounts = {
    contradictions: contradictions.length,
    consistent: consistent.length,
    nuanced: nuanced.length,
    claims: legislator.statements?.length || 0,
    votes: legislator.votes?.length || 0,
    sources: legislator.sources?.length || 0
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h1 className="text-3xl font-bold">{legislator.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded text-sm ${
                  legislator.party === 'Democratic' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                }`}>
                  {legislator.party}
                </span>
                <span className="text-gray-600">
                  {legislator.chamber === 'upper' ? 'Senate' : 'Assembly'} District {legislator.district}
                </span>
              </div>
              <div className="flex gap-4 mt-3 text-sm">
                <span>{legislator.statements?.length || 0} statements collected</span>
                <span>{legislator.votes?.length || 0} votes recorded</span>
                <span className={contradictions.length > 0 ? 'text-red-600 font-semibold' : ''}>
                  {contradictions.length} contradictions found
                </span>
              </div>
              {legislator.last_updated && (
                <div className="text-sm text-gray-500 mt-1">
                  Last updated: {new Date(legislator.last_updated).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {analyzing ? 'Analyzing...' : '🔍 Check All Statements'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={tabCounts}
      />

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Contradictions Tab */}
        {activeTab === 'contradictions' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-red-700">Contradictions Found</h2>
            {contradictions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-16 h-16 mx-auto text-green-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg">No contradictions found!</p>
                <p className="text-sm mt-2">This legislator's votes align with their public statements.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contradictions.map((statement) => (
                  <EvidenceCard 
                    key={statement.id}
                    discrepancy={{
                      id: statement.id,
                      discrepancy_type: 'contradictory',
                      confidence_score: statement.confidence_score,
                      legislator_id: legislator.id,
                      legislator_name: legislator.name,
                      party: legislator.party,
                      chamber: legislator.chamber,
                      bill_id: statement.bill_id,
                      bill_number: statement.bill_number,
                      statement_content: statement.content,
                      source_url: statement.source_url,
                      source_name: statement.source_name,
                      published_date: statement.published_date,
                      vote: statement.vote,
                      vote_date: statement.vote_date,
                      vote_type: statement.vote_type,
                      explanation: statement.analysis_explanation,
                      statement_summary: statement.statement_summary,
                      vote_summary: statement.vote_summary,
                      requires_review: statement.requires_review
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Consistent Tab */}
        {activeTab === 'consistent' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-green-700">Consistent Statements</h2>
            {consistent.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No consistent statements found yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {consistent.map((statement) => (
                  <EvidenceCard 
                    key={statement.id}
                    discrepancy={{
                      id: statement.id,
                      discrepancy_type: 'consistent',
                      confidence_score: statement.confidence_score,
                      legislator_id: legislator.id,
                      legislator_name: legislator.name,
                      party: legislator.party,
                      chamber: legislator.chamber,
                      bill_id: statement.bill_id,
                      bill_number: statement.bill_number,
                      statement_content: statement.content,
                      source_url: statement.source_url,
                      source_name: statement.source_name,
                      published_date: statement.published_date,
                      vote: statement.vote,
                      vote_date: statement.vote_date,
                      vote_type: statement.vote_type,
                      explanation: statement.analysis_explanation,
                      statement_summary: statement.statement_summary,
                      vote_summary: statement.vote_summary
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nuanced Tab */}
        {activeTab === 'nuanced' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-yellow-700">Nuanced Matches</h2>
            {nuanced.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No nuanced statements found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {nuanced.map((statement) => (
                  <EvidenceCard 
                    key={statement.id}
                    discrepancy={{
                      id: statement.id,
                      discrepancy_type: 'nuanced',
                      confidence_score: statement.confidence_score,
                      legislator_id: legislator.id,
                      legislator_name: legislator.name,
                      party: legislator.party,
                      chamber: legislator.chamber,
                      bill_id: statement.bill_id,
                      bill_number: statement.bill_number,
                      statement_content: statement.content,
                      source_url: statement.source_url,
                      source_name: statement.source_name,
                      published_date: statement.published_date,
                      vote: statement.vote,
                      vote_date: statement.vote_date,
                      vote_type: statement.vote_type,
                      explanation: statement.analysis_explanation,
                      statement_summary: statement.statement_summary,
                      vote_summary: statement.vote_summary
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Claims Tab */}
        {activeTab === 'claims' && (
          <div>
            <h2 className="text-xl font-bold mb-4">All Public Claims</h2>
            {legislator.statements?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No statements collected yet.</p>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {analyzing ? 'Collecting...' : '🔍 Collect Statements'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {legislator.statements.map((statement) => (
                  <div key={statement.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {statement.discrepancy_type === 'contradictory' && (
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">❌ Contradiction</span>
                      )}
                      {statement.discrepancy_type === 'consistent' && (
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">✅ Consistent</span>
                      )}
                      {statement.discrepancy_type === 'nuanced' && (
                        <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">⚠️ Nuanced</span>
                      )}
                      {!statement.discrepancy_type && (
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">⏳ Not Checked</span>
                      )}
                    </div>
                    <p className="text-gray-800 mb-2">{statement.content}</p>
                    <div className="text-sm text-gray-600">
                      Source: {statement.source_url ? (
                        <a 
                          href={statement.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {statement.source_name}
                        </a>
                      ) : (
                        statement.source_name
                      )} • {statement.published_date}
                    </div>
                    {statement.bill_number && (
                      <div className="mt-2 text-sm">
                        Related to: <Link to={`/bills/${statement.bill_id}`} className="text-blue-600 hover:underline">{statement.bill_number}</Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Votes Tab */}
        {activeTab === 'votes' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Voting History</h2>
            {legislator.votes?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No votes recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {legislator.votes.map((vote, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Link to={`/bills/${vote.bill_id}`} className="font-semibold text-blue-900 hover:underline">
                        {vote.bill_number}
                      </Link>
                      <p className="text-sm text-gray-600">{vote.title}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{vote.vote_date}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVoteBadge(vote.vote)}`}>
                        {vote.vote?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === 'sources' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Data Sources</h2>
            {legislator.sources?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No sources recorded.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {legislator.sources?.map((source, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium">{source.name}</span>
                      <p className="text-sm text-gray-600">{source.type}</p>
                    </div>
                    <a 
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View →
                    </a>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">About Our Data</h3>
              <p className="text-sm text-gray-700">
                We collect public statements from official sources, social media, and news outlets. 
                Vote data comes from official California Legislature records. 
                All data is cross-referenced and verified before analysis.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LegislatorDetailPage;