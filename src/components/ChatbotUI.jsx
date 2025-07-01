import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { callSoapService } from '@/services/callSoapService';
import { useAuth } from '@/contexts/AuthContext';
const ChatbotUI = () => {
  const { userData } = useAuth()
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
    
        const chartID = { DashBoardID: 1, ChartNo: 1 };
        const res = await callSoapService(userData.clientURL, "BI_GetDashboard_Chart_Data", chartID);
        console.log("bot:", res);

        setChartData(res);
      } catch (error) {
        console.error("Chart data fetch failed:", error);
        setChartData({ error: "Unable to fetch chart data." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');

    // Simulate bot response
    setTimeout(() => {
      let botReply = "I'm here to help you. Try asking about chart data!";

     if (chartData) {
  if (chartData.error) {
    botReply = "Sorry, I couldn't load the dashboard data.";
  } else if (inputMessage.toLowerCase().includes("chart") || inputMessage.toLowerCase().includes("data")) {
   botReply = Array.isArray(chartData)
  ? chartData.map((item, index) => {
      if (typeof item === 'object') {
        return `Item ${index + 1}:\n${Object.entries(item)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join('\n')}`;
      } else {
        return `Item ${index + 1}: ${item}`;
      }
    }).join('\n\n')
  : Object.entries(chartData)
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}:\n${Object.entries(value)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join('\n')}`;
        } else {
          return `${key}: ${value}`;
        }
      }).join('\n');

  }
}
 else if (isLoading) {
        botReply = "I'm still loading chart data. Please wait a moment.";
      }

      const botResponse = {
        id: Date.now() + 1,
        text: botReply,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const minimizeChat = () => setIsMinimized(true);
  const restoreChat = () => setIsMinimized(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-75 blur-md animate-pulse"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-50 blur-lg animate-ping"></div>
          <MessageCircle className="relative z-10 h-6 w-6" />
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">1</span>
          </div>
        </button>
      )}

      {isOpen && (
        <div className={`flex flex-col bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 dark:bg-slate-900 ${
          isMinimized ? 'w-72 h-12' : 'w-80 h-96 sm:w-96 sm:h-[500px]'
        }`}>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-sm">iStreams AI</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={isMinimized ? restoreChat : minimizeChat} className="p-1 hover:bg-white/20 rounded transition-colors">
                <Minimize2 className="h-4 w-4" />
              </button>
              <button onClick={toggleChat} className="p-1 hover:bg-white/20 rounded transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-slate-900">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-800 shadow-sm border border-gray-200 rounded-bl-sm'
                    }`}>
                      <p>{message.text}</p>
                      <span className={`text-xs mt-1 block ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg dark:bg-slate-900">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm dark:bg-slate-900"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatbotUI;
