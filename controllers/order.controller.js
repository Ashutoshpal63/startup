import Order from '../schema/order.js';
import User from '../schema/user.js'; // Agents are now Users

// Place a new order (User)
export const createOrder = async (req, res) => {
  try {
    const { shopId, products, deliveryAddress, paymentMethod } = req.body;
    
    // Calculate total amount on the server-side for security
    const totalAmount = products.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Find an available delivery agent
    const availableAgent = await User.findOne({ role: 'delivery', isAvailable: true });
    if (!availableAgent) {
      return res.status(400).json({ message: 'No delivery agents available at the moment.' });
    }

    const newOrder = await Order.create({
      userId: req.user._id,
      shopId,
      deliveryAgentId: availableAgent._id,
      products,
      totalAmount,
      deliveryAddress,
      paymentMethod,
    });

    // Mark agent as unavailable
    availableAgent.isAvailable = false;
    await availableAgent.save();

    res.status(201).json({ status: 'success', data: newOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Order creation failed', message: err.message });
  }
};

// Update order status (Admin/Delivery)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Authorization for delivery agents
    if (req.user.role === 'delivery' && order.deliveryAgentId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'This is not your assigned order.' });
    }

    order.status = status;
    await order.save();

    // If order delivered, make agent available again
    if (status === 'delivered') {
      await User.findByIdAndUpdate(order.deliveryAgentId, { isAvailable: true });
    }

    res.json({ message: 'Order status updated successfully', data: order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// Get all orders (Admin)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find(req.query)
      .populate('userId', 'name email')
      .populate('shopId', 'name')
      .populate({ path: 'deliveryAgentId', select: 'name phone' }); // Populate agent info from User model

    res.status(200).json({ status: 'success', results: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};


// Get current user’s orders (Customer)
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate('shopId', 'name')
      .populate({ path: 'deliveryAgentId', select: 'name phone' });
    res.status(200).json({ status: 'success', data: orders });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get delivery agent’s assigned orders
export const getAssignedOrders = async (req, res) => {
  try {
    const orders = await Order.find({ deliveryAgentId: req.user._id })
      .populate('shopId', 'name')
      .populate('userId', 'name address');
    res.status(200).json({ status: 'success', data: orders });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Track a single order
export const trackOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name email')
            .populate('shopId', 'name location')
            .populate({ path: 'deliveryAgentId', select: 'name phone isAvailable vehicleDetails' });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Authorization check
        const isOwner = req.user.role === 'customer' && order.userId.toString() === req.user._id.toString();
        const isAgent = req.user.role === 'delivery' && order.deliveryAgentId?._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAgent && !isAdmin) {
            return res.status(403).json({ message: 'You are not authorized to view this order.' });
        }
        
        res.status(200).json({ status: 'success', data: order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to track order', message: err.message });
    }
};