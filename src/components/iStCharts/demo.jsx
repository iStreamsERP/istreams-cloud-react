import { useState, useEffect, useRef } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Paperclip,
  Mic,
  Smile,
  ChevronDown,
  MoreVertical,
  Send,
  CheckCheck,
  Check,
  Menu,
  Plus,
  X,
  Image,
  File,
  Video,
  User,
  ArrowLeft,
  Phone,
  VideoIcon,
  Info,
  Volume2,
  VolumeX,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getListUserMessage,
  getSpecificUserMessage,
  sentMessage,
} from "@/services/chatService";
import { getAllUsers, getEmployeeImage } from "@/services/employeeService";
import { useSearchParams, useNavigate } from "react-router-dom";
import { callSoapService } from "@/services/callSoapService";
 
const Chat = () => {
  const { userData } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [listOfMsg, setListOfMsg] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [specificMessages, setSpecificMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserImage, setSelectedUserImage] = useState("");
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [onlineStatus, setOnlineStatus] = useState({});
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messageStatus, setMessageStatus] = useState({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showCallModal, setShowCallModal] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
 
  useEffect(() => {
    fetchUsersAndMessages();
  }, []);

  // Handle URL parameters to auto-select user
  useEffect(() => {
    const userFromUrl = searchParams.get('user');
    if (userFromUrl && users.length > 0) {
      // Decode the user parameter and set as selected user
      const decodedUser = decodeURIComponent(userFromUrl);
      handleMessageClick(decodedUser);
      
      // Clear the URL parameter after processing
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('user');
      navigate(`/chat?${newSearchParams.toString()}`, { replace: true });
    }
  }, [searchParams, users]);
 
  useEffect(() => {
    scrollToBottom();
  }, [specificMessages, showMobileChat]);
 
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
 
  const fetchUsersAndMessages = async () => {
    const forTheUserName = { ForTheUserName: userData.userName };
 
    try {
    
      const msglist = await callSoapService(userData.clientURL, "IM_Get_ListOfUsers_Messages", forTheUserName);
      const allUsers = await callSoapService(userData.clientURL, "IM_Get_All_Users", "");
      
      const activeUsers = allUsers.filter(
        (user) => user.account_expired == null
      );
 
      setUsers(allUsers);
      setFilteredUsers(activeUsers);
 
      const statuses = {};
      activeUsers.forEach((user) => {
        statuses[user.user_name] = Math.random() > 0.3;
      });
      setOnlineStatus(statuses);
 
      const statusMap = {};
      msglist.forEach((msg) => {
        statusMap[msg.ID] = Math.random() > 0.5 ? "read" : "delivered";
      });
      setMessageStatus(statusMap);
 
      const listWithImages = await Promise.all(
        msglist.map(async (msg) => {
          try {
           
           const empImg = {EmpNo:msg.EMP_NO,};
           const imageData = await callSoapService(userData.clientURL, "getpic_bytearray", empImg);

            return {
              ...msg,
              assignedEmpImage: imageData
                ? `data:image/jpeg;base64,${imageData}`
                : "",
            };
          } catch {
            return { ...msg, assignedEmpImage: "" };
          }
        })
      );
 
      setListOfMsg(listWithImages);
      setFilteredMessages(listWithImages);
    } catch (error) {
      console.error("Failed to fetch user messages:", error);
    }
  };
 
  const parseDotNetDate = (dotNetDateStr) => {
    const match = /\/Date\((\d+)\)\//.exec(dotNetDateStr);
    return match ? new Date(parseInt(match[1], 10)) : null;
  };
 
  const groupMessagesByDate = (messages) => {
    const grouped = {};
    messages.forEach((msg) => {
      const dateObj = parseDotNetDate(msg.CREATED_ON);
      let label = format(dateObj, "MMMM d, yyyy");
      if (isToday(dateObj)) label = "Today";
      else if (isYesterday(dateObj)) label = "Yesterday";
 
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push({ ...msg, parsedDate: dateObj });
    });
    return grouped;
  };
 
  const handleMessageClick = async (createdUser) => {
    setSelectedUser(createdUser);
    setShowContactInfo(false);
    const payload = {
      FromUserName: userData.userName,
      SentToUserName: createdUser,
    };
 
    try {
     
      const spMessages = await callSoapService(userData.clientURL, "IM_Get_Specific_User_Messages", payload);

      setSpecificMessages(spMessages);
 
      const selectedUserObj = users.find((u) => u.user_name === createdUser);
      if (selectedUserObj) {
        const empImg = {EmpNo: selectedUserObj.emp_no};
        const imageData = await callSoapService(userData.clientURL, "getpic_bytearray", empImg);
        setSelectedUserImage(
          imageData ? `data:image/jpeg;base64,${imageData}` : ""
        );
      } else {
        setSelectedUserImage("");
      }
 
      setShowMobileChat(true);
    } catch (err) {
      console.error("Error fetching conversation:", err);
    }
  };
 
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
 
    const sentMsg = {
      UserName: userData.userName,
      ToUserName: selectedUser,
      Message: newMessage,
      MessageInfo: newMessage,
    };
 
    try {
      await sentMessage(sentMsg, userData.userEmail, userData.clientURL);
 
      const payload = {
        FromUserName: userData.userName,
        SentToUserName: selectedUser,
      };
 
      const updatedMessages = await getSpecificUserMessage(
        payload,
        userData.userEmail,
        userData.clientURL
      );
 
      setSpecificMessages(updatedMessages);
      setNewMessage("");
 
      if (updatedMessages.length > 0) {
        const newMsg = updatedMessages[updatedMessages.length - 1];
        setMessageStatus((prev) => ({
          ...prev,
          [newMsg.ID]: "sent",
        }));
 
        setTimeout(() => {
          setMessageStatus((prev) => ({
            ...prev,
            [newMsg.ID]: "delivered",
          }));
        }, 1000);
 
        setTimeout(() => {
          setMessageStatus((prev) => ({
            ...prev,
            [newMsg.ID]: "read",
          }));
        }, 3000);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };
 
  const handleFileUpload = (type) => {
    let inputRef;
    switch (type) {
      case "image":
        inputRef = imageInputRef;
        break;
      case "video":
        inputRef = videoInputRef;
        break;
      default:
        inputRef = fileInputRef;
    }
 
    inputRef.current.click();
    setShowAttachmentMenu(false);
  };
 
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      console.log(`${type} selected:`, file.name);
    }
  };
 
  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };
 
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
 
  const renderStatusIcon = (messageId) => {
    const status = messageStatus[messageId] || "sent";
 
    switch (status) {
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case "sent":
        return <Check className="w-3 h-3 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[75vh]  bg-[#f0f2f5] dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Left sidebar - Contacts */}
      <div
        className={`${
          showMobileChat ? "hidden md:flex" : "flex"
        } w-full md:w-1/3 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative`}
      >
        {/* User header */}
        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={userData.userAvatar}
                alt={userData.userName}
              />
              <AvatarFallback className="bg-blue-500 text-white font-medium">
                {userData.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {userData.userName}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
 
        {/* Search bar - Unified for both views */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={
                showUserList ? "Search contacts" : "Search conversations"
              }
              className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500"
              value={showUserList ? userSearchTerm : messageSearchTerm}
              onChange={(e) => {
                const val = e.target.value;
                if (showUserList) {
                  setUserSearchTerm(val);
                  setFilteredUsers(
                    users.filter(
                      (user) =>
                        user.account_expired == null &&
                        user.user_name.toLowerCase().includes(val.toLowerCase())
                    )
                  );
                } else {
                  setMessageSearchTerm(val);
                  setFilteredMessages(
                    listOfMsg.filter(
                      (msg) =>
                        msg.CREATED_USER &&
                        msg.CREATED_USER.toLowerCase().includes(
                          val.toLowerCase()
                        )
                    )
                  );
                }
              }}
            />
          </div>
        </div>
 
        {/* Dynamic content area with improved scrollbar */}
        <div className="flex-1 relative overflow-hidden">
          {/* Contacts list */}
          <ScrollArea
            className={`h-full w-full ${showUserList ? "hidden" : "block"}`}
          >
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMessages
                .filter((msg) => msg.CREATED_USER !== userData.userName)
                .map((msg, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                      selectedUser === msg.CREATED_USER
                        ? "bg-gray-100 dark:bg-gray-700"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    onClick={() => handleMessageClick(msg.CREATED_USER)}
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={msg.assignedEmpImage} />
                        <AvatarFallback className="bg-blue-500 text-white font-medium">
                          {msg.CREATED_USER.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* {onlineStatus[msg.CREATED_USER] && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      )} */}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">
                          {msg.CREATED_USER}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {format(parseDotNetDate(msg.CREATED_ON), "h:mm a")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {msg.TASK_INFO}
                        </p>
                        {msg.ASSIGNED_USER === userData.userName && (
                          <span className="ml-2">
                            {renderStatusIcon(msg.ID)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
 
          {/* User list for new chat */}
          <ScrollArea
            className={`h-full w-full ${showUserList ? "block" : "hidden"}`}
          >
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers
                .filter((user) => user.user_name !== userData.userName)
                .map((user, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2  hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    onClick={() => {
                      handleMessageClick(user.user_name);
                      setShowUserList(false);
                      setShowMobileChat(true);
                    }}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-blue-500 text-white text-lg font-medium">
                        {user.user_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">
                        {user.user_name}
                      </p>
                     
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>
 
        {/* Unified toggle button */}
        <div className="absolute bottom-6 right-6">
          <Button
            size="icon"
            className="rounded-full h-12 w-12 shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-transform hover:scale-105"
            onClick={() => setShowUserList(!showUserList)}
          >
            {showUserList ? (
              <MessageSquare className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
 
      {/* Right side - Chat area */}
      <div
        className={`${
          !showMobileChat ? "hidden md:flex" : "flex"
        } flex-1 flex-col bg-white dark:bg-gray-900 relative`}
      >
        {selectedUser ? (
          <>
            {/* Chat header */}
            <div className="flex justify-between items-center md:p-3 p-1  bg-[#f0f2f5] dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center md:space-x-3 space-x-1">
                <button
                  className="md:hidden p-1 md:mr-2  text-gray-600 dark:text-gray-300"
                  onClick={() => setShowMobileChat(false)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={selectedUserImage} />
                    <AvatarFallback className="bg-gray-400 dark:bg-gray-600 text-white">
                      {selectedUser.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* {onlineStatus[selectedUser] && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                  )} */}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800 dark:text-white">
                    {selectedUser}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {/* {onlineStatus[selectedUser]
                      ? "Active now"
                      : "Active Recently"} */}
                  </p>
                </div>
              </div>
              <div className="flex md:space-x-4 space-x-1 text-gray-500 dark:text-gray-400">
                <button className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                  <VideoIcon className="w-5 h-5" />
                </button>
                <button
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setShowContactInfo(true)}
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>
 
            {/* Messages area */}
            <div className="flex-1 p-4 overflow-y-auto bg-[#e5ddd5] dark:bg-gray-900 bg-opacity-30">
              {Object.entries(groupMessagesByDate(specificMessages)).map(
                ([dateLabel, msgs], idx) => (
                  <div key={idx} className="mb-6">
                    <div className="text-center mb-4">
                      <span className="bg-white dark:bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-600 dark:text-gray-300 shadow-sm">
                        {dateLabel}
                      </span>
                    </div>
                    {msgs.map((msg, i) => {
                      const isSender =
                        msg.ASSIGNED_USER !== userData.userName;
                      const time = format(
                        parseDotNetDate(msg.CREATED_ON),
                        "h:mm a"
                      );
                      return (
                        <div
                          key={i}
                          className={`flex mb-4 ${
                            isSender ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isSender
                                ? "bg-[#d9fdd3] dark:bg-blue-600 rounded-tr-none"
                                : "bg-white dark:bg-gray-700 rounded-tl-none"
                            } shadow`}
                          >
                            <div className="text-sm dark:text-white">
                              {msg.TASK_INFO}
                            </div>
                            <div
                              className={`text-xs mt-1 flex justify-end items-center space-x-1 ${
                                isSender
                                  ? "text-gray-500 dark:text-blue-100"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              <span>{time}</span>
                              {/* {isSender && (
                                <span className="ml-1">
                                  {renderStatusIcon(msg.ID)}
                                </span>
                              )} */}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
              <div ref={chatEndRef} />
            </div>
 
            {/* Message input */}
            <div className="p-3 bg-[#f0f2f5] dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
              
              
                <Input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message"
                  className="flex-1 rounded-full bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={
                    newMessage.trim() ? handleSendMessage : toggleRecording
                  }
                >
                  {newMessage.trim() ? (
                    <Send className="w-5 h-5 text-blue-500" />
                  ) : isRecording ? (
                    <div className="flex items-center">
                      <div className="animate-pulse mr-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      </div>
                      <X className="w-5 h-5 text-red-500" />
                    </div>
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900">
            <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <div className="w-16 h-16 text-gray-400 dark:text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start a conversation
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center leading-relaxed text-sm max-w-md px-4">
              Select a chat to start messaging. Your conversations will appear
              here.
            </p>
          </div>
        )}
 
        {/* Contact info panel */}
        {showContactInfo && selectedUser && (
          <div className="absolute inset-y-0 right-0 w-full md:w-1/3 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <button
                  className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  onClick={() => setShowContactInfo(false)}
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-semibold dark:text-white">
                  Contact info
                </h3>
                <div className="w-5"></div>
              </div>
            </div>
            <ScrollArea className="h-full">
              <div className="flex flex-col items-center p-6">
                <Avatar className="w-32 h-32 mb-4">
                  <AvatarImage src={selectedUserImage} />
                  <AvatarFallback className="bg-gray-400 dark:bg-gray-600 text-white">
                    {selectedUser.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h4 className="text-xl font-semibold dark:text-white">
                  {selectedUser}
                </h4>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {onlineStatus[selectedUser] ? "Online" : "Offline"}
                </p>
                <div className="flex ">
                  <button className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Phone className="w-6 h-6 text-blue-500 mb-1" />
                    <span className="text-xs dark:text-gray-300">Audio</span>
                  </button>
                  <button className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <VideoIcon className="w-6 h-6 text-blue-500 mb-1" />
                    <span className="text-xs dark:text-gray-300">Video</span>
                  </button>
                  <button
                    className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <VolumeX className="w-6 h-6 text-blue-500 mb-1" />
                    ) : (
                      <Volume2 className="w-6 h-6 text-blue-500 mb-1" />
                    )}
                    <span className="text-xs dark:text-gray-300">
                      {isMuted ? "Unmute" : "Mute"}
                    </span>
                  </button>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};
 
export default Chat;
 