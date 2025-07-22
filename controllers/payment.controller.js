import Order from '../schema/order.js';

export const processDummyPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // MODIFIED: A more robust check. The order must be in the correct status to be paid.
    if (order.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({ message: 'This order is not currently awaiting payment.' });
    }

    console.log(`Processing dummy payment for Order ID: ${orderId}...`);

    // This part runs in the background AFTER we've responded to the user
    setTimeout(async () => {
      try {
        const orderToUpdate = await Order.findById(orderId);
        if (orderToUpdate) {
          orderToUpdate.isPaid = true;
          orderToUpdate.paidAt = new Date();
          
          // CRITICAL FIX: Update the status to move it to the next workflow stage
          orderToUpdate.status = 'PROCESSING'; 
          
          orderToUpdate.paymentResult = {
            id: `dummy_txn_${new Date().getTime()}`,
            status: 'succeeded',
            update_time: new Date().toISOString(),
          };
          
          await orderToUpdate.save();
          console.log(`✅ Dummy payment SUCCEEDED for Order ID: ${orderId}. Status is now PROCESSING.`);
        }
      } catch (dbError) {
        console.error(`❌ Failed to update order in database after dummy payment:`, dbError);
      }
    }, 2000); // 2-second delay to simulate a real gateway

    // This response is sent immediately to the user for good UX
    res.status(200).json({
      status: 'success',
      message: 'Payment is being processed. You will be notified upon completion.',
      orderId: order._id,
    });

  } catch (err) {
    next(err);
  }
};