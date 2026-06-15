import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Suivi from './pages/Suivi.jsx';
import Bilans from './pages/Bilans.jsx';
import BilansSanguins from './pages/BilansSanguins.jsx';
import RendezVous from './pages/RendezVous.jsx';
import Resumes from './pages/Resumes.jsx';

const nav = [
  { to: '/', label: 'Tableau de bord', icon: '🏠', end: true },
  { to: '/suivi', label: 'Suivi de santé', icon: '📈' },
  { to: '/bilans-sanguins', label: 'Bilans sanguins', icon: '📊' },
  { to: '/bilans', label: 'Bilans & examens', icon: '🧪' },
  { to: '/rendez-vous', label: 'Rendez-vous', icon: '📅' },
  { to: '/resumes', label: 'Résumés médicaux', icon: '📋' },
];

export default function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🩺</span>
          <div>
            <h1>BilanMedical</h1>
            <p>Mon carnet de santé</p>
          </div>
        </div>
        <nav>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <footer className="sidebar-footer">Données stockées localement</footer>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/suivi" element={<Suivi />} />
          <Route path="/bilans-sanguins" element={<BilansSanguins />} />
          <Route path="/bilans" element={<Bilans />} />
          <Route path="/rendez-vous" element={<RendezVous />} />
          <Route path="/resumes" element={<Resumes />} />
        </Routes>
      </main>
    </div>
  );
}
