import { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle,
  Bot,
  Users,
  Download,
  Calendar,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { supportApi } from '../api/support';

const defaultVolumeData = [
  { date: 'Sep 18', total: 145, resolved: 120, escalated: 25 },
  { date: 'Sep 19', total: 162, resolved: 138, escalated: 24 },
  { date: 'Sep 20', total: 138, resolved: 112, escalated: 26 },
  { date: 'Sep 21', total: 195, resolved: 168, escalated: 27 },
  { date: 'Sep 22', total: 178, resolved: 155, escalated: 23 },
  { date: 'Sep 23', total: 98, resolved: 89, escalated: 9 },
  { date: 'Sep 24', total: 82, resolved: 75, escalated: 7 },
];

const defaultCategoryData = [
  { name: 'Billing', value: 35 },
  { name: 'Technical', value: 25 },
  { name: 'Account', value: 20 },
  { name: 'Product Info', value: 15 },
  { name: 'Other', value: 5 },
];

const categoryColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#64748b'];

const defaultResolutionTimeData = [
  { range: '< 1m', count: 450 },
  { range: '1-5m', count: 320 },
  { range: '5-15m', count: 180 },
  { range: '15-60m', count: 90 },
  { range: '> 1h', count: 35 },
];

export default function Analytics() {
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [volumeData, setVolumeData] = useState(defaultVolumeData);
  const [categoryData, setCategoryData] = useState(defaultCategoryData);
  const [resolutionTimeData, setResolutionTimeData] = useState(defaultResolutionTimeData);
  const [summary, setSummary] = useState({
    total_handled: 1248,
    resolution_rate: '79.1%',
    avg_response_time: '1.2s',
    csat_score: '94.2%',
  });

  useEffect(() => {
    supportApi
      .getAnalytics()
      .then((res) => {
        if (res) {
          if (res.volume_data) setVolumeData(res.volume_data);
          if (res.category_data) setCategoryData(res.category_data);
          if (res.resolution_time_data) setResolutionTimeData(res.resolution_time_data);
          if (res.summary) setSummary(res.summary);
        }
      })
      .catch((err) => {
        console.warn('Could not load live analytics, using defaults:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics</h2>
          <p className="text-surface-400 text-sm mt-1">
            Track support volume, AI effectiveness, and resolution speeds in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-surface-400 mr-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400" />
              Syncing...
            </div>
          )}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input pl-10 py-1.5 text-sm w-36"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary btn-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Conversations', value: summary.total_handled.toLocaleString(), change: '+12.3%', icon: BarChart3, color: 'text-primary-400', bg: 'bg-primary-500/10' },
          { label: 'Resolution Rate', value: summary.resolution_rate, change: '+2.4%', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Avg AI Response', value: summary.avg_response_time, change: '-0.3s', icon: Bot, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Customer Satisfaction', value: summary.csat_score, change: '+1.5%', icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((kpi, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <span className="text-xs font-semibold text-emerald-400">
                {kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-surface-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversation Volume Chart */}
        <div className="rounded-2xl glass p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Conversation Volume</h3>
            <p className="text-sm text-surface-500">Total vs Resolved conversations</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={volumeData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1e2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              <Area type="monotone" dataKey="total" name="Total Conversations" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorTotal)" />
              <Area type="monotone" dataKey="resolved" name="AI Resolved" stroke="#10b981" strokeWidth={2} fill="url(#colorResolved)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Resolution Time Distribution */}
        <div className="rounded-2xl glass p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Resolution Time</h3>
            <p className="text-sm text-surface-500">Distribution of conversation resolution times</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resolutionTimeData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="range" type="category" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#1e1e2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
              <Bar dataKey="count" name="Conversations" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl glass p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Inquiry Categories</h3>
          <p className="text-sm text-surface-500 mb-6">Breakdown by support topic</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1e2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {categoryData.map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[i % categoryColors.length] }} />
                  <span className="text-surface-300">{cat.name}</span>
                </div>
                <span className="font-semibold text-white">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl glass p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Automated AI Deflection Rate</h3>
            <p className="text-sm text-surface-500 mb-6">
              Percentage of inquiries completely resolved by Supportroot AI without human agent escalation.
            </p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-surface-300">Standard Tier Deflection</span>
                  <span className="font-semibold text-emerald-400">82.4%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-500 to-emerald-400 h-3 rounded-full" style={{ width: '82.4%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-surface-300">Target Deflection Goal</span>
                  <span className="font-semibold text-primary-400">85.0%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-500 to-purple-400 h-3 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-primary-500/20 bg-primary-500/5 mt-6">
            <p className="text-xs text-primary-300 font-medium">
              💡 Tip: Uploading 2-3 more articles to your Knowledge Base can improve automated deflection by an estimated 4-6%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
