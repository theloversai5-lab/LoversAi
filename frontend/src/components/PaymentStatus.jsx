// React component example
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PaymentStatus = () => {
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchPaymentStatus();
  }, []);
  
  const fetchPaymentStatus = async () => {
    try {
      const token = await getFirebaseToken(); // Get Firebase token
      const response = await axios.get('/api/payment/payment-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaymentInfo(response.data);
    } catch (error) {
      console.error('Error fetching payment status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpgrade = async (plan) => {
    try {
      const token = await getFirebaseToken();
      const response = await axios.post('/api/payment/create-checkout', 
        { plan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Redirect to Lemon Squeezy checkout
      window.location.href = response.data.checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout:', error);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="payment-status">
      <h2>Your Subscription</h2>
      
      {paymentInfo?.user?.subscriptionStatus === 'active' ? (
        <div className="active-subscription">
          <div className="status-badge success">Active</div>
          <p>Plan: <strong>{paymentInfo.user.plan.toUpperCase()}</strong></p>
          <p>Credits: <strong>{paymentInfo.user.credits}</strong></p>
          <p>Renews on: {new Date(paymentInfo.user.subscriptionRenewsAt).toLocaleDateString()}</p>
          <p>Last payment: {paymentInfo.user.lastPaymentStatus}</p>
        </div>
      ) : paymentInfo?.user?.lastPaymentStatus === 'success' ? (
        <div className="payment-success">
          <h3>✅ Payment Successful!</h3>
          <p>Your payment was processed successfully.</p>
          <p>Credits added: {paymentInfo.user.credits}</p>
        </div>
      ) : (
        <div className="no-subscription">
          <p>You don't have an active subscription.</p>
          <button onClick={() => handleUpgrade('basic')}>
            Upgrade to Basic Plan
          </button>
          <button onClick={() => handleUpgrade('premium')}>
            Upgrade to Premium Plan
          </button>
        </div>
      )}
      
      {paymentInfo?.paymentHistory?.length > 0 && (
        <div className="payment-history">
          <h3>Payment History</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentInfo.paymentHistory.map((payment, index) => (
                <tr key={index}>
                  <td>{new Date(payment.lastPaymentAt).toLocaleDateString()}</td>
                  <td>{payment.plan}</td>
                  <td>${payment.price}</td>
                  <td className={`status-${payment.lastPaymentStatus}`}>
                    {payment.lastPaymentStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentStatus;