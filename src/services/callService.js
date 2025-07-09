export const initiateCallService = async (fromUser, toUser, callType, clientURL) => {
  try {
    const payload = {
      from: fromUser,
      to: toUser,
      type: callType,
      provider: 'gopi@demo.com'
    };
    
    // Replace with your actual call service endpoint
    const response = await fetch(`${clientURL}/api/initiate-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Call service error:', error);
    throw error;
  }
};