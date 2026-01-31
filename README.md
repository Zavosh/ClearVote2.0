# ClearVote 2.0

AI-powered civic transparency platform that cross-references California legislators' voting records with their public statements to detect discrepancies.

## Overview

ClearVote 2.0 uses AI to analyze whether California legislators' votes on bills align with their public statements and campaign promises. The platform:

1. **Collects public statements** from news articles and official sources
2. **Matches statements to votes** using AI-powered text analysis
3. **Detects discrepancies** between what legislators say and how they vote
4. **Presents findings** with confidence scores and detailed explanations

## Features

- 📰 Automated news collection from NewsAPI and Google News RSS
- 🗳️ CA Legislature web scraping for voting records
- 🤖 GPT-4 powered discrepancy analysis
- 📊 Interactive dashboard with statistics
- 🔍 Detailed legislator and bill profiles
- ⚠️ Confidence scoring with human review flags

## Tech Stack

**Frontend:**
- React 18 + Vite
- React Router
- TailwindCSS

**Backend:**
- Node.js + Express
- SQLite database
- Cheerio + Puppeteer for web scraping
- OpenAI GPT-4o-mini for analysis

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key
- NewsAPI key (free tier)

### Installation

1. **Clone and install dependencies:**
```bash
cd ClearVote2.0
npm install
```

2. **Set up environment variables:**
```bash
cd server
cp .env.example .env
# Edit .env and add your API keys:
# OPENAI_API_KEY=your_key_here
# NEWSAPI_KEY=your_key_here
```

3. **Seed the database:**
```bash
npm run seed
```

4. **Fetch voting records:**
```bash
npm run fetch-votes
```

5. **Start the development servers:**
```bash
npm run dev
```

This will start:
- Backend API at http://localhost:3001
- Frontend at http://localhost:5173

### Usage

1. Visit http://localhost:5173
2. Browse legislators and bills
3. Click "Analyze Statements" on a legislator page to fetch news and run AI analysis
4. View discrepancies in the dashboard or discrepancies page

## API Endpoints

### Legislators
- `GET /api/legislators` - List all legislators
- `GET /api/legislators/:id` - Get legislator with votes and discrepancies

### Bills
- `GET /api/bills` - List all bills
- `GET /api/bills/:id` - Get bill with votes and discrepancies

### Statements
- `GET /api/statements` - List statements
- `POST /api/statements/fetch/:legislatorId` - Fetch news for legislator

### Discrepancies
- `GET /api/discrepancies` - List all discrepancies
- `GET /api/discrepancies/:id` - Get single discrepancy

### Analysis
- `POST /api/analyze/legislator/:id` - Analyze legislator's statements
- `POST /api/analyze/all` - Run full analysis

## Data Sources

- **CA Legislature:** https://leginfo.legislature.ca.gov (web scraping)
- **NewsAPI:** https://newsapi.org (news articles)
- **Google News RSS:** Free news aggregation

## Project Structure

```
ClearVote2.0/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   └── services/    # API client
│   └── package.json
├── server/              # Node.js backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── models/      # Database schema
│   ├── data/            # SQLite database
│   └── package.json
└── package.json
```

## Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run seed` - Seed database with legislators and bills
- `npm run fetch-votes` - Scrape voting records from CA Legislature
- `npm run analyze` - Run AI analysis on all statement-vote pairs

## Cost Estimates

- **OpenAI GPT-4o-mini:** ~$0.06 per 100 analyses
- **NewsAPI:** Free tier (100 requests/day)
- **Google News RSS:** Free, no limits
- **CA Legislature:** Free public data

## Contributing

This is a hackathon project. For production use, consider:
- Adding authentication and rate limiting
- Implementing caching for scraped data
- Adding more robust error handling
- Building a review queue for flagged discrepancies

## License

MIT
