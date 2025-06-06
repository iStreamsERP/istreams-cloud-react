import { ThemeProvider } from "@/components/theme-provider";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import ForgetPasswordPage from "./pages/ForgetPasswordPage";
import LoginFormPage from "./pages/LoginFormPage";
import NotFoundPage from "./pages/NotFoundPage";
import SignUpPage from "./pages/SignUpPage";
import Layout from "./routes/Layout";
import ProtectedRoute from "./routes/ProtectedRoute";
import HomePage from "./pages/HomePage";
import DbBadgeTable from "./pages/DbBadgeTable";
import DashboardModulePage from "./pages/DashboardModule";
import Chat from "./pages/Chat";
import ChartDetails from "./pages/ChartDetails";

const App = () => {
  const router = createBrowserRouter([
    {
      path: "/login",
      element: <LoginFormPage />,
    },
    {
      path: "/signup",
      element: <SignUpPage />,
    },
    {
      path: "/forgot-password",
      element: <ForgetPasswordPage />,
    },
    {
      path: "/",
      element: <ProtectedRoute />,
      children: [
        {
          element: <Layout />,
          children: [
            { index: true, element: <HomePage /> },

            { path: "/dashboard", element: <DashboardPage /> },
            { path: "/dashboard-details/:DashBoardID/:BadgeNo" , element:<DbBadgeTable /> },
            { path: "/dashboard-module/:module" , element:<DashboardModulePage /> },
            { path: "/chat" , element:<Chat /> },
            { path: "/Chartdetails" , element:<ChartDetails /> }


          ]
        }
      ],
    },
    {
      path: "*",
      element: <NotFoundPage />,
    },
  ]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;
