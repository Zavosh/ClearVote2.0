import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function BillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '' });

  useEffect(() => {
    fetchBills();
  }, [filter]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await api.getBills(filter);
      setBills(data);
    } catch (error) {
      console.error('Error fetching bills:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading bills...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">California Bills</h1>
        
        <select 
          value={filter.status}
          onChange={(e) => setFilter({ status: e.target.value })}
          className="border rounded-md px-3 py-2"
        >
          <option value="">All Statuses</option>
          <option value="chaptered">Chaptered (Passed)</option>
          <option value="vetoed">Vetoed</option>
          <option value="failed">Failed</option>
          <option value="in_committee">In Committee</option>
          <option value="active">Active</option>
        </select>
      </div>

      <div className="space-y-4">
        {bills.map((bill) => (
          <Link 
            key={bill.id}
            to={`/bills/${bill.id}`}
            className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-xl text-blue-900">{bill.bill_number}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(bill.status)}`}>
                    {bill.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{bill.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-2">{bill.summary}</p>
                {bill.topics && typeof bill.topics === 'string' && (
                  <div className="flex gap-2 mt-3">
                    {JSON.parse(bill.topics).map((topic, i) => (
                      <span key={i} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default BillsPage;
