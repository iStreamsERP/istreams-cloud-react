import { useState, useEffect, useRef, memo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, MessageSquare, X, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { callSoapService } from "@/api/callSoapService";

const DEFAULT_IMAGE = "/default-user.png"; // should be round image
const FETCH_INTERVAL = 15000; // More frequent updates (15 seconds)
const PLACEHOLDER_COUNT = 3;

// Enhanced Notification Popup Component for All Messages
const AllMessagesNotificationPopup = ({ notifications, onClose, onMessageClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (notifications && notifications.length > 0) {
      setIsVisible(true);
      setCurrentIndex(0);
      
      // Auto-cycle through notifications every 3 seconds
      const cycleTimer = setInterval(() => {
        setCurrentIndex(prev => {
          const nextIndex = (prev + 1) % notifications.length;
          // Close after showing all notifications
          if (nextIndex === 0 && prev === notifications.length - 1) {
            setTimeout(() => handleClose(), 500);
          }
          return nextIndex;
        });
      }, 1000);
      
      return () => clearInterval(cycleTimer);
    }
  }, [notifications]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsLeaving(false);
      onClose();
    }, 300);
  };

  const handleNotificationClick = (notification) => {
    if (notification && onMessageClick) {
      onMessageClick(notification.userName);
      handleClose();
    }
  };

  if (!notifications || notifications.length === 0 || !isVisible) return null;

  const currentNotification = notifications[currentIndex];

  return (
    <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 max-w-xs sm:max-w-sm w-full px-2 sm:px-0">
      <div 
        className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 sm:p-4 transform transition-all duration-300 cursor-pointer hover:shadow-xl ${
          isLeaving ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
        onClick={() => handleNotificationClick(currentNotification)}
      >
        {/* Header with count indicator */}
        <div className="flex items-center justify-between mb-1 sm:mb-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <Bell className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-500">
              {currentIndex + 1} of {notifications.length} messages
            </span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 sm:p-1"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>

        <div className="flex items-start gap-2 sm:gap-3">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-blue-100 dark:border-gray-700 overflow-hidden flex-shrink-0">
            <AvatarImage
              src={currentNotification.icon}
              alt={currentNotification.userName}
              className="object-cover h-full w-full"
            />
            <AvatarFallback className="bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-300 text-xs sm:text-sm">
              {currentNotification.userName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5 sm:mb-1">
              <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                {currentNotification.userName}
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentNotification.time}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {currentNotification.message}
            </p>
          </div>
        </div>
        
        {/* Progress indicators */}
        <div className="mt-2 sm:mt-3 flex gap-1">
          {notifications.map((_, index) => (
            <div 
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                index === currentIndex 
                  ? 'bg-blue-500' 
                  : index < currentIndex 
                    ? 'bg-blue-300' 
                    : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Individual Notification Popup Component (original)
const NotificationPopup = ({ notification, onClose, onMessageClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsLeaving(false);
      onClose();
    }, 300);
  };

  const handleNotificationClick = () => {
    if (notification && onMessageClick) {
      onMessageClick(notification.userName);
      handleClose();
    }
  };

  if (!notification || !isVisible) return null;

  return (
    <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50 max-w-xs sm:max-w-sm w-full px-2 sm:px-0">
      <div 
        className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 sm:p-4 transform transition-all duration-300 cursor-pointer hover:shadow-xl ${
          isLeaving ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
        onClick={handleNotificationClick}
      >
        <div className="flex items-start gap-2 sm:gap-3">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-blue-100 dark:border-gray-700 overflow-hidden flex-shrink-0">
            <AvatarImage
              src={notification.icon}
              alt={notification.userName}
              className="object-cover h-full w-full"
            />
            <AvatarFallback className="bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-300 text-xs sm:text-sm">
              {notification.userName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5 sm:mb-1">
              <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                New message from {notification.userName}
              </h4>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 sm:p-1"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {notification.message}
            </p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-2 sm:mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full"
            style={{
              animation: 'shrinkProgress 2s linear forwards'
            }}
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shrinkProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

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

const Notification = () => {
  const { userData } = useAuth();
  const [groupedMessages, setGroupedMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [imageCache, setImageCache] = useState({});
  const [notification, setNotification] = useState(null); // Single notification state
  const [allMessagesNotifications, setAllMessagesNotifications] = useState([]); // All messages notification state
  const [notificationQueue, setNotificationQueue] = useState([]); // Queue for multiple notifications
  const [notifiedMessages, setNotifiedMessages] = useState(new Set()); // Track already notified messages
  const prevMessageRef = useRef({});
  const fetchingRef = useRef(false);
  const timeoutRef = useRef(null);
  const mountedRef = useRef(true); // Track if component is mounted
  const notificationTimeoutRef = useRef(null);
  const isProcessingNotificationsRef = useRef(false);
  const audioRef = useRef(null);
  const navigate = useNavigate();

  // Initialize notification sound
  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio();
    // Using a default notification sound data URL (short beep sound)
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQlGjuP2PO2eCA0hcLx0m8gRCEpX6/R3sNj';
    audioRef.current.volume = 0.9; // Set volume to 90%
    audioRef.current.preload = 'auto';
    
    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    if (audioRef.current && mountedRef.current) {
      try {
        // Reset audio to beginning and play
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        
        // Handle autoplay restrictions
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            // Autoplay was prevented, user interaction is required first
            console.log('Audio autoplay prevented:', error);
          });
        }
      } catch (error) {
        console.log('Error playing notification sound:', error);
      }
    }
  };

  // Show all messages notification popup
  const showAllMessagesNotification = (allMessages) => {
    if (mountedRef.current && allMessages.length > 0) {
      const notifications = allMessages.map(msg => {
        const { time } = formatDate(parseJsonDate(msg.CREATED_ON));
        return {
          userName: msg.CREATED_USER,
          message: msg.TASK_INFO || "You have a new message.",
          icon: msg.createdEmpImage || DEFAULT_IMAGE,
          time: time
        };
      });
      
      setAllMessagesNotifications(notifications);
      playNotificationSound();
      setHasNewMessages(true);
    }
  };

  // Process notification queue - show notifications one by one
  const processNotificationQueue = () => {
    if (isProcessingNotificationsRef.current || !mountedRef.current) return;
    
    setNotificationQueue(currentQueue => {
      if (currentQueue.length === 0) {
        isProcessingNotificationsRef.current = false;
        return currentQueue;
      }

      const [nextNotification, ...remainingQueue] = currentQueue;
      
      // Show the next notification and play sound
      setNotification(nextNotification);
      playNotificationSound();
      isProcessingNotificationsRef.current = true;
      
      // Schedule the next notification after 2.5 seconds (2s display + 0.5s gap)
      notificationTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          isProcessingNotificationsRef.current = false;
          processNotificationQueue();
        }
      }, 2500);

      return remainingQueue;
    });
  };

  // Start processing notifications when queue has items
  useEffect(() => {
    if (notificationQueue.length > 0 && !isProcessingNotificationsRef.current) {
      processNotificationQueue();
    }
  }, [notificationQueue]);

  // Custom notification function - adds to queue instead of showing immediately
  const showCustomNotification = (msg) => {
    if (mountedRef.current) {
      // Create unique message identifier using CREATED_USER to prevent duplicate notifications
      const messageId = `${msg.CREATED_USER}_${msg.TASK_INFO}_${msg.CREATED_ON}`;
      
      // Check if this message has already been notified
      if (notifiedMessages.has(messageId)) {
        return; // Skip if already notified
      }
      
      const newNotification = {
        userName: msg.CREATED_USER,
        message: msg.TASK_INFO || "You have a new message.",
        icon: msg.createdEmpImage || DEFAULT_IMAGE
      };
      
      // Add to notified messages set
      setNotifiedMessages(prev => new Set([...prev, messageId]));
      
      setNotificationQueue(prevQueue => [...prevQueue, newNotification]);
      setHasNewMessages(true);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
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
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
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
      const res = await callSoapService(userData.clientURL, "IM_Get_User_Messages", payload);

      if (!mountedRef.current) return; // Check if component is still mounted

      const messages = Array.isArray(res) ? res : res?.messages || [];
      
      // Group messages by CREATED_USER and get only the latest message for each user
      const groupMap = new Map();
      messages.forEach((msg) => {
        const createdUser = msg.CREATED_USER;
        if (!createdUser) return; // Skip messages without CREATED_USER
        
        const existingMsg = groupMap.get(createdUser);
        
        // If no existing message or current message is newer, update
        if (!existingMsg || 
            parseJsonDate(msg.CREATED_ON) > parseJsonDate(existingMsg.CREATED_ON)) {
          groupMap.set(createdUser, msg);
        }
      });
      
      const groupedArray = Array.from(groupMap.values());

      const messagesToProcess = [];
      const readyMessages = [];

      for (const msg of groupedArray) {
        // Use CREATED_USER as the key for caching instead of EMP_NO
        const cacheKey = msg.CREATED_USER || msg.EMP_NO;
        
        if (imageCache[cacheKey]) {
          readyMessages.push({
            ...msg,
            createdEmpImage: imageCache[cacheKey],
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
            const cacheKey = msg.CREATED_USER || msg.EMP_NO;
            
            // Only try to fetch image if we have a valid EMP_NO
            if (msg.EMP_NO) {
              try {
                const empImg = {
                  EmpNo: msg.EMP_NO,
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
                [cacheKey]: imgSrc,
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

        // Check for new messages and collect all of them for notification
        const newMessagesToNotify = [];
        const hasAnyNewMessages = allMessages.some((msg) => {
          const userKey = msg.CREATED_USER;
          const prev = prevMessageRef.current[userKey];
          const messageId = `${userKey}_${msg.TASK_INFO}_${msg.CREATED_ON}`;
          
          // Check if this is a new message
          const isNewMessage = (!prev || 
               prev.TASK_INFO !== msg.TASK_INFO || 
               prev.CREATED_ON !== msg.CREATED_ON) && 
              !notifiedMessages.has(messageId);

          if (isNewMessage) {
            newMessagesToNotify.push(msg);
            // Mark as notified
            setNotifiedMessages(prev => new Set([...prev, messageId]));
            return true;
          }
          return false;
        });

        // Show all messages notification popup if there are new messages
        if (newMessagesToNotify.length > 0) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            // Show all messages notification instead of individual ones
            showAllMessagesNotification(allMessages);
          }, 300);
        }

        if (mountedRef.current) {
          setHasNewMessages(hasAnyNewMessages);
          prevMessageRef.current = Object.fromEntries(
            allMessages.map((msg) => [msg.CREATED_USER, msg])
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

  // Handle notification close
  const handleNotificationClose = () => {
    setNotification(null);
  };

  // Handle all messages notification close
  const handleAllMessagesNotificationClose = () => {
    setAllMessagesNotifications([]);
  };

  if (loading && groupedMessages.length === 0) {
    return (
      <>
        <AllMessagesNotificationPopup 
          notifications={allMessagesNotifications} 
          onClose={handleAllMessagesNotificationClose}
          onMessageClick={handleMessageClick}
        />
        <NotificationPopup 
          notification={notification} 
          onClose={handleNotificationClose}
          onMessageClick={handleMessageClick}
        />
      </>
    );
  }

  return (
    <>
      {/* All Messages Notification Popup */}
      <AllMessagesNotificationPopup 
        notifications={allMessagesNotifications} 
        onClose={handleAllMessagesNotificationClose}
        onMessageClick={handleMessageClick}
      />
      
      {/* Individual Notification Popup (kept for backward compatibility) */}
      <NotificationPopup 
        notification={notification} 
        onClose={handleNotificationClose}
        onMessageClick={handleMessageClick}
      />
    </>
  );
};

export default Notification;