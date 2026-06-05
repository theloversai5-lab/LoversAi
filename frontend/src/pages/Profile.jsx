// pages/Profile.jsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { userAPI, paymentAPI } from '../api/api';
import CoupleProfile from './couple/CoupleProfile';

const Profile = () => {
  const { currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [credits, setCredits] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [recentPayment, setRecentPayment] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user data on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  // Fetch payment history when tab changes to 'history'
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (currentUser && activeTab === 'history') {
      fetchPaymentHistory();
    }
  }, [currentUser, activeTab]);

  // Main function to fetch user data
  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching user data...');
      
      // Fetch profile data
      const profileData = await userAPI.getProfile();
      console.log('Profile Response:', profileData);
      setProfileData(profileData.user);
      
      // Fetch payment status
      const paymentData = await paymentAPI.getPaymentStatus();
      console.log('Payment Status Response:', paymentData);
      
      // Set data based on the new response structure
      if (paymentData.success) {
        setCredits(paymentData.user.credits || 0);
        setSubscription(paymentData.subscription);
        
        // Make sure paymentHistory is properly set
        if (paymentData.paymentHistory && Array.isArray(paymentData.paymentHistory)) {
          console.log('Payment History found:', paymentData.paymentHistory.length, 'items');
          setPaymentHistory(paymentData.paymentHistory);
        } else {
          console.log('No payment history found or invalid format');
          setPaymentHistory([]);
        }
        
        setRecentPayment(paymentData.recentPayment);
        
        // Show notification for recent payment
        if (paymentData.recentPayment) {
          const planName = paymentData.recentPayment.plan === 'basic' ? 'Basic' : 'Premium';
          const creditsAdded = paymentData.recentPayment.credits;
          console.log(`🎉 Recent payment detected: ${creditsAdded} credits added from ${planName} plan`);
        }
        
        if (paymentData.message) {
          console.log(paymentData.message);
        }
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error.response?.data || error.message);
      
      // Set default values
      setCredits(0);
      setSubscription(null);
      setPaymentHistory([]);
      setRecentPayment(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to fetch only payment history
  const fetchPaymentHistory = async () => {
    try {
      setRefreshing(true);
      const response = await paymentAPI.getHistory();
      
      if (response.success) {
        console.log('Payment History Response:', response);
        setPaymentHistory(response.paymentHistory || []);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    } finally {
      setRefreshing(false);
    }
  };

  // Manual refresh payment data
  const handleRefreshPayment = async () => {
    try {
      setRefreshing(true);
      const response = await paymentAPI.syncPayment();
      
      if (response.success) {
        // Refresh all data
        await fetchUserData();
        
        // Show success message
        alert('Payment status synced successfully!');
        
        // If there's a recent payment, show details
        if (response.user?.lastPaymentStatus === 'success') {
          const creditsAdded = response.subscription?.creditsGranted || 0;
          const planName = response.subscription?.plan === 'basic' ? 'Basic' : 'Premium';
          alert(`Payment successful! ${creditsAdded} credits added from ${planName} plan.`);
        }
      }
    } catch (error) {
      console.error('Error syncing payment:', error);
      alert('Failed to sync payment status');
    } finally {
      setRefreshing(false);
    }
  };

  // Manual refresh all data
  const handleRefreshAll = async () => {
    try {
      setRefreshing(true);
      await fetchUserData();
      alert('Data refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Add test credits (for development)
  const handleAddTestCredits = async (plan) => {
    try {
      if (!window.confirm(`Add test credits for ${plan} plan? This is for development only.`)) {
        return;
      }
      
      const response = await paymentAPI.addTestCredits(plan);
      
      if (response.success) {
        await fetchUserData(); // Refresh all data
        alert(`Test credits added successfully! ${response.message}`);
      }
    } catch (error) {
      console.error('Error adding test credits:', error);
      alert('Failed to add test credits');
    }
  };

  const handleUpgrade = (plan) => {
    window.location.href = '/pricing';
  };

  if (currentUser?.role === 'couple') {
    return <CoupleProfile />;
  }

  if (loading) {
    return (
      <div className="relative w-full min-h-screen flex items-center justify-center loverai-page-bg">
        <div className="relative z-20 w-full max-w-md px-6 py-10">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-loverai-gold mx-auto"></div>
            <p className="mt-4 text-white/70">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center text-gray-900 overflow-hidden loverai-page-bg p-4">
      <div className="relative z-20 w-full max-w-6xl px-4 py-10">
        {/* Main Profile Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl">
          
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-loverai-gold/20 to-loverai-gold/10 rounded-full flex items-center justify-center">
              <span className="text-3xl">👤</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-loverai-gold-bright to-loverai-gold bg-clip-text text-transparent">
              {profileData?.fullName || 'Your Profile'}
            </h1>
            <p className="text-sm text-white/60 mt-2">
              Manage your account, subscription, and credits
            </p>
            {profileData?.email && (
              <p className="text-sm text-white/40 mt-1">
                {profileData.email}
              </p>
            )}
            
            {/* Credits Display */}
            <div className="mt-6 inline-flex items-center px-6 py-3 bg-gradient-to-r from-loverai-gold/20 to-loverai-gold/10 border border-white/10 rounded-full">
              <span className="text-2xl mr-3">🎫</span>
              <div>
                <p className="text-sm text-white/50">Available Credits</p>
                <p className="text-2xl font-bold text-white">{credits.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Recent Payment Notification */}
          {recentPayment && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🎉</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-200">
                    Payment Successful!
                  </h3>
                  <div className="mt-1 text-sm text-green-100/80">
                    <p>
                      {recentPayment.credits} credits added from {recentPayment.plan} plan on{' '}
                      {new Date(recentPayment.time).toLocaleDateString()}.
                    </p>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => setRecentPayment(null)}
                      className="text-sm font-medium text-green-300 hover:text-green-200"
                    >
                      Dismiss →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-white/20 mb-8">
            <nav className="-mb-px flex flex-wrap justify-center space-x-2 md:space-x-8">
              {[
                { id: 'profile', label: '👤 Personal Info', icon: '👤' },
                { id: 'subscription', label: '💳 Subscription', icon: '💳' },
                { id: 'history', label: '📊 Payment History', icon: '📊' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-3 px-2 md:px-4 border-b-2 font-medium text-sm whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-loverai-gold text-loverai-gold-bright'
                      : 'border-transparent text-white/40 hover:text-loverai-gold hover:border-white/30'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Sections */}
          <div className="space-y-6">
            {/* Personal Info Tab */}
            {activeTab === 'profile' && (
              <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-loverai-gold-bright to-loverai-gold bg-clip-text text-transparent">
                    Personal Information
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/user-form"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-loverai-gold to-amber-700 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </Link>
                    <button
                      onClick={handleRefreshAll}
                      disabled={refreshing}
                      className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all disabled:opacity-50"
                    >
                      {refreshing ? (
                        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Full Name', value: profileData?.fullName || 'Not provided' },
                    { label: 'Email', value: profileData?.email },
                    { label: 'Phone', value: profileData?.phone || 'Not provided' },
                    { label: 'Location', value: profileData?.location || 'Not provided' },
                    { label: 'Age', value: profileData?.age || 'Not provided' },
                    { label: 'Company', value: profileData?.company_name || 'Not provided' },
                    { label: 'Position', value: profileData?.position || 'Not provided' },
                    { label: 'Interests', value: profileData?.interest || 'Not provided' },
                    { label: 'Budget', value: profileData?.budget || 'Not provided' },
                    { 
                      label: 'Payment Status', 
                      value: profileData?.lastPaymentStatus || 'N/A',
                      status: profileData?.lastPaymentStatus 
                    },
                    { 
                      label: 'Subscription Status', 
                      value: profileData?.subscriptionStatus || 'None',
                      status: profileData?.subscriptionStatus 
                    },
                    { 
                      label: 'Last Payment', 
                      value: profileData?.lastPaymentAt 
                        ? new Date(profileData.lastPaymentAt).toLocaleDateString()
                        : 'Never'
                    },
                  ].map((item, index) => (
                    <div key={index} className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <p className="text-sm text-white/50 mb-1">{item.label}</p>
                      {item.status ? (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          item.status === 'success' || item.status === 'active'
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : item.status === 'failed' || item.status === 'cancelled'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : item.status === 'pending' || item.status === 'expired'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : 'bg-white/10 text-white'
                        }`}>
                          {item.value}
                        </span>
                      ) : (
                        <p className="font-medium text-white text-lg">{item.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-loverai-gold-bright to-loverai-gold bg-clip-text text-transparent mb-6">
                  Subscription Details
                </h2>
                
                {subscription ? (
                  <div className="space-y-8">
                    {/* Current Plan Card */}
                    <div className="bg-gradient-to-r from-loverai-gold/10 to-amber-700/10 p-6 rounded-xl border border-loverai-gold/20">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                          <span className={`inline-flex items-center px-4 py-1 rounded-full text-sm font-semibold mb-2 ${
                            subscription.plan === 'premium' 
                              ? 'bg-gradient-to-r from-amber-700 to-loverai-gold text-white'
                              : subscription.plan === 'basic'
                              ? 'bg-gradient-to-r from-loverai-gold to-amber-700 text-white'
                              : 'bg-white/20 text-white'
                          }`}>
                            {subscription.plan.toUpperCase()} PLAN
                          </span>
                          <h3 className="text-xl font-bold text-white">Current Subscription</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            subscription.status === 'active'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : subscription.status === 'cancelled'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : subscription.status === 'expired'
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : subscription.status === 'pending'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-white/10 text-white'
                          }`}>
                            {subscription.status ? subscription.status.toUpperCase() : 'UNKNOWN'}
                          </span>
                          <button
                            onClick={handleRefreshAll}
                            disabled={refreshing}
                            className="inline-flex items-center px-3 py-1 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-all"
                            title="Refresh subscription data"
                          >
                            {refreshing ? (
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                          { label: 'Credits Granted', value: subscription.creditsGranted ? subscription.creditsGranted.toLocaleString() : '0' },
                          { label: 'Credits Used', value: subscription.creditsUsed ? subscription.creditsUsed.toLocaleString() : '0' },
                          { label: 'Remaining', value: subscription.creditsRemaining ? subscription.creditsRemaining.toLocaleString() : subscription.creditsGranted ? subscription.creditsGranted.toLocaleString() : '0' },
                          { label: 'Monthly Price', value: `$${subscription.price ? subscription.price.toLocaleString() : '0'}` }
                        ].map((item, index) => (
                          <div key={index} className="loverai-page-bg/20 p-4 rounded-lg border border-white/10">
                            <p className="text-sm text-white/50">{item.label}</p>
                            <p className="text-2xl font-bold text-white">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {subscription.status === 'cancelled' || subscription.status === 'expired' ? (
                          <button
                            onClick={() => handleUpgrade('basic')}
                            className="bg-gradient-to-r from-loverai-gold to-amber-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-pink-600 transition-all"
                          >
                            🔄 Renew Subscription
                          </button>
                        ) : subscription.plan === 'basic' ? (
                          <button
                            onClick={() => handleUpgrade('premium')}
                            className="bg-gradient-to-r from-amber-700 to-loverai-gold text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-600 transition-all"
                          >
                            ⬆️ Upgrade to Premium
                          </button>
                        ) : null}
                        
                        <button
                          onClick={handleRefreshPayment}
                          disabled={refreshing}
                          className="inline-flex items-center px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50"
                        >
                          {refreshing ? (
                            <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                          {refreshing ? 'Syncing...' : 'Sync Payment'}
                        </button>
                      </div>
                    </div>

                    {/* Available Plans */}
                    <div className="mt-8">
                      <h3 className="text-xl font-bold text-white mb-4">Available Plans</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Free Plan */}
                        <div style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", color: "#fff" }} className="border border-white/10 rounded-2xl p-6 flex flex-col h-full">
                          <h3 className="text-xl font-bold mb-2">Free Plan</h3>
                          <div className="text-3xl font-bold mb-1">₹ 0</div>
                          <div className="text-sm text-white/50 mb-6">/month</div>
                          <p className="text-sm text-white/60 mb-6">
                            Explore basic AI planning and vision tools for couples starting their journey.
                          </p>

                          <ul className="text-sm space-y-2 mb-8 flex-grow">
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> 1 AI Decor Vision (Small Event only)
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> 1 Active moodboard slot
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> Browse wedding planner listings
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> Standard quality downloads
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> Access to basic wedding profile
                            </li>
                          </ul>
                          {(!subscription || subscription?.plan === 'free') && (
                            <div className="w-full py-3 rounded-xl font-semibold bg-white/10 text-white text-center">
                              Current Plan
                            </div>
                          )}
                        </div>

                        {/* Basic Plan */}
                        <div style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", color: "#fff" }} className="border border-white/10 rounded-2xl p-6 flex flex-col h-full">
                          <h3 className="text-xl font-bold mb-2">Basic Plan</h3>
                          <div className="text-3xl font-bold mb-1">₹ 1,499</div>
                          <div className="text-sm text-white/50 mb-6">/month</div>
                          <p className="text-sm text-white/60 mb-6">
                            Great for couples looking for richer event inspiration and contact options.
                          </p>

                          <ul className="text-sm space-y-2 mb-8 flex-grow">
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> 15 AI Decor Visions (Small/Medium Events)
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> 5 Active moodboard slots
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> Connect with up to 5 planners
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> High resolution downloads
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> Standard email support
                            </li>
                          </ul>
                          <button
                            onClick={() => handleUpgrade('basic')}
                            className={`w-2/3 mx-auto flex justify-center py-2 text-sm font-medium rounded-xl shadow-[0_4px_14px_0_rgba(212,140,140,0.39)] transition-all mt-4 ${
                              subscription?.plan === 'basic'
                                ? 'bg-white/10 text-white/50 cursor-default shadow-none'
                                : 'bg-[#D48C8C] text-white hover:shadow-[0_6px_20px_rgba(212,140,140,0.23)] hover:opacity-90'
                            }`}
                            disabled={subscription?.plan === 'basic'}
                          >
                            {subscription?.plan === 'basic' ? 'Current Plan' : 'Upgrade Now'}
                          </button>
                        </div>

                        {/* Premium Plan */}
                        <div style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", color: "#fff" }} className="border border-[#e6c6b2]/40 shadow-[0_0_20px_rgba(230,198,178,0.15)] rounded-2xl p-6 flex flex-col h-full relative overflow-hidden">
                          <div className="absolute top-0 right-0 bg-gradient-to-r from-[#e6c6b2] to-[#c59854] text-[#1c1613] text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Most Popular</div>
                          <h3 className="text-xl font-bold mb-2">Premium Plan</h3>
                          <div className="text-3xl font-bold mb-1">₹ 2,499</div>
                          <div className="text-sm text-white/50 mb-6">/month</div>
                          <p className="text-sm text-white/60 mb-6">
                            Full access to complete wedding tools, custom theme generations, and unlimited listings.
                          </p>

                          <ul className="text-sm space-y-2 mb-8 flex-grow">
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> Unlimited AI Decor Visions (All Event Types)
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> Unlimited moodboards & themes
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> Connect & chat with unlimited planners
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> Ultra high-res downloads
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> Custom generative theme tools
                            </li>
                            <li className="flex items-center">
                              <span className="text-green-600 mr-2">✔️</span> Priority 24/7 dedicated support
                            </li>
                          </ul>
                          <button
                            onClick={() => handleUpgrade('premium')}
                            className={`w-2/3 mx-auto flex justify-center py-2 text-sm font-medium rounded-xl shadow-[0_4px_14px_0_rgba(212,140,140,0.39)] transition-all mt-4 ${
                              subscription?.plan === 'premium'
                                ? 'bg-white/10 text-white/50 cursor-default shadow-none'
                                : 'bg-[#D48C8C] text-white hover:shadow-[0_6px_20px_rgba(212,140,140,0.23)] hover:opacity-90'
                            }`}
                            disabled={subscription?.plan === 'premium'}
                          >
                            {subscription?.plan === 'premium' ? 'Current Plan' : 'Upgrade Now'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-loverai-gold/10 to-amber-700/10 rounded-full flex items-center justify-center">
                      <span className="text-4xl">💳</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">No Active Subscription</h3>
                    <p className="text-white/50 mb-8 max-w-md mx-auto">
                      You don't have an active subscription. Choose a plan to unlock premium features and credits.
                    </p>
                    <button
                      onClick={() => handleUpgrade('basic')}
                      className="bg-gradient-to-r from-loverai-gold to-amber-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-pink-600 transition-all"
                    >
                      🚀 Explore Plans
                    </button>
                    
                    <div className="mt-8 pt-6 border-t border-white/20">
                      <p className="text-sm text-white/30 mb-3">Having issues with payment status?</p>
                      <button
                        onClick={handleRefreshPayment}
                        disabled={refreshing}
                        className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50"
                      >
                        {refreshing ? (
                          <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                        {refreshing ? 'Syncing...' : 'Sync Payment Status'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment History Tab */}
            {activeTab === 'history' && (
              <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-loverai-gold-bright to-loverai-gold bg-clip-text text-transparent">
                    Payment History
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={fetchPaymentHistory}
                      disabled={refreshing}
                      className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50"
                    >
                      {refreshing ? (
                        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>
                
                {paymentHistory.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Plan</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">Credits</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/5 divide-y divide-white/10">
                        {paymentHistory.map((payment, index) => {
                          const displayDate = payment.lastPaymentAt || payment.createdAt || payment.date;
                          const dateObj = displayDate ? new Date(displayDate) : new Date();
                          const amount = payment.price || payment.amount || 
                                        (payment.plan === 'basic' ? 29 : 
                                         payment.plan === 'premium' ? 99 : 0);
                          const credits = payment.creditsGranted || payment.credits ||
                                         (payment.plan === 'basic' ? 1300 :
                                          payment.plan === 'premium' ? 6500 : 100);
                          const status = payment.lastPaymentStatus || payment.paymentStatus || payment.status;
                          
                          return (
                            <tr key={index} className="hover:bg-white/10 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white">
                                  {dateObj.toLocaleDateString()}
                                </div>
                                <div className="text-xs text-white/40">
                                  {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  payment.plan === 'premium'
                                    ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                                    : payment.plan === 'basic'
                                    ? 'bg-loverai-gold/20 text-loverai-gold-bright border border-loverai-gold/30'
                                    : 'bg-white/10 text-white'
                                }`}>
                                  {payment.plan ? payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1) : 'Free'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-lg font-bold text-white">
                                  ${typeof amount === 'number' ? amount.toFixed(2) : '0.00'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  status === 'success'
                                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                    : status === 'failed'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    : status === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                    : 'bg-white/10 text-white'
                                }`}>
                                  {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-lg font-semibold text-white">
                                  {typeof credits === 'number' ? credits.toLocaleString() : '0'}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-loverai-gold/10 to-amber-700/10 rounded-full flex items-center justify-center">
                      <span className="text-4xl">📊</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">No Payment History Found</h3>
                    <p className="text-white/50 mb-6 max-w-md mx-auto">
                      You haven't made any payments yet. Start your journey with our premium plans.
                    </p>
                    <button
                      onClick={() => handleUpgrade('basic')}
                      className="bg-gradient-to-r from-loverai-gold to-amber-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-pink-600 transition-all"
                    >
                      View Plans
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

         
          

          {/* Footer Actions */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={handleRefreshAll}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                🔄 Refresh All Data
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddTestCredits('basic')}
                    className="inline-flex items-center px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all border border-blue-500/30"
                  >
                    Test Basic Credits
                  </button>
                  <button
                    onClick={() => handleAddTestCredits('premium')}
                    className="inline-flex items-center px-3 py-2 bg-amber-600/20 text-amber-400 rounded-lg hover:bg-pink-500/30 transition-all border border-amber-600/30"
                  >
                    Test Premium Credits
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;