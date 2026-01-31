import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import TabNavigation from '../components/TabNavigation';
import EvidenceCard from '../components/EvidenceCard';

function BillDetailPage() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    fetchBill();
  }, [id]);

  const fetchBill = async () => {
    try {
      setLoading(true);
      const data = await api.getBill(id);
      setBill(data);
    } catch (error) {
      console.error('Error fetching bill:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'chaptered': return 'bg-green-100 text-green-800';
      case 'vetoed': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-gray-100 text-gray-800';
      case 'in_committee': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'chaptered': return 'Chaptered (Signed into Law)';
      case 'vetoed': return 'Vetoed by Governor';
      case 'failed': return 'Failed';
      case 'in_committee': return 'In Committee';
      default: return status?.replace('_', ' ') || 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading bill...</div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800">Bill not found</h2>
        <Link to="/bills" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to bills
        </Link>
      </div>
    );
  }

  // Categorize votes
  const yesVotes = (bill.votes || []).filter(v => v.vote === 'yes');
  const noVotes = (bill.votes || []).filter(v => v.vote === 'no');
  const absentVotes = (bill.votes || []).filter(v => v.vote === 'absent' || v.vote === 'not_voting');

  // Tab configuration
  const tabs = [
    { id: 'summary', label: 'Summary', icon: '📄' },
    { id: 'votes', label: 'Roll Call Votes', icon: '🗳️', count: bill.votes?.length || 0 },
    { id: 'claims', label: 'Related Claims', icon: '💬', count: bill.discrepancies?.length || 0 }
  ];

  const tabCounts = {
    votes: bill.votes?.length || 0,
    claims: bill.discrepancies?.length || 0
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-bold text-3xl text-blue-900">{bill.bill_number}</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(bill.status)}`}>
            {getStatusLabel(bill.status)}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{bill.title}</h1>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{yesVotes.length}</div>
            <div className="text-sm text-gray-600">Yes Votes</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{noVotes.length}</div>
            <div className="text-sm text-gray-600">No Votes</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-700">{absentVotes.length}</div>
            <div className="text-sm text-gray-600">Absent/Not Voting</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">{bill.discrepancies?.length || 0}</div>
            <div className="text-sm text-gray-600">Related Claims</div>
          </div>
        </div>

        {bill.topics && typeof bill.topics === 'string' && (
          <div className="flex gap-2 flex-wrap">
            {JSON.parse(bill.topics).map((topic, i) => (
              <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                {topic}
              </span>
            ))}
          </div>
        )}

        {bill.full_text_url && typeof bill.full_text_url === 'string' && (
          <a 
            href={bill.full_text_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 text-blue-600 hover:underline"
          >
            View full text on CA Legislature →
          </a>
        )}
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
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">Bill Summary</h2>
              <p className="text-gray-700 leading-relaxed">{bill.summary || 'No summary available.'}</p>
            </div>

            {bill.vote_counts && typeof bill.vote_counts === 'object' && (
              <div>
                <h2 className="text-xl font-bold mb-3">Vote Summary</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-700">{bill.vote_counts.yes || 0}</div>
                    <div className="text-green-600">Yes</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-3xl font-bold text-red-700">{bill.vote_counts.no || 0}</div>
                    <div className="text-red-600">No</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-gray-700">{bill.vote_counts.not_voting || 0}</div>
                    <div className="text-gray-600">Not Voting</div>
                  </div>
                </div>
              </div>
            )}

            {bill.history && bill.history.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-3">Bill History</h2>
                <div className="space-y-2">
                  {bill.history.map((event, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500 whitespace-nowrap">{event.date}</div>
                      <div>
                        <div className="font-medium">{event.action}</div>
                        {event.chamber && (
                          <div className="text-sm text-gray-600">{event.chamber}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Roll Call Votes Tab */}
        {activeTab === 'votes' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Roll Call Votes</h2>
            
            {bill.votes?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No roll call votes recorded for this bill.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Yes Votes */}
                {yesVotes.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      Voted YES ({yesVotes.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {yesVotes.map((vote, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <Link 
                            to={`/legislators/${vote.legislator_id}`}
                            className="font-medium text-blue-900 hover:underline"
                          >
                            {vote.legislator_name}
                          </Link>
                          <span className="text-sm text-gray-500">{vote.party}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Votes */}
                {noVotes.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      Voted NO ({noVotes.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {noVotes.map((vote, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <Link 
                            to={`/legislators/${vote.legislator_id}`}
                            className="font-medium text-blue-900 hover:underline"
                          >
                            {vote.legislator_name}
                          </Link>
                          <span className="text-sm text-gray-500">{vote.party}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Absent/Not Voting */}
                {absentVotes.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                      Absent / Not Voting ({absentVotes.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {absentVotes.map((vote, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <Link 
                            to={`/legislators/${vote.legislator_id}`}
                            className="font-medium text-blue-900 hover:underline"
                          >
                            {vote.legislator_name}
                          </Link>
                          <span className="text-sm text-gray-500">{vote.party}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Related Claims Tab */}
        {activeTab === 'claims' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Related Claims</h2>
            <p className="text-gray-600 mb-4">
              Public statements made by legislators about this bill, compared with their actual votes.
            </p>
            
            {bill.discrepancies?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg">No related claims found.</p>
                <p className="text-sm mt-2">
                  We haven't found any public statements from legislators about this bill yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bill.discrepancies.map((d) => (
                  <EvidenceCard 
                    key={d.id}
                    discrepancy={{
                      ...d,
                      bill_number: bill.bill_number,
                      bill_title: bill.title
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BillDetailPage;