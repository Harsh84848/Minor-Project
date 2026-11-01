import { useEffect, useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Globe,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Search,
  File,
  X,
  Loader2,
  FileUp,
} from 'lucide-react';
import { supportApi, type KnowledgeArticle } from '../api/support';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await supportApi.listArticles();
      setDocuments(data);
    } catch {
      setError('Failed to load knowledge base. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateText = async () => {
    if (!title.trim() || !content.trim()) return;
    setUploading(true);
    try {
      const article = await supportApi.createArticle({
        title: title.trim(),
        content: content.trim(),
        source_type: 'text',
        status: 'processed',
      });
      setDocuments((prev) => [article, ...prev]);
      setShowTextModal(false);
      setTitle('');
      setContent('');
    } catch {
      setError('Could not save article.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      if (!title) {
        setTitle(f.name);
      }
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile && !title.trim() && !content.trim()) return;
    setUploading(true);
    setError('');
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (title.trim()) {
          formData.append('title', title.trim());
        }
        const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');
        formData.append('source_type', isPdf ? 'pdf' : 'text');
        const article = await supportApi.uploadArticleFile(formData);
        setDocuments((prev) => [article, ...prev]);
      } else {
        const article = await supportApi.createArticle({
          title: title.trim() || 'New Document.pdf',
          content: content.trim() || 'General policy guidelines and customer documentation.',
          source_type: 'pdf',
          size_label: '1.2 MB',
          pages: 4,
        });
        setDocuments((prev) => [article, ...prev]);
      }
      setShowUploadModal(false);
      setSelectedFile(null);
      setTitle('');
      setContent('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed. Ensure backend server is active.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddWebsite = async () => {
    if (!websiteUrl.trim()) return;
    setUploading(true);
    setError('');
    try {
      let hostname = websiteUrl.trim();
      try {
        hostname = new URL(
          websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`
        ).hostname;
      } catch {
        /* keep raw */
      }
      const article = await supportApi.createArticle({
        title: hostname,
        content: `Website content from ${websiteUrl}.`,
        source_type: 'website',
        source_url: websiteUrl,
      });
      setDocuments((prev) => [article, ...prev]);
      setShowUrlModal(false);
      setWebsiteUrl('');
    } catch {
      setError('Could not add website.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await supportApi.deleteArticle(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError('Delete failed.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-surface-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'website':
        return <Globe className="w-5 h-5 text-blue-400" />;
      default:
        return <File className="w-5 h-5 text-surface-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-surface-400 text-sm">
            Your AI learns from your business information to answer customer queries.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowTextModal(true)} className="btn btn-secondary btn-sm">
            <FileText className="w-4 h-4" />
            Add Article
          </button>
          <button onClick={() => setShowUrlModal(true)} className="btn btn-secondary btn-sm">
            <Globe className="w-4 h-4" />
            Add Website
          </button>
          <button onClick={() => setShowUploadModal(true)} className="btn btn-primary btn-sm">
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search knowledge articles..."
          className="input pl-10"
        />
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-surface-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
            <span>Loading knowledge articles...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <p className="text-surface-400 text-sm">No articles found.</p>
            <p className="text-surface-500 text-xs mt-1">
              Add your policies, FAQ guides, or website URLs above to train the AI.
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-surface-850/60 hover:bg-surface-800/80 transition-colors gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  {getTypeIcon(doc.source_type)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-white truncate">{doc.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-surface-500 mt-0.5">
                    <span className="capitalize">{doc.source_type}</span>
                    <span>&bull;</span>
                    <span>{doc.size_label || (doc.pages ? `${doc.pages} pages` : '1 KB')}</span>
                    <span>&bull;</span>
                    <span>{relativeTime(doc.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-surface-400">
                  {getStatusIcon(doc.status)}
                  <span className="capitalize">{doc.status}</span>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-surface-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Text Modal */}
      {showTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-850 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Knowledge Article</h3>
              <button
                onClick={() => setShowTextModal(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-surface-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Return Policy"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Content</label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste policy or FAQ text the AI should learn from..."
                  className="input resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowTextModal(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={handleCreateText}
                disabled={uploading || !title.trim() || !content.trim()}
                className="btn btn-primary btn-sm"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real Document Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-850 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Upload Document (PDF / Text)</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                className="p-1 rounded-lg hover:bg-white/5 text-surface-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-surface-400 mb-4">
              Upload PDF manuals, product documentation, or text files. The backend will parse text and make it searchable by the AI assistant.
            </p>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* File dropzone / selector */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-primary-500/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-white/[0.02] hover:bg-primary-500/[0.03] mb-4"
            >
              <FileUp className="w-8 h-8 text-primary-400 mx-auto mb-2" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                  <p className="text-xs text-primary-400 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to change file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-surface-300">
                    Click to browse or drop file here
                  </p>
                  <p className="text-xs text-surface-500 mt-1">Supports PDF, TXT, MD up to 25MB</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1">
                  Document Title (optional)
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={selectedFile ? selectedFile.name : 'e.g. User Guide.pdf'}
                  className="input text-sm"
                />
              </div>

              {!selectedFile && (
                <div>
                  <label className="block text-xs font-medium text-surface-400 mb-1">
                    Or paste text content directly
                  </label>
                  <textarea
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter document text content..."
                    className="input resize-none text-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadDocument}
                disabled={uploading || (!selectedFile && !title.trim() && !content.trim())}
                className="btn btn-primary btn-sm"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload & Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Website Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-850 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Add Website</h3>
              <button
                onClick={() => setShowUrlModal(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-surface-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Website URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://docs.yourcompany.com"
                  className="input pl-10"
                />
              </div>
              <p className="text-xs text-surface-500 mt-2">
                The backend will automatically crawl the website content with BeautifulSoup and index it for your AI assistant.
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowUrlModal(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={handleAddWebsite}
                disabled={uploading || !websiteUrl.trim()}
                className="btn btn-primary btn-sm"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Website
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
