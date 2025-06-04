import { useState, useEffect, useRef, memo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { callSoapService } from "@/services/callSoapService";

const DEFAULT_IMAGE = "/default-user.png"; // should be round image
const FETCH_INTERVAL = 15000; // More frequent updates (15 seconds)
const PLACEHOLDER_COUNT = 3;

// Helper function to parse JSON date format
const parseJsonDate = (jsonDate) => {
  if (!jsonDate) return null;
  
  try {
    // Handle format like "\/Date(1733895828000)\/"
    const timestamp = jsonDate.replace(/\/Date\((\d+)\)\//, "$1");
    return new Date(parseInt(timestamp, 10));
  } catch (error) {
    console.error("Error parsing JSON date:", error);
    return null;
  }
};

// Format date to show date on top line and time below
const formatDate = (date) => {
  if (!date) return { date: "Unknown date", time: "" };
  
  try {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const day = days[date.getDay()];
    const dateNum = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    return {
      date: `${dateNum}-${month}-${year}`,
      time: `${hours}:${minutes}${ampm}`
    };
  } catch (error) {
    console.error("Error formatting date:", error);
    return { date: "Invalid date", time: "" };
  }
};

const MessageItem = memo(({ msg, hasNewBadge, onMessageClick }) => {
  const { date, time } = formatDate(parseJsonDate(msg.CREATED_ON));
  
  const handleClick = () => {
    onMessageClick(msg.CREATED_USER);
  };
  
  return (
    <li 
      className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10 rounded-full border-2 border-blue-100 dark:border-gray-700 overflow-hidden">
            <AvatarImage
              src={msg.createdEmpImage }
              alt={msg.CREATED_USER || "Unknown User"}
              className="object-cover h-full w-full"
              loading="lazy"
            />
            <AvatarFallback className="bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-300">
              {(msg.CREATED_USER || "UU").substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {/* {hasNewBadge && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></span>
          )} */}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold truncate text-gray-900 dark:text-white">
              {msg.CREATED_USER || "Unknown User"}
            </h4>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
              <div>{date}</div>
              <div>{time}</div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
            {msg.TASK_INFO || "No message content"}
          </p>
        </div>
      </div>
    </li>
  );
});

MessageItem.displayName = "MessageItem";

const RecentMessage = () => {
  const { userData } = useAuth();
  const [groupedMessages, setGroupedMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [imageCache, setImageCache] = useState({});
  const prevMessageRef = useRef({});
  const fetchingRef = useRef(false);
  const timeoutRef = useRef(null);
  const mountedRef = useRef(true); // Track if component is mounted
  const navigate = useNavigate();

  useEffect(() => {
    mountedRef.current = true;
    requestNotificationPermission();
    
    // Initial fetch
    fetchMessages();
    
    // Set up polling interval with more frequent checks
    const interval = setInterval(() => {
      if (!document.hidden) fetchMessages();
    }, FETCH_INTERVAL); 

    // Handle tab visibility changes for immediate updates when returning to tab
    const handleVisibilityChange = () => {
      if (!document.hidden && !fetchingRef.current) fetchMessages();
    };

    // Listen for route changes or page navigation events
    const handleRouteChange = () => {
      if (!fetchingRef.current) fetchMessages();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleRouteChange);
    
    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleRouteChange);
    };
  }, []);  // Empty dependency array so this only runs once on mount

  // Re-fetch when userData changes
  useEffect(() => {
    if (userData?.userName && userData?.userEmail) {
      fetchMessages();
    }
  }, [userData]);

  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  };
  
  const createRoundedImage = (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        // Clip to circle
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Draw image
        ctx.drawImage(img, 0, 0, size, size);

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => {
        resolve(DEFAULT_IMAGE);
      };
      img.src = imageSrc;
    });
  };

  const showBrowserNotification = async (msg) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const iconSrc = await createRoundedImage(msg.createdEmpImage || DEFAULT_IMAGE);

      requestAnimationFrame(() => {
        new Notification(`New message from ${msg.CREATED_USER}`, {
          body: msg.TASK_INFO || "You have a new message.",
          icon: iconSrc,
        });
      });

      if (mountedRef.current) {
        setHasNewMessages(true);
      }
    }
  };

  const fetchMessages = async () => {
    if (fetchingRef.current || !mountedRef.current) return;
    fetchingRef.current = true;

    if (!userData?.userName || !userData?.userEmail) {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
      return;
    }
     
    const payload = { UserName: userData.userName };

    try {
    
      const res  = await callSoapService(userData.clientURL, "IM_Get_User_Messages", payload);
      

      if (!mountedRef.current) return; // Check if component is still mounted

      const messages = Array.isArray(res) ? res : res?.messages || [];
      const groupMap = new Map();
      messages.forEach((msg) => groupMap.set(msg.EMP_NO, msg));
      const groupedArray = Array.from(groupMap.values());

      const messagesToProcess = [];
      const readyMessages = [];

      for (const msg of groupedArray) {
        if (imageCache[msg.EMP_NO]) {
          readyMessages.push({
            ...msg,
            createdEmpImage: imageCache[msg.EMP_NO],
          });
        } else {
          messagesToProcess.push(msg);
        }
      }

      if (readyMessages.length > 0 && mountedRef.current) {
        setGroupedMessages(readyMessages);
        setLoading(false);
      }

      if (messagesToProcess.length > 0) {
        const imagePromises = messagesToProcess.map(async (msg) => {
          try {
            let imgSrc = DEFAULT_IMAGE;
            
            // Only try to fetch image if we have a valid EMP_NO
            if (msg.EMP_NO) {
              try {
               
                const empImg = {
                        EmpNo:msg.EMP_NO,
                      };
            
                 const imageData = await callSoapService(userData.clientURL, "getpic_bytearray", empImg);
                
                // Only update if we got a valid image
                if (imageData) {
                  imgSrc = `data:image/jpeg;base64,${imageData}`;
                }
              } catch (imgError) {
                console.log(`Failed to load image for employee ${msg.EMP_NO}, using default`);
                // Just use default image on error - no need to re-throw
              }
            }

            if (mountedRef.current) {
              setImageCache((prev) => ({
                ...prev,
                [msg.EMP_NO]: imgSrc,
              }));
            }

            return { ...msg, createdEmpImage: imgSrc };
          } catch (error) {
            // Fallback to default image on any error
            return { ...msg, createdEmpImage: DEFAULT_IMAGE };
          }
        });

        const newMessages = await Promise.all(imagePromises);
        
        if (!mountedRef.current) return; // Check if component is still mounted
        
        const allMessages = [...readyMessages, ...newMessages];

        let newMessagesFound = false;
        allMessages.forEach((msg) => {
          const prev = prevMessageRef.current[msg.EMP_NO];
          if (!prev || prev.TASK_INFO !== msg.TASK_INFO) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              showBrowserNotification(msg);
            }, 300);
            newMessagesFound = true;
          }
        });

        if (mountedRef.current) {
          setHasNewMessages(newMessagesFound);
          prevMessageRef.current = Object.fromEntries(
            allMessages.map((msg) => [msg.EMP_NO, msg])
          );
          setGroupedMessages(allMessages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user messages:", error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  };

  // Handle message click - navigate to chat with selected user
  const handleMessageClick = (createdUser) => {
    // Navigate to chat page with the selected user as a URL parameter
    navigate(`/chat?user=${encodeURIComponent(createdUser)}`);
  };

  if (loading && groupedMessages.length === 0) {
    return (
      <Card className="w-full h-[420px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Recent Messages</h3>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {[...Array(PLACEHOLDER_COUNT)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-[420px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <CardHeader className="border-b flex flex-row flex-wrap justify-between border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Recent Messages</h3>
          
        </div>
        <button className="flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-lg bg-blue-50 dark:bg-gray-800 hover:bg-blue-100 whitespace-nowrap dark:hover:bg-gray-700 transition-colors duration-200 text-blue-600 dark:text-blue-400" onClick={() => navigate("/chat")}>
            View All <ChevronRight className="w-4 h-4" />
          </button>
      </CardHeader>
      <CardContent className="p-0 max-h-[360px] overflow-y-auto">
        {groupedMessages.length > 0 ? (
          <ul>
            {groupedMessages.map((msg) => (
              <MessageItem
                key={msg.EMP_NO}
                msg={msg}
                // hasNewBadge={hasNewMessages}
                onMessageClick={handleMessageClick}
              />
            ))}
          </ul>
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No messages found
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentMessage;