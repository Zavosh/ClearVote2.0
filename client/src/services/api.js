const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  async fetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Legislators
  async getLegislators(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.fetch(`/legislators?${query}`);
  }

  async getLegislator(id) {
    return this.fetch(`/legislators/${id}`);
  }

  // Bills
  async getBills(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.fetch(`/bills?${query}`);
  }

  async getBill(id) {
    return this.fetch(`/bills/${id}`);
  }

  // Statements
  async getStatements(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.fetch(`/statements?${query}`);
  }

  async fetchStatementsForLegislator(legislatorId) {
    return this.fetch(`/statements/fetch/${legislatorId}`, { method: 'POST' });
  }

  // Discrepancies
  async getDiscrepancies(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.fetch(`/discrepancies?${query}`);
  }

  async getDiscrepancy(id) {
    return this.fetch(`/discrepancies/${id}`);
  }

  // Analysis
  async analyzeLegislator(legislatorId) {
    return this.fetch(`/analyze/legislator/${legislatorId}`, { method: 'POST' });
  }

  async analyzeAll() {
    return this.fetch('/analyze/all', { method: 'POST' });
  }

  // Campaign Promise Checker
  async checkCampaignPromise(data) {
    return this.fetch('/check-promise', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

export default new ApiService();
