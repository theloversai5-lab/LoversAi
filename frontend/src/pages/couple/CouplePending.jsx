import React from "react";
import { useAuth } from "../../context/AuthContext";
import { LogOut, Heart, Phone, Mail } from "lucide-react";

export default function CouplePending() {
  const { logout, currentUser } = useAuth();

  return (
    <div className="relative min-h-screen flex items-center justify-center text-white overflow-hidden" data-testid="couple-pending-page">
      {/* Background Video */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute min-w-full min-h-full object-cover"
        >
          <source src="/Assets/background_video.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0"
          style={{
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            backgroundColor: "rgba(15, 10, 12, 0.7)",
          }}
        />
      </div>

      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />

      {/* Main Panel */}
      <div className="relative z-10 w-full max-w-xl mx-4">
        <div className="glass-panel rounded-3xl p-8 md:p-10 border border-white/10 shadow-2xl text-center backdrop-blur-md bg-white/5">
          {/* Logo/Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 mb-6 animate-pulse">
            <Heart className="w-10 h-10 text-rose-300" strokeWidth={1.5} />
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight leading-tight" style={{ fontFamily: "var(--font-title)" }}>
            Profile Saved Successfully!
          </h1>
          
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-rose-300 to-transparent mx-auto mb-6" />

          {/* Body Content */}
          <p className="text-rose-100/90 text-base md:text-lg mb-6 leading-relaxed">
            Thank you, <span className="font-semibold text-rose-200">{currentUser?.fullName || "there"}</span>. 
            We have saved your wedding profile.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-300 mt-1">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-rose-200">What happens next?</h3>
                <p className="text-sm text-rose-100/70 mt-1">
                  Our wedding concierge team will review your requirements and curate initial decor, catering, and venue concepts for your special day.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-300 mt-1">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-rose-200">We will reach out</h3>
                <p className="text-sm text-rose-100/70 mt-1">
                  A designated coordinator will get in touch with you shortly at your registered contact details.
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-rose-200/60 italic mb-8">
            "Thanks for Using our Service. Our team will contact you soon."
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@loversai.com"
              className="px-6 py-3 rounded-xl font-semibold border border-white/15 hover:bg-white/5 transition flex items-center justify-center gap-2 text-sm"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
            <button
              onClick={logout}
              className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-rose-950/20"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
