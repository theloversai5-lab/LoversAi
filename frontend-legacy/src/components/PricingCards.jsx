import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { paymentAPI } from "../api/api";
import { plannerPlans, couplePlans, RUPEE } from "../config/pricing";
import { useCheckout } from "../hooks/useCheckout";

export default function PricingCards({ showOnlyRole }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const { handlePurchase, isProcessing } = useCheckout();

  useEffect(() => {
    if (currentUser) {
      const fetchPlan = async () => {
        try {
          const response = await paymentAPI.getPaymentStatus();
          if (response.success && response.plan) {
            setCurrentPlan(response.plan);
          }
        } catch (err) {
          console.error("Error fetching subscription status:", err);
        } finally {
          setLoadingPlan(false);
        }
      };
      fetchPlan();
    } else {
      setLoadingPlan(false);
    }
  }, [currentUser]);

  const [selectedRole, setSelectedRole] = useState(() => {
    if (showOnlyRole) return showOnlyRole;
    const userRole = localStorage.getItem("userRole");
    return userRole === "planner" ? "planner" : "couple";
  });

  useEffect(() => {
    if (showOnlyRole) {
      setSelectedRole(showOnlyRole);
      return;
    }
    const userRole = currentUser?.role || localStorage.getItem("userRole");
    if (userRole === "planner") {
      setSelectedRole("planner");
    } else if (userRole === "couple") {
      setSelectedRole("couple");
    }
  }, [currentUser, showOnlyRole]);

  const serif = { fontFamily: "'Cormorant Garamond', serif" };
  const activePlans = selectedRole === "planner" ? plannerPlans : couplePlans;

  return (
    <div className="space-y-12">
      {!showOnlyRole && (
        <div className="flex justify-center">
          <div className="bg-[#1c1410] border border-white/10 p-1.5 rounded-full flex gap-1 relative z-10">
            <button 
              type="button"
              onClick={() => setSelectedRole("couple")}
              className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                selectedRole === "couple" 
                  ? "bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] shadow-md" 
                  : "text-white/60 hover:text-white"
              }`}
            >
              For Couples
            </button>
            <button 
              type="button"
              onClick={() => setSelectedRole("planner")}
              className={`px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                selectedRole === "planner" 
                  ? "bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] shadow-md" 
                  : "text-white/60 hover:text-white"
              }`}
            >
              For Planners
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto items-stretch">
        {activePlans.map((plan) => {
          const isCurrent = currentPlan?.planId === plan.key;
            
          return (
            <div
              key={plan.name}
              style={{
                backgroundColor: "rgba(20, 15, 12, 0.65)",
                backdropFilter: "blur(20px)",
                borderColor: plan.featured ? "rgba(230, 198, 178, 0.25)" : "rgba(255, 255, 255, 0.08)",
                boxShadow: plan.featured ? "0 0 25px rgba(230, 198, 178, 0.12)" : "none",
              }}
              className={`relative flex flex-col rounded-[28px] border p-8 md:p-10 text-white transition-all hover:scale-[1.01] hover:border-white/15`}
            >
              {plan.featured && (
                <div className="absolute -top-3.5 right-8 bg-[#d4a878] text-[#201913] px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest rounded-full shadow-md">
                  Most Popular
                </div>
              )}

              <h3 className="mb-3 text-3xl font-light" style={serif}>
                {plan.name}
              </h3>
              
              <div className="mb-1 flex items-baseline gap-1 text-white" style={serif}>
                {plan.price !== "Custom Pricing" && <span className="text-[28px] font-medium mr-1">{RUPEE}</span>}
                <span className={plan.price === "Custom Pricing" ? "text-[38px] font-bold tracking-tight" : "text-[54px] font-bold tracking-tight"}>{plan.price}</span>
                {plan.price !== "Custom Pricing" && <span className="text-[18px] font-medium text-white/60 ml-1">/ credit</span>}
              </div>
              
              <div className="mb-6 text-[11px] font-semibold tracking-[0.15em] text-[#d4a878] uppercase">
                {plan.period}
              </div>
              
              <p className="mb-8 text-[14px] text-white/60 leading-relaxed font-light">
                {plan.description}
              </p>

              <ul className="mb-10 flex-grow space-y-4 text-[14px]">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4.5 10l3.5 3.5L15.5 6" />
                    </svg>
                    <span className="leading-5 text-white/80">
                      {feature.bold && <strong className="font-semibold text-white/95">{feature.bold}</strong>}
                      {feature.regular}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest bg-white/5 text-white/40 border border-white/5 cursor-not-allowed text-center"
                >
                  CURRENT PLAN
                </button>
              ) : plan.key === "free" ? (
                <button
                  onClick={() => navigate("/signup")}
                  className="w-full py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-95 cursor-pointer text-center"
                >
                  {plan.buttonText}
                </button>
              ) : plan.featured ? (
                <button
                  onClick={() => handlePurchase(plan.key)}
                  className="w-full py-3.5 rounded-full text-[13px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] hover:brightness-110 shadow-lg shadow-[#d4a878]/10 transition-all active:scale-95 cursor-pointer text-center"
                >
                  {plan.buttonText}
                </button>
              ) : (
                <button
                  onClick={() => handlePurchase(plan.key)}
                  className="w-full py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-95 cursor-pointer text-center"
                >
                  {plan.buttonText}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
