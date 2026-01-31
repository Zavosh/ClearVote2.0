require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const databaseService = require('./services/databaseService');

// Import routes
const legislatorsRoutes = require('./routes/legislators');
const billsRoutes = require('./routes/bills');
const statementsRoutes = require('./routes/statements');
const discrepanciesRoutes = require('./routes/discrepancies');
const analyzeRoutes = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/legislators', legislatorsRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/statements', statementsRoutes);
app.use('/api/discrepancies', discrepanciesRoutes);
app.use('/api/analyze', analyzeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend files
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// SPA fallback - serve index.html for all non-API routes
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    next();
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  try {
    await databaseService.connect();
    await databaseService.initializeSchema();
    
    app.listen(PORT, () => {
      console.log(`ClearVote 2.0 Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
