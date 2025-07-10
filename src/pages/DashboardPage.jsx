import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GrossSalaryChart } from "@/components/iStCharts/GrossSalaryBarChart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ArrowRight } from "lucide-react";
import { callSoapService } from "@/api/callSoapService";

const AnimatedNumber = ({ value, generateRandomValue }) => {
  const [displayValue, setDisplayValue] = useState(generateRandomValue());
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayValue(generateRandomValue());
    }, 100);
    return () => clearInterval(interval);
  }, [generateRandomValue]);
  return <span>{displayValue}</span>;
};

const DashboardPage = () => {
  const { userData } = useAuth();
  const [dbData, setDbData] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAnimatedNumbers, setShowAnimatedNumbers] = useState(true);
  const [selectedLayout, setSelectedLayout] = useState(1);
  const location = useLocation();
  const dashboardId = location.state?.dashboardId;
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
    const timer = setTimeout(() => setShowAnimatedNumbers(false), 1000);
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
      setDbData(master);
      setEventData(event);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const chartProps = (item, chartNo) => ({
    DashBoardID: dashboardId,
    ChartNo: chartNo,
    chartTitle: item[`CHART${chartNo}_TITLE`],
    chartXAxis: item[`CHART${chartNo}_X_AXIS1`],
    chartYAxis: item[`CHART${chartNo}_Y_AXIS1`],
    chartType: chartNo === 2 ? "donut" : "bar",
  });

  const renderEventCard = () => (
    <Card className="shadow-xl bg-white dark:bg-slate-950 border rounded-xl">
      <CardHeader className="p-4">
        <CardTitle className="text-xl font-bold tracking-wide">Upcoming Event</CardTitle>
      </CardHeader>
      <CardContent className="p-3 ms-2 h-[40vh] overflow-y-auto">
        {eventData.length === 0 ? (
          <div className="text-center text-lg py-8">No upcoming events.</div>
        ) : (
          <div className="relative">
            <div className="absolute border border-dashed top-0 left-24 w-0.5 h-full bg-blue-100 dark:bg-blue-900" />
            <div className="space-y-4 whitespace-nowrap ml-28">
              {eventData.map((ev, idx) => {
                const eventDate = new Date(ev.EVENT_DATE);
                const formattedDate = eventDate.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  weekday: "short",
                });
                return (
                  <div key={idx} className="relative">
                    <div className="absolute -left-28 top-0 text-[10px] font-semibold">{formattedDate}</div>
                    <div className="absolute -left-[22.5px] top-2 w-4 h-4 bg-blue-900 border-4 border-white rounded-full animate-pulse shadow-md" />
                    <div className="bg-blue-100 hover:bg-blue-200 w-[280px] text-gray-800 p-2 rounded-lg shadow-lg dark:text-gray-200 dark:bg-gray-800">
                      <h3 className="text-lg font-semibold">{ev.EVENT_NAME}</h3>
                      <div className="font-semibold">
                        {ev.EVENT_DESCRIPTION}
                        <p className="text-[11px] text-gray-500">{ev.EMP_NAME}</p>
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
  );

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
    <div className=" space-y-6">
      {dbData.map((item, index) => (
        <div key={index} className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
            {/* Title */}
            <h1 className="text-lg sm:text-xl font-bold text-center sm:text-left break-words">
              {item.DASHBOARD_NAME}
            </h1>

            {/* Layout Buttons */}
            <div className="flex flex-wrap items-center gap-1 text-xs justify-center sm:justify-start">
              <span className="mr-1">Layout</span>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => setSelectedLayout(num)}
                  className={`px-3 py-1 rounded-md border ${selectedLayout === num
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600"
                    }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Breadcrumb */}
            <div className="flex justify-center sm:justify-end">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink>{item.DASHBOARD_NAME}</BreadcrumbLink>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Badges (Hidden for Layout 5 amd 6) */}
          {![5, 6].includes(selectedLayout) && (
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((badgeNum) => {
                const colors = ["bg-blue-200", "bg-green-200", "bg-purple-200", "bg-orange-200"];
                const textColor = "text-gray-800";
                const generateRandomValue = () => {
                  const badgeValue = item[`BADGE${badgeNum}_VALUE`];
                  if (!badgeValue) return "N/A";
                  const badgeValueStr = String(badgeValue);
                  const prefix = badgeValueStr.replace(/[0-9]/g, "");
                  const numbers = badgeValueStr.replace(/[^0-9]/g, "");
                  if (numbers.length === 0) return badgeValueStr;
                  const randomNum = Math.floor(
                    (Math.random() * (parseInt(numbers) * 2 - parseInt(numbers))) / 2 +
                    parseInt(numbers) / 2
                  ).toString();
                  return prefix + randomNum;
                };
                return (
                  <Card
                    key={badgeNum}
                    className={`hover:shadow-lg hover:scale-105 transform transition duration-300 cursor-pointer ${colors[badgeNum - 1]} ${textColor}`}
                    onClick={() =>
                      navigate(`/dashboard-details/${item.DASHBOARD_ID}/${badgeNum}`, {
                        state: { badgeTitle: item[`BADGE${badgeNum}_TITLE`] },
                      })
                    }
                  >
                    <div className="flex items-center justify-between p-4">
                      {/* Left: Value */}
                      <div className="text-2xl font-bold">
                        {showAnimatedNumbers ? (
                          <AnimatedNumber
                            value={item[`BADGE${badgeNum}_VALUE`]}
                            generateRandomValue={generateRandomValue}
                          />
                        ) : (
                          item[`BADGE${badgeNum}_VALUE`] || "N/A"
                        )}
                      </div>

                      {/* Right: Title + Arrow */}
                      <div className="flex items-center text-sm font-bold">
                        <span className="mr-1">{item[`BADGE${badgeNum}_TITLE`] || "Unknown"}</span>
                        <ArrowRight className={`h-4 w-4 ${textColor}`} />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}


          {/* Layout 1 */}
          {selectedLayout === 1 && (
            <>
              <GrossSalaryChart {...chartProps(item, 1)} />
              <div className="grid sm:grid-cols-2 gap-3">
                <GrossSalaryChart {...chartProps(item, 2)} />
                {renderEventCard()}
              </div>
              <GrossSalaryChart {...chartProps(item, 3)} />
            </>
          )}

          {/* Layout 2 */}
          {selectedLayout === 2 && (
            <>
              <div className="grid lg:grid-cols-2 gap-3">
                <GrossSalaryChart {...chartProps(item, 1)} />
                <GrossSalaryChart {...chartProps(item, 2)} />
              </div>
              <div className="grid lg:grid-cols-2 gap-3">
                <GrossSalaryChart {...chartProps(item, 3)} />
                {renderEventCard()}
              </div>
            </>
          )}

          {/* Layout 3 */}
          {selectedLayout === 3 && (
            <>
              <div className="grid lg:grid-cols-2 gap-3">
                <GrossSalaryChart {...chartProps(item, 1)} />
                {renderEventCard()}
              </div>
              <div className="grid lg:grid-cols-2 gap-3">
                <GrossSalaryChart {...chartProps(item, 2)} />
                <GrossSalaryChart {...chartProps(item, 3)} />
              </div>
            </>
          )}

          {/* Layout 4 */}
          {selectedLayout === 4 && (
            <>
              <GrossSalaryChart {...chartProps(item, 1)} />
              <GrossSalaryChart {...chartProps(item, 2)} />
              <GrossSalaryChart {...chartProps(item, 3)} />
              {renderEventCard()}
            </>
          )}

          {/* Layout 5 */}
          {selectedLayout === 5 && (
            <>
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Left side - Chart */}
                <GrossSalaryChart {...chartProps(item, 1)} />

                {/* Right side - 2x2 grid of cards with minimum height */}
                <div className="grid grid-cols-2 gap-4 h-[100px] mb-10"> {/* Adjust 400px to your preferred minimum height */}
                  {[1, 2, 3, 4].map((badgeNum) => {
                    const colors = ["bg-blue-200", "bg-green-200", "bg-purple-200", "bg-orange-200"];
                    const textColor = "text-gray-800";
                    const generateRandomValue = () => {
                      const badgeValue = item[`BADGE${badgeNum}_VALUE`];
                      if (!badgeValue) return "N/A";
                      const badgeValueStr = String(badgeValue);
                      const prefix = badgeValueStr.replace(/[0-9]/g, "");
                      const numbers = badgeValueStr.replace(/[^0-9]/g, "");
                      if (numbers.length === 0) return badgeValueStr;
                      const randomNum = Math.floor(
                        (Math.random() * (parseInt(numbers) * 2 - parseInt(numbers))) / 2 +
                        parseInt(numbers) / 2
                      ).toString();
                      return prefix + randomNum;
                    };
                    return (
                      <Card
                        key={badgeNum}
                        className={`h-full hover:shadow-lg hover:scale-105 transform transition duration-300 cursor-pointer ${colors[badgeNum - 1]} ${textColor}`}
                      >
                        <div className="flex items-center justify-between p-4 h-full"> {/* Added h-full here */}
                          {/* Left: Value */}
                          <div className="text-2xl font-bold">
                            {showAnimatedNumbers ? (
                              <AnimatedNumber
                                value={item[`BADGE${badgeNum}_VALUE`]}
                                generateRandomValue={generateRandomValue}
                              />
                            ) : (
                              item[`BADGE${badgeNum}_VALUE`] || "N/A"
                            )}
                          </div>

                          {/* Right: Title + Arrow */}
                          <div className="flex items-center text-sm font-bold">
                            <span className="mr-1">{item[`BADGE${badgeNum}_TITLE`] || "Unknown"}</span>
                            <ArrowRight className={`h-4 w-4 ${textColor}`} />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-3">
                <GrossSalaryChart {...chartProps(item, 2)} />
                {renderEventCard()}
              </div>
              <GrossSalaryChart {...chartProps(item, 3)} />
            </>
          )}

          {/* Layout 6 */}
          {selectedLayout === 6 && (
            <>
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Left side - Chart */}
                <div className="grid grid-cols-2 gap-4 h-[100px] mb-10"> {/* Adjust 400px to your preferred minimum height */}
                  {[1, 2, 3, 4].map((badgeNum) => {
                    const colors = ["bg-blue-200", "bg-green-200", "bg-purple-200", "bg-orange-200"];
                    const textColor = "text-gray-800";
                    const generateRandomValue = () => {
                      const badgeValue = item[`BADGE${badgeNum}_VALUE`];
                      if (!badgeValue) return "N/A";
                      const badgeValueStr = String(badgeValue);
                      const prefix = badgeValueStr.replace(/[0-9]/g, "");
                      const numbers = badgeValueStr.replace(/[^0-9]/g, "");
                      if (numbers.length === 0) return badgeValueStr;
                      const randomNum = Math.floor(
                        (Math.random() * (parseInt(numbers) * 2 - parseInt(numbers))) / 2 +
                        parseInt(numbers) / 2
                      ).toString();
                      return prefix + randomNum;
                    };
                    return (
                      <Card
                        key={badgeNum}
                        className={`h-full hover:shadow-lg hover:scale-105 transform transition duration-300 cursor-pointer ${colors[badgeNum - 1]} ${textColor}`}
                      >
                        <div className="flex items-center justify-between p-4 h-full"> {/* Added h-full here */}
                          {/* Left: Value */}
                          <div className="text-2xl font-bold">
                            {showAnimatedNumbers ? (
                              <AnimatedNumber
                                value={item[`BADGE${badgeNum}_VALUE`]}
                                generateRandomValue={generateRandomValue}
                              />
                            ) : (
                              item[`BADGE${badgeNum}_VALUE`] || "N/A"
                            )}
                          </div>

                          {/* Right: Title + Arrow */}
                          <div className="flex items-center text-sm font-bold">
                            <span className="mr-1">{item[`BADGE${badgeNum}_TITLE`] || "Unknown"}</span>
                            <ArrowRight className={`h-4 w-4 ${textColor}`} />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Right side - 2x2 grid of cards with minimum height */}
                <GrossSalaryChart {...chartProps(item, 1)} />
              </div>

              {/* Below section can be extended if needed */}
              <GrossSalaryChart {...chartProps(item, 1)} />
              <div className="grid lg:grid-cols-2 gap-3">
                <GrossSalaryChart {...chartProps(item, 2)} />
                <GrossSalaryChart {...chartProps(item, 3)} />
              </div>
            </>
          )}


        </div>
      ))}
    </div>
  );
};

export default DashboardPage;
