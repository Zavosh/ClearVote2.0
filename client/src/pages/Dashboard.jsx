import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import AiDisclaimer from '../components/AiDisclaimer';
import SourceCitation from '../components/SourceCitation';
import { SkeletonStats, SkeletonList } from '../components/SkeletonLoaders';

function Dashboard() {
  const [stats, setStats] = useState({
    legislators: 0,
    bills: 0,
    discrepancies: 0,
    contradictory: 0
  });
  const [recentDiscrepancies, setRecentDiscrepancies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const legislators = await api.getLegislators();
      const bills = await api.getBills();
      const discrepancies = await api.getDiscrepancies({ limit: 100 });
      
      const contradictory = discrepancies.filter(d => d.discrepancy_type === 'contradictory');
      
      setStats({
        legislators: legislators.length,
        bills: bills.length,
        discrepancies: discrepancies.length,
        contradictory: contradictory.length
      });
      
      // Get recent contradictory discrepancies
      setRecentDiscrepancies(contradictory.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadge = (score) => {
    if (score >= 4) return 'bg-green-100 text-green-800';
    if (score >= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Hero Skeleton */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-8 shadow-lg animate-pulse">
          <div className="h-10 bg-blue-800 rounded w-64 mb-4"></div>
          <div className="h-6 bg-blue-800 rounded w-full max-w-2xl"></div>
        </div>
        
        <SkeletonStats count={4} />
        <SkeletonList items={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AiDisclaimer showSources className="mb-4" />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-lg p-8 shadow-lg">
        <h1 className="text-4xl font-bold mb-4">ClearVote 2.0</h1>
        <p className="text-xl text-blue-100 max-w-2xl">
          AI-powered civic transparency platform that cross-references California legislators' 
          voting records with their public statements to detect discrepancies.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold text-blue-900">{stats.legislators}</div>
          <div className="text-gray-600">Legislators Tracked</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold text-green-700">{stats.bills}</div>
          <div className="text-gray-600">Bills Analyzed</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold text-yellow-700">{stats.discrepancies}</div>
          <div className="text-gray-600">Total Checks</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500 hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold text-red-700">{stats.contradictory}</div>
          <div className="text-gray-600">Contradictions Found</div>
        </div>
      </div>

      {/* Recent Contradictions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Recent Contradictions</h2>
        
        {recentDiscrepancies.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No contradictions detected yet</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-4">
              Start by analyzing legislators to find potential contradictions between their public statements and voting records.
            </p>
            <Link 
              to="/legislators" 
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Browse Legislators
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {recentDiscrepancies.map((d) => (
                <div 
                  key={d.id} 
                  className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg hover:bg-red-100 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/legislators/${d.legislator_id}`}
                        className="font-semibold text-blue-900 hover:underline"
                      >
                        {d.legislator_name}
                      </Link>
                      <span className="text-gray-400">•</span>
                      <Link 
                        to={`/bills/${d.bill_id}`}
                        className="text-blue-700 hover:underline"
                      >
                        {d.bill_number}
                      </Link>
                    </div>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getConfidenceBadge(d.confidence_score)}`}>
                      Confidence: {d.confidence_score}/5
                    </span>
                  </div>
                  
                  {/* Claim excerpt */}
                  <div className="mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Claim:</span>
                    <p className="text-gray-800 text-sm italic mt-1">
                      "{d.statement_summary || d.statement_content?.slice(0, 100)}..."
                    </p>
                  </div>
                  
                  {/* Vote */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Vote:</span>
                    <span className={`px-2 py-0.5 rounded text-sm font-bold ${
                      d.vote === 'yes' ? 'bg-green-200 text-green-800' : 
                      d.vote === 'no' ? 'bg-red-200 text-red-800' : 
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {d.vote?.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Explanation */}
                  <p className="text-gray-700 text-sm mb-2">{d.explanation}</p>
                  
                  {/* Source */}
                  <SourceCitation 
                    sourceName={d.source_name}
                    sourceUrl={d.source_url}
                    publishedDate={d.published_date}
                  />
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-center">
              <Link 
                to="/discrepancies" 
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                View all discrepancies
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📰</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">1. Collect Statements</h3>
            <ul className="text-gray-600 text-sm text-left space-y-1">
              <li>• News articles & press releases</li>
              <li>• Official campaign websites</li>
              <li>• Verified social media accounts</li>
            </ul>
          </div>
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🗳️</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">2. Match with Votes</h3>
            <ul className="text-gray-600 text-sm text-left space-y-1">
              <li>• CA Legislature roll call votes</li>
              <li>• Committee votes & amendments</li>
              <li>• Bill co-sponsorship records</li>
            </ul>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">3. AI Analysis</h3>
            <ul className="text-gray-600 text-sm text-left space-y-1">
              <li>• GPT-4 cross-references claims</li>
              <li>• Confidence scoring (1-5 scale)</li>
              <li>• Flags contradictions for review</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;