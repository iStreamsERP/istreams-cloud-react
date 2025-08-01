import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2, Sparkles } from 'lucide-react';
import { callSoapService } from '@/api/callSoapService';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import axios from 'axios';
import ChartPreview from './iStCharts/ChartPreview';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
const ChatbotUI = () => {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello!",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [chartContext, setChartContext] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [chartData, setChartData] = useState(null);
  const [latestChartData, setLatestChartData] = useState(null); // Track latest AI data
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChartData = async (DashBoardID, ChartNo) => {
    try {
      const chartID = { DashBoardID, ChartNo };
      const res = await callSoapService(userData.clientURL, "BI_GetDashboard_Chart_Data", chartID);
      setChartData(res);
    } catch (error) {
      console.error("Chart data fetch failed:", error);
      setChartData({ error: "Unable to fetch chart data." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const contextStr = localStorage.getItem("chatbot_context");
      if (contextStr) {
        const context = JSON.parse(contextStr);
        setChartContext(context);

        setMessages([
          {
            id: Date.now(),
            text: `How can I help you about "${context.badgeTitle || context.chartTitle || context.UPCOMING_EVENT_HEADER}" data?`,
            sender: "bot",
            timestamp: new Date()
          }
        ]);

        if (context.source === "chart") {
          fetchChartData(context.DashBoardID, context.ChartNo);
        } else if (context.source === "badge" || context.source === "events") {
          setChartData(context.data);
          setIsLoading(false);
        }
      }
    };

    handleStorageChange();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    const loadingMsgId = Date.now() + 1;

    const loadingMessage = {
      id: loadingMsgId,
      text: "Generating...",
      sender: 'bot',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, loadingMessage]);

    const formData = new FormData();
    const blob = new Blob([JSON.stringify(chartData)], { type: 'application/json' });
    formData.append('File', blob, 'chartData.json');
    formData.append('Question', inputMessage);

    try {
      const response = await axios.post('https://apps.istreams-erp.com:4493/api/SmartAsk/ask-from-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const aiResponse = response.data;

      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingMsgId ? { ...msg, text: aiResponse } : msg
        )
      );

      setLatestChartData(aiResponse); // Save latest AI response for chart preview
    } catch (err) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === loadingMsgId
            ? { ...msg, text: "Error processing your question. " + (err.response?.data || err.message) }
            : msg
        )
      );
    }
  };

  const toggleChat = () => {
    if (isOpen) localStorage.removeItem("chatbot_context");
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const minimizeChat = () => setIsMinimized(true);
  const restoreChat = () => setIsMinimized(false);


  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        id="open-chatbot-btn"
        className="hidden"
        onClick={() => {
          const contextStr = localStorage.getItem("chatbot_context");
          if (contextStr) {
            const context = JSON.parse(contextStr);
            setChartContext(context);
            setMessages([
              {
                id: Date.now(),
                text: `How can I help you about "${context.chartTitle}" data?`,
                sender: "bot",
                timestamp: new Date(),
              },
            ]);
            fetchChartData(context.DashBoardID, context.ChartNo);
          }
          setIsOpen(true);
        }}
      />

      {!isOpen && (
        <button
          onClick={toggleChat}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-75 blur-md animate-pulse"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-50 blur-lg animate-ping"></div>
          <Sparkles className="relative z-10 h-6 w-6" />
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">1</span>
          </div>
        </button>
      )}

      {isOpen && (
        <div className={`flex flex-col bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 dark:bg-slate-900 ${isMinimized ? 'w-72 h-12' : 'w-80 h-96 sm:w-96 sm:h-[500px]'}`}>
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
              <div className="flex-1 overflow-y-auto  p-4 space-y-3 bg-gray-50 dark:bg-slate-900">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} `}>
                    <div className={`max-w-xs px-3 py-2 overflow-x-auto rounded-lg text-sm ${message.sender === 'user' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-sm border border-gray-200 rounded-bl-sm'}`}>
                      <p ><ReactMarkdown remarkPlugins={[remarkGfm]}>
        {message.text}
      </ReactMarkdown> </p>
                      <span className={`text-xs mt-1 block ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Chart Preview Button */}
                  {message.sender === 'bot' &&
                  message.id === messages[messages.length - 1].id &&
                  latestChartData && (
                    <div className="mt-2 text-right">
                      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                        <DialogTrigger asChild>
                          {/* <button
                            onClick={() => setIsPreviewOpen(true)}
                            className="mt-2 text-xs px-3 py-1 rounded-full bg-blue-500 text-white hover:bg-blue-600"
                          >
                            Chart Preview
                          </button> */}
                        </DialogTrigger>

                        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
                          <ChartPreview data={message.text} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

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
