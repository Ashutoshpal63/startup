import User from '../schema/user.js';
import Shop from '../schema/shop.js';
import Order from '../schema/order.js';

export const getAdminDashboard = async (req, res) => {
  try {
    const [
      userCounts,
      shopStats,
      orderStats,
      totalRevenueResult
    ] = await Promise.all([
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      Shop.aggregate([
        { $group: { _id: '$isVerified', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);
        // --- NEW DEBUGGING LOG ---
    console.log("Revenue Query Result from DB:", JSON.stringify(totalRevenueResult, null, 2));

    const usersByRole = userCounts.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
    const totalUsers = userCounts.reduce((sum, item) => sum + item.count, 0);

    const shopsByVerification = shopStats.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
    const totalShops = shopStats.reduce((sum, item) => sum + item.count, 0);

    const ordersByStatus = orderStats.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
    const totalOrders = orderStats.reduce((sum, item) => sum + item.count, 0);


    const finalRevenue = totalRevenueResult[0]?.total || 0;
    console.log(`Final calculated revenue: ${finalRevenue}`); // Log final value


    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        usersByRole,
        totalShops,
        shops: {
          verified: shopsByVerification[true] || 0,
          unverified: shopsByVerification[false] || 0,
        },
        orderStats: {
          total: totalOrders,
          ...ordersByStatus,
        },
        totalRevenue: totalRevenueResult[0]?.total || 0,
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};