import Order from '../schema/order.js';
import User from '../schema/user.js';
import Product from '../schema/product.js';
import Shop from '../schema/shop.js';
import mongoose from 'mongoose';

// --------------------------------------------------------------- //
//                  CUSTOMER CONTROLLERS (MODIFIED VIEW)
// --------------------------------------------------------------- //

export const createOrdersFromCart = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const currentUser = await User.findById(req.user.id).populate('cart.productId').session(session);

    if (!currentUser.cart || currentUser.cart.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty!' });
    }

    const groupByShop = currentUser.cart.reduce((acc, item) => {
      if (item.productId?.shopId) {
        const shopKey = item.productId.shopId.toString();
        acc[shopKey] = acc[shopKey] || [];
        acc[shopKey].push(item);
      }
      return acc;
    }, {});

    const createdOrderIds = [];

    for (const shopId in groupByShop) {
      const items = groupByShop[shopId];
      let totalAmount = 0;
      const orderProducts = [];

      for (const cartItem of items) {
        const productDoc = await Product.findById(cartItem.productId._id).session(session);
        if (!productDoc || productDoc.quantityAvailable < cartItem.quantity) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Product "${cartItem.productId.name}" is unavailable.` });
        }

        productDoc.quantityAvailable -= cartItem.quantity;
        await productDoc.save({ session });

        totalAmount += cartItem.quantity * productDoc.price;
        orderProducts.push({
          productId: productDoc._id,
          name: productDoc.name,
          quantity: cartItem.quantity,
          price: productDoc.price,
        });
      }

      const [orderCreated] = await Order.create([{
        userId: currentUser._id,
        shopId,
        products: orderProducts,
        totalAmount,
        deliveryAddress: currentUser.address,
        status: 'PENDING_APPROVAL',
      }], { session });

      createdOrderIds.push(orderCreated._id);
    }

    currentUser.cart = [];
    await currentUser.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      status: 'success',
      message: 'Orders placed successfully!',
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
    const myOrders = await Order.find({ userId: req.user.id })
      .populate('shopId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: myOrders });
  } catch (err) {
    next(err);
  }
};

// --------------------------------------------------------------- //
//                     SHOPKEEPER CONTROLLERS
// --------------------------------------------------------------- //

export const getShopOrders = async (req, res, next) => {
  try {
    const myShop = await Shop.findOne({ ownerId: req.user.id });
    if (!myShop) {
      return res.status(404).json({ message: "Shop not found for this account." });
    }

    const ordersList = await Order.find({ shopId: myShop._id })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', data: ordersList });
  } catch (err) {
    next(err);
  }
};

// --------------------------------------------------------------- //
//                  DELIVERY AGENT CONTROLLERS
// --------------------------------------------------------------- //

export const getAvailableOrders = async (req, res, next) => {
  try {
    const availableOrders = await Order.find({ status: 'PROCESSING', deliveryAgentId: null })
      .populate('shopId', 'name location')
      .sort({ createdAt: 1 });
    res.status(200).json({ status: 'success', data: availableOrders });
  } catch (err) {
    next(err);
  }
};

export const claimOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderToClaim = await Order.findById(req.params.id).session(session);

    if (!orderToClaim || orderToClaim.status !== 'PROCESSING' || orderToClaim.deliveryAgentId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'This order cannot be claimed.' });
    }

    orderToClaim.deliveryAgentId = req.user.id;
    const agentDoc = await User.findById(req.user.id).session(session);
    agentDoc.isAvailable = false;

    await orderToClaim.save({ session });
    await agentDoc.save({ session });

    await session.commitTransaction();
    res.status(200).json({ status: 'success', message: 'Order claimed successfully!', data: orderToClaim });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

export const getMyDeliveries = async (req, res, next) => {
  try {
    const assignedOrders = await Order.find({
      deliveryAgentId: req.user.id,
      status: { $in: ['PROCESSING', 'OUT_FOR_DELIVERY'] }
    })
      .populate('shopId', 'name location')
      .populate('userId', 'name address');

    res.status(200).json({ status: 'success', data: assignedOrders });
  } catch (err) {
    next(err);
  }
};

// --------------------------------------------------------------- //
//                  SHARED & ADMIN CONTROLLERS
// --------------------------------------------------------------- //

export const updateOrderStatus = async (req, res, next) => {
  const { status } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const targetOrder = await Order.findById(req.params.id).session(session);
    if (!targetOrder) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found.' });
    }

    const { role } = req.user;

    if (role === 'shopkeeper') {
      const relatedShop = await Shop.findById(targetOrder.shopId).session(session);
      if (relatedShop.ownerId.toString() !== req.user.id.toString()) {
        await session.abortTransaction();
        return res.status(403).json({ message: 'Unauthorized access.' });
      }
      if (status === 'ACCEPTED') targetOrder.status = 'PENDING_PAYMENT';
      else if (status === 'REJECTED') targetOrder.status = 'REJECTED';
      else return res.status(400).json({ message: 'Invalid status for shopkeeper.' });

    } else if (role === 'delivery_agent') {
      if (!targetOrder.deliveryAgentId || targetOrder.deliveryAgentId.toString() !== req.user.id.toString()) {
        await session.abortTransaction();
        return res.status(403).json({ message: 'Order is not assigned to you.' });
      }
      if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) {
        targetOrder.status = status;
        if (status === 'DELIVERED') {
          await User.findByIdAndUpdate(targetOrder.deliveryAgentId, { isAvailable: true }, { session });
        }
      } else return res.status(400).json({ message: 'Invalid update for agent.' });

    } else if (role === 'admin') {
      targetOrder.status = status;
    } else {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    await targetOrder.save({ session });
    await session.commitTransaction();
    res.json({ status: 'success', message: 'Order updated successfully.', data: targetOrder });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

export const trackOrder = async (req, res, next) => {
  try {
    const orderInfo = await Order.findById(req.params.id)
      .populate('shopId', 'name location')
      .populate({ path: 'deliveryAgentId', select: 'name phone currentLocation' });

    if (!orderInfo) return res.status(404).json({ message: 'Order not located.' });

    const isOwner = orderInfo.userId.toString() === req.user.id.toString();
    const isAgent = orderInfo.deliveryAgentId && orderInfo.deliveryAgentId._id.toString() === req.user.id.toString();
    if (!isOwner && !isAgent && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.status(200).json({ status: 'success', data: orderInfo });
  } catch (err) {
    next(err);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    const orderList = await Order.find(req.query)
      .populate('userId', 'name email')
      .populate('shopId', 'name')
      .populate({ path: 'deliveryAgentId', select: 'name phone' });

    res.status(200).json({ status: 'success', results: orderList.length, data: orderList });
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
    const currentOrder = await Order.findById(orderId).session(session);
    const agentData = await User.findById(agentId).session(session);

    if (!currentOrder) return res.status(404).json({ message: 'Order not found.' });
    if (!agentData || agentData.role !== 'delivery_agent' || !agentData.isAvailable) {
      return res.status(400).json({ message: 'Agent unavailable or invalid.' });
    }
    if (currentOrder.status !== 'PROCESSING') {
      return res.status(400).json({ message: 'Order is not ready for assignment.' });
    }

    currentOrder.deliveryAgentId = agentData._id;
    agentData.isAvailable = false;

    await currentOrder.save({ session });
    await agentData.save({ session });

    await session.commitTransaction();

    res.status(200).json({ status: 'success', message: 'Agent assigned!', data: currentOrder });

  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};
