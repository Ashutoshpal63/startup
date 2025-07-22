import Order from '../schema/order.js';
import User from '../schema/user.js';
import Product from '../schema/product.js';
import Shop from '../schema/shop.js';

// ---------------------------------------------------------------- //
//                  CUSTOMER CONTROLLERS
// ---------------------------------------------------------------- //

/**
 * @description Customer places a new order from their cart for a specific shop.
 *              The backend calculates the total and clears the relevant cart items.
 * @route POST /api/orders
 */
export const createOrder = async (req, res, next) => {
  try {
    const { shopId } = req.body;
    const user = await User.findById(req.user.id).populate('cart.productId');

    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    // Filter cart for items belonging to the specified shop
    const itemsFromShop = user.cart.filter(
      item => item.productId.shopId.toString() === shopId
    );

    if (itemsFromShop.length === 0) {
      return res.status(400).json({ message: 'No items from this shop in your cart.' });
    }

    // Server-side calculation for security
    let totalAmount = 0;
    const orderProducts = itemsFromShop.map(item => {
      totalAmount += item.quantity * item.productId.price;
      return {
        productId: item.productId._id,
        name: item.productId.name,
        quantity: item.quantity,
        price: item.productId.price,
      };
    });

    const newOrder = await Order.create({
      userId: user._id,
      shopId,
      products: orderProducts,
      totalAmount,
      deliveryAddress: user.address, // Get address from user profile on the server
      status: 'PENDING_APPROVAL', // Start with this required status
    });

    // Remove the ordered items from the user's cart
    user.cart = user.cart.filter(
      item => item.productId.shopId.toString() !== shopId
    );
    await user.save();

    res.status(201).json({ status: 'success', data: newOrder });
  } catch (err) {
    next(err);
  }
};

/**
 * @description Customer gets their own order history.
 * @route GET /api/orders/my-orders
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('shopId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: orders });
  } catch (err) {
    next(err);
  }
};


// ---------------------------------------------------------------- //
//                  SHOPKEEPER CONTROLLERS
// ---------------------------------------------------------------- //

/**
 * @description Shopkeeper gets all orders for their specific shop.
 * @route GET /api/orders/shop/:shopId
 */
export const getShopOrders = async (req, res, next) => {
    try {
        const shop = await Shop.findOne({ ownerId: req.user.id });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found for this user."});
        }
        const orders = await Order.find({ shopId: shop._id }).populate('userId', 'name').sort({ createdAt: -1 });
        res.status(200).json({ status: 'success', data: orders });
    } catch(err) {
        next(err);
    }
}


// ---------------------------------------------------------------- //
//                  DELIVERY AGENT CONTROLLERS
// ---------------------------------------------------------------- //

/**
 * @description Delivery agent gets orders that are paid and ready for pickup.
 * @route GET /api/orders/available
 */
export const getAvailableOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ status: 'PROCESSING', deliveryAgentId: null })
            .populate('shopId', 'name location')
            .sort({ createdAt: 1 });
        res.status(200).json({ status: 'success', data: orders });
    } catch (err) {
        next(err);
    }
};

/**
 * @description Delivery agent claims an available order.
 * @route PATCH /api/orders/:id/claim
 */
export const claimOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || order.status !== 'PROCESSING' || order.deliveryAgentId) {
            return res.status(400).json({ message: 'Order is not available for claiming.'});
        }

        order.deliveryAgentId = req.user.id;
        req.user.isAvailable = false; // Mark agent as busy
        await req.user.save({ validateBeforeSave: false });
        await order.save();

        res.status(200).json({ status: 'success', message: 'Order claimed!', data: order });
    } catch (err) {
        next(err);
    }
};

/**
 * @description Delivery agent gets their currently assigned, active deliveries.
 * @route GET /api/orders/my-deliveries
 */
export const getMyDeliveries = async (req, res, next) => {
  try {
    const orders = await Order.find({ 
        deliveryAgentId: req.user.id, 
        status: { $in: ['PROCESSING', 'OUT_FOR_DELIVERY'] } 
      })
      .populate('shopId', 'name location')
      .populate('userId', 'name address');
    res.status(200).json({ status: 'success', data: orders });
  } catch (err) {
    next(err);
  }
};


// ---------------------------------------------------------------- //
//                  SHARED & ADMIN CONTROLLERS
// ---------------------------------------------------------------- //

/**
 * @description Updates an order's status based on the user's role.
 * @route PATCH /api/orders/:id/status
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // --- Role-based Authorization Logic ---
    const userRole = req.user.role;

    if (userRole === 'shopkeeper') {
        const shop = await Shop.findById(order.shopId);
        if (shop.ownerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to update this order.' });
        }
        if (status === 'ACCEPTED') order.status = 'PENDING_PAYMENT';
        else if (status === 'REJECTED') order.status = 'REJECTED';
        else return res.status(400).json({ message: 'Invalid status update for shopkeeper.' });
        
    } else if (userRole === 'delivery_agent') {
        if (!order.deliveryAgentId || order.deliveryAgentId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'This is not your assigned order.' });
        }
        if (status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') {
            order.status = status;
            if (status === 'DELIVERED') {
                await User.findByIdAndUpdate(order.deliveryAgentId, { isAvailable: true });
            }
        } else {
            return res.status(400).json({ message: 'Invalid status update for delivery agent.' });
        }
    } else if (userRole === 'admin') {
        order.status = status; // Admins have broader permissions
    } else {
        return res.status(403).json({ message: 'You are not authorized to change order status.' });
    }

    await order.save();
    res.json({ status: 'success', message: 'Order status updated', data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * @description Any authorized user (customer, agent, admin) can track an order.
 * @route GET /api/orders/:id/track
 */
export const trackOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('shopId', 'name location')
            .populate({ path: 'deliveryAgentId', select: 'name phone currentLocation' });

        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        const isOwner = order.userId.toString() === req.user.id.toString();
        const isAgent = order.deliveryAgentId && order.deliveryAgentId._id.toString() === req.user.id.toString();
        const isAdmin = req.user.role === 'admin';
        
        if (!isOwner && !isAgent && !isAdmin) {
             return res.status(403).json({ message: 'You are not authorized to view this order.' });
        }

        res.status(200).json({ status: 'success', data: order });
    } catch (err) {
        next(err);
    }
};

/**
 * @description Admin gets a list of all orders.
 * @route GET /api/orders
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find(req.query)
      .populate('userId', 'name email')
      .populate('shopId', 'name')
      .populate({ path: 'deliveryAgentId', select: 'name phone' });

    res.status(200).json({ status: 'success', results: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};