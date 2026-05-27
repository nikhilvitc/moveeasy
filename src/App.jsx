import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import HomeV2 from "./pages/HomeV2";
import Login from "./pages/Login";
import MapView from "./components/MapView";
import AdminDashboard from "./pages/AdminDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import CrmDashboard from "./pages/CrmDashboard";
import Guarantee from "./pages/Guarantee";
import Contact from "./pages/Contact";
import MyActivity from "./pages/MyActivity";
import Checkout from "./pages/Checkout";
import Pay from "./pages/Pay";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import MoveazyPlanPage from "./pages/MoveazyPlanPage";
import AgentsDirectory from "./pages/AgentsDirectory";
import MySearchProfile from "./pages/MySearchProfile";
import Onboarding from "./pages/Onboarding";
import About from "./pages/About";
import Properties from "./pages/Properties";
import Listings from "./pages/Listings";
import FlatListings from "./pages/FlatListings";
import ErrorBoundary from "./components/ErrorBoundary";

function PayToCheckout() {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  return <Navigate to={`/checkout${qs ? `?${qs}` : ""}`} replace />;
}

function OnboardingEmailWarning() {
  // Disabled the confusing email warning for the live demo
  return null;
}

function RoleRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",fontSize:"18px",color:"#64748b"}}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/login" />;
  return children;
}

function StaffRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "18px", color: "#64748b" }}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  const allowed = Array.isArray(roles) ? roles : [];
  if (!allowed.includes(user.role)) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/v2" element={<HomeV2 />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/map" element={<MapView />} />
      <Route path="/about" element={<About />} />
      <Route path="/properties" element={<Properties />} />
      <Route path="/guarantee" element={<Guarantee />} />
      <Route path="/listings" element={<Listings />} />
      <Route path="/new-listings" element={<FlatListings />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/activity" element={<MyActivity />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/pay" element={<PayToCheckout />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/plan" element={<MoveazyPlanPage />} />
      <Route path="/agents" element={<AgentsDirectory />} />
      <Route path="/my-search" element={<MySearchProfile />} />
      <Route path="/support" element={<Navigate to="/contact#support" replace />} />
      <Route path="/crm" element={<StaffRoute roles={["admin", "sub_admin", "consultant"]}><CrmDashboard /></StaffRoute>} />
      <Route path="/admin" element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>} />
      <Route path="/seller" element={<RoleRoute role="seller"><SellerDashboard /></RoleRoute>} />
      <Route path="/customer" element={<RoleRoute role="customer"><CustomerDashboard /></RoleRoute>} />
    </Routes>
  );
}

const strip = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
const routerBasename = strip || "/";

export default function App() {
  return (
    <BrowserRouter basename={routerBasename === "/" ? undefined : routerBasename}>
      <ErrorBoundary>
        <AuthProvider>
          <AppRoutes />
          <OnboardingEmailWarning />
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
