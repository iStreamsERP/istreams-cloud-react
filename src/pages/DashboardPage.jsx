import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GrossSalaryChart } from "@/components/iStCharts/GrossSalaryBarChart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"

import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  ArrowRight,
  ChevronDownIcon,
  ChevronUpIcon,
  AlarmCheck,
  Clock,
  CalendarHeart,
} from "lucide-react";
import ProgressTable from "@/components/iStTables/ProgressTable";
import { callSoapService } from "@/services/callSoapService";
import ChatbotUI from "@/components/ChatbotUI";
const AnimatedNumber = ({ value, generateRandomValue }) => {
  const [displayValue, setDisplayValue] = useState(generateRandomValue());

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayValue(generateRandomValue());
    }, 100); // Update every 100ms for a fast animation

    return () => clearInterval(interval);
  }, [generateRandomValue]);

  return <span>{displayValue}</span>;
};

const DashboardPage = () => {
  const { userData } = useAuth();
  const [dbData, setDbData] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [selectedChart, setSelectedChart] = useState("GrossSalaryChart");
  const [loading, setLoading] = useState(true);
  const [showAnimatedNumbers, setShowAnimatedNumbers] = useState(true);
  const location = useLocation();
  const dashboardId = location.state?.dashboardId;
  const navigate = useNavigate();
  const [openIndexes, setOpenIndexes] = useState([]);

  useEffect(() => {
    fetchUserData();

    const timer = setTimeout(() => {
      setShowAnimatedNumbers(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const DashBoardID = { DashBoardID: dashboardId };
      const [master, event] = await Promise.all([
        callSoapService(userData.clientURL, "BI_GetDashBoardMaster_Configuration", DashBoardID),
        callSoapService(userData.clientURL, "BI_GetDashboard_UpcomingEvents_Data", DashBoardID),
      ]);
      //  const moduleName = { ModuleName: moduleNameStr };
      //       const master = await callSoapService(userData.clientURL, "BI_GetDashBoards_ForModules", moduleName);
      setDbData(master);
      setEventData(event);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleIndex = (idx) => {
    setOpenIndexes((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleChartChange = (value) => {
    setSelectedChart(value);
  };

  const hasNoData = dbData.length === 0;
  const hasNoEvents = eventData.length === 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-[200px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div >
      {hasNoData ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-4">
          <CalendarDays className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-medium text-muted-foreground">
            No dashboard data available
          </h3>
          <p className="text-sm text-muted-foreground">
            Please check back later or contact support
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {dbData.map((item, index) => (
            <div key={index} className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight">
                  {item.DASHBOARD_NAME}
                </h1>
               <Breadcrumb>
                <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              
              
                <BreadcrumbItem>
                  <BreadcrumbLink> {item.DASHBOARD_NAME}</BreadcrumbLink>
                </BreadcrumbItem>
              
              </BreadcrumbList>
            </Breadcrumb>
              </div>

              {/* Metrics Grid with Animation */}
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((badgeNum) => {
                  const colors = [
                    "bg-blue-200",
                    "bg-green-200",
                    "bg-purple-200",
                    "bg-orange-200",
                  ];
                  const textColor = "text-gray-800";

                  const generateRandomValue = () => {
                    // Fix: Check if the badge value is null before calling replace
                    const badgeValue = item[`BADGE${badgeNum}_VALUE`];
                    if (badgeValue === null || badgeValue === undefined) {
                      return "N/A"; // Return a default value if the badge value is null
                    }
                    
                    const badgeValueStr = String(badgeValue); // Convert to string to ensure replace works
                    const prefix = badgeValueStr.replace(/[0-9]/g, "");
                    const numbers = badgeValueStr.replace(/[^0-9]/g, "");
                    
                    if (numbers.length === 0) {
                      return badgeValueStr;
                    }

                    const randomNum = Math.floor(
                      (Math.random() *
                        (parseInt(numbers) * 2 - parseInt(numbers))) /
                        2 +
                        parseInt(numbers) / 2
                    ).toString();

                    return prefix + randomNum;
                  };

                  return (
                    <Card
                     
                      key={badgeNum}
                      className={`hover:shadow-lg hover:scale-105 scale-100 transform transition-transform transition-all duration-300 ease-in-out  ${
                        colors[badgeNum - 1]
                      } ${textColor} cursor-pointer`}
                      onClick={() =>
                        navigate(
                          `/dashboard-details/${item.DASHBOARD_ID}/${badgeNum}`,
                          {
                            state: {
                              badgeTitle: item[`BADGE${badgeNum}_TITLE`],
                            },
                          }
                        )
                      }
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4  ">
                        <CardTitle
                          className={`text-sm font-medium ${textColor}`}
                        >
                          {item[`BADGE${badgeNum}_TITLE`] || "Unknown"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="text-xl font-bold flex items-center justify-between pt-2">
                          {showAnimatedNumbers ? (
                            <AnimatedNumber
                              value={item[`BADGE${badgeNum}_VALUE`]}
                              generateRandomValue={generateRandomValue}
                            />
                          ) : (
                            item[`BADGE${badgeNum}_VALUE`] || "N/A"
                          )}
                             <ArrowRight className={`h-4 w-4 ${textColor} mr-1`} />
                        </div>
                        {/* <div className="flex items-center justify-between pt-2">
                          <span className={`text-xs ${textColor}`}>
                            View details
                          </span>
                          <ArrowRight className={`h-4 w-4 ${textColor} mr-1`} />
                        </div> */}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
                    <GrossSalaryChart DashBoardID={dashboardId} ChartNo={1} chartTitle={item.CHART1_TITLE} chartXAxis={item.CHART1_X_AXIS1} chartYAxis={item.CHART1_Y_AXIS1} chartType="bar"  />

              {/* Charts Section */}
              <div className="grid lg:grid-cols-2 grid-cols-1  gap-3">
                
                
                    <GrossSalaryChart DashBoardID={dashboardId} ChartNo={2} chartTitle={item.CHART2_TITLE}chartXAxis={item.CHART2_X_AXIS1} chartYAxis={item.CHART2_Y_AXIS1} chartType="donut" />


                  <Card className="shadow-xl bg-white dark:bg-slate-950 border rounded-xl ">
                <div>
                  {" "}
                  <ProgressTable
                    DashBoardID={dashboardId}
                    ProgressTableNo={2}
                  />
                </div>
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 grid-cols-1  gap-3">
                {/* Progress Tables */}
                <Card className="shadow-xl bg-white dark:bg-slate-950 border rounded-xl ">
                <div className="space-y-6 ">
                  <ProgressTable
                    DashBoardID={dashboardId}
                    ProgressTableNo={1}
                  />
                </div>
                </Card>
                {/* Upcoming Events */}
                <Card className="shadow-xl shadow-xl bg-white dark:bg-slate-950  border rounded-xl ">
                  <CardHeader className=" rounded-sm p-4">
                    <CardTitle className="text-xl font-bold tracking-wide">
                      Upcoming Event
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 ms-2 h-[350px] overflow-y-auto">
                    {hasNoEvents ? (
                      <div className="text-center  text-lg py-8">
                        No upcoming events.
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute border  border-dashed  top-0 left-24 w-0.5 h-full bg-blue-100 dark:bg-blue-900 "></div>
                        <div className="space-y-4 whitespace-nowrap ml-28">
                          {eventData.map((ev, idx) => {
                            const eventDate = new Date(ev.EVENT_DATE);
                            const formattedDate = eventDate.toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                weekday: "short",
                              }
                            );
                            const formattedTime = eventDate.toLocaleTimeString(
                              "en-GB",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              }
                            );

                            return (
                              <div key={idx} className="relative">
                                <div className=" absolute  -left-28 top-0   text-[10px] font-semibold">
                                  {formattedDate}
                                  
                                </div>
                                <div className="absolute -left-[22.5px] top-2 w-4 h-4 bg-blue-900 border-4 border-white rounded-full animate-pulse shadow-md" />
                                <div className="bg-blue-100 hover:bg-blue-200 w-[280px] text-gray-800 scale-100 transition-all duration-300 hover:scale-105 p-2 rounded-lg shadow-lg dark:text-gray-200 dark:bg-gray-800">
                                  <h3 className="text-lg font-semibold flex items-center gap-1">
                                    {ev.EVENT_NAME}
                                  </h3>
                                  <div className="  font-semibold ">
                                    {ev.EVENT_DESCRIPTION}
                                    <p className="text-[11px] text-gray-500 ">
                                      {ev.EMP_NAME}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* <ChatbotUI /> */}
    </div>
  );
};

export default DashboardPage;