// Consistent color coding for discrepancy types
export const typeColors = {
  contradictory: {
    border: 'border-red-500',
    bg: 'bg-red-50',
    bgHover: 'hover:bg-red-100',
    badge: 'bg-red-100 text-red-800 border-red-300',
    text: 'text-red-700',
    icon: '❌'
  },
  nuanced: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-50',
    bgHover: 'hover:bg-yellow-100',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    text: 'text-yellow-700',
    icon: '⚠️'
  },
  consistent: {
    border: 'border-green-500',
    bg: 'bg-green-50',
    bgHover: 'hover:bg-green-100',
    badge: 'bg-green-100 text-green-800 border-green-300',
    text: 'text-green-700',
    icon: '✅'
  },
  default: {
    border: 'border-gray-300',
    bg: 'bg-gray-50',
    bgHover: 'hover:bg-gray-100',
    badge: 'bg-gray-100 text-gray-800',
    text: 'text-gray-700',
    icon: '❓'
  }
};

// Confidence score colors
export const confidenceColors = {
  high: {
    text: 'text-green-600',
    bg: 'bg-green-50',
    badge: 'bg-green-100 text-green-800'
  },
  medium: {
    text: 'text-yellow-600',
    bg: 'bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-800'
  },
  low: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-800'
  }
};

export const getConfidenceStyle = (score) => {
  if (score >= 4) return confidenceColors.high;
  if (score >= 3) return confidenceColors.medium;
  return confidenceColors.low;
};

export const getTypeStyle = (type) => {
  return typeColors[type] || typeColors.default;
};

// Vote colors
export const voteColors = {
  yes: {
    badge: 'bg-green-100 text-green-800 border-green-300',
    bg: 'bg-green-200 text-green-800'
  },
  no: {
    badge: 'bg-red-100 text-red-800 border-red-300',
    bg: 'bg-red-200 text-red-800'
  },
  abstain: {
    badge: 'bg-gray-100 text-gray-800 border-gray-300',
    bg: 'bg-gray-200 text-gray-800'
  },
  default: {
    badge: 'bg-gray-100 text-gray-800 border-gray-300',
    bg: 'bg-gray-200 text-gray-800'
  }
};

export const getVoteStyle = (vote) => {
  const normalizedVote = vote?.toLowerCase();
  return voteColors[normalizedVote] || voteColors.default;
};