// App.jsx
import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Footer from "./components/Footer";
import Feature1 from "./pages/Feature1";
import CoupleHome from "./pages/couple/CoupleHome";
import CoupleWeddingVision from "./pages/couple/CoupleWeddingVision";
import CoupleMoodboard from "./pages/couple/CoupleMoodboard";
import CoupleThemeMoodboard from "./pages/couple/CoupleThemeMoodboard";
import CoupleProfileForm from "./pages/couple/CoupleProfileForm";
import CoupleProfile from "./pages/couple/CoupleProfile";

import WeddingCart from "./pages/couple/WeddingCart";
import CoupleBidPlaced from "./pages/couple/CoupleBidPlaced";
import CoupleBidProgress from "./pages/couple/CoupleBidProgress";
import PublicPlannerProfile from "./pages/PublicPlannerProfile";
import Planner from "./pages/Planner";
import Vendor from "./pages/Vendor";
import PlannerAITools from "./pages/PlannerAI_Tools";
import PricingPage from "./pages/PricingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserForm from "./pages/UserForm";
import Profile from "./pages/Profile";
import AdminProtectedRoute from "./admin/AdminProtectedRoute";
import AdminDashboard from "./admin/AdminDashboard";
import AdminUsers from "./admin/AdminUsers";
import AdminLayout from "./admin/AdminLayout";
import AdminAILogs from "./admin/AdminAILogs";
import AdminSubscriptions from "./admin/AdminSubscriptions";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import { AuthProvider } from "./context/AuthContext";

// Planner Pages
import PlannerLayout from "./pages/planner/PlannerLayout";
import PlannerDashboardPage from "./pages/planner/PlannerDashboard";
import PlannerBids from "./pages/planner/PlannerBids";
import PlannerQuotes from "./pages/planner/PlannerQuotes";
import PlannerMessages from "./pages/planner/PlannerMessages";
import PlannerDeals from "./pages/planner/PlannerDeals";
import PlannerVendors from "./pages/planner/PlannerVendors";
import PlannerProfile from "./pages/planner/PlannerProfile";
import PlannerBuildQuote from "./pages/planner/PlannerBuildQuote";
import PlannerSignup from "./pages/planner/PlannerSignup";
import PlannerOnboarding from "./pages/planner/PlannerOnboarding";

// Vendor Pages
import VendorLayout from "./pages/vendor/VendorLayout";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorInventory from "./pages/vendor/VendorInventory";
import VendorRequests from "./pages/vendor/VendorRequests";
import VendorOnboarding from "./pages/vendor/VendorOnboarding";
import VendorPortfolio from "./pages/vendor/VendorPortfolio";
import VendorEarnings from "./pages/vendor/VendorEarnings";
import VendorMessages from "./pages/vendor/VendorMessages";
import VendorProfile from "./pages/vendor/VendorProfile";
function AppContent() {
  const location = useLocation();
  const [isAIToolOpen, setIsAIToolOpen] = useState(false);

  // Reset active tool state when routing changes
  React.useEffect(() => {
    if (location.pathname !== "/planner-ai-tools") {
      setIsAIToolOpen(false);
    }
  }, [location.pathname]);

  // Hide navbar and footer on admin, planner, vendor dashboard, and couple AI tools pages
  const hideNavbarAndFooter =
    location.pathname.startsWith("/admin") ||
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname.startsWith("/planner/") ||
    location.pathname === "/planner" ||
    location.pathname === "/planner-ai-tools" ||
    location.pathname.startsWith("/vendor/") ||
    location.pathname === "/couple/onboarding" ||
    location.pathname === "/love-story" ||
    location.pathname.startsWith("/couple/moodboard") ||
    location.pathname === "/couple/cart" ||
    location.pathname === "/couple/bid-placed";

  const hideNavbar =
    hideNavbarAndFooter || location.pathname === "/user-form";

  const hideFooter =
    hideNavbarAndFooter || location.pathname === "/user-form";

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/planner/signup" element={<PlannerSignup />} />
        <Route
          path="/planner/onboarding"
          element={
            <ProtectedRoute requiredRole="planner">
              <PlannerOnboarding />
            </ProtectedRoute>
          }
        />

        {/* User form - accessible for both new and existing users */}
        <Route
          path="/user-form"
          element={
            <ProtectedRoute>
              <UserForm />
            </ProtectedRoute>
          }
        />

        {/* Profile page */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* AI Tools - PLANNER ACCESS ONLY */}
        <Route
          path="/planner-ai-tools"
          element={<PlannerAITools onToggleTool={setIsAIToolOpen} />}
        />

        {/* Pricing page - require authentication */}
        <Route
          path="/pricing"
          element={
            <ProtectedRoute>
              <PricingPage />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          element={
            <ProtectedRoute>
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/analytics" element={<AdminDashboard />} />
          <Route path="/admin/ai-logs" element={<AdminAILogs />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="/admin/vendors" element={<AdminUsers />} />
        </Route>

        {/* Planner Dashboard Routes */}
        <Route path="/planner" element={<Planner />} />
        <Route path="/vendor" element={<Vendor />} />
        <Route
          element={
            <ProtectedRoute requiredRole="planner">
              <PlannerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/planner/dashboard" element={<PlannerDashboardPage />} />
          <Route path="/planner/bids" element={<PlannerBids />} />
          <Route path="/planner/quotes" element={<PlannerQuotes />} />
          <Route path="/planner/messages" element={<PlannerMessages />} />
          <Route path="/planner/deals" element={<PlannerDeals />} />
          <Route path="/planner/vendors" element={<PlannerVendors />} />
          <Route path="/planner/profile" element={<PlannerProfile />} />
          <Route
            path="/planner/build-quote/:bidId"
            element={<PlannerBuildQuote />}
          />
        </Route>

        {/* Vendor Dashboard Routes */}
        <Route
          path="/vendor/onboarding"
          element={
            <ProtectedRoute requiredRole="vendor">
              <VendorOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute requiredRole="vendor">
              <VendorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          <Route path="/vendor/inventory" element={<VendorInventory />} />
          <Route path="/vendor/requests" element={<VendorRequests />} />
          <Route path="/vendor/portfolio" element={<VendorPortfolio />} />
          <Route path="/vendor/earnings" element={<VendorEarnings />} />
          <Route path="/vendor/messages" element={<VendorMessages />} />
          <Route path="/vendor/profile" element={<VendorProfile />} />
        </Route>

        {/* Couple Routes */}
        <Route path="/couples" element={<CoupleHome />} />
        <Route
          path="/couple/profile"
          element={
            <ProtectedRoute requiredRole="couple">
              <CoupleProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/couple/onboarding"
          element={
            <ProtectedRoute requiredRole="couple">
              <CoupleProfileForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/couple/cart"
          element={
            <ProtectedRoute requiredRole="couple">
              <WeddingCart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/couple/bid-placed"
          element={
            <ProtectedRoute requiredRole="couple">
              <CoupleBidPlaced />
            </ProtectedRoute>
          }
        />
        <Route
          path="/couple/bid-dashboard/:id"
          element={
            <ProtectedRoute requiredRole="couple">
              <CoupleBidProgress />
            </ProtectedRoute>
          }
        />
        <Route
          path="/couple/quote/:id"
          element={
            <ProtectedRoute requiredRole="couple">
              <CoupleBidProgress />
            </ProtectedRoute>
          }
        />
        <Route
          path="/love-story"
          element={
            <ProtectedRoute requiredRole="couple">
              <CoupleWeddingVision />
            </ProtectedRoute>
          }
        />
        <Route
          path="/couple/moodboard"
          element={
            <ProtectedRoute requiredRole="couple">
              <CoupleThemeMoodboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/couple/moodboard/:theme"
          element={
            <ProtectedRoute requiredRole="couple">
              <CoupleThemeMoodboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/couple/moodboard/create"
          element={
            <ProtectedRoute requiredRole="couple">
              <CoupleMoodboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/planner/profile/:id"
          element={
            <ProtectedRoute>
              <PublicPlannerProfile />
            </ProtectedRoute>
          }
        />
      </Routes>
      {!hideFooter && !isAIToolOpen && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
