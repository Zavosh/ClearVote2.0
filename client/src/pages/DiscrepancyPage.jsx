import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import FilterBar from '../components/FilterBar';
import EvidenceCard from '../components/EvidenceCard';
import AiDisclaimer from '../components/AiDisclaimer';
import { SkeletonList } from '../components/SkeletonLoaders';

function DiscrepancyPage() {
  const { id } = useParams();
  const [discrepancies, setDiscrepancies] = useState([]);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    showOnlyContradictions: false,
    sortBy: 'confidence',
    minConfidence: '',
    chamber: [],
    party: [],
    district: [],
    billStatus: [],
    topics: []
  });

  useEffect(() => {
    if (id) {
      fetchDiscrepancy(id);
    } else {
      fetchDiscrepancies();
    }
  }, [id]);

  const fetchDiscrepancies = async () => {
    try {
      setLoading(true);
      const data = await api.getDiscrepancies();
      setDiscrepancies(data);
    } catch (error) {
      console.error('Error fetching discrepancies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscrepancy = async (discrepancyId) => {
    try {
      setLoading(true);
      const data = await api.getDiscrepancy(discrepancyId);
      setSelectedDiscrepancy(data);
    } catch (error) {
      console.error('Error fetching discrepancy:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort discrepancies
  const filteredDiscrepancies = useMemo(() => {
    let result = [...discrepancies];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(d => 
        d.legislator_name?.toLowerCase().includes(searchLower) ||
        d.bill_number?.toLowerCase().includes(searchLower) ||
        d.bill_title?.toLowerCase().includes(searchLower) ||
        d.statement_content?.toLowerCase().includes(searchLower) ||
        d.explanation?.toLowerCase().includes(searchLower)
      );
    }

    // Show only contradictions
    if (filters.showOnlyContradictions) {
      result = result.filter(d => d.discrepancy_type === 'contradictory');
    }

    // Min confidence filter
    if (filters.minConfidence) {
      const minConf = parseInt(filters.minConfidence);
      result = result.filter(d => d.confidence_score >= minConf);
    }

    // Chamber filter
    if (filters.chamber?.length > 0) {
      result = result.filter(d => filters.chamber.includes(d.chamber));
    }

    // Party filter
    if (filters.party?.length > 0) {
      result = result.filter(d => filters.party.includes(d.party));
    }

    // Sorting
    switch (filters.sortBy) {
      case 'confidence':
        result.sort((a, b) => b.confidence_score - a.confidence_score);
        break;
      case 'recent':
        result.sort((a, b) => new Date(b.vote_date) - new Date(a.vote_date));
        break;
      case 'checks':
        // Group by legislator and sort by count
        result.sort((a, b) => {
          const aCount = discrepancies.filter(d => d.legislator_id === a.legislator_id).length;
          const bCount = discrepancies.filter(d => d.legislator_id === b.legislator_id).length;
          return bCount - aCount;
        });
        break;
      case 'controversial':
        // Sort by contradictory first, then by confidence
        result.sort((a, b) => {
          if (a.discrepancy_type === 'contradictory' && b.discrepancy_type !== 'contradictory') return -1;
          if (b.discrepancy_type === 'contradictory' && a.discrepancy_type !== 'contradictory') return 1;
          return b.confidence_score - a.confidence_score;
        });
        break;
      default:
        break;
    }

    return result;
  }, [discrepancies, filters]);

  const handleReportIssue = (discrepancyId, type) => {
    // TODO: Implement reporting functionality
    console.log(`Report ${type} for discrepancy ${discrepancyId}`);
    alert(`Thank you for your feedback. This ${type} has been reported for review.`);
  };

  // Single discrepancy view
  if (id && selectedDiscrepancy) {
    return (
      <div className="space-y-6">
        <Link to="/discrepancies" className="text-blue-600 hover:underline flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to all discrepancies
        </Link>

        <EvidenceCard 
          discrepancy={selectedDiscrepancy} 
          onReportIssue={handleReportIssue}
        />
      </div>
    );
  }

  // List view
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Consistency Checks</h1>
            <p className="text-gray-600 mt-1">
              Evidence-based comparison of public claims vs voting records
            </p>
          </div>
        </div>
        <SkeletonList items={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AiDisclaimer className="mb-4" />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Consistency Checks</h1>
          <p className="text-gray-600 mt-1">
            Evidence-based comparison of public claims vs voting records
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar 
        filters={filters}
        onFilterChange={setFilters}
        totalResults={filteredDiscrepancies.length}
      />

      {/* Results */}
      <div className="space-y-4">
        {filteredDiscrepancies.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-md">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No consistency checks match your filters
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-4">
              Try adjusting your filters to see more results. You can clear all filters to see every available check.
            </p>
            <button
              onClick={() => setFilters({
                search: '',
                showOnlyContradictions: false,
                sortBy: 'confidence',
                minConfidence: '',
                chamber: [],
                party: [],
                district: [],
                billStatus: [],
                topics: []
              })}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          filteredDiscrepancies.map((d) => (
            <EvidenceCard 
              key={d.id}
              discrepancy={d}
              onReportIssue={handleReportIssue}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default DiscrepancyPage;