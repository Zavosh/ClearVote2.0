import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import LegislatorsPage from './pages/LegislatorsPage'
import LegislatorDetailPage from './pages/LegislatorDetailPage'
import BillsPage from './pages/BillsPage'
import BillDetailPage from './pages/BillDetailPage'
import DiscrepancyPage from './pages/DiscrepancyPage'

function App() {
  const navLinkClass = ({ isActive }) => 
    `transition px-3 py-2 rounded-md ${isActive ? 'bg-blue-800 text-white font-semibold' : 'hover:text-blue-200'}`

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-blue-900 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <NavLink to="/" className="text-2xl font-bold hover:text-blue-200 transition">
                ClearVote 2.0
              </NavLink>
              <nav className="flex gap-2">
                <NavLink to="/" className={navLinkClass} end>Dashboard</NavLink>
                <NavLink to="/legislators" className={navLinkClass}>Legislators</NavLink>
                <NavLink to="/bills" className={navLinkClass}>Bills</NavLink>
                <NavLink to="/discrepancies" className={navLinkClass}>Discrepancies</NavLink>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/legislators" element={<LegislatorsPage />} />
            <Route path="/legislators/:id" element={<LegislatorDetailPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/bills/:id" element={<BillDetailPage />} />
            <Route path="/discrepancies" element={<DiscrepancyPage />} />
            <Route path="/discrepancies/:id" element={<DiscrepancyPage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-gray-400 py-6 mt-12">
          <div className="container mx-auto px-4 text-center">
            <p>ClearVote 2.0 - AI-Powered Civic Transparency</p>
            <p className="text-sm mt-2">Cross-referencing CA legislators' votes with their public statements</p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
