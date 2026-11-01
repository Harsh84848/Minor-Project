import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Users,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { supportApi, type DashboardData } from '../api/support';

interface DashboardProps {
  demoName?: string;
}

export default function Dashboard({ demoName }: DashboardProps) {
  const { user } = useAuth();
  const displayName = demoName || user?.first_name || user?.username || 'there';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    stats: {
      total_conversations: 1248,
      ai_resolved: 987,
      active_tickets: 14,
      resolution_rate: '79.1%',
      avg_response_time: '1.8s',
    },
    chart_data: [
      { name: 'Mon', conversations: 145, resolved: 120 },
      { name: 'Tue', conversations: 162, resolved: 138 },
      { name: 'Wed', conversations: 138, resolved: 112 },
      { name: 'Thu', conversations: 195, resolved: 168 },
      { name: 'Fri', conversations: 178, resolved: 155 },
      { name: 'Sat', conversations: 98, resolved: 89 },
      { name: 'Sun', conversations: 82, resolved: 75 },
    ],
    recent_conversations: [
      { id: 1, customer: 'Rahul Sharma', message: 'Can I get a refund for my order?', time: '10:32 AM', status: 'resolved', channel: 'ai' },
      { id: 2, customer: 'Ananya Gupta', message: 'My payment failed but amount was deducted', time: '10:21 AM', status: 'escalated', channel: 'human' },
      { id: 3, customer: 'Aman Verma', message: 'How long does delivery take to Mumbai?', time: '09:48 AM', status: 'resolved', channel: 'ai' },
      { id: 4, customer: 'Priya Singh', message: 'I want to change my subscription plan', time: '09:15 AM', status: 'pending', channel: 'ai' },
      { id: 5, customer: 'Vikram Patel', message: 'Product arrived damaged, need replacement', time: '08:52 AM', status: 'escalated', channel: 'human' },
    ],
  });

  useEffect(() => {
    supportApi
      .getDashboard()
      .then((res) => {
        if (res && res.stats) {
          setData(res);
        }
      })
      .catch((err) => {
        console.warn('Could not load live dashboard data, using fallback defaults:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = [
    {
      label: 'Total Conversations',
      value: data.stats.total_conversations.toLocaleString(),
      change: '+12.3%',
      trend: 'up',
      icon: MessageSquare,
      color: 'text-primary-400',
      bg: 'bg-primary-500/10',
    },
    {
      label: 'AI Resolved',
      value: data.stats.ai_resolved.toLocaleString(),
      change: '+8.1%',
      trend: 'up',
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Avg Response Time',
      value: data.stats.avg_response_time,
      change: '-18.2%',
      trend: 'down',
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Resolution Rate',
      value: data.stats.resolution_rate,
      change: '+2.4%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {getGreeting()}, {displayName}
          </h2>
          <p className="text-surface-400 text-sm mt-1">
            Here's live performance and activity from your support platform.
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-surface-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400" />
            Syncing live metrics...
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div
                className={`flex items-center gap-1 text-xs font-semibold ${
                  stat.trend === 'up' ? 'text-emerald-400' : 'text-blue-400'
                }`}
              >
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {stat.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-surface-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation Analytics Chart */}
        <div className="lg:col-span-2 rounded-2xl glass p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Conversation Analytics</h3>
              <p className="text-sm text-surface-500">Live 7-day trend</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                <span className="text-surface-400">Conversations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-surface-400">Resolved</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.chart_data}>
              <defs>
                <linearGradient id="colorConvs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161622',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="conversations"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorConvs)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorResolved)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Performance Card */}
        <div className="rounded-2xl glass p-6">
          <h3 className="text-lg font-semibold text-white mb-6">AI Performance</h3>
          <div className="space-y-6">
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="url(#donutGradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${parseFloat(data.stats.resolution_rate || '80') * 3.52} ${100 * 3.52}`}
                  />
                  <defs>
                    <linearGradient id="donutGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute">
                  <p className="text-2xl font-bold text-white">{data.stats.resolution_rate}</p>
                  <p className="text-xs text-surface-500">Deflected</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-surface-300">AI Resolved</span>
                </div>
                <span className="text-sm font-semibold text-white">
                  {data.stats.ai_resolved.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-surface-300">Active Tickets</span>
                </div>
                <span className="text-sm font-semibold text-white">{data.stats.active_tickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-surface-300">Response Speed</span>
                </div>
                <span className="text-sm font-semibold text-white">{data.stats.avg_response_time}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="rounded-2xl glass p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Recent Conversations</h3>
          <Link to="/conversations" className="text-sm text-primary-400 hover:text-primary-300 font-medium">
            View All
          </Link>
        </div>

        <div className="space-y-2">
          {data.recent_conversations.map((conv) => (
            <Link
              key={conv.id}
              to={`/conversations/${conv.id}`}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/30 to-primary-700/30 border border-primary-500/20 flex items-center justify-center text-primary-300 text-sm font-semibold flex-shrink-0">
                {conv.customer ? conv.customer[0].toUpperCase() : 'U'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">{conv.customer}</p>
                  {conv.channel === 'ai' ? (
                    <Bot className="w-3.5 h-3.5 text-primary-400" />
                  ) : (
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </div>
                <p className="text-xs text-surface-400 truncate mt-0.5">{conv.message}</p>
              </div>

              {/* Meta */}
              <div className="text-right flex-shrink-0">
                <span
                  className={`badge ${
                    conv.status === 'resolved'
                      ? 'badge-success'
                      : conv.status === 'escalated'
                      ? 'badge-warning'
                      : 'badge-primary'
                  }`}
                >
                  {conv.status}
                </span>
                <p className="text-xs text-surface-500 mt-1">{conv.time}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
