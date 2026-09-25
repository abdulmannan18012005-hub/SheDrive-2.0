import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Users, Activity, FileText, LogOut, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

// --- API Service ---
const api = axios.create({
  baseURL: 'http://localhost:3005/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Screens ---

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/login', { email, password });
      localStorage.setItem('admin_token', res.data.token);
      onLogin();
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-md">
        <div className="flex justify-center mb-6 text-primary">
          <Shield size={48} />
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">SheDrive Admin</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" placeholder="Admin Email" required
            className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password" required
            className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
            value={password} onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full bg-primary text-white p-3 rounded-lg font-bold hover:bg-pink-600 transition">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardOverview() {
  const [stats, setStats] = useState({ total_drivers: 0, pending_verifications: 0, active_passengers: 0, completed_rides: 0 });

  useEffect(() => {
    api.get('/admin/dashboard/stats').then(res => setStats(res.data)).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Drivers" value={stats.total_drivers} icon={<Users className="text-blue-500" />} />
        <StatCard title="Pending Approvals" value={stats.pending_verifications} icon={<Shield className="text-orange-500" />} />
        <StatCard title="Active Passengers" value={stats.active_passengers} icon={<Users className="text-green-500" />} />
        <StatCard title="Completed Rides" value={stats.completed_rides} icon={<Activity className="text-primary" />} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
      </div>
      <div className="bg-slate-50 p-4 rounded-full">{icon}</div>
    </div>
  );
}

function DriverVerificationQueue() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  const fetchDrivers = () => {
    api.get('/admin/drivers/pending').then(res => setDrivers(res.data.drivers)).catch(console.error);
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleVerify = async (id: string, status: string, reason?: string) => {
    try {
      await api.post(`/admin/drivers/${id}/verify`, { status, rejection_reason: reason });
      setSelectedDriver(null);
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert('Verification failed');
    }
  };

  if (selectedDriver) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedDriver(null)} className="text-primary font-medium">&larr; Back to Queue</button>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Review Driver: {selectedDriver.name}</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-slate-500">Email / Phone</p>
              <p className="font-medium">{selectedDriver.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Vehicle</p>
              <p className="font-medium">{selectedDriver.vehicle_make} {selectedDriver.vehicle_model} ({selectedDriver.vehicle_category})</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => handleVerify(selectedDriver.driver_id, 'approved')} className="bg-green-500 text-white px-6 py-2 rounded font-bold flex items-center gap-2">
              <CheckCircle size={18} /> Approve Driver
            </button>
            <button onClick={() => {
              const reason = prompt("Enter rejection reason:");
              if (reason) handleVerify(selectedDriver.driver_id, 'rejected', reason);
            }} className="bg-red-500 text-white px-6 py-2 rounded font-bold flex items-center gap-2">
              <XCircle size={18} /> Reject Driver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Verification Queue</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-sm font-medium text-slate-600">Name</th>
              <th className="p-4 text-sm font-medium text-slate-600">Email</th>
              <th className="p-4 text-sm font-medium text-slate-600">Vehicle</th>
              <th className="p-4 text-sm font-medium text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-slate-500">No pending verifications</td></tr>
            )}
            {drivers.map(d => (
              <tr key={d.driver_id} className="border-b border-slate-100">
                <td className="p-4">{d.name}</td>
                <td className="p-4 text-slate-600">{d.email}</td>
                <td className="p-4"><span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs">{d.vehicle_category}</span></td>
                <td className="p-4">
                  <button onClick={() => setSelectedDriver(d)} className="text-primary font-medium text-sm hover:underline">Review &rarr;</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/audit-logs').then(res => setLogs(res.data.logs)).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-sm font-medium text-slate-600">Timestamp</th>
              <th className="p-4 text-sm font-medium text-slate-600">Admin</th>
              <th className="p-4 text-sm font-medium text-slate-600">Action</th>
              <th className="p-4 text-sm font-medium text-slate-600">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-slate-500">No logs found</td></tr>
            )}
            {logs.map(log => (
              <tr key={log.id} className="border-b border-slate-100">
                <td className="p-4 text-sm text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-4 text-sm">{log.admin_email}</td>
                <td className="p-4 text-sm font-medium"><span className="bg-slate-100 px-2 py-1 rounded text-slate-700">{log.action}</span></td>
                <td className="p-4 text-sm text-slate-600 truncate max-w-xs">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Layout ---

function Layout({ children, onLogout }: any) {
  const loc = useLocation();
  const navItems = [
    { path: '/', label: 'Dashboard', icon: <Activity size={20} /> },
    { path: '/verification', label: 'Verifications', icon: <Shield size={20} /> },
    { path: '/audit', label: 'Audit Logs', icon: <FileText size={20} /> },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center gap-3">
          <Shield className="text-primary" />
          <span className="font-bold text-lg text-slate-800">SheDrive Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={`flex items-center gap-3 p-3 rounded-lg transition ${loc.pathname === item.path ? 'bg-pink-50 text-primary font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button onClick={onLogout} className="flex items-center gap-3 p-3 w-full text-left text-slate-600 hover:bg-slate-50 rounded-lg transition">
            <LogOut size={20} /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('admin_token'));

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };

  return (
    <Layout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<DashboardOverview />} />
        <Route path="/verification" element={<DriverVerificationQueue />} />
        <Route path="/audit" element={<AuditLogViewer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
