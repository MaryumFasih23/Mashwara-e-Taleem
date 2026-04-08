import { createBrowserRouter } from "react-router-dom";
import HomePage from "../assets/components/HomePage";
import Login from "../assets/components/Login";
import Signup from "../assets/components/Signup";

import ProtectedRoute from "../ProtectedRoute";
import DashboardLayout from "../assets/components/DashboardLayout";

// Dashboard Screens (all in same folder)
import DashboardHome from "../assets/components/DashboardHome";
import Universities from "../assets/components/Universities";
import Scholarships from "../assets/components/Scholarships";
import DocumentAnalyzer from "../assets/components/DocumentAnalyzer";
import AIAdvisor from "../assets/components/AIAdvisor";
import Profile from "../assets/components/Profile";
import VisaGuidance from "../assets/components/VisaGuidance";

const AppRoutes = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <div>404 Forbidden</div>,
  },
  {
    path: "/login",
    element: <Login />,
    errorElement: <div>404 Forbidden</div>,
  },
  {
    path: "/signup",
    element: <Signup />,
    errorElement: <div>404 Forbidden</div>,
  },

  // --------------- DASHBOARD (Protected + Nested) ---------------
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    errorElement: <div>404 Forbidden</div>,

    children: [
      // /dashboard
      { index: true, element: <DashboardHome /> },

      // /dashboard/universities
      { path: "universities", element: <Universities /> },

      // /dashboard/scholarships
      { path: "scholarships", element: <Scholarships /> },

      // /dashboard/analyzer
      { path: "analyzer", element: <DocumentAnalyzer /> },

      // /dashboard/ai-advisor
      { path: "ai-advisor", element: <AIAdvisor /> },

      // /dashboard/profile
      { path: "profile", element: <Profile /> },

      // /dashboard/visa-guidance
      { path: "visa-guidance", element: <VisaGuidance /> },
    ],
  },
]);

export default AppRoutes;
