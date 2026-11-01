import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Bot,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { supportApi, type ConversationItem } from '../api/support';

interface DisplayConversation {
  id: number;
  customerName: string;
  lastMessage: string;
  status: 'resolved' | 'active' | 'escalated' | 'pending';
  channel: 'ai' | 'human';
  messageCount: number;
  time: string;
  date: string;
}

const fallbackConversations: DisplayConversation[] = [
  { id: 1, customerName: 'Rahul Sharma', lastMessage: 'Can I get a refund for my recent order? The product arrived damaged.', status: 'resolved', channel: 'ai', messageCount: 6, time: '10:32 AM', date: 'Today' },
  { id: 2, customerName: 'Ananya Gupta', lastMessage: 'My payment failed but the amount was deducted from my account.', status: 'escalated', channel: 'human', messageCount: 8, time: '10:21 AM', date: 'Today' },
  { id: 3, customerName: 'Aman Verma', lastMessage: 'How long does delivery take to Mumbai?', status: 'resolved', channel: 'ai', messageCount: 4, time: '09:48 AM', date: 'Today' },
  { id: 4, customerName: 'Priya Singh', lastMessage: 'I want to change my subscription plan from Starter to Professional.', status: 'active', channel: 'ai', messageCount: 3, time: '09:15 AM', date: 'Today' },
  { id: 5, customerName: 'Vikram Patel', lastMessage: 'Product arrived damaged, need a replacement urgently.', status: 'escalated', channel: 'human', messageCount: 12, time: '08:52 AM', date: 'Today' },
  { id: 6, customerName: 'Neha Reddy', lastMessage: 'What are the available payment methods?', status: 'resolved', channel: 'ai', messageCount: 3, time: '08:30 AM', date: 'Today' },
];

export default function Conversations() {
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo');
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<DisplayConversation[]>(fallbackConversations);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }

    supportApi
      .listConversations()
      .then((items: ConversationItem[]) => {
        if (items && items.length > 0) {
          const mapped: DisplayConversation[] = items.map((c) => {
            const msgs = c.messages || [];
            const lastMsg = msgs[msgs.length - 1];
            const d = new Date(c.updated_at);
            return {
              id: c.id,
              customerName: c.customer_name || 'Customer',
              lastMessage: lastMsg ? lastMsg.content : 'No messages yet',
              status: (c.status as any) || 'active',
              channel: c.status === 'escalated' ? 'human' : 'ai',
              messageCount: msgs.length,
              time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            };
          });
          setConversations(mapped);
        }
      })
      .catch((err) => {
        console.warn('Using fallback conversations:', err);
      })
      .finally(() => setLoading(false));
  }, [isDemo]);

  const filteredConversations = conversations.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (
      searchQuery &&
      !c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const statusCounts = {
    all: conversations.length,
    active: conversations.filter((c) => c.status === 'active').length,
    resolved: conversations.filter((c) => c.status === 'resolved').length,
    escalated: conversations.filter((c) => c.status === 'escalated').length,
    pending: conversations.filter((c) => c.status === 'pending').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="badge badge-success">
            <CheckCircle className="w-3 h-3" /> Resolved
          </span>
        );
      case 'active':
        return (
          <span className="badge badge-info">
            <MessageSquare className="w-3 h-3" /> Active
          </span>
        );
      case 'escalated':
        return (
          <span className="badge badge-warning">
            <AlertTriangle className="w-3 h-3" /> Escalated
          </span>
        );
      default:
        return (
          <span className="badge badge-neutral">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Conversations</h2>
          <p className="text-surface-400 text-sm mt-1">
            Real-time customer chats handled by Supportroot AI and human agents.
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-surface-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400" />
            Loading conversations...
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-4 overflow-x-auto">
        {(['all', 'active', 'resolved', 'escalated'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize whitespace-nowrap flex items-center gap-2 ${
              filter === tab
                ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
            }`}
          >
            {tab}
            <span
              className={`px-1.5 py-0.5 rounded-md text-xs ${
                filter === tab ? 'bg-primary-500/20 text-primary-300' : 'bg-white/5 text-surface-500'
              }`}
            >
              {statusCounts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations by customer or message..."
          className="input pl-10"
        />
      </div>

      {/* Conversation List */}
      <div className="space-y-2">
        {filteredConversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <p className="text-surface-400 text-sm">No conversations match your filter.</p>
          </div>
        ) : (
          filteredConversations.map((c) => (
            <Link
              key={c.id}
              to={isDemo ? '#' : `/conversations/${c.id}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-surface-850/60 hover:bg-surface-800/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/30 to-primary-700/30 border border-primary-500/20 flex items-center justify-center text-primary-300 font-semibold flex-shrink-0">
                {c.customerName ? c.customerName[0].toUpperCase() : 'C'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">{c.customerName}</span>
                  {c.channel === 'ai' ? (
                    <Bot className="w-3.5 h-3.5 text-primary-400" />
                  ) : (
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  <span className="text-xs text-surface-500">&bull; {c.messageCount} messages</span>
                </div>
                <p className="text-xs text-surface-400 truncate mt-1">{c.lastMessage}</p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  {getStatusBadge(c.status)}
                  <p className="text-xs text-surface-500 mt-1">{c.time}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-surface-500" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
