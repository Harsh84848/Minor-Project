import { useParams, Link } from 'react-router-dom';
import { Bot, User, ArrowLeft, Ticket, CheckCircle, Send, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supportApi, type ConversationItem } from '../api/support';

export default function ConversationDetail() {
  const { id } = useParams();
  const [conversation, setConversation] = useState<ConversationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supportApi
      .getConversation(id)
      .then((data) => setConversation(data))
      .catch(() => setError('Conversation not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSendReply = async () => {
    if (!id || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const updated = await supportApi.replyConversation(id, replyText.trim());
      setConversation(updated);
      setReplyText('');
    } catch {
      setError('Could not send reply.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 gap-2 text-surface-400">
        <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
        <span>Loading conversation...</span>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-400 text-sm">{error || 'Conversation not found.'}</p>
        <Link to="/conversations" className="btn btn-secondary btn-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Conversations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/conversations" className="p-2 rounded-lg hover:bg-white/5 text-surface-400">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">{conversation.customer_name}</h2>
            <span
              className={`badge ${
                conversation.status === 'resolved'
                  ? 'badge-success'
                  : conversation.status === 'escalated'
                  ? 'badge-warning'
                  : 'badge-primary'
              }`}
            >
              {conversation.status === 'resolved' && <CheckCircle className="w-3 h-3" />}
              {conversation.status === 'escalated' && <AlertTriangle className="w-3 h-3" />}
              <span className="capitalize">{conversation.status}</span>
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-0.5">
            Conversation #{conversation.id} &bull; Updated{' '}
            {new Date(conversation.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <Link
          to={`/tickets`}
          state={{ conversationId: conversation.id, customerName: conversation.customer_name }}
          className="btn btn-secondary btn-sm"
        >
          <Ticket className="w-4 h-4" />
          Create Ticket
        </Link>
      </div>

      {/* Messages Thread */}
      <div className="rounded-2xl glass p-6 space-y-4 min-h-[400px] flex flex-col justify-between">
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {(!conversation.messages || conversation.messages.length === 0) ? (
            <p className="text-xs text-surface-500 text-center py-8">No messages recorded in this conversation.</p>
          ) : (
            conversation.messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isAI = msg.sender === 'ai';
              const isSystem = msg.sender === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center my-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      {msg.content}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isUser
                        ? 'bg-primary-500/20 text-primary-300'
                        : isAI
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : isAI ? <Bot className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[75%] rounded-2xl p-4 text-sm ${
                      isUser
                        ? 'bg-primary-600 text-white rounded-tr-none'
                        : 'bg-surface-800 text-surface-200 border border-white/5 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center justify-between gap-3 text-[10px] text-surface-400 mt-2">
                      <span className="capitalize">{msg.sender}</span>
                      {msg.confidence != null && (
                        <span>Confidence: {Math.round(msg.confidence * 100)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply Box */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex gap-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
              placeholder="Type an agent reply to this customer..."
              className="input flex-1"
            />
            <button
              onClick={handleSendReply}
              disabled={sending || !replyText.trim()}
              className="btn btn-primary px-4"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
