import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, File, FileText, Image, RefreshCw, X, ZoomIn, ZoomOut } from "lucide-react";
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
};

const cleanResponse = (response, field) => {
  if (!response || typeof response !== "string" || /(no data|not found|unable|n\/a|no content)/i.test(response)) {
    return null;
  }

  let cleaned = response.trim();
  if (!cleaned) return null;

  switch (field) {
     case "invoiceNo":
      // Remove common prefixes and extract alphanumeric invoice numbers
      cleaned = cleaned.replace(/(invoice\s*number\s*is[:\-]?)\s*/i, "").trim();
      // Match various invoice number formats
      const invoicePattern = /\b([A-Z]{2,}\/[A-Z0-9]+\/[A-Z]+\/\d{4}|\d{4}-\d{4,6}|[A-Z]{2,3}-\d{4,6})\b/i;
      const fullMatch = cleaned.match(invoicePattern);
      return fullMatch ? fullMatch[0] : cleaned;
    case "invoiceDate":
    case "orderDate":
    case "paidOn":
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
    case "adjustedValue":
    case "taxableAmount":
      const amountMatch = cleaned.match(/(\d{1,3}(,\d{3})*(\.\d+)?)/);
      return amountMatch ? amountMatch[0].replace(/,/g, "") : null;

    case "invoiceCurrency":
      return cleaned.replace(/([A-Z])/g, ' $1').trim();

    case "supplierName":
      return cleaned
        .replace(/\s*\(.*?\)\s*/g, "")
        .replace(/[^a-zA-Z0-9&.,\s-]/g, "")
        .trim();

    case "trnvatNo":
      const trnMatch = cleaned.match(/(TRN|VAT|Tax\s*Reg.*?)\s*[:-\s]*\s*([A-Z0-9]+)/i);
      if (trnMatch && trnMatch[2]) return trnMatch[2];
      const vatNumberMatch = cleaned.match(/\b\d{9,15}\b/);
      return vatNumberMatch ? vatNumberMatch[0] : null;

    case "creditDays":
      const daysMatch = cleaned.match(/(\d+)\s*(day|days)/i);
      if (daysMatch) return daysMatch[1];
      const netMatch = cleaned.match(/net\s*(\d+)/i);
      if (netMatch) return netMatch[1];
      return null;

    default:
      return cleaned;
  }
};

const UploadInvoice = ({ uploadedFiles, isUploadOpen, setIsUploadOpen, onExtractedData , resetTrigger }) => {
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

  //   useEffect(() => {
  //   // Reset extraction data when resetTrigger changes
  //   resetExtractionData();
  // }, [resetTrigger]);
  useEffect(() => {
  return () => {
    // Clean up when component unmounts
    resetExtractionData();
  };
}, []);

  const extractAllInformation = async () => {
    setIsLoading(true);
    setConfidence(100);
    
    try {
      const questionMap = [
  {
    question: "Check if the document is in English. If it is merged with or written in another language, detect the language, translate the entire document to English, and extract key information in bullet points (label and value only). If the document is already in English, simply extract the key details in bullet points.",
    field: "isEnglish",
  },
  {
    question: "What is the invoice number exact it (not account number)? Look for 'Invoice Number' or 'inv no' or 'Invoice Serial Number' or similar or else just say data not found",
    field: "invoiceNo",
  },
  {
    question: "What is the exact invoice date? Look for 'Invoice Date' or similar in DD/MM/YYYY format or else just say data not found",
    field: "invoiceDate",
  },
  {
    question: "What is the supplier name? Extract only the supplier name providing the service or product remove the supplier name is only needed a supplier name or else just say data not found",
    field: "supplierName",
  },
  {
    question: "What is the invoice currency name only extract the currency name without anything else? or else just say data not found",
    field: "invoiceCurrency",
  },
  {
    question: "What is the total invoice amount or the grand total due for this invoice? Look for keywords such as 'Total Amount', 'Amount Due', 'Total Payable', 'Grand Total', 'Balance Due', 'Net Amount', 'Invoice Total', or simply 'Total' Extract the numerical or else just say data not found",
    field: "invoiceAmount",
  },
  {
    question: "What is the payment date if mentioned? Extract in DD/MM/YYYY format or else just say data not found",
    field: "paidOn",
  },
  {
    question: "What is the order number if mentioned extract the order number without anything else or else just say data not found",
    field: "orderNo",
  },
  {
    question: "What is the order date if mentioned? Extract in DD/MM/YYYY format if available or else just only say order date is not mentioned.",
    field: "orderDate",
  },
  {
    question: "What is the TRN/VAT number if mentioned? Extract only the numerical value without anything else. Look for 'TRN', 'VAT', 'Tax Registration Number' or similar or else just say data not found",
    field: "trnvatNo",
  },
  {
    question: "What is the credit period in days if mentioned? Extract only the numerical value without anything else. Look for 'Credit Days', 'Payment Terms', 'Net Days' or similar or else just say data not found",
    field: "creditDays",
  },
  {
    question: "What is the taxable amount if mentioned? Extract only the numerical value without anything else. Look for 'Taxable Amount', 'Taxable Value', 'Amount Before Tax' or similar or else just say data not found",
    field: "taxableAmount",
  },
  {
    question: "What is the country name if mentioned? only extract the country name without anything else. Look for 'Country Name', 'Country', 'Billing Country', 'Shipping Country' or similar or else just say data not found",
    field: "countryName",
  },
  {
    question: "What is the city name if mentioned? only extract the city name without anything else. Look for 'City Name', 'City', 'Billing City', 'Shipping City' or similar or else just say data not found",
    field: "cityName",
  },
  {
    question: "What is the adjusted value if any adjustments are mentioned? Extract the numerical value only if available or else just only say adjusted value is not mentioned.",
    field: "adjustedValue",
  },
];

      let currentData = { ...extractionData };
      let successfulExtractions = 0;
      let confidenceDecrement = Math.floor(100 / questionMap.length);

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

          if (cleanedData) {
            currentData = { ...currentData, [field]: cleanedData };
            successfulExtractions++;
          } else {
            setConfidence((prev) => Math.max(0, prev - confidenceDecrement));
          }
        } catch (err) {
          currentData = { ...currentData, [field]: null };
          setConfidence((prev) => Math.max(0, prev - confidenceDecrement));
        }
      }

      setExtractionData(currentData);

      if (successfulExtractions === 0) {
        setConfidence(0);
      }
    } catch (err) {
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

    const filledFields = Object.values(extractionData).filter((val) => val !== null).length - 1;
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

  console.log("extractionData", extractionData);
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
      <DialogContent className="z-[9999] h-full max-w-5xl overflow-y-scroll p-0">
        <DialogHeader className="border-b px-4 py-1">
          <DialogTitle className="text-lg font-medium">Invoice Processing</DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 grid-cols-1 sm:divide-x divide-none sm:gap-0 gap-4 sm:mb-0 mb-3 p-0">
          {/* Left Panel - Preview */}
          <div className="col-span-1 flex h-[86vh] flex-col px-2">
            <h3 className="mb-2 text-xs font-medium text-gray-500">DOCUMENT PREVIEW</h3>

            <div className="relative h-[80vh] flex-1 overflow-hidden rounded-lg bg-gray-50">
              <AnimatePresence>
                {previewFile ? (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
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
                        <div className="absolute bottom-2 right-2 z-10 flex gap-1">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              zoomOut();
                            }}
                            className="h-8 w-8 bg-white/90 p-0 shadow-sm backdrop-blur-sm"
                          >
                            <ZoomOut className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              zoomIn();
                            }}
                            className="h-8 w-8 bg-white/90 p-0 shadow-sm backdrop-blur-sm"
                          >
                            <ZoomIn className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetImageZoom();
                            }}
                            className="h-8 w-8 bg-white/90 p-0 shadow-sm backdrop-blur-sm"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <div className="flex h-8 items-center rounded-md bg-white/90 px-2 text-xs shadow-sm backdrop-blur-sm">
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
                            transition: isDraggingImage ? "none" : "transform 0.1s ease",
                            cursor: isDraggingImage ? "grabbing" : "grab",
                          }}
                        />
                      </div>
                    ) : previewFile.type === "application/pdf" ? (
                      <iframe
                        src={previewFile.previewUrl}
                        className="h-full w-full rounded border"
                        title="PDF Preview"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 p-2 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
                        {getFileIcon(previewFile.type)}
                        <p className="mt-2 text-xs font-medium">{previewFile.name}</p>
                        <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                          {previewFile.type.includes("word") ? "Word document preview not available" : "Preview not available for this file type"}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                    <Image className="mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-xs text-gray-500">No file selected</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {previewFile && (
              <div className="mt-2 flex items-center justify-between rounded-md bg-gray-50 px-2 py-1.5 text-xs dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  {getFileIcon(previewFile.type)}
                  <div>
                    <p className="max-w-[180px] truncate font-medium">{previewFile.name}</p>
                    <p className="text-[0.65rem] text-gray-500">{(previewFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - AI Extraction */}
          <div className="col-span-1 flex h-[86vh] flex-col px-2">
            <div className="flex items-center justify-between pt-0">
              <h3 className="mb-2 text-xs font-medium text-gray-500">ISTREAMS AI EXTRACTION</h3>
              <Button
                className="h-6 px-2 pt-0 pb-0 mb-1 text-[0.7rem]"
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading || !previewFile}
              >
                <RefreshCw className={cn("mr-0.5 h-2 w-2", isLoading ? "animate-spin" : "")} />
                Refresh
              </Button>
            </div>

            <div className="relative flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex h-full flex-col items-center justify-center rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="mb-2 h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent"
                  />
                  <p className="text-center text-xs text-gray-600">
                    Analyzing document with AI
                    <br />
                    <span className="text-[0.65rem] text-gray-400">This usually takes a few seconds</span>
                  </p>
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  transition={{ staggerChildren: 0.1 }}
                  className="h-full overflow-y-auto"
                >
                  <div className="space-y-3">
                    {/* Key Fields */}
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries({
                        invoiceNo: "INVOICE NO",
                        invoiceDate: "INVOICE DATE",
                        supplierName: "SUPPLIER NAME",
                        invoiceCurrency: "INVOICE CURRENCY",
                        invoiceAmount: "INVOICE AMOUNT",
                        paidOn: "PAID ON",
                        orderNo: "ORDER NO",
                        orderDate: "ORDER DATE",
                        adjustedValue: "ADJUSTED VALUE",
                        taxableAmount: "TAXABLE AMOUNT",
                        trnvatNo: "TRN VAT NO",
                        creditDays: "CREDIT DAYS",
                        countryName: "COUNTRY NAME",
                        cityName: "CITY NAME",
                        isEnglish: "IS ENGLISH",
                      }).map(([field, label], index) => (
                        <motion.div
                          key={field}
                          variants={extractionItemVariants}
                          custom={index}
                          className={cn(
                            "shadow-xs relative rounded-md border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900",
                            field === "isEnglish" ? "col-span-3" : "",
                          )}
                        >
                          {extractionData[field] && (
                            <button
                              onClick={() => removeField(field)}
                              className="absolute right-1 top-1 rounded-full p-0.5 hover:bg-gray-200"
                            >
                              <X className="h-3 w-3 text-gray-500" />
                            </button>
                          )}
                          <h4 className="mb-0.5 text-[0.65rem] font-medium text-gray-400">{label}</h4>
                          <p className="text-sm font-medium">
                            {extractionData[field] || <span className="italic text-gray-400">Data not found</span>}
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Status Card */}
                    <div className="shadow-xs rounded-md border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
                      <h4 className="mb-1 text-[0.65rem] font-medium text-gray-400">STATUS</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <div
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              confidence > 50 ? "bg-green-500" : confidence > 20 ? "bg-yellow-500" : "bg-red-500",
                            )}
                          />
                          <span className="text-xs font-medium">{confidence > 0 ? "Extraction Complete" : "No Data Found"}</span>
                        </div>
                        {confidence > 0 ? (
                          <div
                            className={cn(
                              "transmission-all rounded-full px-1.5 py-0.5 text-[0.65rem] duration-200",
                              confidence > 50
                                ? "bg-green-100 text-green-800"
                                : confidence > 20
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800",
                            )}
                          >
                            {confidence}% Confidence
                          </div>
                        ) : (
                          <div className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[0.65rem] text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                            No Confidence
                          </div>
                        )}
                      </div>

                      <div className="mt-2">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={cn(
                              "h-full",
                              confidence > 50
                                ? "bg-gradient-to-r from-green-400 to-green-600"
                                : confidence > 20
                                  ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                                  : "bg-gradient-to-r from-red-400 to-red-600",
                            )}
                            style={{ width: `${confidence}%` }}
                          />
                        </div>
                        <div className="flex items-end justify-end">
                          <Button
                            onClick={handleApplyToForm}
                            className="mt-2 h-8 w-fit animate-pulse justify-between px-2 text-xs"
                            disabled={isLoading || confidence === 0}
                          >
                            Apply To Form
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadInvoice;