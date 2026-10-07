import { Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import EntryDetail from './pages/EntryDetail';
import EntryForm from './pages/EntryForm';
import AuthPages from './pages/AuthPages';
import Admin from './pages/Admin';
import { useAuth } from './auth';

function GuestOnly({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
}

function MembersOnly({ children }) {
  const { user } = useAuth();
  if (user === undefined) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function MayorsOnly({ children }) {
  const { user } = useAuth();
  if (user === undefined) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/entries/new" element={<MembersOnly><EntryForm /></MembersOnly>} />
        <Route path="/entries/:id" element={<EntryDetail />} />
        <Route path="/entries/:id/edit" element={<MembersOnly><EntryForm /></MembersOnly>} />
        <Route path="/login" element={<GuestOnly><AuthPages mode="login" /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><AuthPages mode="register" /></GuestOnly>} />
        <Route path="/admin" element={<MayorsOnly><Admin /></MayorsOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
