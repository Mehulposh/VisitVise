import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Background from "./components/Background";
import Layout from "./components/Layout";
import { Spinner } from "./components/ui";

import Landing from "./pages/Landing";
import { Login, Register, ForgotPassword, ResetPassword, VerifyEmail } from "./pages/Auth";
import PassPage from "./pages/PassPage";
import Kiosk from "./pages/Kiosk";
import Approve from "./pages/Approve";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import HostDashboard from "./pages/host/Dashboard";
import NewVisit from "./pages/host/NewVisit";
import MyVisits from "./pages/host/MyVisits";
import VisitDetail from "./pages/host/VisitDetail";
import Gate from "./pages/gate/Gate";
import AdminOverview from "./pages/admin/Overview";
import { AdminVisits, Approvals } from "./pages/admin/Visits";
import Users from "./pages/admin/Users";
import { Sites, Areas } from "./pages/admin/Sites";
import { Blocklist, Webhooks, Logs, Tools } from "./pages/admin/More";

const HOME = { user: "/dashboard", security: "/gate", admin: "/admin" };

function RequireAuth() {
  const { user, ready } = useAuth(); const loc = useLocation();
  if (!ready) return <Spinner className="min-h-screen" />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
}
const RequireRole = ({ roles }) => { const { user } = useAuth(); return roles.includes(user.role) ? <Outlet /> : <Navigate to={HOME[user.role]} replace />; };
function GuestOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner className="min-h-screen" />;
  return user ? <Navigate to={HOME[user.role]} replace /> : children;
}
function Root() {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner className="min-h-screen" />;
  return user ? <Navigate to={HOME[user.role]} replace /> : <Landing />;
}

export default function App() {
  return (
    <>
      <Background />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        {/* public: visitor pass, walk-in kiosk, host approval link */}
        <Route path="/pass/:code" element={<PassPage />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/approve/:id/:token" element={<Approve />} />

        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route element={<RequireRole roles={["user", "admin"]} />}>
              <Route path="/dashboard" element={<HostDashboard />} />
              <Route path="/visits/new" element={<NewVisit />} />
              <Route path="/visits" element={<MyVisits />} />
              <Route path="/visits/:id" element={<VisitDetail />} />
            </Route>
            <Route element={<RequireRole roles={["security", "admin"]} />}>
              <Route path="/gate" element={<Gate />} />
            </Route>
            <Route element={<RequireRole roles={["admin"]} />}>
              <Route path="/admin" element={<AdminOverview />} />
              <Route path="/admin/visits" element={<AdminVisits />} />
              <Route path="/admin/visits/:id" element={<VisitDetail />} />
              <Route path="/admin/approvals" element={<Approvals />} />
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/sites" element={<Sites />} />
              <Route path="/admin/areas" element={<Areas />} />
              <Route path="/admin/blocklist" element={<Blocklist />} />
              <Route path="/admin/logs" element={<Logs />} />
              <Route path="/admin/webhooks" element={<Webhooks />} />
              <Route path="/admin/tools" element={<Tools />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
