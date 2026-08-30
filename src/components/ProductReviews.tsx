import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';
import { 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  Trash2, 
  Send, 
  Sparkles, 
  LogIn, 
  ThumbsUp, 
  AlertCircle, 
  User as UserIcon,
  Loader2,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface ProductReview {
  id: number;
  product_id: number;
  user_id: number;
  user_name: string;
  user_email?: string;
  user_avatar?: string;
  rating: number;
  title?: string;
  comment: string;
  is_verified_purchase: boolean;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  distribution: Record<number, number>;
}

interface ProductReviewsProps {
  productId: number | string;
  productName: string;
}

export default function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const { user, token } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  // Fetch reviews from API
  const fetchReviews = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setStats(data.stats || {
          totalReviews: 0,
          averageRating: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });

        // Prepopulate if user already reviewed
        if (user && data.reviews) {
          const userRev = data.reviews.find((r: ProductReview) => r.user_id === user.id);
          if (userRev) {
            setRating(userRev.rating);
            setTitle(userRev.title || '');
            setComment(userRev.comment || '');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [productId, user]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Submit Review Handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return;

    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5');
      return;
    }

    if (!comment.trim() || comment.trim().length < 3) {
      setError('Please provide a constructive review comment (minimum 3 characters)');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          title: title.trim(),
          comment: comment.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setSuccessMessage(data.message || 'Review submitted successfully!');
      await fetchReviews();

      // Clear success notification after 4 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'Error submitting review');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Review Handler
  const handleDeleteReview = (reviewId: number) => {
    if (!token) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Review',
      message: 'Are you sure you want to remove this review? This action cannot be undone.',
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/products/${productId}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (res.ok) {
            // Reset local form if this was the logged-in user's review
            setTitle('');
            setComment('');
            setRating(5);
            await fetchReviews();
          } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete review');
          }
        } catch (err) {
          console.error(err);
        }
        setConfirmDialog(null);
      }
    });
  };
  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered reviews list
  const filteredReviews = filterRating === 'all'
    ? reviews
    : reviews.filter((r) => r.rating === filterRating);

  // Check if current logged-in user has already submitted a review
  const userExistingReview = user ? reviews.find((r) => r.user_id === user.id) : null;

  return (
    <section id="customer-reviews" className="border-t border-slate-200/80 pt-6 sm:pt-10 mt-6 sm:mt-10">
      <div className="space-y-4 sm:space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-600">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              </span>
              <h2 className="text-base sm:text-xl font-bold tracking-tight text-slate-900">
                Ratings & Reviews
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Verified feedback for <span className="font-medium text-slate-700">{productName}</span>
            </p>
          </div>

          {stats.totalReviews > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg w-fit">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3.5 h-3.5 ${i < Math.round(stats.averageRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                  />
                ))}
              </div>
              <span className="text-xs font-black text-slate-800">{stats.averageRating}</span>
              <span className="text-[11px] text-slate-400 font-medium">({stats.totalReviews})</span>
            </div>
          )}
        </div>

        {/* Rating Breakdown & Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 bg-slate-50/70 border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-5">
          {/* Average score card */}
          <div className="sm:col-span-4 flex flex-col items-center justify-center text-center p-3 bg-white rounded-lg sm:rounded-xl border border-slate-200/60 shadow-2xs">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {stats.totalReviews > 0 ? stats.averageRating : '0.0'}
            </span>
            
            <div className="flex items-center gap-0.5 my-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(stats.averageRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-200'
                  }`}
                />
              ))}
            </div>

            <p className="text-[11px] font-semibold text-slate-500">
              Based on {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
            </p>

            {stats.totalReviews > 0 && (
              <div className="mt-2 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>{Math.round(((stats.distribution[5] + stats.distribution[4]) / (stats.totalReviews || 1)) * 100)}% Recommended</span>
              </div>
            )}
          </div>

          {/* Star Distribution Progress Bars */}
          <div className="sm:col-span-8 flex flex-col justify-center space-y-1.5 bg-white p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200/60 shadow-2xs">
            <div className="flex items-center justify-between pb-1 mb-0.5 border-b border-slate-100">
              <span className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">Breakdown</span>
              {filterRating !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilterRating('all')}
                  className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  Clear ({filterRating}★)
                </button>
              )}
            </div>

            {[5, 4, 3, 2, 1].map((starCount) => {
              const count = stats.distribution[starCount] || 0;
              const percent = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              const isSelected = filterRating === starCount;

              return (
                <button
                  key={starCount}
                  type="button"
                  onClick={() => setFilterRating(filterRating === starCount ? 'all' : starCount)}
                  className={`w-full flex items-center gap-2 text-xs py-0.5 px-1.5 rounded transition-colors group cursor-pointer ${
                    isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
                  }`}
                  title={`Filter by ${starCount} stars`}
                >
                  <div className="flex items-center gap-1 w-10 font-semibold text-slate-700 shrink-0 text-[11px]">
                    <span>{starCount}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </div>

                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        starCount >= 4 ? 'bg-amber-400' : starCount === 3 ? 'bg-amber-300' : 'bg-slate-300'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <span className="w-10 text-right font-medium text-slate-500 shrink-0 group-hover:text-slate-900 text-[11px]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Review Box / Login Prompt */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-2xs">
          {user ? (
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.name?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      {userExistingReview ? 'Edit Your Review' : 'Write a Review'}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">Posting as <span className="font-semibold text-slate-700">{user.name}</span></p>
                  </div>
                </div>

                {userExistingReview && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Existing
                  </span>
                )}
              </div>

              {/* Star Rating Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rating <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeStar = hoverRating || rating;
                    const isFilled = star <= activeStar;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 rounded hover:bg-amber-50 transition-transform active:scale-90 cursor-pointer"
                        aria-label={`${star} star rating`}
                      >
                        <Star
                          className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-2xs'
                              : 'text-slate-200 hover:text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-1.5 text-xs font-bold text-slate-700">
                    {hoverRating || rating}/5
                  </span>
                </div>
              </div>

              {/* Review Headline (Optional) */}
              <div>
                <label htmlFor="review-title" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Headline <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="review-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Great quality and fast shipping"
                  maxLength={100}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>

              {/* Review Comment (Required) */}
              <div>
                <label htmlFor="review-comment" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Review Comment <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Describe your experience with this product..."
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800 resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Feedback Alerts */}
              {error && (
                <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold px-4 py-2 rounded-lg shadow-2xs transition-all disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{userExistingReview ? 'Update Review' : 'Submit Review'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4 px-3 bg-slate-50/80 rounded-lg border border-dashed border-slate-200">
              <MessageSquare className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Share your review with other buyers
              </h3>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5 mb-3">
                Log in to rate this product and share your feedback.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log in</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <span>Register</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              All Customer Reviews ({filteredReviews.length})
            </h3>
            {filterRating !== 'all' && (
              <span className="text-xs text-slate-500 font-medium">
                Filtering by {filterRating} Star{filterRating > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
              <p className="text-xs font-medium">Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                {filterRating !== 'all' 
                  ? `No reviews found with ${filterRating} star rating.` 
                  : 'No customer reviews yet. Be the first to share your thoughts!'}
              </p>
              {filterRating !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilterRating('all')}
                  className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  View All Reviews
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredReviews.map((rev) => {
                const isOwnReview = user && (rev.user_id === user.id || user.role === 'admin');

                return (
                  <div
                    key={rev.id}
                    className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                  >
                    {/* Author & Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs overflow-hidden shrink-0">
                          {rev.user_avatar ? (
                            <img src={rev.user_avatar} alt={rev.user_name} className="w-full h-full object-cover" />
                          ) : (
                            rev.user_name?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{rev.user_name}</span>
                            {rev.is_verified_purchase && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                <CheckCircle2 className="w-3 h-3" />
                                Verified Buyer
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(rev.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Delete button if owner or admin */}
                      {isOwnReview && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete review"
                          aria-label="Delete review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Star Rating & Headline */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        {rev.title && (
                          <h4 className="text-xs font-bold text-slate-900">
                            {rev.title}
                          </h4>
                        )}
                      </div>

                      {/* Comment Body */}
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pt-1">
                        {rev.comment}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmText={confirmDialog?.confirmText}
        cancelText={confirmDialog?.cancelText}
        isDanger={confirmDialog?.isDanger}
        onConfirm={confirmDialog?.onConfirm || (() => {})}
        onCancel={() => setConfirmDialog(null)}
      />
    </section>
  );
}
