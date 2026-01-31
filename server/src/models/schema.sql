-- ClearVote 2.0 Database Schema
-- SQLite Database

-- legislators: CA State legislators
CREATE TABLE IF NOT EXISTS legislators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    party TEXT,
    chamber TEXT,
    district TEXT,
    photo_url TEXT,
    twitter_handle TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- bills: Target bills
CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    session TEXT,
    status TEXT,
    topics TEXT,
    full_text_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- votes: Individual legislator votes
CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legislator_id TEXT NOT NULL,
    bill_id TEXT NOT NULL,
    vote TEXT NOT NULL,
    vote_date DATE,
    vote_type TEXT,
    FOREIGN KEY (legislator_id) REFERENCES legislators(id),
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    UNIQUE(legislator_id, bill_id, vote_type)
);

-- statements: Campaign/public statements
CREATE TABLE IF NOT EXISTS statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legislator_id TEXT NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT,
    source_name TEXT,
    article_title TEXT,
    author TEXT,
    published_date DATE,
    topics TEXT,
    source_type TEXT DEFAULT 'news',
    is_direct_quote BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (legislator_id) REFERENCES legislators(id)
);

-- discrepancies: AI-detected discrepancies
CREATE TABLE IF NOT EXISTS discrepancies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legislator_id TEXT NOT NULL,
    statement_id INTEGER NOT NULL,
    bill_id TEXT NOT NULL,
    vote_id INTEGER NOT NULL,
    discrepancy_type TEXT NOT NULL,
    confidence_score INTEGER,
    explanation TEXT,
    statement_summary TEXT,
    vote_summary TEXT,
    requires_review BOOLEAN DEFAULT FALSE,
    reviewed BOOLEAN DEFAULT FALSE,
    review_verdict TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (legislator_id) REFERENCES legislators(id),
    FOREIGN KEY (statement_id) REFERENCES statements(id),
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (vote_id) REFERENCES votes(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_votes_legislator ON votes(legislator_id);
CREATE INDEX IF NOT EXISTS idx_votes_bill ON votes(bill_id);
CREATE INDEX IF NOT EXISTS idx_statements_legislator ON statements(legislator_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_legislator ON discrepancies(legislator_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_type ON discrepancies(discrepancy_type);
