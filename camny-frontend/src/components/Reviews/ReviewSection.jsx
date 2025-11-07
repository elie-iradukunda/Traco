import React, { useState, useEffect } from "react";
import { submitReview, getReviews, getAverageRating } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const ReviewSection = ({ routeId, driverId, vehicleId }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [routeId, driverId, vehicleId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params = {};
      if (routeId) params.route_id = routeId;
      if (driverId) params.driver_id = driverId;
      if (vehicleId) params.vehicle_id = vehicleId;

      const [reviewsRes, avgRes] = await Promise.all([
        getReviews(params),
        getAverageRating(params)
      ]);

      setReviews(reviewsRes.data || []);
      setAverageRating(parseFloat(avgRes.data?.average_rating || 0));
      setTotalReviews(parseInt(avgRes.data?.total_reviews || 0));
    } catch (err) {
      console.error("Error loading reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || rating === 0) return;

    try {
      setSubmitting(true);
      await submitReview({
        passenger_id: user.user_id,
        route_id: routeId,
        driver_id: driverId,
        vehicle_id: vehicleId,
        rating,
        comment
      });
      setRating(0);
      setComment("");
      await loadReviews();
      alert("Review submitted successfully!");
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            onClick={interactive ? () => setRating(star) : undefined}
            className={`text-2xl ${
              star <= value
                ? "text-yellow-400"
                : "text-gray-300"
            } ${interactive ? "hover:text-yellow-500 cursor-pointer" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">Reviews & Ratings</h3>

      {/* Average Rating */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
            <div className="mt-1">{renderStars(Math.round(averageRating))}</div>
          </div>
          <div className="flex-1">
            <p className="text-gray-600">Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
            {totalReviews > 0 && (
              <div className="mt-2 space-y-1">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter(r => r.rating === star).length;
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 w-12">{star} star</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submit Review Form */}
      {user && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Write a Review</h4>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            {renderStars(rating, true)}
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Share your experience..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      {/* Reviews List */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Recent Reviews</h4>
        {loading ? (
          <p className="text-gray-500 text-center py-4">Loading reviews...</p>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.review_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{review.passenger_name || "Anonymous"}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>{renderStars(review.rating)}</div>
                </div>
                {review.comment && (
                  <p className="text-gray-700 mt-2">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No reviews yet. Be the first to review!</p>
        )}
      </div>
    </div>
  );
};

export default ReviewSection;

