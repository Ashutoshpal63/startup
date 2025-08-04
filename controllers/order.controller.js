import Order from '../schema/order.js';
import User from '../schema/user.js';
import Product from '../schema/product.js';
import Shop from '../schema/shop.js';
import mongoose from 'mongoose';

// ---------------------------------------------------------------- //
//                  CUSTOMER CONTROLLERS
// ---------------------------------------------------------------- //

/**
 * @description Customer checks out their entire cart, creating one order per shop.
 *              This is the new primary function for creating orders.
 * @route POST /api/orders/checkout-all
 */
export const createOrdersFromCart = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.user.id).populate('cart.productId').session(session);

    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    // 1. Group all cart items by their shop ID
    const groupedByShop = user.cart.reduce((acc, item) => {
      // Ensure productId and shopId exist before processing
      if (item.productId && item.productId.shopId) {
        const shopId = item.productId.shopId.toString();
        if (!acc[shopId]) {
          acc[shopId] = [];
        }
        acc[shopId].push(item);
      }
      return acc;
    }, {});

    const createdOrderIds = [];

    // 2. Loop through each shop group and create a separate order for it
    for (const shopId in groupedByShop) {
      const itemsFromShop = groupedByShop[shopId];
      let totalAmount = 0;
      const orderProducts = [];

      for (const item of itemsFromShop) {
        const product = await Product.findById(item.productId._id).session(session);
        if (!product || product.quantityAvailable < item.quantity) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Product "${item.productId.name}" is out of stock.` });
        }
        product.quantityAvailable -= item.quantity;
        await product.save({ session });
        totalAmount += item.quantity * product.price;
        orderProducts.push({
          productId: product._id,
          name: product.name,
          quantity: item.quantity,
          price: product.price,
        });
      }

      const [newOrder] = await Order.create([{
        userId: user._id,
        shopId,
        products: orderProducts,
        totalAmount,
        deliveryAddress: user.address,
        status: 'PENDING_APPROVAL',
      }], { session });

      createdOrderIds.push(newOrder._id);
    }

    // 3. Clear the user's entire cart
    user.cart = [];
    await user.save({ session });

    // 4. If everything was successful, commit the transaction
    await session.commitTransaction();

    res.status(201).json({ 
      status: 'success', 
      message: 'Orders placed successfully for all shops.',
      data: { createdOrderIds }
    });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};


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

export const claimOrder = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const order = await Order.findById(req.params.id).session(session);
        if (!order || order.status !== 'PROCESSING' || order.deliveryAgentId) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Order is not available for claiming.'});
        }

        order.deliveryAgentId = req.user.id;
        
        const agent = await User.findById(req.user.id).session(session);
        agent.isAvailable = false;

        await agent.save({ session });
        await order.save({ session });

        await session.commitTransaction();
        res.status(200).json({ status: 'success', message: 'Order claimed!', data: order });
    } catch (err) {
        await session.abortTransaction();
        next(err);
    } finally {
        session.endSession();
    }
};

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

export const updateOrderStatus = async (req, res, next) => {
  const { status } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'Order not found' });
    }

    const userRole = req.user.role;

    if (userRole === 'shopkeeper') {
        const shop = await Shop.findById(order.shopId).session(session);
        if (shop.ownerId.toString() !== req.user.id.toString()) {
            await session.abortTransaction();
            return res.status(403).json({ message: 'You are not authorized to update this order.' });
        }
        if (status === 'ACCEPTED') order.status = 'PENDING_PAYMENT';
        else if (status === 'REJECTED') order.status = 'REJECTED';
        else {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Invalid status update for shopkeeper.' });
        }
        
    } else if (userRole === 'delivery_agent') {
        if (!order.deliveryAgentId || order.deliveryAgentId.toString() !== req.user.id.toString()) {
            await session.abortTransaction();
            return res.status(403).json({ message: 'This is not your assigned order.' });
        }
        if (status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') {
            order.status = status;
            if (status === 'DELIVERED') {
                await User.findByIdAndUpdate(order.deliveryAgentId, { isAvailable: true }, { session });
            }
        } else {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Invalid status update for delivery agent.' });
        }
    } else if (userRole === 'admin') {
        order.status = status;
    } else {
        await session.abortTransaction();
        return res.status(403).json({ message: 'You are not authorized to change order status.' });
    }

    await order.save({ session });
    await session.commitTransaction();
    res.json({ status: 'success', message: 'Order status updated', data: order });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

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

export const assignAgentToOrder = async (req, res, next) => {
    const { agentId } = req.body;
    const { id: orderId } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findById(orderId).session(session);
        const agent = await User.findById(agentId).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Order not found.' });
        }
        if (!agent || agent.role !== 'delivery_agent' || !agent.isAvailable) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Selected agent is not available or invalid.' });
        }
        if (order.status !== 'PROCESSING') {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Order is not ready to be assigned.' });
        }

        order.deliveryAgentId = agent._id;
        agent.isAvailable = false;

        await order.save({ session });
        await agent.save({ session });
        
        await session.commitTransaction();

        res.status(200).json({ status: 'success', message: 'Agent assigned successfully.', data: order });

    } catch (err) {
        await session.abortTransaction();
        next(err);
    } finally {
        session.endSession();
    }
};