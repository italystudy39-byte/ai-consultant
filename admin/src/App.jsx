import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Conversations from './pages/Conversations.jsx';
import ConversationView from './pages/ConversationView.jsx';
import Knowledge from './pages/Knowledge.jsx';
import Leads from './pages/Leads.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const { me, loading } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-slate-400"><Spinner className="h-6 w-6" /></div>;
  }
  if (!me) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="conversations/:id" element={<ConversationView />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="leads" element={<Leads />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
