import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import Admin from './pages/Admin.jsx';
import Pass from './pages/Pass.jsx';

function Nav() {
  const { user, logout } = useAuth();
  return user ? (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-slate-500 sm:inline">{user.name}</span>
      <Link className="btn-ghost btn-sm" to={user.role === 'admin' ? '/admin' : '/home'}>Dashboard</Link>
      <button className="btn-primary btn-sm" onClick={logout}>Log out</button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link className="btn-ghost btn-sm" to="/pass">Visitor pass</Link>
      <Link className="btn-ghost btn-sm" to="/login">Log in</Link>
      <Link className="btn-primary btn-sm" to="/register">Register</Link>
    </div>
  );
}
function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/home'} replace />;
  return children;
}
export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm text-white">V</span>
            <span>Visit<span className="text-indigo-600">Pass</span></span>
          </Link>
          <Nav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth register />} />
          <Route path="/home" element={<Protected role="user"><Home /></Protected>} />
          <Route path="/admin" element={<Protected role="admin"><Admin /></Protected>} />
          <Route path="/pass" element={<Pass />} />
          <Route path="/pass/:code" element={<Pass />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 print:hidden">© VisitPass · Visitor Management</footer>
    </div>
  );
}