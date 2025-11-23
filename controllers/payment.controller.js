import Order from '../schema/order.js';

export const processDummyPayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const existingOrder = await Order.findById(orderId);

    if (!existingOrder) {
      return res.status(404).json({ message: 'No order found with this ID.' });
    }

    // Slightly different message + variable name change but same logic
    if (existingOrder.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({ message: 'Payment cannot be processed for the current order status.' });
    }

    console.log(`🔄 Initiating simulated payment for Order: ${orderId}`);

    setTimeout(async () => {
      try {
        const freshOrderInstance = await Order.findById(orderId);
        if (freshOrderInstance) {
          freshOrderInstance.isPaid = true;
          freshOrderInstance.paidAt = new Date();
          
          // Same functionality, just slightly different wording & style
          freshOrderInstance.status = 'PROCESSING';

          freshOrderInstance.paymentResult = {
            id: `txn_mock_${Date.now()}`,
            status: 'succeeded',
            update_time: new Date().toISOString(),
          };

          await freshOrderInstance.save();
          console.log(`🎉 Payment simulation completed. Order ${orderId} is now PROCESSING.`);
        }
      } catch (err) {
        console.error(`⚠️ Error while finalizing simulated payment update:`, err);
      }
    }, 2000); // Keeping same delay

    return res.status(200).json({
      status: 'success',
      message: 'Payment is currently being verified. You will receive an update shortly.',
      orderId: existingOrder._id,
    });

  } catch (error) {
    next(error);
  }
};
