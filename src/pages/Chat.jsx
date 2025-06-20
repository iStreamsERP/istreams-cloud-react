
import React, { useState, useEffect, useRef } from "react";
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
// 1. Updated state management for better call type detection
const [callMetadata, setCallMetadata] = useState(null); // Store call type info
const [isInitiatingCall, setIsInitiatingCall] = useState(false);
const [callHistory, setCallHistory] = useState([]);
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

// 2. Enhanced convertEmailToPeerId with better validation
const convertEmailToPeerId = (email) => {
  if (!email) return null;
  return email.replace(/[@.]/g, '_').toLowerCase();
};

const convertPeerIdToEmail = (peerId) => {
  if (!peerId || !peerId.includes('_')) return peerId + '@demo.com';
  const parts = peerId.split('_');
  if (parts.length >= 2) {
    return parts[0] + '@' + parts.slice(1).join('.');
  }
  return peerId + '@demo.com';
};
const startCall = async (type) => {
  if (!peer || !selectedUser || isInitiatingCall) {
    setCallError('Connection not ready. Please try again.');
    setShowCallError(true);
    return;
  }

  try {
    setIsInitiatingCall(true);
    setCallType(type);
    setIsInCall(true);
    setShowCallModal(true);
    setCallStatus('calling');
    setCallError(null);
    setIsRinging(true);

    console.log(`Starting ${type} call to:`, selectedUser);

    // Start playing ringtone for outgoing call
    if (ringtone) {
      ringtone.currentTime = 0;
      ringtone.play().catch(console.error);
    }

    // Get media with proper constraints based on call type
    const constraints = {
      video: type === 'video',
      audio: true
    };

    console.log('Getting user media with constraints:', constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // ENHANCED: Create call metadata with explicit call type info
    const callMetadata = {
      type: type, // 'audio' or 'video'
      timestamp: Date.now(),
      caller: userData.userName,
      callerEmail: userData.userEmail // Add caller email for better identification
    };

    // Store metadata for this call
    setCallMetadata(callMetadata);

    const recipientEmail = selectedUser.toLowerCase() + '@demo.com';
    const recipientPeerId = convertEmailToPeerId(recipientEmail);
    
    console.log('Call details:', {
      selectedUser,
      recipientEmail,
      recipientPeerId,
      myPeerId: peer.id,
      callType: type,
      metadata: callMetadata
    });
    
    setCallStatus('connecting');
    
    // Create the call with enhanced metadata
    const call = peer.call(recipientPeerId, stream, {
      metadata: callMetadata // This will be received by the incoming call handler
    });
    
    if (!call) {
      throw new Error('Failed to initiate call');
    }
    
    setCurrentCall(call);

    // Enhanced timeout handling
    const timeout = setTimeout(() => {
      if (!isCallConnected) {
        console.log('Call timeout - recipient not available');
        handleCallTimeout();
      }
    }, 30000);

    setCallTimeout(timeout);

    // Handle remote stream
    call.on('stream', (remoteStream) => {
      console.log('Received remote stream');
      handleRemoteStreamReceived(remoteStream);
    });

    // Handle call close
    call.on('close', () => {
      console.log('Call closed by remote peer');
      handleCallClosed();
    });

    // Enhanced error handling
    call.on('error', (error) => {
      console.error('Call error:', error);
      handleCallError(error);
    });

  } catch (error) {
    console.error('Error starting call:', error);
    handleCallInitError(error);
  } finally {
    setIsInitiatingCall(false);
  }
};

// 2. Update handleIncomingCall to properly detect call type from metadata
const handleIncomingCall = (call) => {
  console.log('Incoming call from peer:', call.peer);
  console.log('Call metadata:', call.metadata); // This will contain the call type
  
  // Fix: Better peer ID to username conversion
  let callerUsername;
  if (call.peer.includes('_')) {
    const callerEmail = convertPeerIdToEmail(call.peer);
    console.log('Caller email:', callerEmail);
    callerUsername = callerEmail.replace('@demo.com', '');
  } else {
    callerUsername = call.peer;
  }
  
  console.log('Caller username:', callerUsername);
  
  const callerUser = users.find(user => 
    user.user_name.toLowerCase() === callerUsername.toLowerCase()
  );
  const callerName = callerUser ? callerUser.user_name : callerUsername;
  
  // ENHANCED: Detect call type from metadata first, then from stream as fallback
  let detectedCallType = 'audio'; // Default fallback
  
  if (call.metadata && call.metadata.type) {
    // Primary method: Use metadata passed from caller
    detectedCallType = call.metadata.type;
    console.log('Call type detected from metadata:', detectedCallType);
  }
  
  setIncomingCallType(detectedCallType);
  
  // Fallback: Also check stream when it arrives (in case metadata is missing)
  call.on('stream', (remoteStream) => {
    const videoTracks = remoteStream.getVideoTracks();
    const streamBasedType = videoTracks.length > 0 ? 'video' : 'audio';
    
    // Only update if we didn't get metadata or if stream contradicts metadata
    if (!call.metadata || !call.metadata.type) {
      console.log('Updating call type based on stream:', streamBasedType);
      setIncomingCallType(streamBasedType);
    } else {
      console.log('Stream-based type:', streamBasedType, 'matches metadata type:', call.metadata.type);
    }
  });
  
  call.callerUsername = callerName;
  setIncomingCall(call);
  setShowCallModal(true);
  setCallStatus('incoming');
  
  // Play incoming call ringtone
  if (ringtone) {
    ringtone.currentTime = 0;
    ringtone.play().catch(console.error);
  }
  
  // ENHANCED: Auto-reject after 30 seconds with proper cleanup
  const autoRejectTimeout = setTimeout(() => {
    console.log('Auto-rejecting call after 30 seconds');
    rejectCall();
  }, 30000);
  
  // Store timeout reference for cleanup
  call.autoRejectTimeout = autoRejectTimeout;
};

// 3. Update answerCall to use the detected call type
const answerCall = async () => {
  if (!incomingCall) return;

  try {
    const callTypeToUse = incomingCallType || 'audio'; // Use detected type or fallback to audio
    console.log(`Answering ${callTypeToUse} call`);
    
    // Stop ringtone
    if (ringtone) {
      ringtone.pause();
      ringtone.currentTime = 0;
    }
    
    // Clear auto-reject timeout
    if (incomingCall.autoRejectTimeout) {
      clearTimeout(incomingCall.autoRejectTimeout);
    }

    // Get media with proper constraints based on detected call type
    const constraints = {
      video: callTypeToUse === 'video',
      audio: true
    };

    console.log('Answering with constraints:', constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    setCallType(callTypeToUse); // Set the call type based on what was detected
    setIsInCall(true);
    setCallStatus('connecting');

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // Answer the call with our stream
    incomingCall.answer(stream);
    setCurrentCall(incomingCall);

    // Handle remote stream
    incomingCall.on('stream', (remoteStream) => {
      console.log('Received remote stream in answer');
      handleRemoteStreamReceived(remoteStream);
    });

    incomingCall.on('close', () => {
      console.log('Answered call closed');
      handleCallClosed();
    });

    incomingCall.on('error', (error) => {
      console.error('Answer call error:', error);
      handleCallError(error);
    });

    setIncomingCall(null);
    setIncomingCallType(null);
    
  } catch (error) {
    console.error('Error answering call:', error);
    handleCallInitError(error);
    rejectCall();
  }
};

// 4. Update the rejectCall function to handle timeout cleanup
const rejectCall = () => {
  console.log('Rejecting call');
  
  if (ringtone) {
    ringtone.pause();
    ringtone.currentTime = 0;
  }
  
  if (incomingCall) {
    // Clear auto-reject timeout
    if (incomingCall.autoRejectTimeout) {
      clearTimeout(incomingCall.autoRejectTimeout);
    }
    
    // Send rejection signal
    try {
      incomingCall.close();
    } catch (error) {
      console.error('Error closing incoming call:', error);
    }
    setIncomingCall(null);
  }
  
  setIncomingCallType(null);
  setShowCallModal(false);
  setCallStatus('');
  setCallType(null);
};



// 6. Helper functions for better error handling
const handleCallTimeout = () => {
  setIsRinging(false);
  if (ringtone) {
    ringtone.pause();
    ringtone.currentTime = 0;
  }
  
  setCallStatus('no-answer');
  setCallError(`${selectedUser} didn't answer the call.`);
  setShowCallError(true);
  endCall();
};

const handleRemoteStreamReceived = (remoteStream) => {
  console.log('Remote stream received, setting up...');
  
  if (callTimeout) {
    clearTimeout(callTimeout);
    setCallTimeout(null);
  }
  
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
  
  // Start call duration timer
  setCallDuration(0);
  
  // Log call in history
  const callRecord = {
    id: Date.now(),
    user: selectedUser || incomingCall?.callerUsername,
    type: callType,
    duration: 0,
    timestamp: new Date(),
    status: 'connected'
  };
  setCallHistory(prev => [callRecord, ...prev]);
};

const handleCallClosed = () => {
  console.log('Call closed, cleaning up...');
  if (callTimeout) {
    clearTimeout(callTimeout);
    setCallTimeout(null);
  }
  setIsRinging(false);
  if (ringtone) {
    ringtone.pause();
    ringtone.currentTime = 0;
  }
  setCallStatus('ended');
  endCall();
};

const handleCallError = (error) => {
  if (callTimeout) {
    clearTimeout(callTimeout);
    setCallTimeout(null);
  }
  setIsRinging(false);
  if (ringtone) {
    ringtone.pause();
    ringtone.currentTime = 0;
  }
  setCallStatus('failed');
  
  let errorMessage = 'Failed to connect call. Please try again.';
  
  switch (error.type) {
    case 'peer-unavailable':
      errorMessage = `${selectedUser} is currently offline or unavailable.`;
      setCallStatus('offline');
      break;
    case 'network':
      errorMessage = 'Network connection issue. Please check your internet connection.';
      break;
    case 'disconnected':
      errorMessage = 'Connection lost. Please try calling again.';
      break;
    case 'call-rejected':
      errorMessage = `${selectedUser} declined the call.`;
      break;
    default:
      if (error.message) {
        errorMessage = error.message;
      }
  }
  
  setCallError(errorMessage);
  setShowCallError(true);
  endCall();
};

const handleCallInitError = (error) => {
  setIsRinging(false);
  if (ringtone) {
    ringtone.pause();
    ringtone.currentTime = 0;
  }
  setCallStatus('failed');
  
  let errorMessage = 'Failed to start call. Please try again.';
  
  switch (error.name) {
    case 'NotAllowedError':
      errorMessage = 'Camera/microphone access denied. Please allow access in your browser settings and try again.';
      break;
    case 'NotFoundError':
      errorMessage = 'Camera/microphone not found. Please check your devices and try again.';
      break;
    case 'NotReadableError':
      errorMessage = 'Camera/microphone is being used by another application. Please close other apps and try again.';
      break;
    case 'OverconstrainedError':
      errorMessage = 'Your device does not support the required video/audio format.';
      break;
    default:
      if (error.message) {
        errorMessage = error.message;
      }
  }
  
  setCallError(errorMessage);
  setShowCallError(true);
  endCall();
};


// 8. Enhanced endCall function with better cleanup
const endCall = () => {
  console.log('Ending call - comprehensive cleanup');
  
  // Stop ringtone
  setIsRinging(false);
  if (ringtone) {
    ringtone.pause();
    ringtone.currentTime = 0;
  }
  
  // Clear all timeouts
  if (callTimeout) {
    clearTimeout(callTimeout);
    setCallTimeout(null);
  }
  
  // Close current call
  if (currentCall) {
    try {
      currentCall.close();
    } catch (error) {
      console.error('Error closing current call:', error);
    }
  }

  // Stop all media streams
  if (localStream) {
    localStream.getTracks().forEach(track => {
      track.stop();
      console.log('Stopped local track:', track.kind);
    });
  }

  if (remoteStream) {
    remoteStream.getTracks().forEach(track => {
      track.stop();
      console.log('Stopped remote track:', track.kind);
    });
  }

  // Clear video elements
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
  setIncomingCallType(null);
  setCallDuration(0);
  setCallStatus('');
  setIsScreenSharing(false);
  setIsCallFullscreen(false);
  setIsVideoEnabled(true);
  setIsAudioEnabled(true);
  setCallMetadata(null);
  setIsInitiatingCall(false);
  
  console.log('Call ended and cleaned up completely');
};
const METERED_TURN_USERNAME = '6f2e2279b8d10dc28a1c792c'; 
const METERED_TURN_CREDENTIAL = 'ScGGto7DupSnIBvG'; //

// 9. Enhanced peer initialization with better error handling
const initializePeer = () => {
  if (!userData?.userEmail) {
    console.error('User email not available for peer initialization');
    return;
  }
  
  const peerId = convertEmailToPeerId(userData.userEmail.toLowerCase());
  console.log('Initializing peer:', { userEmail: userData.userEmail, peerId });
  
  // Destroy existing peer
  if (peer && !peer.destroyed) {
    peer.destroy();
  }
  
  const peerInstance = new window.Peer(peerId, {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
    debug: 1, // Reduced debug level for cleaner logs
    config: {
      'iceServers': [
        // Google STUN servers (free)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.relay.metered.ca:80' },

        
        // Metered TURN servers (replace with your actual Metered TURN URLs)
        {
          urls: 'turn:global.relay.metered.ca:80',
          username: METERED_TURN_USERNAME,
          credential: METERED_TURN_CREDENTIAL,
        },
        {
          urls: 'turn:global.relay.metered.ca:80?transport=tcp',
          username: METERED_TURN_USERNAME,
          credential: METERED_TURN_CREDENTIAL,
        },
        {
          urls: 'turn:global.relay.metered.ca:443',
          username: METERED_TURN_USERNAME,
          credential: METERED_TURN_CREDENTIAL,
        },
        {
          urls: 'turn:global.relay.metered.ca:443?transport=tcp',
          username: METERED_TURN_USERNAME,
          credential: METERED_TURN_CREDENTIAL,
        },
        
        // Alternative Metered TURN servers for redundancy
        {
          urls: 'turn:b.relay.metered.ca:80',
          username: METERED_TURN_USERNAME,
          credential: METERED_TURN_CREDENTIAL,
        },
        {
          urls: 'turn:b.relay.metered.ca:80?transport=tcp',
          username: METERED_TURN_USERNAME,
          credential: METERED_TURN_CREDENTIAL,
        },
        {
          urls: 'turn:b.relay.metered.ca:443',
          username: METERED_TURN_USERNAME,
          credential: METERED_TURN_CREDENTIAL,
        },
        {
          urls: 'turn:b.relay.metered.ca:443?transport=tcp',
          username: METERED_TURN_USERNAME,
          credential: METERED_TURN_CREDENTIAL,
        }
      ],
      // Additional ICE configuration for better connectivity
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    }
  });

  peerInstance.on('open', (id) => {
    console.log('✅ Peer connected successfully with ID:', id);
    console.log('🌐 Using Metered TURN servers for global connectivity');
    setPeer(peerInstance);
  });

  peerInstance.on('call', handleIncomingCall);

  peerInstance.on('error', (error) => {
    console.error('❌ Peer error:', error);
    
    if (error.type === 'peer-destroyed') {
      console.log('🔄 Peer destroyed, reconnecting...');
      setTimeout(() => {
        initializePeer();
      }, 2000);
    } else {
      let errorMessage = 'Connection error. Please refresh and try again.';
      if (error.type === 'unavailable-id') {
        errorMessage = 'Your session has expired. Please refresh the page.';
      }
      setCallError(errorMessage);
      setShowCallError(true);
    }
  });

  peerInstance.on('disconnected', () => {
    console.log('⚠️ Peer disconnected, attempting to reconnect...');
    setTimeout(() => {
      if (!peerInstance.destroyed) {
        peerInstance.reconnect();
      }
    }, 1000);
  });

  peerInstance.on('connection', (conn) => {
    console.log('🔗 Data connection established with:', conn.peer);
  });
};
// 10. Enhanced UI components with proper call type display

// Enhanced CallStatusDisplay with better status messages
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
      case 'incoming':
        return `Incoming ${incomingCallType || callType} call...`;
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'calling':
      case 'connecting':
      case 'incoming':
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
      {(callStatus === 'calling' || callStatus === 'connecting' || callStatus === 'incoming') && (
        <div className="flex justify-center mt-2">
          {isRinging || callStatus === 'incoming' ? (
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


// Add these state variables to track call type detection
const [incomingCallType, setIncomingCallType] = useState(null); // 'audio' or 'video'



// 4. Fixed answerCall function 

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

const AudioVideoElement = ({ stream, muted = false, className = "", isAudioOnly = false }) => {
  const videoRef = useRef(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = muted;
      
      // For audio-only calls, ensure audio plays
      if (isAudioOnly && !muted) {
        videoRef.current.volume = 1.0;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [stream, muted, isAudioOnly]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`${className} ${isAudioOnly ? 'hidden' : ''}`}
      style={{ 
        width: '100%', 
        height: '100%',
        objectFit: 'cover'
      }}
    />
  );
};
const CallModalIncomingSection = () => {
  const getCallTypeIcon = (type) => {
    return type === 'audio' ? Phone : VideoIcon;
  };

  const getCallTypeLabel = (type) => {
    return type === 'audio' ? 'Audio Call' : 'Video Call';
  };

  const getGradientClass = (type) => {
    return type === 'audio' 
      ? 'from-green-500 to-blue-600' 
      : 'from-blue-500 to-purple-600';
  };

  // Only render if there's an incoming call and we're not in a call yet
  if (!incomingCall || isInCall) return null;

  return (
    <div className={`p-8 text-center bg-gradient-to-br ${getGradientClass(incomingCallType)} text-white rounded-lg`}>
      <div className="mb-6">
        {/* Dynamic call type icon */}
        <div className="relative mx-auto w-24 h-24 mb-6 bg-white/20 rounded-full flex items-center justify-center">
          {React.createElement(getCallTypeIcon(incomingCallType), {
            className: "w-12 h-12 text-white animate-pulse"
          })}
          <div className="absolute inset-0 rounded-full border-4 border-white opacity-30 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-4 border-white opacity-20 animate-ping" style={{animationDelay: '0.5s'}}></div>
        </div>

        <h3 className="text-2xl font-bold mb-2">
          {incomingCall.callerUsername || 'Unknown User'}
        </h3>
        <p className="text-white/80 text-lg mb-2 flex items-center justify-center">
          {React.createElement(getCallTypeIcon(incomingCallType), {
            className: "w-5 h-5 mr-2"
          })}
          Incoming {getCallTypeLabel(incomingCallType).toLowerCase()}...
        </p>
        
        {/* Enhanced status display */}
        <div className="flex justify-center items-center space-x-2 mb-4">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      
        {/* Debug info (remove in production) */}
        {incomingCall.metadata && (
          <div className="text-white/40 text-xs mb-2">
            Detected: {incomingCall.metadata.type || 'unknown'} call
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-center space-x-8">
        <button
          onClick={rejectCall}
          className="bg-red-500 hover:bg-red-600 text-white rounded-full p-6 shadow-lg transform hover:scale-105 transition-all duration-200"
          title={`Decline ${incomingCallType} call`}
        >
          <PhoneOff className="w-8 h-8" />
        </button>
        <button
          onClick={answerCall}
          className="bg-green-500 hover:bg-green-600 text-white rounded-full p-6 shadow-lg transform hover:scale-105 transition-all duration-200 animate-pulse"
          title={`Answer ${incomingCallType} call`}
        >
          {React.createElement(getCallTypeIcon(incomingCallType), {
            className: "w-8 h-8"
          })}
        </button>
      </div>
    </div>
  );
};

// Updated CallModal component - cleaned up with single incoming call UI
const CallModal = () => {
  if (!showCallModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${
        isCallFullscreen ? 'w-full h-full' : 'w-96 max-w-lg'
      }`}>
        
        {/* Incoming Call UI - Using the single component */}
        <CallModalIncomingSection />

        {/* Active call UI */}
        {isInCall && (
          <div className={`relative ${isCallFullscreen ? 'h-full' : 'h-96'}`}>
            {/* Call header */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
              <div className="flex justify-between items-center text-white">
                <div className="flex items-center space-x-2">
                  {callType === 'audio' && <Phone className="w-5 h-5" />}
                  {callType === 'video' && <VideoIcon className="w-5 h-5" />}
                  <div>
                    <h3 className="font-semibold text-lg">{selectedUser}</h3>
                    <CallStatusDisplay />
                  </div>
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
                </div>
              </div>
            </div>

            {/* Video streams with proper audio handling */}
            {callType === 'video' && (
              <div className="relative w-full h-full bg-gray-900">
                {/* Remote video with audio */}
                <AudioVideoElement 
                  stream={remoteStream}
                  muted={false}
                  className="w-full h-full object-cover"
                />
                
                {/* Local video (muted to prevent echo) */}
                <div className="absolute bottom-20 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden">
                  <AudioVideoElement 
                    stream={localStream}
                    muted={true}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Call status overlay */}
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

            {/* Audio call UI */}
            {callType === 'audio' && (
              <div className="relative w-full h-full">
                {/* Hidden audio element for audio-only calls */}
                {remoteStream && (
                  <AudioVideoElement 
                    stream={remoteStream}
                    muted={false}
                    className="hidden"
                  />
                )}
                
                <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-green-500 to-blue-600 text-white">
                  {/* Audio call icon */}
                 
                  
                  <div className="relative mb-8">
                    <Avatar className="w-40 h-40 border-4 border-white shadow-lg">
                      <AvatarImage src={selectedUserImage} />
                      <AvatarFallback className="bg-white/20 text-white text-5xl font-bold">
                        {selectedUser?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <h3 className="text-3xl font-bold mb-2">{selectedUser}</h3>
                  <p className="text-white/80 text-lg mb-4 flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    Audio Call
                  </p>
                 
                </div>
              </div>
            )}

            {/* Call controls */}
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
  