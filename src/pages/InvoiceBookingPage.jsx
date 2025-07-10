import { callSoapService } from "@/api/callSoapService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronsUpDown,
  File,
  FileText,
  Image,
  Loader,
  Sparkles,
  Upload,
  X,
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
import OrderTracking from "../components/invoice/OrderTracking";
import InvoiceChatbot from "../components/invoice/InvoiceChatbot";
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
  GL_ADJUSTED_VALUE: "0.00",
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
        WhereCodition: "",
        Orderby: "",
      };
      const response = await callSoapService(
        userData.clientURL,
        "DataModel_GetData",
        payload
      );
      if (response) {
        setSuppliers(response);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch suppliers. Please try again later.",
      });
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

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
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
  }, []);

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
      INVOICE_NO: data.invoiceNo || prev.INVOICE_NO,
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
    <div className="max-w-screen  overflow-y-auto p-2">
      <div className="flex  flex-col gap-2 text-xs lg:flex-row">
        {/* Left Column - Invoice Form */}
        <div className="flex w-full flex-col lg:w-[100%]">
          <div className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-950">
            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-700 sm:flex-row sm:items-center">
              <h2 className="text-sm font-semibold">
                Invoice
                <span className="whitespace-nowrap text-[0.9rem] text-purple-600">
                  Booking
                </span>
              </h2>
              <h2 className="whitespace-nowrap text-xs font-semibold">
                Booking Ref No -{" "}
                <span className="text-purple-600">
                  (
                  {invoice.REF_SERIAL_NO === -1 ? "New" : invoice.REF_SERIAL_NO}
                  )
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="whitespace-nowrap rounded bg-purple-300 px-2 py-0.5 text-[0.7rem] text-purple-700 dark:bg-purple-700 dark:text-purple-300"
                >
                  Booking Ref Date: {invoice.INVOICE_DATE}
                </Badge>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-2 py-3">
              {/* Supplier and Invoice Info */}
              <div className="mb-2 flex w-full flex-col items-center gap-2 sm:flex-row">
                <div className="w-full flex-1">
                  {/* Invoice Number and Date */}
                  <div className="flex w-full flex-col justify-between gap-2 ps-[2.9%]">
                    <div className="flex w-full items-center justify-between gap-1 text-xs">
                      <Label className="whitespace-nowrap text-xs font-medium">
                        Invoice No
                      </Label>
                      <Input
                        className="h-8 w-full text-xs sm:w-44"
                        name="INVOICE_NO"
                        placeholder="Invoice No"
                        value={invoice.INVOICE_NO || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="flex w-full items-center justify-between gap-1">
                      <Label className="whitespace-nowrap text-xs font-medium">
                        Invoice Date
                      </Label>
                      <Input
                        className="h-8 w-full text-left text-xs sm:w-44"
                        type="date"
                        name="INVOICE_DATE"
                        value={invoice.INVOICE_DATE || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Document Upload */}
                <div
                  {...getRootProps()}
                  className={`flex w-full cursor-pointer flex-col items-center justify-center truncate rounded-lg bg-gray-100 p-2 text-center transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 sm:h-20 sm:w-36 ${
                    isDragActive ? "border-primary bg-primary/10" : ""
                  }`}
                >
                  <input {...getInputProps()} />
                  {isProcessingFile ? (
                    <div className="flex flex-col items-center">
                      <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
                      <p className="mt-1 text-[0.7rem] text-muted-foreground">
                        Processing file...
                      </p>
                    </div>
                  ) : uploadedFiles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="relative"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent dropzone from opening
                            handlePreview(file);
                          }}
                        >
                          {file.previewUrl && file.type.startsWith("image/") ? (
                            <>
                              <img
                                src={file.previewUrl}
                                alt="Preview"
                                className="h-16 w-40 cursor-pointer rounded-md object-cover"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(index);
                                }}
                                className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-white p-0 text-destructive shadow-sm hover:text-destructive dark:bg-slate-950"
                              >
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex h-[4.5rem] truncate w-[8.5rem] cursor-pointer flex-col items-center justify-center rounded-md bg-gray-200 p-1 dark:bg-gray-700">
                              {getFileIcon(file.type)}
                              <span className="mt-1 truncate text-[0.6rem]">
                                {file.name}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(index);
                                }}
                                className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-white p-0 text-destructive shadow-sm hover:text-destructive dark:bg-slate-950"
                              >
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <p className="mt-1 text-[0.7rem] text-muted-foreground">
                        {isDragActive ? "Drop files here" : "Upload invoice"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Invoice Details Card */}
              <div className="rounded-lg px-2 text-xs">
                <div className="grid grid-cols-1 gap-3 space-y-1.5 sm:grid-cols-1 sm:gap-1">
                  {/* Invoice Amount */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Invoice Amount
                    </Label>
                    <div className="w-[64%]">
                      <Input
                        type="text"
                        className="h-8 text-right text-xs"
                        value={invoice.INVOICE_AMOUNT}
                        onChange={handleInputChange}
                        name="INVOICE_AMOUNT"
                      />
                    </div>
                  </div>

                  {/* Invoice Currency */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Invoice Currency
                    </Label>
                    <div className="w-[64%]">
                      <Select
                        value={invoice.CURRENCY_NAME || ""}
                        onValueChange={(value) =>
                          setInvoice((prev) => ({
                            ...prev,
                            CURRENCY_NAME: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select currency">
                            {invoice.CURRENCY_NAME || "Select currency"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {currency.map((curr) => (
                            <SelectItem
                              key={curr.value}
                              value={curr.value}
                              className="text-xs"
                            >
                              {curr.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Exchange Rate */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Exchange Rate</Label>
                    <div className="w-[64%]">
                      <Input
                        type="text"
                        step="0.000001"
                        className="h-8 text-right text-xs"
                        value={invoice.EXCHANGE_RATE}
                        onChange={handleInputChange}
                        name="EXCHANGE_RATE"
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Local Currency */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Local Currency Amount
                    </Label>
                    <div className="w-[64%]">
                      <Input
                        className="h-8 text-right text-xs"
                        value={invoice.LC_INVOICE_AMOUNT}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Adj Value */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      G / L Adj value
                    </Label>
                    <div className="w-[64%]">
                      <Input
                        className="h-8 text-right text-xs"
                        value={invoice.GL_ADJUSTED_VALUE}
                        onChange={handleInputChange}
                        name="GL_ADJUSTED_VALUE"
                      />
                    </div>
                  </div>
                  {/* Taxable Amount */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      Taxable Amount
                    </Label>
                    <div className="w-[64%]">
                      <Input
                        type="text"
                        className="h-8 text-right text-xs"
                        value={invoice.TAXABLE_AMOUNT}
                        onChange={handleInputChange}
                        name="TAXABLE_AMOUNT"
                      />
                    </div>
                  </div>

                  {/* Paid On */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">
                      To Be Paid On
                    </Label>
                    <div className="w-[64%]">
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={invoice.PAYMENT_DATE}
                        onChange={handleInputChange}
                        name="PAYMENT_DATE"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-col items-center justify-between gap-2 sm:flex-row">
                <div className="w-full sm:w-auto">
                  <Badge
                    variant={"secondary"}
                    className="w-full justify-center font-medium sm:justify-start"
                  >
                    User Name :{" "}
                    <span className="ml-2 font-semibold text-purple-400">
                      {invoice.USER_NAME}{" "}
                    </span>
                  </Badge>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-fit sm:flex-row">
                  <Button
                    variant="outline"
                    className="h-8 w-full px-3 text-xs sm:w-auto"
                    onClick={() => window.print()}
                  >
                    Print
                  </Button>
                  <Button
                    className="h-8 w-full px-3 text-xs sm:w-auto"
                    onClick={handleSubmit}
                  >
                    {id ? "Update" : "Submit"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Supplier Details and Order Tracking */}
        <div className="flex w-full overflow-x-hidden flex-col gap-2 text-xs lg:w-[100%] lg:flex-row">
          {/* Supplier Details */}
          <div className="flex w-full overflow-x-hidden flex-col lg:w-[50%]">
            <div className="h-full rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-950">
              <div className="flex items-center justify-between border-b border-gray-200 px-3 py-[10.5px] text-sm dark:border-gray-700">
                <h2 className="text-xs font-semibold">Supplier Details</h2>
              </div>

              <div className="p-3">
                {/* Supplier Selection - Only shown when editing */}
                <div className="flex flex-col">
                  <div className="mb-3">
                    <img
                      src="https://seeklogo.com/images/L/logo-com-hr-logo-5636A4D2D5-seeklogo.com.png"
                      alt="Supplier Logo"
                      className="h-16 w-16 rounded-full"
                    />
                  </div>

                  <div className="mb-4 truncate">
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
                            {invoice.VENDOR_NAME || "Select supplier..."}
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
                              {suppliers
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
                    <div className="mt-2 flex flex-col gap-2 px-2 py-2 sm:flex-col">
                      <div>
                        <Badge variant={"secondary"} className="text-xs">
                          {invoice.VENDOR_ID || "Vendor ID"}
                        </Badge>

                        <Badge variant={"secondary"} className="ml-2 text-xs">
                          {invoice.CITY_NAME || "City Name"}
                        </Badge>
                      </div>
                      <div>
                        <Badge variant={"secondary"} className="text-xs">
                          {invoice.COUNTRY_NAME || "County Name"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">
                        Credit Days
                      </span>
                      {showCreditDaysInput ? (
                        <Input
                          type="text"
                          name="CREDIT_DAYS"
                          className="h-6 w-10 text-right text-xs text-gray-500"
                          value={invoice.CREDIT_DAYS || ""}
                          onChange={handleInputChange}
                          onBlur={() => setShowCreditDaysInput(false)}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-pointer text-xs text-gray-500 hover:text-purple-600"
                          onClick={() => setShowCreditDaysInput(true)}
                        >
                          {invoice.CREDIT_DAYS || "N/A"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">
                        Dealing Currency
                      </span>
                      <span className="text-xs text-gray-500">
                        {invoice.CURRENCY_NAME || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">
                        TRN/VAT NO
                      </span>
                      <span className="text-xs text-gray-500">
                        {invoice.TRN_VAI_NO || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">
                        A/c Code (CR)
                      </span>
                      <span className="text-xs text-gray-500">
                        {invoice.VENDOR_ACCOUNT_CODE || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-gray-500">
                        Approved Status
                      </Label>
                      <span className="text-xs text-gray-500">
                        {invoice.APPROVAL_STATUS || "N/A"}
                      </span>
                    </div>
                    <div className="mt-3">
                      <Label className="text-xs font-semibold text-gray-500">
                        Remarks
                      </Label>
                      <Textarea
                        name="REMARKS"
                        placeholder="Enter Remarks..."
                        className="mt-1 w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary focus:ring-primary"
                        rows={1}
                        value={invoice.REMARKS || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Tracking */}
          <div className="flex w-full flex-col lg:w-[50%]">
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
      />

      {uploadedFiles.length > 0 && (
        <Button
          variant="outline"
          onClick={() => setIsChatOpen(true)}
          disabled={isProcessingFile}
          className="group absolute bottom-24 right-9 flex items-center gap-1 overflow-hidden rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 px-2 text-white transition-all duration-100 sm:w-fit"
        >
          <Sparkles className="h-4 w-4 animate-pulse" />

          <span className="max-w-0 animate-pulse overflow-hidden whitespace-nowrap text-xs opacity-0 transition-all duration-500 group-hover:max-w-xs group-hover:pl-1 group-hover:opacity-100">
            Ask AI
          </span>
        </Button>
      )}
    </div>
  );
};

export default InvoiceBookingPage;
