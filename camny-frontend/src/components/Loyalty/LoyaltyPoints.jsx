import React, { useState, useEffect } from "react";
import { getLoyaltyPoints, getLoyaltyHistory, redeemLoyaltyPoints } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const LoyaltyPoints = () => {
  const { user } = useAuth();
  const [loyalty, setLoyalty] = useState(null);
  const [history, setHistory] = useState([]);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pointsRes, historyRes] = await Promise.all([
        getLoyaltyPoints(user.user_id),
        getLoyaltyHistory(user.user_id)
      ]);
      setLoyalty(pointsRes.data);
      setHistory(historyRes.data || []);
    } catch (err) {
      console.error("Error loading loyalty data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    const points = parseInt(redeemPoints);
    if (!points || points <= 0 || points > (loyalty?.available_points || 0)) {
      alert("Invalid points amount");
      return;
    }

    try {
      setRedeeming(true);
      await redeemLoyaltyPoints({
        passenger_id: user.user_id,
        points,
        reason: "Points redemption"
      });
      setRedeemPoints("");
      await loadData();
      alert("Points redeemed successfully!");
    } catch (err) {
      console.error("Error redeeming points:", err);
      alert(err.response?.data?.error || "Failed to redeem points");
    } finally {
      setRedeeming(false);
    }
  };

  const getTierColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum':
        return 'from-purple-500 to-purple-600';
      case 'gold':
        return 'from-yellow-500 to-yellow-600';
      case 'silver':
        return 'from-gray-400 to-gray-500';
      default:
        return 'from-orange-500 to-orange-600';
    }
  };

  const getTierIcon = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum':
        return '💎';
      case 'gold':
        return '🥇';
      case 'silver':
        return '🥈';
      default:
        return '🥉';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <p className="text-gray-500 text-center">Loading loyalty points...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loyalty Points Card */}
      <div className={`bg-gradient-to-br ${getTierColor(loyalty?.tier)} text-white rounded-xl shadow-lg p-6`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold mb-2">Loyalty Points</h3>
            <p className="text-white opacity-90 capitalize">
              {getTierIcon(loyalty?.tier)} {loyalty?.tier || 'Bronze'} Member
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Available</p>
            <p className="text-3xl font-bold">{loyalty?.available_points || 0}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Total Earned</p>
            <p className="text-3xl font-bold">{loyalty?.total_points || 0}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm opacity-90 mb-1">Redeemed</p>
            <p className="text-3xl font-bold">{loyalty?.redeemed_points || 0}</p>
          </div>
        </div>
      </div>

      {/* Redeem Points */}
      {loyalty && loyalty.available_points > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Redeem Points</h3>
          <form onSubmit={handleRedeem} className="flex gap-4">
            <input
              type="number"
              value={redeemPoints}
              onChange={(e) => setRedeemPoints(e.target.value)}
              placeholder="Enter points to redeem"
              min="1"
              max={loyalty.available_points}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={redeeming || !redeemPoints}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {redeeming ? "Redeeming..." : "Redeem"}
            </button>
          </form>
          <p className="text-sm text-gray-600 mt-2">
            Points can be redeemed for discounts on future bookings
          </p>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h3>
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((transaction) => (
              <div
                key={transaction.transaction_id}
                className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {transaction.type === 'earned' ? '➕ Earned' : '➖ Redeemed'}
                  </p>
                  <p className="text-sm text-gray-600">{transaction.reason || 'Transaction'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(transaction.created_at).toLocaleString()}
                  </p>
                </div>
                <div className={`text-lg font-bold ${
                  transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'earned' ? '+' : '-'}{transaction.points} pts
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No transaction history yet</p>
        )}
      </div>
    </div>
  );
};

export default LoyaltyPoints;

