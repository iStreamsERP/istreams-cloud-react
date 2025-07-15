import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  File,
  FileText,
  Image,
  RefreshCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useState } from "react";

const getFileIcon = (fileType) => {
  if (fileType.startsWith("image/")) {
    return <Image className="h-6 w-6 text-blue-500" />;
  } else if (fileType === "application/pdf") {
    return <FileText className="h-6 w-6 text-red-500" />;
  } else if (fileType.includes("word") || fileType.includes("document")) {
    return <FileText className="h-6 w-6 text-blue-600" />;
  } else if (fileType === "text/plain") {
    return <FileText className="h-6 w-6 text-green-500" />;
  }
  return <File className="h-6 w-6 text-gray-500" />;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      when: "beforeChildren",
    },
  },
};

const previewVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: { opacity: 0, scale: 0.9 },
};

const extractionItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: "easeOut",
    },
  }),
  hover: {
    y: -2,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    transition: { duration: 0.2 },
  },
};

const statusBarVariants = {
  initial: { width: 0 },
  animate: {
    width: "100%",
    transition: { duration: 1, ease: "easeInOut" },
  },
};

const UploadInvoice = ({
  uploadedFiles,
  isUploadOpen,
  setIsUploadOpen,
  onExtractedData,
  resetTrigger,
}) => {
  const [previewFile, setPreviewFile] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [extractionData, setExtractionData] = useState({
    invoiceNo: null,
    invoiceDate: null,
    invoiceCurrency: null,
    supplierName: null,
    invoiceAmount: null,
    paidOn: null,
    orderNo: null,
    orderDate: null,
    adjustedValue: null,
    taxableAmount: null,
    creditDays: null,
    trnvatNo: null,
    isEnglish: null,
    countryName: null,
    cityName: null,
  });
  const [confidence, setConfidence] = useState(0);
  const [isHoveringApply, setIsHoveringApply] = useState(false);

  useEffect(() => {
    if (uploadedFiles.length > 0 && isUploadOpen) {
      setPreviewFile(uploadedFiles[0]);
      resetImageZoom();
      if (isUploadOpen) {
        extractAllInformation();
      }
    } else {
      setPreviewFile(null);
    }
  }, [uploadedFiles, isUploadOpen]);

  useEffect(() => {
    resetExtractionData();
  }, [resetTrigger]);

  useEffect(() => {
    return () => {
      resetExtractionData();
    };
  }, []);

  const extractAllInformation = async () => {
    setIsLoading(true);
    setConfidence(0);

    try {
      const question = `Analyze the uploaded document and return the result in JSON format with the following structure:
      Extract the following fields:
      - invoiceNo: The invoice number
      - invoiceDate: The invoice date in YYYY-MM-DD format
      - invoiceCurrency: The currency used in the invoice incase the is symbol is used convert into words related to this         
        Australian Dollar
        Bahraini Dinar
        Canadian Dollar
        Cyprus Pounds
        KR0NE
        Egp Pounds
        EURO
        Franc
        Deutsche Mark
        Hong Kong Dollar
        Indian Rupees
        Lira
        Jordanian Dinars
        Kuwaiti Dinar
        Lebanon Pounds
        Ringgit
        Nepalese Rupee
        Oman Riyal
        Peso
        Polish Zloty
        Qatari Riyal
        Saudi Riyal
        Singapore Dollar
        Srilankan Rupees
        Swiss Franks
        Taiwan Dollar
        Baht
        Dhirams
        GB Pounds
        US Dollars
        or else return the same 
      - invoiceAmount: The total invoice amount need an exact amount
      - paidOn: The payment date in YYYY-MM-DD format
      - supplierName: The name of the supplier
      - taxableAmount: The taxable amount
      - creditDays: The credit days mentioned convert in to days
      - country: The country mentioned
      - city: The city mentioned
      - orderNo: The order/PO/PLO number
      - orderDate: The order/PO/PLO date in YYYY-MM-DD format
      - trnVatNo: The TRN/VAT number
      - adjustedValue: Any adjusted value or adjustment
      - isEnglish: extract the invoice language in English.

      Return only the JSON object in this exact format:
      {
        "invoiceNo": "",
        "invoiceDate": "",
        "invoiceAmount": "",
        "invoiceCurrency": "",
        "paidOn": "",
        "taxableAmount": "",
        "trnVatNo": "",
        "creditDays": "",
        "orderNo": "",
        "orderDate": "",
        "country": "",
        "city": "",
        "supplierName": "",
        "adjustedValue": "",
        "isEnglish": ""
      }`;

      const formData = new FormData();
      formData.append("File", uploadedFiles[0].file);
      formData.append("Question", question);

      const response = await axios.post(
        "https://apps.istreams-erp.com:4493/api/SmartAsk/ask-from-file",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      try {
        let jsonResponse;
        if (typeof response.data === "string") {
          const cleanedResponse = response.data
            .replace(/```json|```/g, "")
            .replace(/^.*?\{/, "{")
            .replace(/\}.*?$/, "}");
          jsonResponse = JSON.parse(cleanedResponse.trim());
        } else {
          jsonResponse = response.data;
        }

        if (jsonResponse && typeof jsonResponse === "object") {
          let isEnglishValue = null;
          if (jsonResponse.isEnglish) {
            if (typeof jsonResponse.isEnglish === "string") {
              if (jsonResponse.isEnglish.toLowerCase().includes("false")) {
                const langMatch = jsonResponse.isEnglish.match(
                  /language:\s*([a-zA-Z]+)/i
                );
                isEnglishValue = langMatch
                  ? `Not English (${langMatch[1]})`
                  : "Not English";
              } else {
                isEnglishValue = "English";
              }
            } else if (typeof jsonResponse.isEnglish === "boolean") {
              isEnglishValue = jsonResponse.isEnglish
                ? "English"
                : "Not English";
            }
          }

          const filledFields = Object.values(jsonResponse).filter(
            (val) =>
              val !== null && val !== undefined && val !== "" && val !== "null"
          ).length;

          const totalFields = Object.keys(jsonResponse).length;
          const newConfidence = Math.round((filledFields / totalFields) * 100);

          setExtractionData((prev) => ({
            ...prev,
            invoiceNo: jsonResponse.invoiceNo || null,
            invoiceDate: jsonResponse.invoiceDate || null,
            invoiceCurrency: jsonResponse.invoiceCurrency || null,
            supplierName: jsonResponse.supplierName || null,
            invoiceAmount: jsonResponse.invoiceAmount || null,
            paidOn: jsonResponse.paidOn || null,
            orderNo: jsonResponse.orderNo || null,
            orderDate: jsonResponse.orderDate || null,
            taxableAmount: jsonResponse.taxableAmount || null,
            creditDays: jsonResponse.creditDays || null,
            trnvatNo: jsonResponse.trnVatNo || null,
            countryName: jsonResponse.country || null,
            cityName: jsonResponse.city || null,
            adjustedValue: jsonResponse.adjustedValue || null,
            isEnglish: isEnglishValue || null,
          }));

          setConfidence(newConfidence);
        } else {
          setConfidence(0);
        }
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
        setConfidence(0);
      }
    } catch (err) {
      console.error("Extraction error:", err);
      setConfidence(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToForm = () => {
    if (onExtractedData) {
      onExtractedData({
        invoiceNo: extractionData.invoiceNo,
        invoiceDate: extractionData.invoiceDate,
        supplierName: extractionData.supplierName,
        invoiceAmount: extractionData.invoiceAmount,
        invoiceCurrency: extractionData.invoiceCurrency,
        paidOn: extractionData.paidOn,
        orderNo: extractionData.orderNo,
        orderDate: extractionData.orderDate,
        adjustedValue: extractionData.adjustedValue,
        taxableAmount: extractionData.taxableAmount,
        creditDays: extractionData.creditDays,
        trnvatNo: extractionData.trnvatNo,
        countryName: extractionData.countryName,
        cityName: extractionData.cityName,
      });
    }
    setIsUploadOpen(false);
  };

  const handleImageZoom = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newZoom = Math.min(Math.max(0.5, imageZoom + delta), 3);
    setImageZoom(newZoom);
  };

  const handleDragStart = (e) => {
    setIsDraggingImage(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y,
    });
  };

  const handleDragging = (e) => {
    if (!isDraggingImage) return;
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleDragEnd = () => {
    setIsDraggingImage(false);
  };

  const resetImageZoom = () => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
    setExtractionData({
      invoiceNo: null,
      invoiceDate: null,
      invoiceCurrency: null,
      supplierName: null,
      invoiceAmount: null,
      paidOn: null,
      orderNo: null,
      orderDate: null,
      adjustedValue: null,
      taxableAmount: null,
      creditDays: null,
      trnvatNo: null,
      isEnglish: null,
      countryName: null,
      cityName: null,
    });
    setConfidence(0);
  };

  const zoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 0.1, 3));
  };

  const zoomOut = () => {
    setImageZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  const removeField = (fieldName) => {
    setExtractionData((prev) => ({
      ...prev,
      [fieldName]: null,
    }));

    const filledFields =
      Object.values(extractionData).filter((val) => val !== null).length - 1;
    const totalFields = Object.keys(extractionData).length;
    setConfidence(Math.round((filledFields / totalFields) * 100));
  };

  const handleRefresh = () => {
    setExtractionData({
      invoiceNo: null,
      invoiceDate: null,
      invoiceCurrency: null,
      supplierName: null,
      invoiceAmount: null,
      paidOn: null,
      orderNo: null,
      orderDate: null,
      adjustedValue: null,
      taxableAmount: null,
      creditDays: null,
      trnvatNo: null,
      isEnglish: null,
      countryName: null,
      cityName: null,
    });
    setConfidence(0);
    extractAllInformation();
  };

  const resetExtractionData = () => {
    setExtractionData({
      invoiceNo: null,
      invoiceDate: null,
      invoiceCurrency: null,
      supplierName: null,
      invoiceAmount: null,
      paidOn: null,
      orderNo: null,
      orderDate: null,
      adjustedValue: null,
      taxableAmount: null,
      creditDays: null,
      trnvatNo: null,
      isEnglish: null,
      countryName: null,
      cityName: null,
    });
    setConfidence(0);
  };

  const getSortedFields = () => {
    const fields = [
      { field: "invoiceNo", label: "INVOICE NO" },
      { field: "invoiceDate", label: "INVOICE DATE" },
      { field: "supplierName", label: "SUPPLIER NAME" },
      { field: "invoiceCurrency", label: "INVOICE CURRENCY" },
      { field: "invoiceAmount", label: "INVOICE AMOUNT" },
      { field: "paidOn", label: "PAID ON" },
      { field: "orderNo", label: "ORDER NO" },
      { field: "orderDate", label: "ORDER DATE" },
      { field: "adjustedValue", label: "ADJUSTED VALUE" },
      { field: "taxableAmount", label: "TAXABLE AMOUNT" },
      { field: "trnvatNo", label: "TRN VAT NO" },
      { field: "creditDays", label: "CREDIT DAYS" },
      { field: "countryName", label: "COUNTRY NAME" },
      { field: "cityName", label: "CITY NAME" },
      { field: "isEnglish", label: "LANGUAGE" },
    ];

    return fields.sort((a, b) => {
      const aHasData = extractionData[a.field] !== null;
      const bHasData = extractionData[b.field] !== null;
      if (aHasData && !bHasData) return -1;
      if (!aHasData && bHasData) return 1;
      return 0;
    });
  };

  return (
    <Dialog
      open={isUploadOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetExtractionData();
        }
        setIsUploadOpen(open);
      }}
      className="z-[9999]"
    >
      <DialogContent className="z-[9999] h-full max-w-6xl overflow-y-scroll p-0">
        <DialogHeader className="border-b px-6 py-3">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DialogTitle className="text-xl font-semibold text-gray-800 dark:text-white">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Invoice Processing
              </span>
            </DialogTitle>
          </motion.div>
        </DialogHeader>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid sm:grid-cols-2 grid-cols-1 sm:divide-x divide-none sm:gap-0 gap-4 sm:mb-0 mb-3 p-0"
        >
          {/* Left Panel - Preview */}
          <div className="col-span-1 flex h-[86vh] flex-col px-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between mb-2"
            >
              <h3 className="text-sm font-medium text-gray-500 flex items-center">
                <span className="mr-2 h-2 w-2 rounded-full bg-blue-500"></span>
                DOCUMENT PREVIEW
              </h3>
            </motion.div>

            <div className="relative h-[80vh] flex-1 overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 shadow-inner dark:from-gray-800 dark:to-gray-900">
              <AnimatePresence mode="wait">
                {previewFile ? (
                  <motion.div
                    key="preview-content"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={previewVariants}
                    className="h-full w-full"
                  >
                    {previewFile.type.startsWith("image/") ? (
                      <div
                        className="relative h-full w-full cursor-move overflow-hidden"
                        onWheel={handleImageZoom}
                        onMouseDown={handleDragStart}
                        onMouseMove={handleDragging}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                      >
                        <div className="absolute bottom-3 right-3 z-10 flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              zoomOut();
                            }}
                            className="h-9 w-9 flex items-center justify-center rounded-full bg-white/90 p-0 shadow-md backdrop-blur-sm border border-gray-200"
                          >
                            <ZoomOut className="h-4 w-4 text-gray-700" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              zoomIn();
                            }}
                            className="h-9 w-9 flex items-center justify-center rounded-full bg-white/90 p-0 shadow-md backdrop-blur-sm border border-gray-200"
                          >
                            <ZoomIn className="h-4 w-4 text-gray-700" />
                          </motion.button>
                          <div className="flex h-9 items-center rounded-full bg-white/90 px-3 text-sm font-medium shadow-md backdrop-blur-sm border border-gray-200">
                            {Math.round(imageZoom * 100)}%
                          </div>
                        </div>

                        <motion.img
                          src={previewFile.previewUrl}
                          alt="Preview"
                          className="mx-auto max-h-[calc(100%-1rem)] max-w-full object-contain"
                          style={{
                            transform: `scale(${imageZoom}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                            transformOrigin: "center center",
                            transition: isDraggingImage
                              ? "none"
                              : "transform 0.1s ease",
                            cursor: isDraggingImage ? "grabbing" : "grab",
                          }}
                        />
                      </div>
                    ) : previewFile.type === "application/pdf" ? (
                      <iframe
                        src={previewFile.previewUrl}
                        className="h-full w-full rounded border-0"
                        title="PDF Preview"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center rounded-lg p-2">
                        {getFileIcon(previewFile.type)}
                        <p className="mt-3 text-sm font-medium">
                          {previewFile.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {previewFile.type.includes("word")
                            ? "Word document preview not available"
                            : "Preview not available for this file type"}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full flex-col items-center justify-center rounded-lg p-4"
                  >
                    <div className="mb-4 rounded-full bg-gray-200/50 p-4 dark:bg-gray-700/50">
                      <Image className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No file selected</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload or drag & drop a file to preview
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {previewFile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-3 flex items-center justify-between rounded-lg bg-gray-100 px-3 py-1 text-sm backdrop-blur-sm dark:bg-gray-900/50"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-100 p-2 shadow-xs dark:bg-gray-800">
                    {getFileIcon(previewFile.type)}
                  </div>
                  <div>
                    <p className="max-w-[180px] truncate font-medium">
                      {previewFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(previewFile.size / 1024).toFixed(2)} KB •{" "}
                      {previewFile.type}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Panel - AI Extraction */}
          <div className="col-span-1 flex h-[86vh] flex-col px-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between pt-0"
            >
              <h3 className="text-sm font-medium text-gray-500 flex items-center">
                <span className="mr-2 h-2 w-2 rounded-full bg-purple-500"></span>
                AI DATA EXTRACTION
              </h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={isLoading || !previewFile}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium",
                  isLoading || !previewFile
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                )}
              >
                <RefreshCw
                  className={cn("h-3 w-3", isLoading ? "animate-spin" : "")}
                />
                {isLoading ? "Processing..." : "Re-extract"}
              </motion.button>
            </motion.div>

            <div className="relative flex-1 overflow-hidden">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full flex-col items-center justify-center rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900"
                >
                  <motion.div
                    animate={{
                      rotate: 360,
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "easeInOut",
                    }}
                    className="mb-4 h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent"
                  />
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-sm font-medium text-gray-600"
                  >
                    Analyzing document with AI
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-xs text-gray-400 mt-1"
                  >
                    Extracting invoice details...
                  </motion.p>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    transition={{
                      delay: 0.7,
                      duration: 1.5,
                      ease: "easeInOut",
                    }}
                    className="mt-4 h-1.5 rounded-full bg-gray-200 overflow-hidden"
                  >
                    <div className="h-full w-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                  className="h-full overflow-y-auto pr-1 mt-3 pb-5"
                >
                  <div className="space-y-4">
                    {/* Key Fields */}
                    <motion.div
                      className="grid grid-cols-1 sm:grid-cols-3  gap-3"
                      variants={containerVariants}
                    >
                      {getSortedFields().map(({ field, label }, index) => (
                        <motion.div
                          key={field}
                          variants={extractionItemVariants}
                          custom={index}
                          whileHover="hover"
                          className={cn(
                            "relative rounded-lg border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900",
                            extractionData[field]
                              ? "border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10"
                              : ""
                          )}
                        >
                          {extractionData[field] && (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeField(field)}
                              className="absolute right-2 top-2 rounded-full p-0.5 hover:bg-gray-200/50 dark:hover:bg-gray-700"
                            >
                              <X className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                            </motion.button>
                          )}
                          <h4 className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                            {label}
                          </h4>
                          <p
                            className={cn(
                              "text-sm font-medium truncate",
                              extractionData[field]
                                ? "text-gray-800 dark:text-white"
                                : "italic text-gray-400 dark:text-gray-500"
                            )}
                          >
                            {extractionData[field] || "Not found"}
                          </p>
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* Status Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="rounded-xl border  border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Extraction Summary
                      </h4>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              confidence > 70
                                ? "bg-green-500 animate-pulse"
                                : confidence > 40
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            )}
                          />
                          <span className="text-sm font-medium">
                            {confidence > 70
                              ? "High Confidence"
                              : confidence > 40
                              ? "Medium Confidence"
                              : confidence > 0
                              ? "Low Confidence"
                              : "No Data Found"}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            confidence > 70
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : confidence > 40
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : confidence > 0
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          {confidence > 0
                            ? `${confidence}% Confidence`
                            : "Not Available"}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${confidence}%` }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className={cn(
                              "h-full",
                              confidence > 70
                                ? "bg-gradient-to-r from-green-400 to-green-600"
                                : confidence > 40
                                ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                                : confidence > 0
                                ? "bg-gradient-to-r from-red-400 to-red-600"
                                : "bg-gray-300"
                            )}
                          />
                        </div>
                      </div>

                      <motion.div
                        onHoverStart={() => setIsHoveringApply(true)}
                        onHoverEnd={() => setIsHoveringApply(false)}
                        className="flex justify-end"
                      >
                        <motion.button
                          onClick={handleApplyToForm}
                          disabled={isLoading || confidence === 0}
                          className={cn(
                            "flex items-center justify-center gap-1 rounded-full px-4 py-2 text-xs font-medium shadow-md",
                            isLoading || confidence === 0
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg"
                          )}
                          whileHover={
                            !isLoading && confidence > 0
                              ? {
                                  scale: 1.03,
                                  boxShadow:
                                    "0 4px 15px rgba(99, 102, 241, 0.3)",
                                }
                              : {}
                          }
                          whileTap={
                            !isLoading && confidence > 0 ? { scale: 0.97 } : {}
                          }
                        >
                          Apply to Form
                          <motion.div
                            animate={{
                              x: isHoveringApply ? 3 : 0,
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 15,
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </motion.div>
                        </motion.button>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadInvoice;
