import { useState, useEffect } from 'react';
import api from '../services/api';

function CampaignPromiseChecker() {
  const [legislatorId, setLegislatorId] = useState('');
  const [promise, setPromise] = useState('');
  const [billId, setBillId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clear error when user changes any field
  useEffect(() => {
    if (error) setError(null);
  }, [legislatorId, promise, billId]);

  const handleCheck = async () => {
    if (!legislatorId || !promise || !billId) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await api.checkCampaignPromise({
        legislator_id: legislatorId,
        promise: promise,
        bill_id: billId
      });

      setResult(response);
    } catch (err) {
      setError(err.message || 'Failed to check promise');
    } finally {
      setLoading(false);
    }
  };

  const getResultColor = (type) => {
    if (type === 'consistent') return 'bg-green-100 border-green-500 text-green-800';
    if (type === 'contradictory') return 'bg-red-100 border-red-500 text-red-800';
    if (type === 'nuanced') return 'bg-yellow-100 border-yellow-500 text-yellow-800';
    return 'bg-gray-100 border-gray-500 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Campaign Promise Checker</h2>
      <p className="text-gray-600 mb-6">
        Enter a legislator's campaign promise and select a bill to see if their vote matches their promise.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Legislator
          </label>
          <select
            value={legislatorId}
            onChange={(e) => setLegislatorId(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Select a legislator...</option>
            <option value="ca-wiener">Scott Wiener (Senate D-11)</option>
            <option value="ca-wicks">Buffy Wicks (Assembly D-14)</option>
            <option value="ca-bauer-kahan">Rebecca Bauer-Kahan (Assembly D-16)</option>
            <option value="ca-low">Evan Low (Assembly D-26)</option>
            <option value="ca-becker">Josh Becker (Senate D-13)</option>
            <option value="ca-essayli">Bill Essayli (Assembly D-63)</option>
            <option value="ca-gallagher">James Gallagher (Assembly D-3)</option>
            <option value="ca-dahle">Brian Dahle (Senate D-1)</option>
            <option value="ca-wahab">Aisha Wahab (Senate D-10)</option>
            <option value="ca-kalra">Ash Kalra (Assembly D-25)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Promise / Statement
          </label>
          <textarea
            value={promise}
            onChange={(e) => setPromise(e.target.value)}
            placeholder="Enter the campaign promise or public statement here..."
            className="w-full border rounded-md px-3 py-2 h-32"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bill to Check Against
          </label>
          <select
            value={billId}
            onChange={(e) => setBillId(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Select a bill...</option>
            <option value="ca-AB853">AB-853 - California AI Transparency Act</option>
            <option value="ca-SB53">SB-53 - Safe and Secure Innovation for Frontier AI Models Act</option>
            <option value="ca-SB1047">SB-1047 - Safe AI Innovation Act (Vetoed)</option>
            <option value="ca-AB2013">AB-2013 - AI Training Data Transparency</option>
            <option value="ca-AB2930">AB-2930 - Automated Decision Tools</option>
          </select>
        </div>

        <button
          onClick={handleCheck}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '🔍 Analyzing with AI...' : 'Check Promise Against Vote'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {result && (
          <div className={`mt-6 p-6 rounded-lg border-l-4 ${getResultColor(result.analysis.discrepancy_type)}`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">
                {result.analysis.discrepancy_type === 'consistent' && '✅'}
                {result.analysis.discrepancy_type === 'contradictory' && '❌'}
                {result.analysis.discrepancy_type === 'nuanced' && '⚠️'}
              </span>
              <div>
                <h3 className="font-bold text-lg capitalize">
                  {result.analysis.discrepancy_type}
                </h3>
                <p className="text-sm">
                  Confidence: {result.analysis.confidence_score}/5
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white bg-opacity-60 p-4 rounded">
                <h4 className="font-semibold mb-2">📝 Your Promise:</h4>
                <p className="italic">"{promise}"</p>
              </div>

              <div className="bg-white bg-opacity-60 p-4 rounded">
                <h4 className="font-semibold mb-2">🗳️ Their Vote:</h4>
                <p>
                  <span className={`font-bold ${result.vote.vote === 'yes' ? 'text-green-600' : result.vote.vote === 'no' ? 'text-red-600' : 'text-gray-600'}`}>
                    {result.vote.vote.toUpperCase()}
                  </span>
                  {' '}on {result.bill.bill_number}
                </p>
              </div>

              <div className="bg-white bg-opacity-60 p-4 rounded">
                <h4 className="font-semibold mb-2">🤖 AI Analysis:</h4>
                <p>{result.analysis.explanation}</p>
              </div>

              {result.analysis.requires_review === true && (
                <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded text-sm">
                  ⚠️ This analysis may require human review
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CampaignPromiseChecker;
