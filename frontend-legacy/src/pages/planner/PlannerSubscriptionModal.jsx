import React, { useEffect, useState } from "react";
import { plannerPlans, RUPEE } from "../../config/pricing";
import { paymentAPI } from "../../api/api";
import { useCheckout } from "../../hooks/useCheckout";

export default function PlannerSubscriptionModal({ isOpen, onClose }) {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userCredits, setUserCredits] = useState(0);

  const { handlePurchase, isProcessing } = useCheckout();

  useEffect(() => {
    if (!isOpen) return;
    
    // Prevent background scrolling
    document.body.style.overflow = "hidden";
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const [planRes, creditRes] = await Promise.all([
          paymentAPI.getPaymentStatus(),
          paymentAPI.getCredits('planner')
        ]);
        
        if (planRes.success && planRes.plan) {
          setCurrentPlan(planRes.plan);
        }
        setUserCredits(creditRes.credits || 0);
      } catch (err) {
        console.error("Error fetching modal data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Determine usage progress based on current plan's total credits
  let totalCredits = 0;
  if (currentPlan) {
    const matchedPlan = plannerPlans.find(p => p.key === currentPlan.planId);
    if (matchedPlan && typeof matchedPlan.credits === 'number') {
      totalCredits = matchedPlan.credits;
    }
  }

  // Fallback if we don't have a known total, we just show remaining.
  // Or maybe we can approximate if userCredits > totalCredits.
  if (totalCredits < userCredits && totalCredits > 0) {
    totalCredits = userCredits;
  }
  
  const creditsUsed = totalCredits > 0 ? Math.max(0, totalCredits - userCredits) : 0;
  const progressPercent = totalCredits > 0 ? (creditsUsed / totalCredits) * 100 : 0;

  const currentPlanDetails = plannerPlans.find(p => p.key === currentPlan?.planId);
  const currentPlanName = currentPlanDetails?.name || "Free";
  const currentTier = currentPlanDetails?.tier || 0;

  const getActionButton = (plan) => {
    const isCurrent = currentPlan?.planId === plan.key;
    
    if (isCurrent) {
      return (
        <button
          disabled
          className="w-full py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest bg-white/5 text-white/40 border border-white/5 cursor-not-allowed text-center"
        >
          CURRENT PLAN
        </button>
      );
    }
    
    const isUpgrade = plan.tier > currentTier;
    const buttonText = isProcessing ? "Processing..." : (isUpgrade ? "Upgrade" : "Downgrade");
    
    return (
      <button
        onClick={() => handlePurchase(plan.key)}
        disabled={isProcessing}
        className={`w-full py-3.5 rounded-full text-[13px] font-bold uppercase tracking-widest transition-all active:scale-95 text-center ${
          plan.featured
            ? "bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] text-[#201913] hover:brightness-110 shadow-lg shadow-[#d4a878]/10"
            : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {buttonText}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-white/10 bg-[#0a0a0a] shadow-[0_20px_60px_rgba(0,0,0,0.5)] custom-scrollbar flex flex-col">
        
        {/* Header Section */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 p-6 md:p-8 flex justify-between items-start">
          <div className="space-y-6 flex-1 pr-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-light text-white font-heading" style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}>
                Planner Subscription
              </h2>
              <p className="text-white/60 text-sm mt-1">Upgrade anytime to continue generating Planner AI images.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Current Plan</div>
                <div className="text-lg font-semibold text-white flex items-center gap-2">
                  {currentPlanName}
                  {currentPlanName !== "Free" && (
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Credits Remaining</div>
                <div className="text-lg font-semibold text-amber-100">{loading ? "..." : userCredits.toLocaleString()}</div>
              </div>
              <div className="hidden md:block">
                <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Credits Used</div>
                <div className="text-lg font-semibold text-white/80">{loading ? "..." : creditsUsed.toLocaleString()}</div>
              </div>
              <div className="hidden md:block">
                <div className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Next Renewal</div>
                <div className="text-sm font-medium text-white/80 mt-1">
                  {currentPlan?.nextBillingDate ? new Date(currentPlan.nextBillingDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            {/* Usage Progress Bar */}
            {totalCredits > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/50">
                  <span>Usage Progress</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#e6c6b2] to-[#d4a878] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
            <div className="text-xs text-white/40 italic">
              1 Planner Credit ≈ Generate up to 1 Planner AI image
            </div>
          </div>

          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="p-6 md:p-8 bg-[#0a0a0a]">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            {plannerPlans.map((plan) => (
              <div
                key={plan.key}
                style={{
                  backgroundColor: "rgba(20, 15, 12, 0.65)",
                  borderColor: plan.featured ? "rgba(230, 198, 178, 0.25)" : "rgba(255, 255, 255, 0.08)",
                  boxShadow: plan.featured ? "0 0 25px rgba(230, 198, 178, 0.12)" : "none",
                }}
                className="relative flex flex-col rounded-[24px] border p-6 text-white transition-all hover:border-white/15"
              >
                {plan.featured && (
                  <div className="absolute -top-3.5 right-6 bg-[#d4a878] text-[#201913] px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-full shadow-md">
                    Most Popular
                  </div>
                )}
                {currentPlan?.planId === plan.key && !plan.featured && (
                  <div className="absolute -top-3.5 right-6 bg-emerald-500 text-white px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-full shadow-md">
                    Current Plan
                  </div>
                )}

                <h3 className="mb-2 text-2xl font-light" style={{ fontFamily: "'Dream Avenue', 'DM Serif Display', serif" }}>
                  {plan.name}
                </h3>
                
                <div className="mb-1 flex items-baseline gap-1 text-white">
                  {plan.price !== "Custom Pricing" && <span className="text-xl font-medium">{RUPEE}</span>}
                  <span className={plan.price === "Custom Pricing" ? "text-2xl font-bold tracking-tight" : "text-4xl font-bold tracking-tight"}>{plan.price}</span>
                </div>
                
                <div className="mb-4 text-[10px] font-medium tracking-[0.15em] text-white/50 uppercase">
                  {plan.period}
                </div>

                <div className="bg-white/5 rounded-lg px-3 py-2 mb-4 text-[11px] font-semibold text-amber-100 flex items-center gap-2">
                  <span>🎫</span> {plan.credits === "Unlimited" ? "Unlimited Credits" : `${plan.credits} Credits Included`}
                </div>
                
                <ul className="mb-6 flex-grow space-y-3 text-[12px]">
                  {plan.features.slice(0, 7).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <svg className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 10l3.5 3.5L15.5 6" /></svg>
                      <span className="leading-tight text-white/80">
                        {feature.bold && <strong className="font-semibold text-white/95">{feature.bold}</strong>} {feature.regular}
                      </span>
                    </li>
                  ))}
                  {plan.features.length > 7 && (
                    <li className="text-white/40 text-[11px] italic pl-6">+ {plan.features.length - 7} more features</li>
                  )}
                </ul>

                <div className="mt-auto pt-4">
                  {getActionButton(plan)}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-white/10 bg-[#0a0a0a] p-6 text-center text-sm text-white/60">
          Need more credits? Upgrade anytime to continue generating Planner AI images.
        </div>
      </div>
    </div>
  );
}
