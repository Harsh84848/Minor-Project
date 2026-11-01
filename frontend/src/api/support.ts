import api from './axios';

export type ArticleStatus = 'processed' | 'processing' | 'failed';
export type ArticleType = 'pdf' | 'website' | 'text';

export interface KnowledgeArticle {
  id: number;
  title: string;
  content: string;
  source_type: ArticleType;
  status: ArticleStatus;
  size_label: string;
  pages: number | null;
  source_url: string;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  customer_name: string;
  customer_email: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'pending' | 'in_progress' | 'resolved';
  assigned_to: string;
  ai_analysis: string;
  suggested_response: string;
  conversation_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChatResponse {
  conversation_id: number;
  user_message: { id: number; content: string };
  ai_message: {
    id: number;
    content: string;
    confidence: number | null;
    source: string | null;
  };
  system_message: { id: number; content: string } | null;
}

export interface ConversationMessage {
  id: number;
  sender: 'user' | 'ai' | 'system' | 'agent';
  content: string;
  confidence?: number | null;
  created_at: string;
}

export interface ConversationItem {
  id: number;
  customer_name: string;
  status: 'active' | 'escalated' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  messages: ConversationMessage[];
}

export interface DashboardData {
  stats: {
    total_conversations: number;
    ai_resolved: number;
    active_tickets: number;
    resolution_rate: string;
    avg_response_time: string;
  };
  chart_data: Array<{
    name: string;
    conversations: number;
    resolved: number;
  }>;
  recent_conversations: Array<{
    id: number;
    customer: string;
    message: string;
    time: string;
    status: string;
    channel: string;
  }>;
}

export const supportApi = {
  listArticles: () =>
    api.get<KnowledgeArticle[]>('/support/articles/').then((r) => r.data),

  createArticle: (payload: Partial<KnowledgeArticle>) =>
    api.post<KnowledgeArticle>('/support/articles/', payload).then((r) => r.data),

  uploadArticleFile: (formData: FormData) =>
    api
      .post<KnowledgeArticle>('/support/articles/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  deleteArticle: (id: number) => api.delete(`/support/articles/${id}/`),

  chat: (message: string, conversationId?: number | null) =>
    api
      .post<ChatResponse>('/support/chat/', {
        message,
        conversation_id: conversationId ?? null,
      })
      .then((r) => r.data),

  listTickets: (params?: { status?: string; search?: string }) =>
    api
      .get<Ticket[]>('/support/tickets/', { params })
      .then((r) => r.data),

  getTicket: (id: number | string) =>
    api.get<Ticket>(`/support/tickets/${id}/`).then((r) => r.data),

  createTicket: (payload: {
    subject: string;
    customer_name: string;
    customer_email?: string;
    description?: string;
    priority?: string;
    assigned_to?: string;
    conversation_id?: number | null;
  }) => api.post<Ticket>('/support/tickets/', payload).then((r) => r.data),

  updateTicket: (id: number | string, payload: Partial<Ticket>) =>
    api.patch<Ticket>(`/support/tickets/${id}/`, payload).then((r) => r.data),

  // Phase 3 & Conversations
  getDashboard: () =>
    api.get<DashboardData>('/support/dashboard/').then((r) => r.data),

  getAnalytics: () =>
    api.get<any>('/support/analytics/').then((r) => r.data),

  listConversations: () =>
    api.get<ConversationItem[]>('/support/conversations/').then((r) => r.data),

  getConversation: (id: number | string) =>
    api.get<ConversationItem>(`/support/conversations/${id}/`).then((r) => r.data),

  replyConversation: (id: number | string, message: string) =>
    api
      .post<ConversationItem>(`/support/conversations/${id}/reply/`, { message })
      .then((r) => r.data),
};
