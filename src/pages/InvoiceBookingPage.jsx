import { callSoapService } from "@/api/callSoapService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronsUpDown,
  File,
  FileText,
  Globe,
  Image,
  Loader,
  MapPin,
  Printer,
  Save,
  Sparkles,
  Upload,
  UserCircle,
  UserRound,
  X
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate, useParams } from "react-router-dom";

// Components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { convertDataModelToStringData } from "@/utils/dataModelConverter";
import { convertServiceDate } from "@/utils/dateUtils";
import InvoiceChatbot from "../components/invoice/InvoiceChatbot";
import OrderTracking from "../components/invoice/OrderTracking";
import UploadInvoice from "../components/invoice/UploadInvoice";

const ACCEPTED_FILE_TYPES = {
  "image/*": [".png", ".jpg", ".jpeg"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"], // Older Excel format
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "text/plain": [".txt"],
};

const getInitialInvoice = (userData, id) => ({
  COMPANY_CODE: userData.companyCode || 1,
  BRANCH_CODE: userData.branchCode || 1,
  REF_SERIAL_NO: id || -1,
  VENDOR_ID: "",
  VENDOR_NAME: "",
  COUNTRY_NAME: "",
  CITY_NAME: "",
  AUTO_ACCOUNT_CODE: "",
  VENDOR_ACCOUNT_CODE: "",
  CREDIT_DAYS: "",
  CURRENCY_NAME: "",
  TRN_VAI_NO: "",
  GRN_TYPE: "",
  IS_CLOSED: "F",
  IS_FREEZED: "F",
  ENT_DATE: new Date().toISOString().split("T")[0],
  INVOICE_DATE: new Date().toISOString().split("T")[0],
  INVOICE_NO: "",
  RECEIVED_DATE: new Date().toISOString().split("T")[0],
  INVOICE_AMOUNT: 0.0,
  Invoiceamtinwords: "",
  USER_NAME: userData.userName || "",
  GL_ADJUSTED_VALUE: "0",
  REF_ORDER_NO: "ref" + " - " + Math.floor(Math.random() * 1000000),
  REF_ORDER_DATE: new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }),
  Ordertime: new Date().toLocaleTimeString(),
  Grnno: "GRN-2024-0002",
  Grndate: new Date().toISOString().split("T")[0],
  Grnval: "22,750.00",
  PreGrnno: "GRN-2024-0001",
  PreGrndate: new Date().toISOString().split("T")[0],
  PreGrnval: "22,750.00",
  Orderval: "22,750.00",
  Balance: "0.00",
  EXCHANGE_RATE: 1.0,
  REF_NO_ACCOUNTS: "",
  REMARKS: "",
  PAYMENT_DATE: new Date().toISOString().split("T")[0],
  LC_INVOICE_AMOUNT: 0,
  APPROVAL_STATUS: "",
  TAXABLE_AMOUNT: 0,
});

const getFileIcon = (fileType) => {
  if (fileType.startsWith("image/")) {
    return <Image className="h-8 w-8 text-blue-500" />;
  } else if (fileType === "application/pdf") {
    return <FileText className="h-8 w-8 text-red-500" />;
  } else if (fileType.includes("word") || fileType.includes("document")) {
    return <FileText className="h-8 w-8 text-blue-600" />;
  } else if (fileType === "text/plain") {
    return <FileText className="h-8 w-8 text-green-500" />;
  }
  return <File className="h-8 w-8 text-gray-500" />;
};

const InvoiceBookingPage = () => {
  const { userData } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(getInitialInvoice(userData, id));
  const [suppliers, setSuppliers] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isSupplierPopoverOpen, setIsSupplierPopoverOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showCreditDaysInput, setShowCreditDaysInput] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [currency, setCurrency] = useState([]);
  const [uploadResetKey, setUploadResetKey] = useState(0);

  // Add these new handler functions for image zoom
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
  };

  useEffect(() => {
    fetchSuppliers();
    fetchCurrency();
  }, [userData]);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id, userData]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      uploadedFiles.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, [uploadedFiles]);

  const fetchInvoice = async () => {
    try {
      const payload = {
        DataModelName: "ACC_INVOICE_BOOKING",
        WhereCondition: `REF_SERIAL_NO = ${id}`,
        Orderby: "",
      };
      const response = await callSoapService(
        userData.clientURL,
        "DataModel_GetData",
        payload
      );
      if (response) {
        const invoiceData = response[0];
        setInvoice((prevInvoice) => ({
          ...prevInvoice,
          ...invoiceData,
          id: invoiceData.REF_SERIAL_NO,
          INVOICE_DATE: convertServiceDate(invoiceData.INVOICE_DATE),
          RECEIVED_DATE: convertServiceDate(invoiceData.RECEIVED_DATE),
          PAYMENT_DATE: convertServiceDate(invoiceData.PAYMENT_DATE),
        }));
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch invoice. Please try again later.",
      });
    }
  };

  const fetchCurrency = async () => {
    try {
      const payload = {
        DataModelName: "COUNTRY_MASTER",
        WhereCondition: "CURRENCY_NAME IS NOT NULL",
        Orderby: "",
      };
      const response = await callSoapService(
        userData.clientURL,
        "DataModel_GetData",
        payload
      );
      if (response) {
        const currencies = response.map((country) => ({
          value: country.CURRENCY_NAME,
          label: country.CURRENCY_NAME,
        }));
        // Remove duplicates if any
        const uniqueCurrencies = currencies.filter(
          (curr, index, self) =>
            index === self.findIndex((t) => t.value === curr.value)
        );
        setCurrency(uniqueCurrencies);
      }
    } catch (error) {
      console.error("Error fetching country data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch country data. Please try again later.",
      });
    }
  };

  const fetchSuppliers = async () => {
    try {
      const payload = {
        DataModelName: "VENDOR_MASTER",
        WhereCondition: "", // Fixed typo here
        Orderby: "",
      };
      const response = await callSoapService(
        userData.clientURL,
        "DataModel_GetData",
        payload
      );
      if (response) {
        setSuppliers(Array.isArray(response) ? response : []);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch suppliers. Please try again later.",
      });
      setSuppliers([]); // Ensure suppliers is set to empty array on error
    }
  };

  const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      if (!acceptedFiles?.length && !rejectedFiles?.length) return;
      setIsUploadOpen(true);
      // Handle rejected files
      if (rejectedFiles?.length > 0) {
        const rejectionReasons = rejectedFiles.map((file) => {
          if (file.size > MAX_FILE_SIZE) {
            return `File ${file.name} is too large (max 10MB)`;
          }
          return `File type not supported: ${file.name}`;
        });

        toast({
          variant: "destructive",
          title: "Some files were rejected",
          description: rejectionReasons.join(", "),
        });
      }

      // Process accepted files
      const validFiles = acceptedFiles.filter(
        (file) =>
          file.size <= MAX_FILE_SIZE &&
          (ALLOWED_MIME_TYPES.includes(file.type) ||
            Object.keys(ACCEPTED_FILE_TYPES).some((type) => {
              const extensions = ACCEPTED_FILE_TYPES[type];
              return extensions.some((ext) =>
                file.name.toLowerCase().endsWith(ext)
              );
            }))
      );

      if (validFiles.length === 0) {
        toast({
          variant: "destructive",
          title: "Invalid file type!",
          description:
            "Only images, PDFs, Word docs, and text files are allowed (max 10MB).",
        });
        return;
      }

      setIsProcessingFile(true);

      // Create preview URLs for supported types
      const filesWithPreview = validFiles.map((file) => {
        let previewUrl = null;
        if (file.type.startsWith("image/")) {
          previewUrl = URL.createObjectURL(file);
        } else if (file.type === "application/pdf") {
          // For PDFs, we'll show a generic PDF icon but can preview in dialog
          previewUrl = URL.createObjectURL(file);
        }

        return {
          file,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          previewUrl,
        };
      });

      // Clean up previous files
      uploadedFiles.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });

      setUploadedFiles(filesWithPreview);
      toast({
        title: "File uploaded!",
        description: `${validFiles.length} file(s) have been added.`,
      });

      setIsProcessingFile(false);
      setUploadResetKey((prev) => prev + 1);
      setInvoice(getInitialInvoice(userData, id));
    },
    [userData, id]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 5,
    maxSize: MAX_FILE_SIZE,
  });

  const removeFile = (index) => {
    const fileToRemove = uploadedFiles[index];
    if (fileToRemove.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setInvoice(getInitialInvoice(userData, id));
    setUploadResetKey((prev) => prev + 1); // Trigger reset
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInvoice((prev) => ({ ...prev, [name]: value }));
  };

  const handleSupplierSelect = (vendorId) => {
    const selectedSupplier = suppliers.find((s) => s.VENDOR_ID === vendorId);
    if (selectedSupplier) {
      setInvoice((prev) => ({
        ...prev,
        VENDOR_ID: selectedSupplier.VENDOR_ID,
        VENDOR_NAME: selectedSupplier.VENDOR_NAME,
        COUNTRY_NAME: selectedSupplier.COUNTRY_NAME,
        CITY_NAME: selectedSupplier.CITY_NAME || selectedSupplier.CITY || "",
        AUTO_ACCOUNT_CODE: selectedSupplier.ACCOUNT_CODE || "",
        TRN_VAI_NO: selectedSupplier.TRN_VAT_NO || "",
        CREDIT_DAYS: selectedSupplier.CREDIT_DAYS || "0",
        REF_NO_ACCOUNTS: selectedSupplier.ACCOUNT_CODE || "0",
        APPROVAL_STATUS: selectedSupplier.APPROVAL_STATUS || "0",
        VENDOR_ACCOUNT_CODE: selectedSupplier.ACCOUNT_CODE || "0",
        CURRENCY_NAME: selectedSupplier.CURRENCY_NAME || prev.CURRENCY_NAME,
      }));
    }
    setIsSupplierPopoverOpen(false);
  };

  const handlePreview = (file) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  // Helper function to extract vendor name from raw string
  const handleExtractedData = (data) => {
    // Format the date for input fields if we got one from AI
    const formattedDate = data.invoiceDate
      ? new Date(data.invoiceDate).toISOString().split("T")[0]
      : invoice.INVOICE_DATE;
    const formattedPaidOn = data.paidOn
      ? new Date(data.paidOn).toISOString().split("T")[0]
      : invoice.PAYMENT_DATE;
    const formattedOrderDate = data.orderDate
      ? new Date(data.orderDate).toISOString().split("T")[0]
      : invoice.REF_ORDER_DATE;

    setInvoice((prev) => ({
      ...prev,
      INVOICE_NO: data.invoiceNo || data.invoiceNumber || prev.INVOICE_NO,
      INVOICE_DATE: formattedDate,
      RECEIVED_DATE: formattedDate,
      VENDOR_NAME: data.supplierName || prev.VENDOR_NAME,
      INVOICE_AMOUNT: data.invoiceAmount
        ? parseFloat(data.invoiceAmount)
        : prev.INVOICE_AMOUNT,
      CURRENCY_NAME: data.invoiceCurrency || prev.CURRENCY_NAME, // This will update both places
      PAYMENT_DATE: formattedPaidOn,
      REF_ORDER_NO: data.orderNo || prev.REF_ORDER_NO,
      GL_ADJUSTED_VALUE: data.adjustedValue || prev.GL_ADJUSTED_VALUE,
      TAXABLE_AMOUNT: data.taxableAmount
        ? parseFloat(data.taxableAmount)
        : prev.TAXABLE_AMOUNT,
      TRN_VAI_NO: data.trnvatNo || prev.TRN_VAI_NO,
      CREDIT_DAYS: data.creditDays || prev.CREDIT_DAYS,
      COUNTRY_NAME: data.countryName || prev.COUNTRY_NAME,
      CITY_NAME: data.cityName || prev.CITY_NAME,
      REF_ORDER_DATE: formattedOrderDate,
    }));

    // Update supplier if name matches
    if (data.supplierName) {
      const matchingSupplier = suppliers.find((s) =>
        s.VENDOR_NAME.toLowerCase().includes(data.supplierName.toLowerCase())
      );
      if (matchingSupplier) {
        handleSupplierSelect(matchingSupplier.VENDOR_ID);
      }
    }

    toast({
      title: "AI Extraction Applied!",
      description: "The extracted data has been populated in the form.",
    });
  };

  const handleSubmit = async () => {
    try {
      // Prepare form data including files
      const formData = new FormData();

      // Append files to form data
      uploadedFiles.forEach((fileObj, index) => {
        formData.append(`file_${index}`, fileObj.file);
      });

      // Append invoice data
      formData.append("invoice", JSON.stringify(invoice));

      // In a real application, you would send formData to your backend
      // For this example, we'll keep the existing SOAP call
      const invoiceWithFiles = { ...invoice };
      const convertedDataModel = convertDataModelToStringData(
        "ACC_INVOICE_BOOKING",
        invoiceWithFiles
      );

      const payload = {
        UserName: userData.UserName,
        DModelData: convertedDataModel,
      };

      await callSoapService(userData.clientURL, "DataModel_SaveData", payload);

      toast({
        title: id ? "Invoice updated!" : "Invoice submitted!",
        description: `Invoice ${invoice.INVOICE_NO} has been ${
          id ? "updated" : "saved"
        }.`,
      });

      navigate("/invoice-list");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  invoice.LC_INVOICE_AMOUNT = invoice.INVOICE_AMOUNT * invoice.EXCHANGE_RATE;

  return (
    <>
      <div className="flex w-[100%] flex-col gap-1 text-xs lg:flex-row lg:h-full   ">
        {/* Left Column - Invoice Form */}
        <div className="flex w-full lg:w-[45%] flex-col">
          <div className="flex flex-col h-full rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-950 p-2 gap-2">
            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-2 border-b border-gray-200 pb-2 dark:border-gray-700 sm:flex-row sm:items-center">
              <h2 className="text-sm font-semibold">
                Invoice
                <span className="whitespace-nowrap text-[0.9rem] text-purple-600">
                  Booking
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-gradient-to-r from-purple-100 to-purple-50 px-3 py-1 text-xs font-medium text-purple-600 shadow-sm dark:from-purple-900/30 dark:to-purple-900/20 dark:text-purple-200">
                  <span className="mr-1">Ref No:</span>
                  <span className="font-semibold tracking-wide">
                    {invoice.REF_SERIAL_NO === -1 ? (
                      <span>New</span>
                    ) : (
                      invoice.REF_SERIAL_NO
                    )}
                  </span>
                </div>

                <div className="rounded-full bg-gradient-to-r from-purple-100 to-purple-50 px-3 py-1 text-xs font-medium text-purple-600 shadow-sm dark:from-purple-900/30 dark:to-purple-900/20 dark:text-purple-200">
                  <span className="mr-1">Ref Date:</span>
                  <span className="font-semibold">
                    {invoice.INVOICE_DATE ||
                      new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content - Added overflow handling */}
            <div className="flex-1 space-y-1 w-full overflow-x-hidden">
              {/* Supplier and Invoice Info */}
              <div className="w-full">
                <div className="flex flex-col gap-1 md:flex-row w-full">
                  {/* Invoice Details Card - Added min-w-0 to prevent overflow */}
                  <div className="w-full md:w-[70%] min-w-0 rounded-lg border bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-slate-950">
                    <div className="space-y-4 ">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm mb-2 font-semibold text-gray-700 dark:text-gray-300">
                          Invoice Details
                        </h3>
                        {uploadedFiles.length > 0 && (
                          <Button
                            variant="outline"
                            onClick={() => setIsChatOpen(true)}
                            disabled={isProcessingFile}
                            className="h-8 px-3 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-300 group transition-all duration-300 ease-in-out overflow-hidden"
                          >
                            <div className="flex items-center">
                              <Sparkles className="h-4 w-4 transition-all duration-300 ease-in-out" />
                              <span className="text-xs font-medium max-w-0 group-hover:max-w-[50px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap">
                                Ask AI
                              </span>
                            </div>
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                        {/* Invoice Number */}
                        <div className="space-y-1 min-w-0">
                          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Invoice Number <span className="text-red-600">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              name="INVOICE_NO"
                              placeholder="INV-2023-001"
                              value={invoice.INVOICE_NO || ""}
                              onChange={handleInputChange}
                            />
                            {/* <Hash className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" /> */}
                          </div>
                        </div>

                        {/* Invoice Date */}
                        <div className="space-y-1 min-w-0">
                          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Invoice Date
                          </Label>
                          <div className="flex items-center gap-1">
                            <div className="relative w-full">
                              <Input
                                type="date"
                                name="INVOICE_DATE"
                                value={invoice.INVOICE_DATE || ""}
                                onChange={handleInputChange}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document Upload Card - Added min-w-0 to prevent overflow */}
                  <div className="w-full md:w-[30%] min-w-0  rounded-lg border bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-slate-950">
                    <div
                      {...getRootProps()}
                      className={`flex h-full w-full truncate cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors ${
                        isDragActive
                          ? "border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-900/20"
                          : "border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
                      }`}
                    >
                      <input {...getInputProps()} />

                      {isProcessingFile ? (
                        <div className="flex flex-col items-center p-4">
                          <Loader className="h-5 w-5 animate-spin text-blue-500" />
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Extracting invoice data...
                          </p>
                        </div>
                      ) : uploadedFiles.length > 0 ? (
                        <div className="flex w-full justify-center">
                          {uploadedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="relative flex-shrink-0 transition-transform hover:scale-[1.02]"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(file);
                              }}
                            >
                              {file.previewUrl &&
                              file.type.startsWith("image/") ? (
                                <>
                                  <img
                                    src={file.previewUrl}
                                    alt="Preview"
                                    className="h-[60px] w-[80px] cursor-pointer rounded-md object-cover shadow-sm"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFile(index);
                                    }}
                                    className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-white p-0 text-red-500 shadow-sm hover:bg-red-50 hover:text-red-600 dark:bg-gray-800"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <div className="group relative flex h-full sm:w-[110px] w-full  cursor-pointer flex-col items-center justify-center rounded-md bg-white p-2  shadow-sm dark:bg-gray-700 truncate">
                                  <div className="text-blue-500 truncate group-hover:text-blue-600 dark:text-blue-400">
                                    {getFileIcon(file.type)}
                                  </div>
                                  <span className="mt-1 truncate text-xs trunacte  text-gray-600 dark:text-gray-300">
                                    {file.name}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFile(index);
                                    }}
                                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-white p-0 text-red-500 opacity-0 shadow-sm hover:bg-red-50 group-hover:opacity-100 dark:bg-gray-800"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center p-4">
                          <Upload className="h-6 w-6 text-gray-400" />
                          <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                            {isDragActive
                              ? "Drop the invoice here..."
                              : "Upload Invoice"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Details Card - Added min-w-0 to prevent overflow */}
              <div className="w-full min-w-0 rounded-xl bg-white border border-gray-200 dark:border-gray-700  p-2 shadow-sm dark:bg-slate-950">
                <h3 className="text-sm mb-2 font-semibold text-gray-700 dark:text-gray-300">
                  Financial Details
                </h3>

                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {/* Amount and Currency Row */}
                  <div className="space-y-1 min-w-0">
                    <div>
                      <Label className="block text-xs  font-medium text-gray-500 dark:text-gray-400">
                        Invoice Amount <span className="text-red-600">*</span>
                      </Label>
                      <div className="relative">
                        {/* <DollarSign className="absolute  top-2.5 h-4 w-4 text-gray-400" /> */}
                        <Input
                          type="text"
                          className="text-right"
                          value={invoice.INVOICE_AMOUNT}
                          onChange={handleInputChange}
                          name="INVOICE_AMOUNT"
                        />
                        
                      </div>
                    </div>

                    <div>
                      <Label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Invoice Currency
                      </Label>
                      <Select
                        value={invoice.CURRENCY_NAME || ""}
                        onValueChange={(value) =>
                          setInvoice((prev) => ({
                            ...prev,
                            CURRENCY_NAME: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-9 w-full rounded-md border-gray-300 bg-gray-50 text-sm focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-950">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent className="rounded-md border-gray-200 shadow-lg dark:border-gray-600">
                          {currency.map((curr) => (
                            <SelectItem
                              key={curr.value}
                              value={curr.value}
                              className="text-sm"
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-xs">{curr.symbol}</span>
                                <span>{curr.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Exchange Rate and Local Amount Row */}
                  <div className="space-y-1 min-w-0">
                    <div>
                      <Label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Exchange Rate
                      </Label>
                      <div className="relative">
                        <Input
                          type="text"
                          step="0.000001"
                          className="text-right"
                          value={invoice.EXCHANGE_RATE}
                          onChange={handleInputChange}
                          name="EXCHANGE_RATE"
                          readOnly
                        />
                        {/* <RefreshCw className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" /> */}
                      </div>
                    </div>

                    <div>
                      <Label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Local Currency Amount
                      </Label>
                      <div className="relative">
                        <Input className="text-right" value={invoice.LC_INVOICE_AMOUNT} readOnly />
                        {/* <Banknote className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" /> */}
                      </div>
                    </div>
                  </div>

                  {/* Tax and Adjustment Row */}
                  <div className="space-y-1 min-w-0">
                    <div>
                      <Label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        G/L Adj Value
                      </Label>
                      <div className="relative">
                        <Input
                          value={invoice.GL_ADJUSTED_VALUE}
                          className="text-right"
                          onChange={handleInputChange}
                          name="GL_ADJUSTED_VALUE"
                        />
                        {/* <LineChart className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" /> */}
                      </div>
                    </div>

                    <div>
                      <Label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Taxable Amount
                      </Label>
                      <div className="relative">
                        <Input
                          type="text"
                          className="text-right"
                          value={invoice.TAXABLE_AMOUNT}
                          onChange={handleInputChange}
                          name="TAXABLE_AMOUNT"
                        />
                        {/* <Receipt className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" /> */}
                      </div>
                    </div>
                  </div>

                  {/* Payment Date Row */}
                  <div className="space-y-1 min-w-0">
                    <div>
                      <Label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                        To Be Paid On
                      </Label>
                      <div className="relative">
                        <Input
                          type="date"
                          className=" w-full flex justify-end"
                          value={invoice.PAYMENT_DATE}
                          onChange={handleInputChange}
                          name="PAYMENT_DATE"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              {/* User Badge */}
              <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-2 dark:border-blue-900/30 dark:bg-blue-900/20">
                <div className="flex items-center">
                  <UserCircle className="mr-1 h-4 w-4 text-blue-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Processed by:{" "}
                    <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">
                      {invoice.USER_NAME}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <Printer className="mr-1 h-4 w-4" />
                  Print
                </Button>
                <Button size="sm" onClick={handleSubmit}>
                  {id ? (
                    <>
                      <Save className="mr-1 h-4 w-4" />
                      Update Invoice
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1 h-4 w-4" />
                      Submit Invoice
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Supplier Details and Order Tracking */}
        <div className="flex w-full overflow-x-hidden flex-col gap-1 text-xs lg:w-[55%] lg:flex-row">
          {/* Supplier Details */}
          <div className="flex w-full overflow-x-hidden flex-col lg:w-[55%]">
            <div className="h-full rounded-lg p-2 border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-950 space-y-2">
              <div className="flex items-center justify-between border-b border-gray-200 p-2 text-sm dark:border-gray-700">
                <h2 className="text-xs font-semibold">Supplier Details</h2>
              </div>

              {/* Supplier Selection - Only shown when editing */}
              <div className="flex flex-col gap-1">
                <div className="w-full overflow-x-hidden flex items-center gap-1 p-4 bg-white dark:bg-slate-950 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 dark:border-gray-700">
                  <div className="relative flex-shrink-0 group">
                    <img
                      src="https://seeklogo.com/images/L/logo-com-hr-logo-5636A4D2D5-seeklogo.com.png"
                      alt="Supplier Logo"
                      className="relative h-20 w-20 rounded-full"
                    />
                  </div>

                  {invoice.VENDOR_NAME && (
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-800 dark:text-white truncate">
                        {invoice.VENDOR_NAME}
                      </h3>

                      <div className="flex flex-wrap gap-1">
                        <Badge
                          variant={"secondary"}
                          className="rounded-full bg-blue-50 hover:bg-blue-100 text-xs px-3 py-1 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 transition-colors duration-200 flex items-center gap-1"
                        >
                          <UserRound className="h-3 w-3" />
                          {invoice.VENDOR_ID || "ID"}
                        </Badge>
                        <Badge
                          variant={"secondary"}
                          className="rounded-full bg-green-50 hover:bg-green-100 px-3 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-200 transition-colors duration-200 flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" />
                          {invoice.CITY_NAME || "City N/A"}
                        </Badge>
                        <Badge
                          variant={"secondary"}
                          className="rounded-full bg-orange-50 hover:bg-orange-100 px-3 py-1 text-xs text-orange-700 dark:bg-orange-900/40 dark:text-orange-200 transition-colors duration-200 flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {invoice.COUNTRY_NAME || "Country N/A"}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                <div className="truncate">
                  <Popover
                    open={isSupplierPopoverOpen}
                    onOpenChange={setIsSupplierPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isSupplierPopoverOpen}
                        className="h-8 w-full justify-between truncate p-1 text-xs" // Added truncate
                        title={invoice.VENDOR_NAME}
                      >
                        <span className="ml-2 w-[200px] truncate text-start">
                          {invoice.VENDOR_NAME || "Select supplier..."}  <span className="text-red-600">*</span>
                        </span>{" "}
                        {/* Truncate long names */}
                        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />{" "}
                        {/* Added shrink-0 */}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      {" "}
                      {/* Fixed width */}
                      <Command>
                        <CommandInput
                          placeholder="Search supplier..."
                          className="h-8 text-xs"
                          value={supplierSearch}
                          onValueChange={setSupplierSearch}
                        />
                        <CommandList>
                          <CommandEmpty className="py-2 text-xs">
                            No supplier found.
                          </CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-y-auto">
                            {" "}
                            {/* Added max height and scroll */}
                            {Array.isArray(suppliers) &&
                              suppliers
                                .filter((supp) => {
                                  const search = supplierSearch.toLowerCase();
                                  return (
                                    (supp.VENDOR_NAME &&
                                      supp.VENDOR_NAME.toLowerCase().includes(
                                        search
                                      )) ||
                                    (supp.VENDOR_ID &&
                                      supp.VENDOR_ID.toString()
                                        .toLowerCase()
                                        .includes(search)) ||
                                    (supp.COUNTRY_NAME &&
                                      supp.COUNTRY_NAME.toLowerCase().includes(
                                        search
                                      ))
                                  );
                                })
                                .map((supp) => (
                                  <CommandItem
                                    key={supp.VENDOR_ID}
                                    value={supp.VENDOR_ID}
                                    onSelect={() => {
                                      handleSupplierSelect(supp.VENDOR_ID);
                                      setIsSupplierPopoverOpen(false);
                                    }}
                                    className="text-xs"
                                  >
                                    <div className="flex w-full flex-col items-start truncate">
                                      {" "}
                                      {/* Added truncate */}
                                      <div className="w-full truncate text-xs">
                                        {" "}
                                        {/* Added truncate and full width */}
                                        <span className="truncate">
                                          {supp.VENDOR_NAME}
                                        </span>{" "}
                                        {/* Truncate long names */}
                                        <Badge
                                          variant="secondary"
                                          className="ml-2 rounded-full px-1.5 py-0.5 text-[0.65rem]"
                                        >
                                          {supp.VENDOR_ID}
                                        </Badge>
                                      </div>
                                      <div className="w-full truncate text-[0.65rem] text-muted-foreground">
                                        {" "}
                                        {/* Added truncate */}
                                        {supp.COUNTRY_NAME}
                                      </div>
                                    </div>
                                    <Check
                                      className={cn(
                                        "ml-auto h-3 w-3",
                                        invoice.VENDOR_ID === supp.VENDOR_ID
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  {/* Top Row - 4 Cards */}
                  <div className="grid grid-cols-2 gap-1">
                    {/* Credit Days Card */}
                    <div className="bg-white dark:bg-slate-950 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
                      <div className="flex  space-y-2 flex-col h-full justify-between">
                        <span className="text-[10px] font-medium truncate text-gray-500 uppercase tracking-wider">
                          Credit Days
                        </span>
                        {showCreditDaysInput ? (
                          <Input
                            type="text"
                            name="CREDIT_DAYS"
                            value={invoice.CREDIT_DAYS || ""}
                            onChange={handleInputChange}
                            onBlur={() => setShowCreditDaysInput(false)}
                            autoFocus
                          />
                        ) : (
                          <span
                            className="cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                            onClick={() => setShowCreditDaysInput(true)}
                          >
                            {invoice.CREDIT_DAYS || "N/A"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dealing Currency Card */}
                    <div className="bg-white truncate dark:bg-slate-950 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
                      <div className="flex space-y-2 flex-col h-full justify-between">
                        <span className="text-[10px] font-medium whitespace-nowrap truncate text-gray-500 uppercase tracking-wider">
                          Dealing Currency
                        </span>
                        <span className="text-sm truncate  font-medium text-gray-700">
                          {invoice.CURRENCY_NAME || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* TRN/VAT NO Card */}
                    <div className="bg-white dark:bg-slate-950 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col space-y-2 h-full justify-between">
                        <span className="text-[10px] font-medium truncate text-gray-500 uppercase tracking-wider">
                          TRN/VAT NO
                        </span>
                        <span className="text-sm font-medium truncate text-gray-700">
                          {invoice.TRN_VAI_NO || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* A/c Code (CR) Card */}
                    <div className="bg-white dark:bg-slate-950 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col space-y-2 h-full justify-between">
                        <span className="text-[10px] font-medium truncate text-gray-500 uppercase tracking-wider">
                          A/c Code (CR)
                        </span>
                        <span className="text-sm font-medium truncate text-gray-700">
                          {invoice.VENDOR_ACCOUNT_CODE || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="space-y-1">
                    {/* Approved Status Card */}
                    <div className="bg-white dark:bg-slate-950  rounded-lg px-2 py-1 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
                      <div className="flex  items-center justify-between">
                        <Label className="text-xs font-medium truncate text-gray-500 uppercase tracking-wider">
                          Supplier Ratings
                        </Label>
                        <div className="flex items-center">
                          <span
                            className={`text-sm font-medium truncate px-2 py-1 rounded 
                              ${
                                invoice.APPROVAL_STATUS === "Approved"
                                  ? "bg-green-100 text-green-800"
                                  : invoice.APPROVAL_STATUS === "Pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {invoice.APPROVAL_STATUS || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Remarks */}

                    <Textarea
                      name="REMARKS"
                      className="bg-white dark:bg-slate-900"
                      placeholder="Enter remarks here..."
                      rows={4}
                      value={invoice.REMARKS || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Tracking */}
          <div className="flex w-full flex-col lg:w-[45%]">
            <OrderTracking invoice={invoice} />
          </div>
        </div>
      </div>

      {/* Chatbot UI */}
      {isChatOpen && (
        <InvoiceChatbot
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          uploadedFiles={uploadedFiles}
          onExtractedData={handleExtractedData}
        />
      )}

      {/* File Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="z-[500] max-h-[90vh] max-w-[90vw] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">File Preview</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="flex flex-col items-center justify-center">
              {previewFile.type.startsWith("image/") ? (
                <div
                  className="relative h-full w-full cursor-move overflow-hidden"
                  onWheel={handleImageZoom}
                  onMouseDown={handleDragStart}
                  onMouseMove={handleDragging}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                >
                  <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetImageZoom();
                      }}
                      className="bg-white/80 backdrop-blur-sm"
                    >
                      Reset Zoom
                    </Button>
                    <div className="flex items-center rounded-md bg-white/80 px-3 py-1 text-xs backdrop-blur-sm">
                      Zoom: {Math.round(imageZoom * 100)}%
                    </div>
                  </div>

                  <img
                    src={previewFile.previewUrl}
                    alt="Preview"
                    className="mx-auto max-h-[70vh] max-w-full object-contain"
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
                  className="h-[70vh] w-full"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex h-64 w-full flex-col items-center justify-center rounded-md bg-gray-100 p-4 dark:bg-gray-800">
                  {getFileIcon(previewFile.type)}
                  <p className="mt-2 text-sm">{previewFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {previewFile.type.includes("word")
                      ? "Word document preview not available"
                      : "Preview not available for this file type"}
                  </p>
                </div>
              )}
              <div className="mt-4 flex w-full justify-between text-xs">
                <span>{previewFile.name}</span>
                <span>{(previewFile.size / 1024).toFixed(2)} KB</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UploadInvoice
        uploadedFiles={uploadedFiles}
        isUploadOpen={isUploadOpen}
        setIsUploadOpen={setIsUploadOpen}
        onExtractedData={handleExtractedData}
        resetTrigger={uploadResetKey}
      />
    </>
  );
};

export default InvoiceBookingPage;
