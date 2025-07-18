import Order from '../schema/order.js';


export const processDummyPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body; // The frontend sends the internal order ID
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.isPaid) {
      return res.status(400).json({ message: 'This order has already been paid for.' });
    }

    
    console.log(`Processing dummy payment for Order ID: ${orderId}...`);

    setTimeout(async () => {
      try {
        
        const orderToUpdate = await Order.findById(orderId);
        if (orderToUpdate) {
          orderToUpdate.isPaid = true;
          orderToUpdate.paidAt = new Date();
          orderToUpdate.paymentResult = {
            id: `dummy_txn_${new Date().getTime()}`, // Generate a fake transaction ID
            status: 'succeeded',
            update_time: new Date().toISOString(),
          };
          await orderToUpdate.save();
          console.log(`✅ Dummy payment SUCCEEDED for Order ID: ${orderId}`);
        }
      } catch (dbError) {
        console.error(`❌ Failed to update order in database after dummy payment:`, dbError);
      }
    }, 2000); 
    res.status(200).json({
      status: 'success',
      message: 'Payment is being processed. You will be notified upon completion.',
      orderId: order._id,
    });

  } catch (err) {
    next(err);
  }
};