import RecentMessage from "@/components/iStTables/RecentMessage";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { toTitleCase } from "@/utils/stringUtils";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { callSoapService } from "@/api/callSoapService";

const HomePage = () => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const DEFAULT_IMAGE = "/default-user.png";

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchUser = useCallback(async () => {
    // Add validation for required userData
    if (!userData?.userName || !userData?.userEmail || !userData?.clientURL) {
      console.error("Missing required user data:", userData);
      setError("Missing user authentication data");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        UserName: userData.userName,
      };

      const res = await callSoapService(userData.clientURL, "IM_Get_User_Tasks", payload);
      console.log("Updated tasks:", res);


      // Add validation for response data
      if (!res || !Array.isArray(res)) {
        console.error("Invalid response from getUserTasks:", res);
        setError("Invalid response format from server");
        setLoading(false);
        return;
      }

      console.log("Raw tasks response:", res);

      const loginUsername = userData.userEmail;

      const updatedTasks = res.map((tdata) => {
        if (!tdata) {
          console.warn("Null task data found:", tdata);
          return null;
        }

        let newStatus = tdata.STATUS;

        if (tdata.STATUS === "NEW") {
          if (tdata.CREATED_USER === tdata.ASSIGNED_USER) {
            newStatus = "Pending";
          } else if (
            loginUsername === tdata.CREATED_USER ||
            loginUsername === tdata.ASSIGNED_USER
          ) {
            newStatus = "Awaiting for Acceptance";
          } else {
            newStatus = "Awaiting for Acceptance";
          }
        } else if (tdata.STATUS === "ACCEPTED") {
          newStatus = "Pending";
        }

        return {
          ...tdata,
          NEW_STATUS: newStatus,
        };
      }).filter(Boolean); // Remove null entries

      console.log("Updated tasks:", updatedTasks);

      // Fetch images with better error handling and timeout
      const tasksWithImages = await Promise.allSettled(
        updatedTasks.map(async (task) => {
          if (!task.ASSIGNED_EMP_NO) {
            console.warn("Missing ASSIGNED_EMP_NO for task:", task.TASK_ID);
            return {
              ...task,
              assignedEmpImage: DEFAULT_IMAGE,
            };
          }

          try {

            const empImg = {
              EmpNo: task.ASSIGNED_EMP_NO,
            };

            const imagePromise = await callSoapService(userData.clientURL, "getpic_bytearray", empImg);
            console.log("Updated tasks:", res);
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 5000)
            );

            const imageData = await Promise.race([imagePromise, timeoutPromise]);

            return {
              ...task,
              assignedEmpImage: imageData
                ? `data:image/jpeg;base64,${imageData}`
                : DEFAULT_IMAGE,
            };
          } catch (error) {
            console.error(
              `Error fetching image for assigned user ${task.ASSIGNED_EMP_NO}:`,
              error
            );
            return {
              ...task,
              assignedEmpImage: DEFAULT_IMAGE,
            };
          }
        })
      );

      // Handle settled promises
      const finalTasks = tasksWithImages.map((result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error('Failed to process task:', result.reason);
          return null;
        }
      }).filter(Boolean);

      console.log("Final tasks with images:", finalTasks);
      setTasks(finalTasks);

    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      setError(`Failed to fetch tasks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [userData?.userName, userData?.userEmail, userData?.clientURL]);

  // Add dependency array to useEffect
  useEffect(() => {
    if (userData) {
      fetchUser();
    }
  }, [userData, fetchUser]);

  // Add retry function
  const handleRetry = () => {
    fetchUser();
  };

  function parseMicrosoftDate(msDate) {
    if (!msDate) return null;

    const match = /\/Date\((\d+)\)\//.exec(msDate);
    if (match) {
      const timestamp = parseInt(match[1], 10);
      return new Date(timestamp);
    }
    return null;
  }

  // Calculate stats with better error handling
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);

  const totalTasks = tasks.length;
  const newTasks = tasks.filter((task) => task?.STATUS === "NEW").length;
  const overdueTasks = tasks.filter((task) => {
    if (!task?.COMPLETION_DATE || task?.STATUS === "NEW") return false;
    const completionDate = parseMicrosoftDate(task.COMPLETION_DATE);
    return completionDate && completionDate < today;
  }).length;
  const currentTask = tasks.filter((task) => {
    if (!task?.COMPLETION_DATE) return false;
    const completionDate = parseMicrosoftDate(task.COMPLETION_DATE);
    return completionDate && completionDate >= today;
  }).length;

  const tasksLast7Days = tasks.filter((task) => {
    if (!task?.COMPLETION_DATE) return false;
    const completionDate = parseMicrosoftDate(task.COMPLETION_DATE);
    return completionDate && completionDate >= sevenDaysAgo && completionDate <= today;
  });

  const totalTasks7Days = tasksLast7Days.length;
  const newTasks7Days = tasksLast7Days.filter((task) => task?.STATUS === "NEW").length;
  const overdueTasks7Days = tasksLast7Days.filter((task) => {
    if (!task?.COMPLETION_DATE || task?.STATUS === "NEW") return false;
    const completionDate = parseMicrosoftDate(task.COMPLETION_DATE);
    return completionDate && completionDate < today;
  }).length;
  const currentTasks7Days = tasksLast7Days.filter((task) => {
    if (!task?.COMPLETION_DATE) return false;
    const completionDate = parseMicrosoftDate(task.COMPLETION_DATE);
    return completionDate && completionDate >= today;
  }).length;

  function getStatusBadgeClass(NEW_STATUS) {
    switch (NEW_STATUS) {
      case "Pending":
        return "bg-blue-100 text-blue-600";
      case "Awaiting for Acceptance":
        return "bg-orange-100 text-orange-600";
      case "REJECTED":
        return "bg-red-100 text-red-600";
      case "COMPLETED":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading tasks...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col gap-y-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-4">
      {/* <div className="flex-1 w-full">
      <Card className="p-6 mb-4 hover:shadow-xl bg-white border dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-shadow duration-300 border-blue-100/50">
        <div className="flex items-center gap-x-4">
          <div className="relative w-20 h-20 group">
            <img
              src={userData?.userAvatar || DEFAULT_IMAGE}
              alt="User Avatar"
              className="w-full h-full object-cover rounded-full border-4 border-white shadow-xl transform group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.src = DEFAULT_IMAGE;
              }}
            />
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
          </div>

          <div>
            <h1 className="md:text-2xl text-lg font-bold">
              Welcome back, {toTitleCase(userData?.userName || "User")} 👋
            </h1>
            <p className="text-gray-400 md:text-sm text-xs">
              Here's what's happening with your account today
            </p>
          </div>
        </div>
      </Card>
    </div> */}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        {/* Total Tasks Card */}
        <Card className="hover:shadow-lg transition-all duration-300 border bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 border-blue-100/50">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <h3 className="text-xl font-bold mt-1">{totalTasks}</h3>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-blue-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{totalTasks7Days} Task from last 7 Days</span>
            </div>
          </CardContent>
        </Card>

        {/* New Tasks Card */}
        <Card className="hover:shadow-lg transition-all duration-300 hover:shadow-xl bg-white border dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-shadow duration-300 border-blue-100/50">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">New Tasks</p>
                <h3 className="text-xl font-bold mt-1">{newTasks}</h3>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              {/* <span>{newTasks7Days} Task from last 7 Days</span> */}
              <span>Awaiting for Acceptance</span>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Tasks Card */}
        <Card className="hover:shadow-lg transition-all bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 duration-300 border border-red-100/50">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Overdue Tasks
                </p>
                <h3 className="text-xl font-bold mt-1">{overdueTasks}</h3>
              </div>
              <div className="p-3 rounded-lg bg-red-50 text-red-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-red-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{overdueTasks7Days} Task from last 7 Days</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Tasks Card */}
        <Card className="hover:shadow-lg transition-all bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 duration-300 border border-yellow-100/50">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Current Tasks
                </p>
                <h3 className="text-xl font-bold mt-1">{currentTask}</h3>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 text-yellow-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-yellow-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{currentTasks7Days} Task from last 7 Days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 grid-cols-1 lg:grid-cols-[68%_32%] mt-1 w-full">
        {/* Tasks Table */}
        <div className="overflow-y-scroll w-full max-h-[63vh] shadow-lg hover:shadow-xl rounded-lg whitespace-nowrap border p-3 pb-2 border-blue-100/50 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-shadow duration-300">
          <Table className="w-full whitespace-nowrap">
            <TableHeader className="w-full sticky top-0 text-sm">
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Assigned by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="w-full">
              {tasks.length > 0 ? (
                // Fix: Use slice instead of splice to avoid mutating the original array
                tasks.slice(0, 5).map((task, index) => (
                  <TableRow key={task?.TASK_ID || index}>
                    <TableCell className="flex-col">
                      <div>{task?.TASK_NAME || "Unknown Task"}</div>
                      <Badge className="mt-1 text-xs text-purple-600 bg-purple-200">
                        {task?.TASK_ID || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(task?.NEW_STATUS)}>
                        {task?.NEW_STATUS || "Unknown"}
                      </Badge>
                      <div className="mt-1">
                        <span className="text-xs font-medium text-gray-500">
                          {task?.date || "25-10-2025"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center h-full w-full">
                        <div className="relative">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={task?.assignedEmpImage} />
                            <AvatarFallback className="bg-blue-500 text-white font-medium">
                              {task?.ASSIGNED_USER.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 w-full">
                          {task?.ASSIGNED_USER}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {task?.CREATED_USER === "***00***" && (
                          <div className="absolute top-0 right-0 bg-blue-500 text-white text-[0.6rem] rounded-full w-3 h-3 flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-2 h-2"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {task?.CREATED_USER === "***00***"
                          ? "System"
                          : task?.CREATED_USER || "Unknown"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No tasks available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-end justify-end mt-2 relative">
            <div className="text-xs absolute text-gray-500 font-medium top-1 left-1 z-10">
              Total No Of Tasks:
              <span className="font-bold"> {tasks.length}</span>
            </div>
            <button className="px-3 py-1 text-xs btn btn-xs font-medium rounded border bg-white border dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-shadow duration-300 border-blue-100/50">
              View {tasks.length}+ More
            </button>
          </div>
        </div>

        {/* Task Status Chart */}
        <div className="mr-2">
          <div className="w-full bg-white rounded-lg border shadow-lg hover:shadow-xl dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-shadow duration-300 border-blue-100/50">
            <RecentMessage />
          </div>
        </div>
      </div>
    </div >
  );
};

export default HomePage;