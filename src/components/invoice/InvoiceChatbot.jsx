import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { Minimize2, Send, X, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const InvoiceChatbot = ({ isOpen, onClose, uploadedFiles, onExtractedData }) => {
  const initialMessage = {
    id: 1,
    text: "Hello! I'm your invoice assistant. I'll analyze this document and extract the key information for you.",
    sender: "bot",
    timestamp: new Date(),
  };

  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([initialMessage]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState({
    invoiceNumber: null,
    invoiceDate: null,
    supplierName: null,
    invoiceAmount: null,
    invoiceCurrency: null,
  });
  const [showApplyButton, setShowApplyButton] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && uploadedFiles.length > 0 && messages.length === 1) {
      extractAllInformation();
    }
  }, [isOpen, uploadedFiles]);

  const cleanResponse = (response, field) => {
    if (response === null || response === undefined) return null;
    
    // Check if response contains "data not found" or similar
    if (typeof response === "string" && 
        (response.toLowerCase().includes("data not found") || 
        response.toLowerCase().includes("not found") ||
        response.trim() === "")) {
      return null;
    }

    let cleaned = typeof response === "string" ? response : JSON.stringify(response);
    cleaned = cleaned.trim();

    if (cleaned === "") return null;

    switch (field) {
      case "invoiceNumber":
        cleaned = cleaned.replace(/^(invoice\s*#?|no\.?)\s*/i, "").trim();
        break;
      case "invoiceDate":
        try {
          const dateMatch = cleaned.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (dateMatch) {
            const [, day, month, year] = dateMatch;
            return `${year}-${month}-${day}`;
          }

          const months = {
            jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
            jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
          };

          const altDateMatch = cleaned.match(/(\d{1,2})[-/](\w{3})[-/](\d{4})/i);
          if (altDateMatch) {
            const [, day, month, year] = altDateMatch;
            return `${year}-${months[month.toLowerCase().substring(0, 3)]}-${day.padStart(2, "0")}`;
          }

          const date = new Date(cleaned);
          return !isNaN(date) ? date.toISOString().split("T")[0] : null;
        } catch (e) {
          return null;
        }
      case "invoiceAmount":
        cleaned = cleaned.replace(/[^\d.-]/g, ""); // Remove non-numeric characters
        break;
      case "invoiceCurrency":
        // Keep only currency code or symbol
        cleaned = cleaned.replace(/[^A-Za-z$€£¥]/g, "").toUpperCase();
        break;
    }
    
    return cleaned || null;
  };

  const extractAllInformation = async () => {
    setIsLoading(true);

    try {
      const questionMap = [
        {
          question: "Extract only the invoice number without any other text. If not found, return null.",
          field: "invoiceNumber",
        },
        {
          question: "Extract only the invoice date in DD/MM/YYYY format without any other text. If not found, return null.",
          field: "invoiceDate",
        },
        {
          question: "Extract only the supplier name without any other text. If not found, return null.",
          field: "supplierName",
        },
        {
          question: "Extract only the invoice currency code (like USD, EUR) without any other text. If not found, return null.",
          field: "invoiceCurrency",
        },
        {
          question: "Extract only the invoice amount as a number without any currency symbols or other text. If not found, return null.",
          field: "invoiceAmount",
        },
      ];

      let currentData = { ...extractedData };

      for (const { question, field } of questionMap) {
        try {
          const formData = new FormData();
          formData.append("File", uploadedFiles[0].file);
          formData.append("Question", question);

          const response = await axios.post("https://apps.istreams-erp.com:4493/api/SmartAsk/ask-from-file", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          const responseData = response?.data ?? null;
          const cleanedData = cleanResponse(responseData, field);
          
          // Only update if we got valid data
          if (cleanedData !== null) {
            currentData = { ...currentData, [field]: cleanedData };
          }
        } catch (err) {
          console.error(`Error processing ${field}:`, err);
        }
      }

      setExtractedData(currentData);
      setShowApplyButton(true);

      const summaryMessage = {
        id: Date.now(),
        sender: "bot",
        timestamp: new Date(),
        text:
          "I've analyzed the document. Here's what I found:\n\n" +
          `• Invoice Number: ${currentData.invoiceNumber || "Not found"}\n` +
          `• Invoice Date: ${currentData.invoiceDate || "Not found"}\n` +
          `• Supplier: ${currentData.supplierName || "Not found"}\n` +
          `• Amount: ${currentData.invoiceAmount || "Not found"} ${currentData.invoiceCurrency || ""}\n\n` +
          "You can ask me questions about it or apply this data to your form.",
      };

      setMessages((prev) => [...prev, summaryMessage]);
    } catch (err) {
      console.error("General error processing file:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "Sorry, I encountered an error while analyzing the document. Please try again or ask a specific question about the document.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const newMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      if (uploadedFiles.length > 0) {
        formData.append("File", uploadedFiles[0].file);
        formData.append("Question", inputMessage);
      }

      const response = await axios.post("https://apps.istreams-erp.com:4491/api/OpenAI/ask-from-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const responseText = response?.data ? String(response.data) : "No response received";

      // Check if the response contains any of our field data and update extractedData
      const updatedData = { ...extractedData };
      let shouldUpdate = false;

      // Check for invoice number
      if (inputMessage.toLowerCase().includes("invoice number")) {
        const cleaned = cleanResponse(responseText, "invoiceNumber");
        if (cleaned !== null) {
          updatedData.invoiceNumber = cleaned;
          shouldUpdate = true;
        }
      }
      // Check for invoice date
      else if (inputMessage.toLowerCase().includes("invoice date")) {
        const cleaned = cleanResponse(responseText, "invoiceDate");
        if (cleaned !== null) {
          updatedData.invoiceDate = cleaned;
          shouldUpdate = true;
        }
      }
      // Check for supplier name
      else if (inputMessage.toLowerCase().includes("supplier") || inputMessage.toLowerCase().includes("vendor")) {
        const cleaned = cleanResponse(responseText, "supplierName");
        if (cleaned !== null) {
          updatedData.supplierName = cleaned;
          shouldUpdate = true;
        }
      }
      // Check for currency
      else if (inputMessage.toLowerCase().includes("currency")) {
        const cleaned = cleanResponse(responseText, "invoiceCurrency");
        if (cleaned !== null) {
          updatedData.invoiceCurrency = cleaned;
          shouldUpdate = true;
        }
      }
      // Check for amount
      else if (inputMessage.toLowerCase().includes("amount") || inputMessage.toLowerCase().includes("total")) {
        const cleaned = cleanResponse(responseText, "invoiceAmount");
        if (cleaned !== null) {
          updatedData.invoiceAmount = cleaned;
          shouldUpdate = true;
        }
      }

      if (shouldUpdate) {
        setExtractedData(updatedData);
        setShowApplyButton(true);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: responseText,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error("Error processing file:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "Sorry, I encountered an error: " + (err.response?.data?.message || err.message),
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToForm = () => {
    if (onExtractedData) {
      onExtractedData(extractedData);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: "The extracted data has been applied to the form fields.",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
    setShowApplyButton(false);
  };

  const handleRemoveDataItem = (field) => {
    setExtractedData(prev => ({
      ...prev,
      [field]: null
    }));
  };

  const minimizeChat = () => setIsMinimized(true);
  const restoreChat = () => setIsMinimized(false);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
       <div
    className={`flex flex-col rounded-lg border border-gray-200 bg-white shadow-2xl transition-all duration-300 dark:border-gray-700 dark:bg-slate-900 ${
      isMinimized ? "h-12 w-72 " : "lg:h-[32rem] h-[28rem] w-[18rem]  sm:w-96"
    }`}
  >
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 animate-pulse rounded-full bg-green-400"></div>
            <h3 className="text-sm font-semibold">iStreams AI</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={isMinimized ? restoreChat : minimizeChat}
              className="rounded p-1 transition-colors hover:bg-white/20"
              aria-label={isMinimized ? "Restore chat" : "Minimize chat"}
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 transition-colors hover:bg-white/20"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4 dark:bg-slate-900">
              {uploadedFiles.length > 0 && (
                <div className="px-2 pb-2 text-xs text-gray-500 dark:text-gray-400">
                  {uploadedFiles[0].type.startsWith("image/") ? (
                    <span>Analyzing image: {uploadedFiles[0].name}</span>
                  ) : uploadedFiles[0].type === "application/pdf" ? (
                    <span>Analyzing PDF: {uploadedFiles[0].name}</span>
                  ) : uploadedFiles[0].type.includes("word") || uploadedFiles[0].name.endsWith(".docx") ? (
                    <span>Analyzing Word document: {uploadedFiles[0].name}</span>
                  ) : uploadedFiles[0].type === "text/plain" ? (
                    <span>Analyzing text file: {uploadedFiles[0].name}</span>
                  ) : (
                    <span className="text-orange-500">File type may not be fully supported: {uploadedFiles[0].name}</span>
                  )}
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                      message.sender === "user"
                        ? "rounded-br-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                        : message.sender === "system"
                          ? "rounded-bl-sm border border-gray-200 bg-gray-100 text-xs italic text-gray-600 shadow-sm dark:border-gray-700 dark:bg-slate-700 dark:text-gray-300"
                          : "rounded-bl-sm border border-gray-200 bg-white text-gray-800 shadow-sm dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <span
                      className={`mt-1 block text-xs ${
                        message.sender === "user"
                          ? "text-blue-100"
                          : message.sender === "system"
                            ? "text-gray-400"
                            : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}

              {showApplyButton && (
                <div className="space-y-2 transition-all duration-300">
                  <div className="grid gap-2 mb-2">
                    {extractedData.invoiceNumber !== null && (
                      <Badge className="flex items-center justify-between bg-emerald-50 px-3 py-2 text-emerald-700 transition-all duration-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <div className="flex items-center gap-2">
                          <p className="whitespace-pre-wrap p-1 rounded-full animate-pulse bg-blue-500"></p>
                          <span>Invoice No: {extractedData.invoiceNumber}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleRemoveDataItem('invoiceNumber')}
                            className="text-red-600 hover:bg-red-400 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-full p-1"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </Badge>
                    )}
                    {extractedData.invoiceDate !== null && (
                      <Badge className="flex items-center justify-between bg-emerald-50 px-3 py-2 text-emerald-700 transition-all duration-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <div className="flex items-center gap-2">
                          <p className="whitespace-pre-wrap p-1 rounded-full animate-pulse bg-blue-500"></p>
                          <span>Invoice Date: {extractedData.invoiceDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleRemoveDataItem('invoiceDate')}
                            className="text-red-600 hover:bg-red-400 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-full p-1"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </Badge>
                    )}
                    {extractedData.supplierName !== null && (
                      <Badge className="flex items-center justify-between bg-emerald-50 px-3 py-2 text-emerald-700 transition-all duration-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <div className="flex items-center gap-2">
                          <p className="whitespace-pre-wrap p-1 rounded-full animate-pulse bg-blue-500"></p>
                          <span>Supplier: {extractedData.supplierName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleRemoveDataItem('supplierName')}
                            className="text-red-600 hover:bg-red-400 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-full p-1"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </Badge>
                    )}
                    {extractedData.invoiceCurrency !== null && (
                      <Badge className="flex items-center justify-between bg-emerald-50 px-3 py-2 text-emerald-700 transition-all duration-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <div className="flex items-center gap-2">
                          <p className="whitespace-pre-wrap p-1 rounded-full animate-pulse bg-blue-500"></p>
                          <span>Currency: {extractedData.invoiceCurrency}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleRemoveDataItem('invoiceCurrency')}
                            className="text-red-600 hover:bg-red-400 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-full p-1"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </Badge>
                    )}
                    {extractedData.invoiceAmount !== null && (
                      <Badge className="flex items-center justify-between bg-emerald-50 px-3 py-2 text-emerald-700 transition-all duration-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <div className="flex items-center gap-2">
                          <p className="whitespace-pre-wrap p-1 rounded-full animate-pulse bg-blue-500"></p>
                          <span>Amount: {extractedData.invoiceAmount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleRemoveDataItem('invoiceAmount')}
                            className="text-red-600 hover:bg-red-400 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-full p-1"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={handleApplyToForm}
                    className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2 shadow-md transition-all duration-400 hover:shadow-lg hover:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
                  >
                    <p className="whitespace-pre-wrap animate-pulse">Apply to Form</p>
                  </button>
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg rounded-bl-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200">
                    <div className="flex items-center space-x-2">
                      <span>Processing...</span>
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="rounded-b-lg border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-slate-900">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about this invoice..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-600"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InvoiceChatbot;