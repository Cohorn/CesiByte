
// Add a method to verify the delivery PIN for an order
export async function verifyDeliveryPin(orderId: string, pin: string) {
  try {
    console.log(`Sending verification for order ${orderId} with PIN ${pin}`);
    const response = await apiClient.post(`/orders/${orderId}/verify-pin`, { pin });
    console.log('Verification response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error verifying delivery PIN:", error);
    throw error;
  }
}
