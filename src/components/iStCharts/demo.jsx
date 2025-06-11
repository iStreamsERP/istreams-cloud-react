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
  PhoneOff,
  VideoOff,
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getListUserMessage,
  getSpecificUserMessage,
  sentMessage,
} from "@/services/chatService";
import Peer from 'peerjs';
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
  
  // Call-related states
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' or 'video'
  const [isInCall, setIsInCall] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallFullscreen, setIsCallFullscreen] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [peer, setPeer] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [callError, setCallError] = useState(null);
  const [callStatus, setCallStatus] = useState(''); // 'calling', 'connecting', 'connected', 'failed', 'ended'
  const [showCallError, setShowCallError] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [ringtone, setRingtone] = useState(null);
  const [callTimeout, setCallTimeout] = useState(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callDurationRef = useRef(null);

  useEffect(() => {
    fetchUsersAndMessages();
    initializePeer();
  }, []);

  useEffect(() => {
    // Create ringtone audio for outgoing calls
    const outgoingRingtone = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEUBT2a2u3CcOr/'); // Short beep sound
    outgoingRingtone.loop = true;
    setRingtone(outgoingRingtone);
    
    return () => {
      if (outgoingRingtone) {
        outgoingRingtone.pause();
        outgoingRingtone.currentTime = 0;
      }
    };
  }, []);
  const convertEmailToPeerId = (email) => {
  // Convert email to a valid peer ID by replacing special characters
  return email.replace(/[@.]/g, '_').toLowerCase();
};

const convertPeerIdToEmail = (peerId) => {
  // Convert peer ID back to email format
  return peerId.replace(/_/g, '@').replace('@', '@').replace('@', '.');
};
// Updated initializePeer function
const initializePeer = () => {
  const peerId = convertEmailToPeerId(userData.userEmail.toLowerCase());
  console.log('Creating peer with ID:', peerId);
  
  if (peer) {
    peer.destroy();
  }
 const peerInstance = new window.Peer(peerId, {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
    debug: 1,
    config: {
      'iceServers': [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
  });

  peerInstance.on('open', (id) => {
    console.log('Peer connected with ID:', id);
    setPeer(peerInstance);
  });

  peerInstance.on('call', handleIncomingCall); // Use the new handler

  peerInstance.on('error', (error) => {
    console.error('Peer error:', error);
    setCallError('Connection error. Please refresh and try again.');
    setShowCallError(true);
  });

  peerInstance.on('disconnected', () => {
    console.log('Peer disconnected, attempting to reconnect...');
    setTimeout(() => {
      if (!peerInstance.destroyed) {
        peerInstance.reconnect();
      }
    }, 1000);
  });
};


// Updated startCall function
const startCall = async (type) => {
  if (!peer || !selectedUser) {
    setCallError('Connection not ready. Please try again.');
    setShowCallError(true);
    return;
  }

  try {
    setCallType(type);
    setIsInCall(true);
    setShowCallModal(true);
    setCallStatus('calling');
    setCallError(null);
    setIsRinging(true);

    // Start playing ringtone for outgoing call
    if (ringtone) {
      ringtone.currentTime = 0;
      ringtone.play().catch(console.error);
    }

    const constraints = {
      video: type === 'video',
      audio: true
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const recipientEmail = selectedUser.toLowerCase() + '@demo.com';
    const recipientPeerId = convertEmailToPeerId(recipientEmail);
    console.log('Calling user:', selectedUser);
    console.log('Recipient peer ID:', recipientPeerId);
    
    setCallStatus('connecting');
    const call = peer.call(recipientPeerId, stream);
    
    if (!call) {
      throw new Error('Failed to initiate call');
    }
    
    setCurrentCall(call);

    // Enhanced timeout with ringing detection
    const timeout = setTimeout(() => {
      if (!isCallConnected) {
        console.log('Call timeout - recipient not available');
        setIsRinging(false);
        if (ringtone) {
          ringtone.pause();
          ringtone.currentTime = 0;
        }
        
        // Check if peer exists but didn't answer
        if (peer.connections[recipientPeerId]) {
          setCallStatus('no-answer');
          setCallError(`${selectedUser} didn't answer the call.`);
        } else {
          setCallStatus('offline');
          setCallError(`${selectedUser} is currently offline or unavailable.`);
        }
        setShowCallError(true);
        endCall();
      }
    }, 30000); // 30 seconds timeout

    setCallTimeout(timeout);

    call.on('stream', (remoteStream) => {
      console.log('Received remote stream');
      clearTimeout(timeout);
      setIsRinging(false);
      if (ringtone) {
        ringtone.pause();
        ringtone.currentTime = 0;
      }
      
      setRemoteStream(remoteStream);
      setIsCallConnected(true);
      setCallStatus('connected');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    call.on('close', () => {
      console.log('Call closed by remote peer');
      clearTimeout(timeout);
      setIsRinging(false);
      if (ringtone) {
        ringtone.pause();
        ringtone.currentTime = 0;
      }
      setCallStatus('ended');
      endCall();
    });

    call.on('error', (error) => {
      console.error('Call error:', error);
      clearTimeout(timeout);
      setIsRinging(false);
      if (ringtone) {
        ringtone.pause();
        ringtone.currentTime = 0;
      }
      setCallStatus('failed');
      
      let errorMessage = 'Failed to connect call. Please try again.';
      if (error.type === 'peer-unavailable') {
        errorMessage = `${selectedUser} is currently offline or unavailable.`;
        setCallStatus('offline');
      } else if (error.type === 'network') {
        errorMessage = 'Network connection issue. Please check your internet connection.';
      } else if (error.type === 'disconnected') {
        errorMessage = 'Connection lost. Please try calling again.';
      }
      
      setCallError(errorMessage);
      setShowCallError(true);
      endCall();
    });

  } catch (error) {
    console.error('Error starting call:', error);
    setIsRinging(false);
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
    setCallStatus('failed');
    
    let errorMessage = 'Failed to start call. Please try again.';
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera/microphone access denied. Please allow access in your browser settings and try again.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'Camera/microphone not found. Please check your devices and try again.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera/microphone is being used by another application. Please close other apps and try again.';
    }
    
    setCallError(errorMessage);
    setShowCallError(true);
    endCall();
  }
};
// Enhanced Call Status Display Component
const CallStatusDisplay = () => {
  const getStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return isRinging && !isCallConnected ? `Ringing ${selectedUser}...` : `Calling ${selectedUser}...`;
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatCallDuration(callDuration);
      case 'failed':
        return 'Call failed';
      case 'ended':
        return 'Call ended';
      case 'offline':
        return 'User offline';
      case 'no-answer':
        return 'No answer';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'calling':
      case 'connecting':
        return 'text-blue-400';
      case 'connected':
        return 'text-green-400';
      case 'failed':
      case 'offline':
      case 'no-answer':
        return 'text-red-400';
      case 'ended':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="text-center">
      <p className={`text-sm ${getStatusColor()}`}>
        {getStatusText()}
      </p>
      {(callStatus === 'calling' || callStatus === 'connecting') && (
        <div className="flex justify-center mt-2">
          {isRinging ? (
            // Ringing animation
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          ) : (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          )}
        </div>
      )}
    </div>
  );
};
// Call Error Modal Component
const CallErrorModal = () => {
  if (!showCallError || !callError) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <PhoneOff className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Call Failed
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {callError}
          </p>
          <div className="flex space-x-3">
            <Button
              onClick={() => {
                setShowCallError(false);
                setCallError(null);
              }}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowCallError(false);
                setCallError(null);
                // Retry the call
                startCall(callType);
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};


// Add cleanup on component unmount
useEffect(() => {
  return () => {
    if (peer && !peer.destroyed) {
      peer.destroy();
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
  };
}, []);


// Add a new state to track peer instances and their usernames
const [activePeers, setActivePeers] = useState(new Map());

// Enhanced peer discovery - you might want to implement this with your backend
const findActivePeerForUser = async (username) => {
  // This is a placeholder - in a real app, you'd query your backend
  // to find the active peer ID for a given username
  return username; // Fallback to base username
};

  // Handle URL parameters to auto-select user
  useEffect(() => {
    const userFromUrl = searchParams.get('user');
    if (userFromUrl && users.length > 0) {
      const decodedUser = decodeURIComponent(userFromUrl);
      handleMessageClick(decodedUser);
      
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('user');
      navigate(`/chat?${newSearchParams.toString()}`, { replace: true });
    }
  }, [searchParams, users]);

  useEffect(() => {
    scrollToBottom();
  }, [specificMessages, showMobileChat]);

  // Call duration timer
  useEffect(() => {
    if (isCallConnected) {
      callDurationRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callDurationRef.current) {
        clearInterval(callDurationRef.current);
      }
    }

    return () => {
      if (callDurationRef.current) {
        clearInterval(callDurationRef.current);
      }
    };
  }, [isCallConnected]);

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
            const empImg = {EmpNo: msg.EMP_NO};
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

const handleIncomingCall = (call) => {
  console.log('Incoming call from:', call.peer);
  const callerEmail = convertPeerIdToEmail(call.peer);
  console.log('Caller email:', callerEmail);
  
  const callerUsername = callerEmail.replace('@demo.com', '').toLowerCase();
  const callerUser = users.find(user => user.user_name.toLowerCase() === callerUsername);
  const callerName = callerUser ? callerUser.user_name : callerUsername;
  
  setIncomingCall({ ...call, callerUsername: callerName });
  setShowCallModal(true);
  setCallStatus('incoming');
  
  // Play incoming call ringtone (browser default or custom)
  if (ringtone) {
    ringtone.currentTime = 0;
    ringtone.play().catch(console.error);
  }
};

// 6. Enhanced answerCall function
const answerCall = async () => {
  if (!incomingCall) return;

  try {
    // Stop ringtone
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }

    const constraints = {
      video: true,
      audio: true
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    setCallType('video');
    setIsInCall(true);
    setCallStatus('connecting');

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    incomingCall.answer(stream);
    setCurrentCall(incomingCall);

    incomingCall.on('stream', (remoteStream) => {
      console.log('Received remote stream');
      setRemoteStream(remoteStream);
      setIsCallConnected(true);
      setCallStatus('connected');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    incomingCall.on('close', () => {
      endCall();
    });

    setIncomingCall(null);
  } catch (error) {
    console.error('Error answering call:', error);
    setCallError('Failed to answer call. Please check your camera/microphone permissions.');
    setShowCallError(true);
    rejectCall();
  }
};

// 7. Enhanced rejectCall function
const rejectCall = () => {
  if (ringtone) {
    ringtone.pause();
    ringtone.currentTime = 0;
  }
  
  if (incomingCall) {
    incomingCall.close();
    setIncomingCall(null);
  }
  setShowCallModal(false);
  setCallStatus('');
};

// 8. Enhanced endCall function
const endCall = () => {
  console.log('Ending call...');
  
  // Stop ringtone
  setIsRinging(false);
  if (ringtone) {
    ringtone.pause();
    ringtone.currentTime = 0;
  }
  
  // Clear timeout
  if (callTimeout) {
    clearTimeout(callTimeout);
    setCallTimeout(null);
  }
  
  if (currentCall) {
    currentCall.close();
  }

  if (localStream) {
    localStream.getTracks().forEach(track => {
      track.stop();
      console.log('Stopped track:', track.kind);
    });
  }

  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
  }

  if (localVideoRef.current) {
    localVideoRef.current.srcObject = null;
  }
  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = null;
  }

  // Reset all call-related states
  setLocalStream(null);
  setRemoteStream(null);
  setCurrentCall(null);
  setIsInCall(false);
  setIsCallConnected(false);
  setShowCallModal(false);
  setCallType(null);
  setCallDuration(0);
  setCallStatus('');
  setIsScreenSharing(false);
  setIsCallFullscreen(false);
  setIsVideoEnabled(true);
  setIsAudioEnabled(true);
  
  console.log('Call ended and cleaned up');
};





  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!currentCall) return;

    try {
      if (isScreenSharing) {
        // Stop screen sharing, return to camera
        const constraints = {
          video: callType === 'video',
          audio: true
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Replace tracks
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && currentCall.peerConnection) {
          const sender = currentCall.peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }

        setLocalStream(stream);
        setIsScreenSharing(false);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        // Replace video track
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack && currentCall.peerConnection) {
          const sender = currentCall.peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }

        // Handle screen share end
        videoTrack.onended = () => {
          toggleScreenShare(); // This will switch back to camera
        };

        setIsScreenSharing(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
const CallModal = () => {
  if (!showCallModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${
        isCallFullscreen ? 'w-full h-full' : 'w-96 max-w-lg'
      }`}>
        
        {/* Incoming call UI with enhanced styling */}
        {incomingCall && !isInCall && (
          <div className="p-8 text-center bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg">
            <div className="mb-6">
              {/* Pulsing avatar for incoming call */}
              <div className="relative mx-auto w-32 h-32 mb-4">
                <Avatar className="w-32 h-32 mx-auto border-4 border-white shadow-lg">
                  <AvatarImage src={selectedUserImage} />
                  <AvatarFallback className="bg-white/20 text-white text-4xl font-bold">
                    {incomingCall.callerUsername?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {/* Pulsing ring animation */}
                <div className="absolute inset-0 rounded-full border-4 border-white opacity-30 animate-ping"></div>
                <div className="absolute inset-0 rounded-full border-4 border-white opacity-20 animate-ping" style={{animationDelay: '0.5s'}}></div>
              </div>
              
              <h3 className="text-2xl font-bold mb-2">
                {incomingCall.callerUsername || 'Unknown User'}
              </h3>
              <p className="text-white/80 text-lg mb-2">Incoming call...</p>
              
              {/* Ringing indicator */}
              <div className="flex justify-center items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
            
            {/* Enhanced call action buttons */}
            <div className="flex justify-center space-x-8">
              <button
                onClick={rejectCall}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-6 shadow-lg transform hover:scale-105 transition-all duration-200"
                title="Decline call"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
              <button
                onClick={answerCall}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full p-6 shadow-lg transform hover:scale-105 transition-all duration-200 animate-pulse"
                title="Answer call"
              >
                <Phone className="w-8 h-8" />
              </button>
            </div>
          </div>
        )}

        {/* Active call UI */}
        {isInCall && (
          <div className={`relative ${isCallFullscreen ? 'h-full' : 'h-96'}`}>
            {/* Call header with enhanced status */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
              <div className="flex justify-between items-center text-white">
                <div>
                  <h3 className="font-semibold text-lg">{selectedUser}</h3>
                  <CallStatusDisplay />
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setIsCallFullscreen(!isCallFullscreen)}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/10"
                  >
                    {isCallFullscreen ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </Button>
                  {(callStatus === 'failed' || callStatus === 'offline' || callStatus === 'no-answer') && (
                    <Button
                      onClick={endCall}
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/10"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Video streams */}
            {callType === 'video' && (
              <div className="relative w-full h-full bg-gray-900">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute bottom-20 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Enhanced call status overlay */}
                {callStatus !== 'connected' && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="relative mb-6">
                        <Avatar className="w-32 h-32 mx-auto border-4 border-white shadow-lg">
                          <AvatarImage src={selectedUserImage} />
                          <AvatarFallback className="bg-gray-600 text-white text-4xl">
                            {selectedUser?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Show ringing animation during calling */}
                        {isRinging && (
                          <>
                            <div className="absolute inset-0 rounded-full border-4 border-white opacity-30 animate-ping"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-white opacity-20 animate-ping" style={{animationDelay: '0.5s'}}></div>
                          </>
                        )}
                      </div>
                      <CallStatusDisplay />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Enhanced audio call UI */}
            {callType === 'audio' && (
              <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <div className="relative mb-8">
                  <Avatar className="w-40 h-40 border-4 border-white shadow-lg">
                    <AvatarImage src={selectedUserImage} />
                    <AvatarFallback className="bg-white/20 text-white text-5xl font-bold">
                      {selectedUser?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Ringing animation for audio calls */}
                  {isRinging && (
                    <>
                      <div className="absolute inset-0 rounded-full border-4 border-white opacity-30 animate-ping"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-white opacity-20 animate-ping" style={{animationDelay: '0.5s'}}></div>
                    </>
                  )}
                </div>
                <h3 className="text-3xl font-bold mb-4">{selectedUser}</h3>
                <CallStatusDisplay />
              </div>
            )}

            {/* Enhanced call controls */}
            {(callStatus !== 'failed' && callStatus !== 'offline' && callStatus !== 'no-answer') && (
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex justify-center space-x-6">
                  {callType === 'video' && (
                    <Button
                      onClick={toggleVideo}
                      className={`rounded-full p-4 transition-all duration-200 ${
                        isVideoEnabled 
                          ? 'bg-gray-600 hover:bg-gray-700' 
                          : 'bg-red-500 hover:bg-red-600'
                      } text-white shadow-lg`}
                    >
                      {isVideoEnabled ? (
                        <VideoIcon className="w-6 h-6" />
                      ) : (
                        <VideoOff className="w-6 h-6" />
                      )}
                    </Button>
                  )}
                  
                  <Button
                    onClick={toggleAudio}
                    className={`rounded-full p-4 transition-all duration-200 ${
                      isAudioEnabled 
                        ? 'bg-gray-600 hover:bg-gray-700' 
                        : 'bg-red-500 hover:bg-red-600'
                    } text-white shadow-lg`}
                  >
                    {isAudioEnabled ? (
                      <Mic className="w-6 h-6" />
                    ) : (
                      <VolumeX className="w-6 h-6" />
                    )}
                  </Button>

                  {callType === 'video' && isCallConnected && (
                    <Button
                      onClick={toggleScreenShare}
                      className={`rounded-full p-4 transition-all duration-200 ${
                        isScreenSharing 
                          ? 'bg-blue-500 hover:bg-blue-600' 
                          : 'bg-gray-600 hover:bg-gray-700'
                      } text-white shadow-lg`}
                    >
                      {isScreenSharing ? (
                        <MonitorOff className="w-6 h-6" />
                      ) : (
                        <Monitor className="w-6 h-6" />
                      )}
                    </Button>
                  )}

                  <Button
                    onClick={endCall}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

  return (
    <div className="flex h-[75vh]  bg-[#f0f2f5] dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Left sidebar - Contacts */}
      <CallModal />
      <div
        className={`${
          showMobileChat ? "hidden md:flex" : "flex"
        } w-full md:w-1/3 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative`}
      >
        {/* User header */}
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
             
              <div className="flex md:space-x-4 space-x-1 text-gray-500 dark:text-gray-400">
                 <button 
    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    onClick={() => startCall('audio')}
    disabled={!peer}
    title="Audio call"
  >
    <Phone className="w-5 h-5" />
  </button>
  <button 
    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    onClick={() => startCall('video')}
    disabled={!peer}
    title="Video call"
  >
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
 
         
 
         
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900">
           
          </div>
        )}
 
       
      </div>
    </div>
  );
};
 
export default Chat;
  