import User from '../schema/user.js';
import Shop from '../schema/shop.js';
import Order from '../schema/order.js';

export const getAdminDashboard = async (req, res) => {
  try {
    const results = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Shop.aggregate([{ $group: { _id: '$isVerified', count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const [userCounts, shopStats, orderStats, revenueData] = results;

    // Debug log remains but formatted
    console.log("Revenue Data =>", JSON.stringify(revenueData, null, 2));

    const usersByRole = Object.fromEntries(
      userCounts.map((item) => [item._id, item.count])
    );
    const totalUsers = userCounts.reduce((acc, curr) => acc + curr.count, 0);

    const shopsByVerification = Object.fromEntries(
      shopStats.map((item) => [item._id, item.count])
    );
    const totalShops = shopStats.reduce((acc, curr) => acc + curr.count, 0);

    const ordersByStatus = Object.fromEntries(
      orderStats.map((item) => [item._id, item.count])
    );
    const totalOrders = orderStats.reduce((acc, curr) => acc + curr.count, 0);

    const finalRevenue = revenueData?.[0]?.total || 0;
    console.log(`Computed Revenue --> ${finalRevenue}`);

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
        totalRevenue: finalRevenue,
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
