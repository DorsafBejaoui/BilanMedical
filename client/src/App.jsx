import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import BilansSanguins from './pages/BilansSanguins.jsx';
import Radiologie from './pages/Radiologie.jsx';
import RendezVous from './pages/RendezVous.jsx';
import Resumes from './pages/Resumes.jsx';
import Synthese from './pages/Synthese.jsx';
import Profil from './pages/Profil.jsx';

const nav = [
  { to: '/', label: 'Tableau de bord', icon: '🏠', end: true },
  { to: '/synthese', label: 'Synthèse santé', icon: '🧠' },
  { to: '/bilans-sanguins', label: 'Bilans sanguins', icon: '📊' },
  { to: '/radiologie', label: 'Rapports Radiologie', icon: '🩻' },
  { to: '/rendez-vous', label: 'Rendez-vous', icon: '📅' },
  { to: '/resumes', label: 'Résumés médicaux', icon: '📋' },
  { to: '/profil', label: 'Mon profil', icon: '👤' },
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
          <Route path="/synthese" element={<Synthese />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/bilans-sanguins" element={<BilansSanguins />} />
          <Route path="/radiologie" element={<Radiologie />} />
          <Route path="/rendez-vous" element={<RendezVous />} />
          <Route path="/resumes" element={<Resumes />} />
        </Routes>
      </main>
    </div>
  );
}
