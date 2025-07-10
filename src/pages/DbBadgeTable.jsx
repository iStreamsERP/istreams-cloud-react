import { useAuth } from "@/contexts/AuthContext";
import { getDashBoardBadgeDetails } from "@/services/iStDashBoardServices";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Button } from "@/components/ui/button";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Filter, Printer, Search, X, ChevronDown } from "lucide-react";
import { callSoapService } from "@/api/callSoapService";

const DbBadgeTable = () => {
  const { DashBoardID, BadgeNo } = useParams();
  const location = useLocation();
  const { userData } = useAuth();

  const [dbData, setDbData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState({});
  const [columnValues, setColumnValues] = useState({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const tableRef = useRef();

  const badgeTitle = location.state?.badgeTitle || "Dashboard Details";

  // Calculate pagination indexes
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  useEffect(() => {
    fetchUser();
  }, [DashBoardID, BadgeNo]);

  useEffect(() => {
    if (dbData.length > 0) {
      // Extract unique values for each column
      const values = {};
      const firstItem = dbData[0];

      if (firstItem) {
        Object.keys(firstItem).forEach((key) => {
          const uniqueValues = [
            ...new Set(
              dbData.map((item) => {
                const value = String(item[key]);
                return key.toLowerCase().includes("date") 
                  ? formatDate(value) 
                  : value;
              })
            ),
          ].sort((a, b) => {
            // Sort values: numbers first (numerically), then strings (alphabetically)
            const aNum = parseFloat(a);
            const bNum = parseFloat(b);
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            if (!isNaN(aNum)) return -1;
            if (!isNaN(bNum)) return 1;
            return a.localeCompare(b);
          });
          
          values[key] = uniqueValues;
        });
      }

      setColumnValues(values);
      
      // Initialize column filters with all values selected
      const initialFilters = {};
      Object.keys(values).forEach(key => {
        initialFilters[key] = new Set(values[key]);
      });
      setColumnFilters(initialFilters);
    }
  }, [dbData]);

  useEffect(() => {
    let result = dbData;

    // Apply search term filter
    if (searchTerm) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      result = result.filter((item) => {
        return Object.values(item).some((value) =>
          String(value).toLowerCase().includes(lowercasedSearchTerm)
        );
      });
    }

    // Apply column filters (Excel-like)
    if (Object.keys(columnFilters).length > 0) {
      result = result.filter((item) => {
        return Object.entries(columnFilters).every(([column, selectedValues]) => {
          if (!selectedValues || selectedValues.size === 0) return true;
          
          let itemValue = String(item[column]);
          
          // Format date values for comparison if column is a date
          if (column.toLowerCase().includes("date")) {
            itemValue = formatDate(itemValue);
          }
          
          return selectedValues.has(itemValue);
        });
      });
    }

    setFilteredData(result);
    setCurrentPage(1);
  }, [searchTerm, dbData, columnFilters]);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const payload = {
        DashBoardID: parseInt(DashBoardID),
        BadgeNo: parseInt(BadgeNo),
      };
  
      const master = await callSoapService(userData.clientURL, "BI_GetDashboard_BadgeDetails_Data", payload);
      
      setDbData(master);
      setFilteredData(master);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextPage = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  const formatDate = (date) => {
    if (!date) return "";
    
    // Check if date is in the format "\/Date(timestamp)\/"
    const regex = /\/Date\((\d+)\)\//;
    const match = String(date).match(regex);
    
    if (match) {
      const timestamp = parseInt(match[1], 10);
      const dateObj = new Date(timestamp);
      
      // Format as "DD-MMM-YYYY" (e.g., "25-Jan-2025")
      return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).replace(/ /g, '-');
    }
    
    // Try to parse as a regular date if not in the special format
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime())
      ? date
      : parsedDate.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }).replace(/ /g, '-');
  };

  const formatHeader = (key) => {
    return key
      .replace(/[_-]/g, " ")
      .split(" ")
      .map((word, i) =>
        i === 0
          ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          : word.toLowerCase()
      )
      .join(" ");
  };


  const handleDownloadExcel = () => {
    // Create a copy of the filtered data with formatted dates
    const formattedData = filteredData.map(item => {
      const formattedItem = {};
      Object.entries(item).forEach(([key, value]) => {
        formattedItem[key] = key.toLowerCase().includes("date") 
          ? formatDate(value) 
          : value;
      });
      return formattedItem;
    });
    
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dashboard Data");
    XLSX.writeFile(wb, `${badgeTitle.replace(/[^a-z0-9]/gi, "_")}.xlsx`);
  };


const exportToPDF = async () => {
  try {
    setIsGeneratingPDF(true);
    const tableElement = tableRef.current;
    if (!tableElement) {
      console.error('Table element not found');
      setIsGeneratingPDF(false);
      return;
    }

    // Get user data from auth context
    const currentUserImageData = userData?.userAvatar
      ? (userData.userAvatar.startsWith('data:') ? userData.userAvatar : `data:image/jpeg;base64,${userData.userAvatar}`)
      : null;
    const currentUserName = userData?.userName || '';
    const companyLogoData = userData?.companyLogo
      ? (userData.companyLogo.startsWith('data:') ? userData.companyLogo : `data:image/jpeg;base64,${userData.companyLogo}`)
      : null;

    // Pagination settings - 20-30 lines as requested
    const ROWS_PER_PAGE = 45; 
    const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
    
    // Create PDF with proper A4 dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4', // Ensures true A4 size (210 x 297 mm portrait)
      compress: true
    });

    // A4 portrait dimensions in mm
    const pdfWidth = 210; // A4 portrait width
    const pdfHeight = 297; // A4 portrait height

    // Function to create header content - optimized for A4 portrait
 // Function to create header content - optimized for A4 portrait
const createHeaderContent = () => {
  const headerContainer = document.createElement('div');
  headerContainer.style.width = '750px'; // Adjusted for A4 portrait proportions
  headerContainer.style.padding = '15px';
  headerContainer.style.paddingBottom = '12px';
  headerContainer.style.backgroundColor = 'white';
  headerContainer.style.boxSizing = 'border-box';
  headerContainer.style.color = '#000000';
  headerContainer.style.fontFamily = 'Arial, sans-serif';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.flexDirection = 'column'; // Stack vertically for portrait
  header.style.alignItems = 'center';
  header.style.borderBottom = '1px solid #e0e0e0'; // Light color border
  header.style.paddingBottom = '12px';

  // Top row - Company logo on left, company details on right
  const topRow = document.createElement('div');
  topRow.style.display = 'flex';
  topRow.style.justifyContent = 'space-between';
  topRow.style.alignItems = 'flex-start';
  topRow.style.width = '100%';
  topRow.style.marginBottom = '10px';

  // Left column - Company logo only
  const leftColumn = document.createElement('div');
  leftColumn.style.flex = '0 0 auto';
  leftColumn.style.display = 'flex';
  leftColumn.style.alignItems = 'flex-start';

  if (companyLogoData) {
    const companyLogo = document.createElement('img');
    companyLogo.src = companyLogoData;
    companyLogo.style.width = '120px'; 
    companyLogo.style.height = '40px';
    companyLogo.style.objectFit = 'cover';
    leftColumn.appendChild(companyLogo);
  }

  // Right column - Company details only
  const rightColumn = document.createElement('div');
  rightColumn.style.flex = '0 0 auto';
  rightColumn.style.textAlign = 'right';
  rightColumn.style.display = 'flex';
  rightColumn.style.flexDirection = 'column';
  rightColumn.style.alignItems = 'flex-end';

  const companyTitle = document.createElement('h3');
  companyTitle.textContent = userData?.companyName || 'Company Name';
  companyTitle.style.fontSize = '14px'; // Smaller for portrait
  companyTitle.style.fontWeight = 'bold';
  companyTitle.style.marginBottom = '3px';
  companyTitle.style.color = '#1e40af';

  const companyAddress = document.createElement('div');
  companyAddress.innerHTML = `Address: ${userData?.companyAddress || 'N/A'}<br>`;
  companyAddress.style.fontSize = '9px'; // Smaller for portrait
  companyAddress.style.lineHeight = '1.2';
  companyAddress.style.marginBottom = '3px';

  const companyContact = document.createElement('div');
  // Add contact details if needed
  
  rightColumn.appendChild(companyTitle);
  rightColumn.appendChild(companyAddress);
  rightColumn.appendChild(companyContact);

  // Add both columns to topRow
  topRow.appendChild(leftColumn);
  topRow.appendChild(rightColumn);
  header.appendChild(topRow);

  // Bottom row - PDF title (centered)
  const titleRow = document.createElement('div');
  titleRow.style.textAlign = 'center';
  titleRow.style.width = '100%';

  const pdfTitle = document.createElement('h3');
  pdfTitle.textContent = badgeTitle;
  pdfTitle.style.fontSize = '16px'; // Adjusted for portrait
  pdfTitle.style.fontWeight = 'bold';
  pdfTitle.style.margin = '0';
  pdfTitle.style.color = 'black';

  titleRow.appendChild(pdfTitle);
  header.appendChild(titleRow);
  headerContainer.appendChild(header);

  return headerContainer;
};
    // Function to create table for a specific page - optimized for A4 portrait
    const createTableForPage = (pageData, pageNumber) => {
      const tableContainer = document.createElement('div');
      tableContainer.style.width = '750px'; // A4 portrait optimized width
      tableContainer.style.padding = '15px';
      tableContainer.style.paddingTop = '8px';
      tableContainer.style.backgroundColor = 'white';
      tableContainer.style.boxSizing = 'border-box';
      tableContainer.style.color = '#000000';
      tableContainer.style.fontFamily = 'Arial, sans-serif';

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontFamily = 'Arial, sans-serif';
      table.style.fontSize = '10px'; // Increased font size for table
      table.style.marginTop = '8px';
      table.style.color = '#000000';
      table.style.textRendering = 'optimizeLegibility';
      table.style.webkitFontSmoothing = 'antialiased';

      // Table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headerRow.style.backgroundColor = '#ffffff';
      headerRow.style.border = '1px solid #d0d0d0'; // Light color border

      if (filteredData[0]) {
        Object.keys(filteredData[0]).forEach(key => {
          const th = document.createElement('th');
          th.textContent = formatHeader(key);
          th.style.padding = '6px 4px'; // Increased padding for better readability
          th.style.textAlign = columnTypes[key] === 'numeric' ? 'right' : 'left';
          th.style.border = '1px solid #d0d0d0'; // Light color border
          th.style.fontWeight = 'bold';
          th.style.fontSize = '12px'; // Increased font size for headers
          th.style.whiteSpace = 'nowrap';
          headerRow.appendChild(th);
        });
      }

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Table body for current page - exactly 25 rows for consistent A4 portrait layout
      const tbody = document.createElement('tbody');
      pageData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.style.border = '1px solid #d0d0d0'; // Light color border
        // tr.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f8f8';
        tr.style.backgroundColor = '#ffffff';


        Object.keys(row).forEach(key => {
          const td = document.createElement('td');
          const cellValue = key.toLowerCase().includes("date") ? formatDate(row[key]) : row[key];
          td.textContent = cellValue;
          td.style.padding = '4px 3px'; // Increased padding
          td.style.textAlign = columnTypes[key] === 'numeric' ? 'right' : 'left';
          td.style.border = '1px solid #d0d0d0'; // Light color border
          td.style.fontSize = '10px'; // Increased font size for cells
          td.style.maxWidth = '80px'; // Smaller max width for portrait
          td.style.overflow = 'hidden';
          td.style.textOverflow = 'ellipsis';
          td.style.whiteSpace = 'nowrap';
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableContainer.appendChild(table);

      return tableContainer;
    };

    // Function to create footer - optimized for A4 portrait
    const createFooter = (pageNumber, totalPages) => {
      const footerContainer = document.createElement('div');
      footerContainer.style.width = '750px';
      footerContainer.style.padding = '15px';
      footerContainer.style.paddingTop = '8px';
      footerContainer.style.backgroundColor = 'white';
      footerContainer.style.boxSizing = 'border-box';
      footerContainer.style.color = '#000000';
      footerContainer.style.fontFamily = 'Arial, sans-serif';

      const currentDate = new Date();
      const formattedDateTime = currentDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      // Page footer
      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.justifyContent = 'space-between';
      footer.style.alignItems = 'center';
      footer.style.marginTop = '15px';
      footer.style.paddingTop = '8px';
      footer.style.borderTop = '1px solid #e0e0e0'; // Light color border
      footer.style.fontSize = '10px';
      footer.style.color = '#666';

      const dateTimeFooter = document.createElement('div');
      dateTimeFooter.textContent = `Generated on: ${formattedDateTime}`;
      
      const pageInfo = document.createElement('div');
      pageInfo.textContent = `Page ${pageNumber} of ${totalPages}`;
      pageInfo.style.textAlign = 'center';
      pageInfo.style.flex = '1';

      const recordRange = document.createElement('div');
      const startRecord = (pageNumber - 1) * ROWS_PER_PAGE + 1;
      const endRecord = Math.min(pageNumber * ROWS_PER_PAGE, filteredData.length);
      recordRange.textContent = `Records ${startRecord}-${endRecord}`;

      footer.appendChild(dateTimeFooter);
      footer.appendChild(pageInfo);
      footer.appendChild(recordRange);
      footerContainer.appendChild(footer);

      return footerContainer;
    };

    // Generate each page with proper A4 scaling
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const startIndex = (pageNumber - 1) * ROWS_PER_PAGE;
      const endIndex = startIndex + ROWS_PER_PAGE;
      const pageData = filteredData.slice(startIndex, endIndex);

      // Create temporary container for this page
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';

      // Add header
      const headerContent = createHeaderContent();
      tempContainer.appendChild(headerContent);

      // Add table for this page
      const tableContent = createTableForPage(pageData, pageNumber);
      tempContainer.appendChild(tableContent);

      // Add footer
      const footerContent = createFooter(pageNumber, totalPages);
      tempContainer.appendChild(footerContent);

      // Add to document temporarily
      document.body.appendChild(tempContainer);

      // Generate canvas for this page with A4 portrait optimized settings
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // Good balance for A4 quality
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 750, // Match container width for portrait
        onclone: (clonedDoc) => {
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              text-rendering: optimizeLegibility !important;
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });

      // Add new page if not the first page
      if (pageNumber > 1) {
        pdf.addPage();
      }

      // Add image to PDF with proper A4 portrait margins and scaling
      const imgData = canvas.toDataURL('image/png');
      
      // A4 portrait margins in mm
      const marginTop = 10;
      const marginSide = 10;
      const marginBottom = 10;
      
      const maxWidth = pdfWidth - (marginSide * 2); // 190mm usable width
      const maxHeight = pdfHeight - marginTop - marginBottom; // 277mm usable height
      
      const canvasAspectRatio = canvas.width / canvas.height;
      const pageAspectRatio = maxWidth / maxHeight;
      
      let finalWidth, finalHeight;
      
      if (canvasAspectRatio > pageAspectRatio) {
        finalWidth = maxWidth;
        finalHeight = maxWidth / canvasAspectRatio;
      } else {
        finalHeight = maxHeight;
        finalWidth = maxHeight * canvasAspectRatio;
      }
      
      const centerX = (pdfWidth - finalWidth) / 2;
      const startY = marginTop;

      pdf.addImage(
        imgData,
        'PNG',
        centerX,
        startY,
        finalWidth,
        finalHeight,
        undefined,
        'SLOW'
      );

      // Clean up temporary container
      document.body.removeChild(tempContainer);
    }

    // Save PDF with descriptive filename
    setTimeout(() => {
      pdf.save(`${badgeTitle.replace(/\s+/g, '_')}`);
      setIsGeneratingPDF(false);
    }, 500);

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    setIsGeneratingPDF(false);
  }
};

// Excel-like Filter Component with Advanced Operators
const ExcelFilter = ({ column }) => {
  const [searchFilter, setSearchFilter] = useState("");
  const [filterMode, setFilterMode] = useState("checkbox"); // "checkbox" or "advanced"
  const [operator, setOperator] = useState("=");
  const [filterValue, setFilterValue] = useState("");
  const [tempSelectedValues, setTempSelectedValues] = useState(new Set()); // Temporary state for OK/Cancel
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" or "desc"
  
  const values = columnValues[column] || [];
  const selectedValues = columnFilters[column] || new Set();
  
  // Sort values based on sort order
  const sortedValues = [...values].sort((a, b) => {
    // Handle numeric sorting
    const aNum = parseFloat(a);
    const bNum = parseFloat(b);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    }
    
    // Handle string sorting
    const comparison = a.localeCompare(b);
    return sortOrder === "asc" ? comparison : -comparison;
  });
  
  const filteredValues = sortedValues.filter(value =>
    value.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const isAllSelected = tempSelectedValues.size === values.length;
  const isIndeterminate = tempSelectedValues.size > 0 && tempSelectedValues.size < values.length;

  // Initialize temp state when opening filter
  const handleOpenChange = (open) => {
    if (open) {
      setTempSelectedValues(new Set(selectedValues));
    }
  };

  const handleTempFilterChange = (value, checked) => {
    setTempSelectedValues(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(value);
      } else {
        newSet.delete(value);
      }
      return newSet;
    });
  };

  const handleTempSelectAll = (checked) => {
    if (checked) {
      setTempSelectedValues(new Set(values));
    } else {
      setTempSelectedValues(new Set());
    }
  };

  const handleApplyFilter = () => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: new Set(tempSelectedValues)
    }));
  };

  const handleCancelFilter = () => {
    setTempSelectedValues(new Set(selectedValues));
    setSearchFilter("");
  };

  const applyAdvancedFilter = () => {
    if (!filterValue.trim()) return;
    
    // Create a Set with values that match the advanced filter criteria
    const matchingValues = new Set();
    
    values.forEach(itemValue => {
      let match = false;
      
      switch (operator) {
        case "=":
          match = itemValue === filterValue;
          break;
        case "!=":
          match = itemValue !== filterValue;
          break;
        case "contains":
          match = itemValue.toLowerCase().includes(filterValue.toLowerCase());
          break;
        case "startsWith":
          match = itemValue.toLowerCase().startsWith(filterValue.toLowerCase());
          break;
        case "endsWith":
          match = itemValue.toLowerCase().endsWith(filterValue.toLowerCase());
          break;
        case "in":
          match = filterValue.split(",").map(v => v.trim()).includes(itemValue);
          break;
        case "notIn":
          match = !filterValue.split(",").map(v => v.trim()).includes(itemValue);
          break;
        default:
          match = true;
      }
      
      if (match) {
        matchingValues.add(itemValue);
      }
    });
    
    // Update the column filter
    setColumnFilters(prev => ({
      ...prev,
      [column]: matchingValues
    }));
  };

  const resetAdvancedFilter = () => {
    setFilterValue("");
    setOperator("=");
    // Reset to show all values
    setColumnFilters(prev => ({
      ...prev,
      [column]: new Set(values)
    }));
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 hover:bg-muted ${
            selectedValues.size < values.length ? 'text-blue-600' : ''
          }`}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Filter Mode Toggle */}
        <div className="p-3 border-b">
          <div className="flex gap-1 mb-3">
            <Button
              variant={filterMode === "checkbox" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilterMode("checkbox")}
              className="flex-1 h-7 text-xs"
            >
              Checkbox Filter
            </Button>
            <Button
              variant={filterMode === "advanced" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilterMode("advanced")}
              className="flex-1 h-7 text-xs"
            >
              Advanced Filter
            </Button>
          </div>
              {/* Sort Order Toggle */}
              <div className="flex gap-1">
                <Button
                  variant={sortOrder === "asc" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSortOrder("asc")}
                  className="flex-1 h-7 text-xs"
                >
                  A→Z
                </Button>
                <Button
                  variant={sortOrder === "desc" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSortOrder("desc")}
                  className="flex-1 h-7 text-xs"
                >
                  Z→A
                </Button>
              </div>
          {filterMode === "checkbox" && (
            <>
              <div className="relative mb-2 mt-2">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search values..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-7 h-8 text-sm"
                />
              </div>
              
          
            </>
          )}
        </div>

        {filterMode === "checkbox" ? (
          <>
            {/* Checkbox Filter Mode */}
            <div className="p-2 border-b">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`select-all-${column}`}
                  checked={isAllSelected}
                  onCheckedChange={(checked) => handleTempSelectAll(checked)}
                  className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
                  {...(isIndeterminate && { 'data-state': 'indeterminate' })}
                />
                <Label htmlFor={`select-all-${column}`} className="text-sm font-medium">
                  Select All
                </Label>
              </div>
            </div>
            
            <div className="max-h-48 overflow-y-auto">
              {filteredValues.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No items found
                </div>
              ) : (
                filteredValues.map((value) => (
                  <div key={value} className="flex items-center space-x-2 p-2 hover:bg-muted">
                    <Checkbox
                      id={`${column}-${value}`}
                      checked={tempSelectedValues.has(value)}
                      onCheckedChange={(checked) => handleTempFilterChange(value, checked)}
                    />
                    <Label 
                      htmlFor={`${column}-${value}`} 
                      className="text-sm flex-1 cursor-pointer truncate"
                      title={value}
                    >
                      {value}
                    </Label>
                  </div>
                ))
              )}
            </div>

            {/* OK/Cancel Buttons for Checkbox Mode */}
            <div className="p-3 border-t flex gap-2">
              <Button 
                size="sm" 
                onClick={handleApplyFilter}
                className="flex-1"
              >
                OK
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancelFilter}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Advanced Filter Mode */}
            <div className="p-3 space-y-3">
              <div>
                <Label className="text-sm font-medium mb-1 block">Operator</Label>
                <Select value={operator} onValueChange={setOperator}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="=">Equal (=)</SelectItem>
                    <SelectItem value="!=">Not Equal (!=)</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="startsWith">Starts With</SelectItem>
                    <SelectItem value="endsWith">Ends With</SelectItem>
                    <SelectItem value="in">In (comma separated)</SelectItem>
                    <SelectItem value="notIn">Not In (comma separated)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-1 block">Value</Label>
                <Input
                  placeholder={
                    operator === "in" || operator === "notIn" 
                      ? "value1, value2, value3" 
                      : "Enter value..."
                  }
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="h-8 text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      applyAdvancedFilter();
                    }
                  }}
                />
                {(operator === "in" || operator === "notIn") && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Separate values with commas
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={applyAdvancedFilter}
                  disabled={!filterValue.trim()}
                  className="flex-1"
                >
                  Apply Filter
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetAdvancedFilter}
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>

              {/* Preview of matching values */}
              {filterValue.trim() && (
                <div className="border-t pt-3">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Preview ({operator} "{filterValue}"):
                  </Label>
                  <div className="max-h-24 overflow-y-auto mt-1 text-xs">
                    {values.filter(itemValue => {
                      switch (operator) {
                        case "=": return itemValue === filterValue;
                        case "!=": return itemValue !== filterValue;
                        case "contains": return itemValue.toLowerCase().includes(filterValue.toLowerCase());
                        case "startsWith": return itemValue.toLowerCase().startsWith(filterValue.toLowerCase());
                        case "endsWith": return itemValue.toLowerCase().endsWith(filterValue.toLowerCase());
                        case "in": return filterValue.split(",").map(v => v.trim()).includes(itemValue);
                        case "notIn": return !filterValue.split(",").map(v => v.trim()).includes(itemValue);
                        default: return true;
                      }
                    }).slice(0, 10).map((value, idx) => (
                      <div key={idx} className="text-muted-foreground py-0.5">
                        {value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

  const handleSelectAllFilter = (column, checked) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      if (checked) {
        newFilters[column] = new Set(columnValues[column]);
      } else {
        newFilters[column] = new Set();
      }
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    // Reset all filters to show all values
    const resetFilters = {};
    Object.keys(columnValues).forEach(key => {
      resetFilters[key] = new Set(columnValues[key]);
    });
    setColumnFilters(resetFilters);
    setSearchTerm("");
  };

  const getActiveFilterCount = () => {
    let count = 0;
    Object.entries(columnFilters).forEach(([column, selectedValues]) => {
      if (selectedValues && columnValues[column] && selectedValues.size < columnValues[column].length) {
        count++;
      }
    });
    return count;
  };

  // Get available columns from the first data item
  const availableColumns = dbData[0] ? Object.keys(dbData[0]) : [];

  // Function to determine if a value is a number for right-alignment
  const isNumericValue = (value) => {
    if (value === null || value === undefined || value === "") return false;
    return !isNaN(parseFloat(value)) && isFinite(value);
  };
  
  // Determine if a column contains numeric values
  const isNumericColumn = (key) => {
    if (!dbData.length) return false;
    
    // Check if column name suggests numeric data
    if (key.toLowerCase().includes('amount') || 
        key.toLowerCase().includes('price') || 
        key.toLowerCase().includes('cost') || 
        key.toLowerCase().includes('qty') || 
        key.toLowerCase().includes('count') ||
        key.toLowerCase().includes('total') ||
        key.toLowerCase().includes('num') ||
        key.toLowerCase().includes('id')) {
      return true;
    }
    
    // Check if most values in this column are numeric
    const numericCount = dbData.reduce((count, row) => {
      const value = row[key];
      return isNumericValue(value) ? count + 1 : count;
    }, 0);
    
    // If more than 70% of values are numeric, consider it a numeric column
    return numericCount / dbData.length > 0.7;
  };
  
  // Calculate column types once
  const columnTypes = dbData.length > 0 
    ? Object.keys(dbData[0]).reduce((types, key) => {
        types[key] = key.toLowerCase().includes('date') 
          ? 'date' 
          : isNumericColumn(key) 
            ? 'numeric' 
            : 'text';
        return types;
      }, {})
    : {};

  const navigate = useNavigate();

  const handleGoBack = (e) => {
    e.preventDefault();
    navigate(-1); // Go back one step in history
  };


  return (
    <div className="space-y-6">
      <div className="space-y-1 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">{badgeTitle}</h1>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="" onClick={handleGoBack}>
                Go Back
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>{badgeTitle}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-row justify-between gap-3 w-full">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={clearAllFilters}
            >
              <Filter className="h-4 w-4" />
              <span>Clear Filters</span>
              {getActiveFilterCount() > 0 && (
                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs">
                  {getActiveFilterCount()}
                </span>
              )}
            </Button>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
<div className="flex gap-2">
  <Popover>
    <PopoverTrigger asChild>
      <Button size="sm" className="gap-1">
        <Download className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only">Download</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-40 p-1" align="end">
      <div className="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={exportToPDF}
          disabled={isGeneratingPDF}
          className="w-full justify-start gap-2 h-8"
        >
          {isGeneratingPDF ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Printer className="h-3 w-3" />
              <span>Print PDF</span>
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadExcel}
          className="w-full justify-start gap-2 h-8"
        >
          <Download className="h-3 w-3" />
          <span>Export Excel</span>
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</div>
        </div>
      </div>

      <Card className="w-full bg-transparent rounded-lg border shadow-sm  hover:shadow-xl dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 transition-shadow duration-300 border-blue-100/50">
        <CardContent className="p-2  overflow-auto">
          <Table ref={tableRef}>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {filteredData[0] &&
                  Object.keys(filteredData[0]).map((key) => (
                    <TableHead
                      key={key}
                      className={`whitespace-nowrap font-medium relative ${
                        columnTypes[key] === 'numeric' ? 'text-right' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="flex-1">{formatHeader(key)}</span>
                        <ExcelFilter column={key} />
                      </div>
                    </TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      filteredData[0] ? Object.keys(filteredData[0]).length : 1
                    }
                  >
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentItems.length > 0 ? (
                currentItems.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    {Object.keys(item).map((key) => (
                      <TableCell
                        key={key}
                        className={`py-3 max-w-[200px] truncate ${
                          columnTypes[key] === 'numeric' ? 'text-right' : ''
                        }`}
                      >
                        {key.toLowerCase().includes("date")
                          ? formatDate(item[key])
                          : item[key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={
                      filteredData[0] ? Object.keys(filteredData[0]).length : 1
                    }
                    className="h-24 text-center"
                  >
                    No results found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        <CardFooter className="border-t px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(indexOfLastItem, filteredData.length)}
              </span>{" "}
              of <span className="font-medium">{filteredData.length}</span>{" "}
              entries
            </div>

            <div className="flex items-center gap-2 sm:flex-row flex-col justify-between sm:whitespace-nowrap whitespace-wrap   space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={`${itemsPerPage}`}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={itemsPerPage} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Pagination className="w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        prevPage();
                      }}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <div className="flex items-center justify-center h-8 w-8 text-sm rounded-md border bg-transparent font-medium">
                      {currentPage}
                    </div>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        nextPage();
                      }}
                      disabled={currentPage === totalPages || totalPages === 0}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default DbBadgeTable;


