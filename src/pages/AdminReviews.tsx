import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { CheckCircle, XCircle, Trash2, Search, MessageSquare, Star, ExternalLink, Settings as SettingsIcon } from 'lucide-react';

interface Review {
  id: number;
  product_id: number;
  product_name: string;
  product_image: string;
  user_name: string;
  user_email: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reviewSettings, setReviewSettings] = useState({
    auto_approve: false,
    spam_words: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/admin/reviews/settings');
      setReviewSettings(data || { auto_approve: false, spam_words: '' });
    } catch (err) {
      console.error('Failed to fetch review settings:', err);
    }
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await apiFetch('/admin/reviews/settings', {
        method: 'PUT',
        body: JSON.stringify(reviewSettings)
      });
      setIsSettingsOpen(false);
    } catch (err) {
      console.error('Failed to save review settings:', err);
      alert('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch('/admin/reviews');
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const updated = await apiFetch(`/admin/reviews/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      setReviews(reviews.map(r => r.id === id ? { ...r, status: updated.status } : r));
    } catch (err) {
      console.error('Failed to update review status:', err);
      alert('Failed to update review status');
    }
  };

  const deleteReview = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await apiFetch(`/admin/reviews/${id}`, {
        method: 'DELETE'
      });
      setReviews(reviews.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete review:', err);
      alert('Failed to delete review');
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        r.user_name.toLowerCase().includes(term) ||
        r.user_email?.toLowerCase().includes(term) ||
        r.comment.toLowerCase().includes(term) ||
        r.product_name?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 shrink-0">
          <div>
            <h1 className="text-[16px] font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Product Reviews
            </h1>
            <p className="text-[12px] text-gray-500 mt-0.5">Manage customer reviews and control spam.</p>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[13px] font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
            Review Settings
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-4 flex flex-col sm:flex-row gap-4 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviews, customers, products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 h-[36px] bg-gray-50 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 overflow-x-auto">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 h-[28px] rounded-md text-[12px] font-medium transition-colors whitespace-nowrap ${
                  filter === f
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-[14px] font-medium">No reviews found</p>
                <p className="text-[12px]">Try adjusting your filters</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rating & Review</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReviews.map((review) => (
                    <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {review.product_image ? (
                              <img src={review.product_image} alt={review.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-400 text-[10px]">No Img</span>
                            )}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-gray-900 line-clamp-1">{review.product_name || 'Unknown Product'}</p>
                            <a href={`/product/${review.product_id}`} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="text-[13px] font-medium text-gray-900">{review.user_name}</div>
                        <div className="text-[11px] text-gray-500">{review.user_email}</div>
                        <div className="text-[10px] text-gray-400 mt-1">{new Date(review.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3 align-top max-w-[300px]">
                        <div className="mb-1">{renderStars(review.rating)}</div>
                        <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium ${
                          review.status === 'approved' ? 'bg-green-100 text-green-700' :
                          review.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          {review.status !== 'approved' && (
                            <button
                              onClick={() => updateStatus(review.id, 'approved')}
                              className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-md transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {review.status !== 'rejected' && (
                            <button
                              onClick={() => updateStatus(review.id, 'rejected')}
                              className="p-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-md transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteReview(review.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Review Settings
              </h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[13px] font-semibold text-gray-900 block">Auto-Approve Reviews</label>
                  <p className="text-[11px] text-gray-500 mt-0.5">Automatically approve if no spam words found.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewSettings({ ...reviewSettings, auto_approve: !reviewSettings.auto_approve })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    reviewSettings.auto_approve ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      reviewSettings.auto_approve ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-gray-900 block mb-1">Blocked Spam Words</label>
                <p className="text-[11px] text-gray-500 mb-2">Comma-separated. Matching reviews get marked pending/rejected.</p>
                <textarea
                  value={reviewSettings.spam_words}
                  onChange={(e) => setReviewSettings({ ...reviewSettings, spam_words: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="e.g., scam, fake, worst, terrible"
                />
              </div>
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={isSavingSettings}
                className="px-3 py-1.5 text-[12px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
