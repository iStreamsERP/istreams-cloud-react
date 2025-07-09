import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getDashBoardForModule } from "@/services/iStDashBoardServices";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileSearch,
  ArrowRight,
  LayoutDashboard,
  BarChart2,
  PieChart,
  LineChart,
  Database,
  Settings,
  Users,
  ShoppingCart,
  Calendar,
  Globe,
  Wallet,
  Activity,
  Shield,
} from "lucide-react";
import { callSoapService } from "@/services/callSoapService";

// Array of professional icons to cycle through
const dashboardIcons = [
  <LayoutDashboard className="h-6 w-6" />,
  <BarChart2 className="h-6 w-6" />,
  <PieChart className="h-6 w-6" />,
  <LineChart className="h-6 w-6" />,
  <Database className="h-6 w-6" />,
  <Users className="h-6 w-6" />,
  <ShoppingCart className="h-6 w-6" />,
  <Calendar className="h-6 w-6" />,
  <Globe className="h-6 w-6" />,
  <Activity className="h-6 w-6" />,
  <Wallet className="h-6 w-6" />,
  <Shield className="h-6 w-6" />,
];

const DashboardModulePage = () => {
  const { userData } = useAuth();
  const { module } = useParams();
  const navigate = useNavigate();

  const [dashboardList, setDashboardList] = useState([]);

  useEffect(() => {
    if (module) {
      fetchUser(module);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);

  const fetchUser = async (moduleNameStr) => {
    try {
      const moduleName = { ModuleName: moduleNameStr };
      const master = await callSoapService(userData.clientURL, "BI_GetDashBoards_ForModules", moduleName);
      console.log("Module:", master);
      setDashboardList(master);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    }
  };

  const handleCardClick = (item) => {
    if (item.DASHBOARD_PAGE && item.DASHBOARD_PAGE.trim() !== "") {
      navigate("/dashboard", { state: { dashboardId: item.DASHBOARD_ID } });
    } else if (item.EXTERNAL_REPORT_URL) {
      window.open(item.EXTERNAL_REPORT_URL, "_blank");
    }
  };

  // Function to get icon based on index (cycles through the array)
  const getDashboardIcon = (index) => {
    return dashboardIcons[index % dashboardIcons.length];
  };

  return (
    <div>
      {dashboardList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 rounded-lg border border-dashed">
          <FileSearch className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            No dashboards available
          </p>
          <p className="text-sm text-muted-foreground">
            Create a new dashboard to get started
          </p>
        </div>
      ) : (

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardList.map((item, index) => (
            <Card
              key={index}
              className="cursor-pointer bg-white border dark:bg-transparent border-blue-100/50
        transition-all duration-300 ease-in-out
        hover:scale-[1.03] hover:shadow-lg hover:shadow-blue-100/30 dark:hover:shadow-blue-900/20
        hover:border-blue-200 dark:hover:border-blue-600
        group"
              onClick={() => handleCardClick(item)} >
              <CardHeader className="flex flex-row items-center whitespace-wrap flex-wrap space-y-0">

                <div className="flex-1">
                  <CardTitle className="truncate whitespace-wrap text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.DASHBOARD_NAME || "Untitled Dashboard"}
                  </CardTitle>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                  {getDashboardIcon(index)}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground line-clamp-2 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                  {item.DASHBOARD_DESCRIPTION || "No description provided"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground
            group-hover:text-blue-600 dark:group-hover:text-blue-400
            group-hover:translate-x-1
            transition-all duration-300"
                  onClick={() => handleCardClick(item)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardModulePage;
