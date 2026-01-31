import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function LegislatorsPage() {
  const [legislators, setLegislators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ chamber: '', party: '', district: '' });

  useEffect(() => {
    fetchLegislators();
  }, [filter]);

  const fetchLegislators = async () => {
    try {
      setLoading(true);
      const data = await api.getLegislators(filter);
      setLegislators(data);
    } catch (error) {
      console.error('Error fetching legislators:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChamberLabel = (chamber) => chamber === 'upper' ? 'Senate' : 'Assembly';
  const getPartyColor = (party) => {
    if (party === 'Democratic') return 'bg-blue-100 text-blue-800';
    if (party === 'Republican') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading legislators...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">California Legislators</h1>
        
        {/* Filters */}
        <div className="flex gap-4">
          <select 
            value={filter.chamber}
            onChange={(e) => setFilter({ ...filter, chamber: e.target.value })}
            className="border rounded-md px-3 py-2"
          >
            <option value="">All Chambers</option>
            <option value="upper">Senate</option>
            <option value="lower">Assembly</option>
          </select>
          
          <select 
            value={filter.party}
            onChange={(e) => setFilter({ ...filter, party: e.target.value })}
            className="border rounded-md px-3 py-2"
          >
            <option value="">All Parties</option>
            <option value="Democratic">Democratic</option>
            <option value="Republican">Republican</option>
          </select>
          
          <input
            type="text"
            placeholder="District #"
            value={filter.district}
            onChange={(e) => setFilter({ ...filter, district: e.target.value })}
            className="border rounded-md px-3 py-2 w-24"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {legislators.map((legislator) => (
          <Link 
            key={legislator.id}
            to={`/legislators/${legislator.id}`}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
                👤
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900">{legislator.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPartyColor(legislator.party)}`}>
                    {legislator.party}
                  </span>
                  <span className="text-gray-600 text-sm">
                    {getChamberLabel(legislator.chamber)} District {legislator.district}
                  </span>
                </div>
                {legislator.twitter_handle && (
                  <p className="text-blue-600 text-sm mt-2">{legislator.twitter_handle}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default LegislatorsPage;
