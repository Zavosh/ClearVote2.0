import { useState } from 'react';

function FilterBar({ filters, onFilterChange, totalResults }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearchChange = (e) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleToggleContradictions = () => {
    onFilterChange({ 
      ...filters, 
      showOnlyContradictions: !filters.showOnlyContradictions 
    });
  };

  const handleSortChange = (e) => {
    onFilterChange({ ...filters, sortBy: e.target.value });
  };

  const handleChipToggle = (chipType, value) => {
    const currentValues = filters[chipType] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onFilterChange({ ...filters, [chipType]: newValues });
  };

  const handleConfidenceChange = (e) => {
    onFilterChange({ ...filters, minConfidence: e.target.value });
  };

  const clearAllFilters = () => {
    onFilterChange({
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
  };

  const hasActiveFilters = filters.search || 
    filters.showOnlyContradictions || 
    filters.minConfidence ||
    (filters.chamber?.length > 0) ||
    (filters.party?.length > 0) ||
    (filters.district?.length > 0) ||
    (filters.billStatus?.length > 0) ||
    (filters.topics?.length > 0);

  const filterChips = {
    chamber: [
      { label: 'Senate', value: 'upper' },
      { label: 'Assembly', value: 'lower' }
    ],
    party: [
      { label: 'Democratic', value: 'Democratic' },
      { label: 'Republican', value: 'Republican' },
      { label: 'Independent', value: 'Independent' }
    ],
    billStatus: [
      { label: 'Chaptered', value: 'chaptered' },
      { label: 'Vetoed', value: 'vetoed' },
      { label: 'In Committee', value: 'in_committee' },
      { label: 'Failed', value: 'failed' }
    ]
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sticky top-0 z-10 mb-6">
      {/* Primary Controls Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search legislators, bills, claims..."
              value={filters.search || ''}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Toggle: Show Only Contradictions */}
        <button
          onClick={handleToggleContradictions}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            filters.showOnlyContradictions 
              ? 'bg-red-100 text-red-700 border-2 border-red-300' 
              : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {filters.showOnlyContradictions ? 'Showing Contradictions Only' : 'Show All Checks'}
        </button>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Sort by:</label>
          <select
            value={filters.sortBy || 'confidence'}
            onChange={handleSortChange}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="confidence">Highest Confidence</option>
            <option value="recent">Most Recent</option>
            <option value="checks">Most Checks</option>
            <option value="controversial">Most Controversial</option>
          </select>
        </div>

        {/* Confidence Threshold */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Min Confidence:</label>
          <select
            value={filters.minConfidence || ''}
            onChange={handleConfidenceChange}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Any</option>
            <option value="4">High (4-5)</option>
            <option value="3">Medium (3+)</option>
          </select>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
        >
          {showAdvanced ? 'Hide Filters' : 'More Filters'}
          <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Clear All */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear all
          </button>
        )}
      </div>

      {/* Advanced Filters Section */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          {/* Chamber Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Chamber</label>
            <div className="flex flex-wrap gap-2">
              {filterChips.chamber.map(chip => (
                <button
                  key={chip.value}
                  onClick={() => handleChipToggle('chamber', chip.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.chamber?.includes(chip.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Party Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Party</label>
            <div className="flex flex-wrap gap-2">
              {filterChips.party.map(chip => (
                <button
                  key={chip.value}
                  onClick={() => handleChipToggle('party', chip.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.party?.includes(chip.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bill Status Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Bill Status</label>
            <div className="flex flex-wrap gap-2">
              {filterChips.billStatus.map(chip => (
                <button
                  key={chip.value}
                  onClick={() => handleChipToggle('billStatus', chip.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filters.billStatus?.includes(chip.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      {totalResults !== undefined && (
        <div className="mt-4 pt-3 border-t border-gray-100 text-sm text-gray-600">
          Showing {totalResults} result{totalResults !== 1 ? 's' : ''}
          {hasActiveFilters && ' with current filters'}
        </div>
      )}
    </div>
  );
}

export default FilterBar;