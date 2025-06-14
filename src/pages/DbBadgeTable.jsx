import { useAuth } from "@/contexts/AuthContext";
import { getDashBoardBadgeDetails } from "@/services/iStDashBoardServices";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

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
import { callSoapService } from "@/services/callSoapService";

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
      // const master = await getDashBoardBadgeDetails(
      //   payload,
      //   userData.currentUserLogin,
      //   userData.clientURL
      // );
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

  const handlePrint = () => {
    // Create a new window
    const printWindow = window.open('', '_blank');
    
    // Get all stylesheets from the current document
    const stylesheets = Array.from(document.styleSheets);
    let styleText = '';
    
    // Extract and combine all CSS rules
    stylesheets.forEach(stylesheet => {
      try {
        const rules = stylesheet.cssRules || stylesheet.rules;
        for (let i = 0; i < rules.length; i++) {
          styleText += rules[i].cssText + '\n';
        }
      } catch (e) {
        // Skip external stylesheets that may cause CORS issues
        console.warn('Could not load stylesheet:', e);
      }
    });
    
    // Create a temporary table with all data
    let allDataTableHTML = `
      <table class="w-full border-collapse">
        <thead class="bg-muted/50">
          <tr>
            ${
              filteredData[0] && 
              Object.keys(filteredData[0])
                .map(key => `<th class="p-2 text-left font-medium border">${formatHeader(key)}</th>`)
                .join('')
            }
          </tr>
        </thead>
        <tbody>
          ${
            filteredData.map(item => `
              <tr class="hover:bg-muted/50">
                ${
                  Object.keys(item)
                    .map(key => `
                      <td class="p-2 border">
                        ${key.toLowerCase().includes("date") ? formatDate(item[key]) : item[key]}
                      </td>
                    `)
                    .join('')
                }
              </tr>
            `).join('')
          }
        </tbody>
      </table>
    `;
    
    // Create a proper HTML document with styles
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${badgeTitle}</title>
        <style>
          ${styleText}
          @media print {
            body { padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; border: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
          }
        </style>
      </head>
      <body>
        <h1>${badgeTitle}</h1>
        <p>Total Records: ${filteredData.length}</p>
        ${allDataTableHTML}
      </body>
      </html>
    `;
    
    // Write to the new window
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load before printing
    printWindow.onload = function() {
      printWindow.print();
      // Close the window after printing (or after a delay if printing was canceled)
      setTimeout(() => {
        try {
          printWindow.close();
        } catch (e) {
          console.warn('Could not close print window:', e);
        }
      }, 500);
    };
  }

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

  // Excel-like filter functions
  const handleColumnFilterChange = (column, value, checked) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters[column]) {
        newFilters[column] = new Set();
      } else {
        newFilters[column] = new Set(newFilters[column]);
      }
      
      if (checked) {
        newFilters[column].add(value);
      } else {
        newFilters[column].delete(value);
      }
      
      return newFilters;
    });
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

  // Excel-like Filter Component with Advanced Operators
  const ExcelFilter = ({ column }) => {
    const [searchFilter, setSearchFilter] = useState("");
    const [filterMode, setFilterMode] = useState("checkbox"); // "checkbox" or "advanced"
    const [operator, setOperator] = useState("=");
    const [filterValue, setFilterValue] = useState("");
    
    const values = columnValues[column] || [];
    const selectedValues = columnFilters[column] || new Set();
    
    const filteredValues = values.filter(value =>
      value.toLowerCase().includes(searchFilter.toLowerCase())
    );

    const isAllSelected = selectedValues.size === values.length;
    const isIndeterminate = selectedValues.size > 0 && selectedValues.size < values.length;

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
      <Popover>
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
            
            {filterMode === "checkbox" && (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Search values..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-7 h-8 text-sm"
                />
              </div>
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
                    onCheckedChange={(checked) => handleSelectAllFilter(column, checked)}
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
                        checked={selectedValues.has(value)}
                        onCheckedChange={(checked) => handleColumnFilterChange(column, value, checked)}
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
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1"
            >
              <Printer className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Print</span>
            </Button>
            <Button size="sm" onClick={handleDownloadExcel} className="gap-1">
              <Download className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Export</span>
            </Button>
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



// import { useAuth } from "@/contexts/AuthContext";
// import { getDashBoardBadgeDetails } from "@/services/iStDashBoardServices";
// import { useEffect, useRef, useState } from "react";
// import { useLocation, useParams,useNavigate } from "react-router-dom";
// import * as XLSX from "xlsx";


// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Breadcrumb,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbList,
//   BreadcrumbSeparator
// } from "@/components/ui/breadcrumb"
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";

// import { Card, CardContent, CardFooter } from "@/components/ui/card";
// import {
//   Pagination,
//   PaginationContent,
//   PaginationItem,
//   PaginationNext,
//   PaginationPrevious,
// } from "@/components/ui/pagination";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Skeleton } from "@/components/ui/skeleton";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { ArrowLeft, Download, Filter, Printer, Search, X } from "lucide-react";
// import { callSoapService } from "@/services/callSoapService";

// const DbBadgeTable = () => {
//   const { DashBoardID, BadgeNo } = useParams();
//   const location = useLocation();
//   const { userData } = useAuth();

//   const [dbData, setDbData] = useState([]);
//   const [filteredData, setFilteredData] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(10);
//   const [isLoading, setIsLoading] = useState(true);
//   const [filters, setFilters] = useState({});
//   const [columnValues, setColumnValues] = useState({});
//   const tableRef = useRef();

//   const badgeTitle = location.state?.badgeTitle || "Dashboard Details";

//   // Calculate pagination indexes
//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
//   const totalPages = Math.ceil(filteredData.length / itemsPerPage);

//   useEffect(() => {
//     fetchUser();
//   }, [DashBoardID, BadgeNo]);

//   useEffect(() => {
//     if (dbData.length > 0) {
//       // Extract unique values for each column
//       const values = {};
//       const firstItem = dbData[0];

//       if (firstItem) {
//         Object.keys(firstItem).forEach((key) => {
//           const uniqueValues = [
//             ...new Set(
//               dbData.map((item) => {
//                 const value = String(item[key]);
//                 return key.toLowerCase().includes("date") 
//                   ? formatDate(value) 
//                   : value;
//               })
//             ),
//           ];
//           values[key] = uniqueValues;
//         });
//       }

//       setColumnValues(values);
//     }
//   }, [dbData]);

//   useEffect(() => {
//     let result = dbData;

//     // Apply search term filter
//     if (searchTerm) {
//       const lowercasedSearchTerm = searchTerm.toLowerCase();
//       result = result.filter((item) => {
//         return Object.values(item).some((value) =>
//           String(value).toLowerCase().includes(lowercasedSearchTerm)
//         );
//       });
//     }

//     // Apply custom filters
//     if (Object.keys(filters).length > 0) {
//       result = result.filter((item) => {
//         return Object.entries(filters).every(([column, filter]) => {
//           let itemValue = String(item[column]);
//           const filterValue = filter.value;

//           if (!itemValue || !filterValue) return true;

//           // Format date values for comparison if column is a date
//           if (column.toLowerCase().includes("date")) {
//             itemValue = formatDate(itemValue);
//           }

//           switch (filter.operator) {
//             case "=":
//               return itemValue === filterValue;
//             case "!=":
//               return itemValue !== filterValue;
//             case "contains":
//               return itemValue
//                 .toLowerCase()
//                 .includes(filterValue.toLowerCase());
//             case "startsWith":
//               return itemValue
//                 .toLowerCase()
//                 .startsWith(filterValue.toLowerCase());
//             case "endsWith":
//               return itemValue
//                 .toLowerCase()
//                 .endsWith(filterValue.toLowerCase());
//             case "in":
//               return filterValue
//                 .split(",")
//                 .map((v) => v.trim())
//                 .includes(itemValue);
//             case "notIn":
//               return !filterValue
//                 .split(",")
//                 .map((v) => v.trim())
//                 .includes(itemValue);
//             default:
//               return true;
//           }
//         });
//       });
//     }

//     setFilteredData(result);
//     setCurrentPage(1);
//   }, [searchTerm, dbData, filters]);

//   const fetchUser = async () => {
//     setIsLoading(true);
//     try {
//       const payload = {
//         DashBoardID: parseInt(DashBoardID),
//         BadgeNo: parseInt(BadgeNo),
//       };
//       // const master = await getDashBoardBadgeDetails(
//       //   payload,
//       //   userData.currentUserLogin,
//       //   userData.clientURL
//       // );
//       const master = await callSoapService(userData.clientURL, "BI_GetDashboard_BadgeDetails_Data", payload);
      
//       setDbData(master);
//       setFilteredData(master);
//     } catch (error) {
//       console.error("Failed to fetch dashboard data", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const nextPage = () =>
//     currentPage < totalPages && setCurrentPage(currentPage + 1);
//   const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

//   const formatDate = (date) => {
//     if (!date) return "";
    
//     // Check if date is in the format "\/Date(timestamp)\/"
//     const regex = /\/Date\((\d+)\)\//;
//     const match = String(date).match(regex);
    
//     if (match) {
//       const timestamp = parseInt(match[1], 10);
//       const dateObj = new Date(timestamp);
      
//       // Format as "DD-MMM-YYYY" (e.g., "25-Jan-2025")
//       return dateObj.toLocaleDateString('en-GB', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric'
//       }).replace(/ /g, '-');
//     }
    
//     // Try to parse as a regular date if not in the special format
//     const parsedDate = new Date(date);
//     return isNaN(parsedDate.getTime())
//       ? date
//       : parsedDate.toLocaleDateString('en-GB', {
//           day: '2-digit',
//           month: 'short',
//           year: 'numeric'
//         }).replace(/ /g, '-');
//   };

//   const formatHeader = (key) => {
//     return key
//       .replace(/[_-]/g, " ")
//       .split(" ")
//       .map((word, i) =>
//         i === 0
//           ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
//           : word.toLowerCase()
//       )
//       .join(" ");
//   };

// const handlePrint = () => {
//   // Create a new window
//   const printWindow = window.open('', '_blank');
  
//   // Get all stylesheets from the current document
//   const stylesheets = Array.from(document.styleSheets);
//   let styleText = '';
  
//   // Extract and combine all CSS rules
//   stylesheets.forEach(stylesheet => {
//     try {
//       const rules = stylesheet.cssRules || stylesheet.rules;
//       for (let i = 0; i < rules.length; i++) {
//         styleText += rules[i].cssText + '\n';
//       }
//     } catch (e) {
//       // Skip external stylesheets that may cause CORS issues
//       console.warn('Could not load stylesheet:', e);
//     }
//   });
  
//   // Create a temporary table with all data
//   let allDataTableHTML = `
//     <table class="w-full border-collapse">
//       <thead class="bg-muted/50">
//         <tr>
//           ${
//             filteredData[0] && 
//             Object.keys(filteredData[0])
//               .map(key => `<th class="p-2 text-left font-medium border">${formatHeader(key)}</th>`)
//               .join('')
//           }
//         </tr>
//       </thead>
//       <tbody>
//         ${
//           filteredData.map(item => `
//             <tr class="hover:bg-muted/50">
//               ${
//                 Object.keys(item)
//                   .map(key => `
//                     <td class="p-2 border">
//                       ${key.toLowerCase().includes("date") ? formatDate(item[key]) : item[key]}
//                     </td>
//                   `)
//                   .join('')
//               }
//             </tr>
//           `).join('')
//         }
//       </tbody>
//     </table>
//   `;
  
//   // Create a proper HTML document with styles
//   const printContent = `
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <title>${badgeTitle}</title>
//       <style>
//         ${styleText}
//         @media print {
//           body { padding: 20px; }
//           table { width: 100%; border-collapse: collapse; }
//           th, td { padding: 8px; border: 1px solid #ddd; }
//           th { background-color: #f2f2f2; }
//         }
//       </style>
//     </head>
//     <body>
//       <h1>${badgeTitle}</h1>
//       <p>Total Records: ${filteredData.length}</p>
//       ${allDataTableHTML}
//     </body>
//     </html>
//   `;
  
//   // Write to the new window
//   printWindow.document.open();
//   printWindow.document.write(printContent);
//   printWindow.document.close();
  
//   // Wait for content to load before printing
//   printWindow.onload = function() {
//     printWindow.print();
//     // Close the window after printing (or after a delay if printing was canceled)
//     setTimeout(() => {
//       try {
//         printWindow.close();
//       } catch (e) {
//         console.warn('Could not close print window:', e);
//       }
//     }, 500);
//   };
// }

//   const handleDownloadExcel = () => {
//     // Create a copy of the filtered data with formatted dates
//     const formattedData = filteredData.map(item => {
//       const formattedItem = {};
//       Object.entries(item).forEach(([key, value]) => {
//         formattedItem[key] = key.toLowerCase().includes("date") 
//           ? formatDate(value) 
//           : value;
//       });
//       return formattedItem;
//     });
    
//     const ws = XLSX.utils.json_to_sheet(formattedData);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Dashboard Data");
//     XLSX.writeFile(wb, `${badgeTitle.replace(/[^a-z0-9]/gi, "_")}.xlsx`);
//   };

//   const updateFilter = (column, field, value) => {
//     setFilters((prev) => ({
//       ...prev,
//       [column]: {
//         ...prev[column],
//         [field]: value,
//       },
//     }));
//   };

//   const removeFilter = (column) => {
//     const newFilters = { ...filters };
//     delete newFilters[column];
//     setFilters(newFilters);
//   };

//   const clearAllFilters = () => {
//     setFilters({});
//     setSearchTerm("");
//   };

//   // Get available columns from the first data item
//   const availableColumns = dbData[0] ? Object.keys(dbData[0]) : [];

//   // Function to determine if a value is a number for right-alignment
//   const isNumericValue = (value) => {
//     if (value === null || value === undefined || value === "") return false;
//     return !isNaN(parseFloat(value)) && isFinite(value);
//   };
  
//   // Determine if a column contains numeric values
//   const isNumericColumn = (key) => {
//     if (!dbData.length) return false;
    
//     // Check if column name suggests numeric data
//     if (key.toLowerCase().includes('amount') || 
//         key.toLowerCase().includes('price') || 
//         key.toLowerCase().includes('cost') || 
//         key.toLowerCase().includes('qty') || 
//         key.toLowerCase().includes('count') ||
//         key.toLowerCase().includes('total') ||
//         key.toLowerCase().includes('num') ||
//         key.toLowerCase().includes('id')) {
//       return true;
//     }
    
//     // Check if most values in this column are numeric
//     const numericCount = dbData.reduce((count, row) => {
//       const value = row[key];
//       return isNumericValue(value) ? count + 1 : count;
//     }, 0);
    
//     // If more than 70% of values are numeric, consider it a numeric column
//     return numericCount / dbData.length > 0.7;
//   };
  
//   // Calculate column types once
//   const columnTypes = dbData.length > 0 
//     ? Object.keys(dbData[0]).reduce((types, key) => {
//         types[key] = key.toLowerCase().includes('date') 
//           ? 'date' 
//           : isNumericColumn(key) 
//             ? 'numeric' 
//             : 'text';
//         return types;
//       }, {})
//     : {};
//  const navigate = useNavigate();

//   const handleGoBack = (e) => {
//     e.preventDefault();
//     navigate(-1); // Go back one step in history
//   };

//   return (
//     <div className="space-y-6">
//        <div className="space-y-1 flex justify-between items-center">
//           <h1 className="text-2xl font-bold tracking-tight">{badgeTitle}</h1>
//              <Breadcrumb>
//         <BreadcrumbList>
//         <BreadcrumbItem>
//             <BreadcrumbLink href="" onClick={handleGoBack}>
//             Go Back
//           </BreadcrumbLink>
//         </BreadcrumbItem>
//         <BreadcrumbSeparator />
       
       
//         <BreadcrumbItem>
//           <BreadcrumbLink>{badgeTitle}</BreadcrumbLink>
//         </BreadcrumbItem>
      
//       </BreadcrumbList>
//     </Breadcrumb>
//         </div>
//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
       

//         <div className="flex flex-row justify-between gap-3 w-full">
//           <div className="flex gap-2">
//           <Dialog>
//             <DialogTrigger asChild>
//               <Button variant="outline" className="gap-2">
//                 <Filter className="h-4 w-4" />
//                 <span>Filter</span>
//                 {Object.keys(filters).length > 0 && (
//                   <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs">
//                     {Object.keys(filters).length}
//                   </span>
//                 )}
//               </Button>
//             </DialogTrigger>
//             <DialogContent className="sm:max-w-[600px]">
//               <DialogHeader>
//                 <DialogTitle>Add Filters</DialogTitle>
//                 <DialogDescription>
//                   Select values for each column to filter the table
//                 </DialogDescription>
//               </DialogHeader>
//               <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
//                 {availableColumns.map((column) => (
//                   <div
//                     key={column}
//                     className="grid grid-cols-12 gap-2 items-center"
//                   >
//                     <Label className="col-span-3 text-right">
//                       {formatHeader(column)}
//                     </Label>
//                     <div className="col-span-4">
//                       <Select
//                         value={filters[column]?.operator || ""}
//                         onValueChange={(value) =>
//                           updateFilter(column, "operator", value)
//                         }
//                       >
//                         <SelectTrigger>
//                           <SelectValue placeholder="Operator" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="=">Equal</SelectItem>
//                           <SelectItem value="!=">Not Equal</SelectItem>
//                           <SelectItem value="contains">contains</SelectItem>
//                           <SelectItem value="startsWith">
//                             starts with
//                           </SelectItem>
//                           <SelectItem value="endsWith">ends with</SelectItem>
//                           <SelectItem value="in">in</SelectItem>
//                           <SelectItem value="notIn">not in</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </div>
//                     <div className="col-span-4">
//                       <Select
//                         value={filters[column]?.value || ""} 
//                         onValueChange={(value) =>
//                           updateFilter(column, "value", value)
//                         }
//                         disabled={!filters[column]?.operator}
//                       >
//                         <SelectTrigger>
//                           <SelectValue
//                             placeholder={`Select ${formatHeader(column)}`}
//                           />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {columnValues[column]?.map((value) => (
//                             <SelectItem key={value} value={value}>
//                               {value}
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                     </div>
//                     <div className="col-span-1">
//                       {filters[column] && (
//                         <Button
//                           variant="ghost"
//                           size="icon"
//                           onClick={() => removeFilter(column)}
//                         >
//                           <X className="h-4 w-4" />
//                         </Button>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               <div className="flex justify-end gap-2">
//                 <Button variant="outline" onClick={clearAllFilters}>
//                   Clear All
//                 </Button>
//                 <DialogTrigger asChild>
//                   <Button>Apply Filters</Button>
//                 </DialogTrigger>
//               </div>
//             </DialogContent>
//           </Dialog>

//           <div className="relative w-full sm:w-64">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//             <Input
//               placeholder="Search records..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="pl-10 w-full"
//             />
//             {searchTerm && (
//               <button
//                 onClick={() => setSearchTerm("")}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
//               >
//                 <X className="h-4 w-4" />
//               </button>
//             )}
//           </div>
//           </div>

//           <div className="flex gap-2">
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={handlePrint}
//               className="gap-1"
//             >
//               <Printer className="h-4 w-4" />
//               <span className="sr-only sm:not-sr-only">Print</span>
//             </Button>
//             <Button size="sm" onClick={handleDownloadExcel} className="gap-1">
//               <Download className="h-4 w-4" />
//               <span className="sr-only sm:not-sr-only">Export</span>
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* Display active filters */}
//       {Object.keys(filters).length > 0 && (
//         <div className="flex flex-wrap gap-2">
//           {Object.entries(filters).map(([column, filter]) => (
//             <div
//               key={column}
//               className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm"
//             >
//               <span className="font-medium">{formatHeader(column)}</span>
//               <span>{filter.operator}</span>
//               <span className="font-medium">{filter.value}</span>
//               <button
//                 onClick={() => removeFilter(column)}
//                 className="text-muted-foreground hover:text-foreground"
//               >
//                 <X className="h-3 w-3" />
//               </button>
//             </div>
//           ))}
//           <button
//             onClick={clearAllFilters}
//             className="text-sm text-primary hover:underline"
//           >
//             Clear all
//           </button>
//         </div>
//       )}

//       <Card className="w-full bg-transparent rounded-lg border shadow-sm  hover:shadow-xl dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 transition-shadow duration-300 border-blue-100/50">
//         <CardContent className="p-2  overflow-auto">
//           <Table ref={tableRef}>
//             <TableHeader className="bg-muted/50">
//               <TableRow>
//                 {filteredData[0] &&
//                   Object.keys(filteredData[0]).map((key) => (
//                     <TableHead
//                       key={key}
//                       className={`whitespace-nowrap font-medium ${
//                         columnTypes[key] === 'numeric' ? 'text-right' : ''
//                       }`}
//                     >
//                       {formatHeader(key)}
//                     </TableHead>
//                   ))}
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {isLoading ? (
//                 <TableRow>
//                   <TableCell
//                     colSpan={
//                       filteredData[0] ? Object.keys(filteredData[0]).length : 1
//                     }
//                   >
//                     <div className="space-y-2">
//                       {Array.from({ length: 5 }).map((_, i) => (
//                         <Skeleton key={i} className="h-8 w-full" />
//                       ))}
//                     </div>
//                   </TableCell>
//                 </TableRow>
//               ) : currentItems.length > 0 ? (
//                 currentItems.map((item, index) => (
//                   <TableRow key={index} className="hover:bg-muted/50">
//                     {Object.keys(item).map((key) => (
//                       <TableCell
//                         key={key}
//                         className={`py-3 max-w-[200px] truncate ${
//                           columnTypes[key] === 'numeric' ? 'text-right' : ''
//                         }`}
//                       >
//                         {key.toLowerCase().includes("date")
//                           ? formatDate(item[key])
//                           : item[key]}
//                       </TableCell>
//                     ))}
//                   </TableRow>
//                 ))
//               ) : (
//                 <TableRow>
//                   <TableCell
//                     colSpan={
//                       filteredData[0] ? Object.keys(filteredData[0]).length : 1
//                     }
//                     className="h-24 text-center"
//                   >
//                     No results found
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         </CardContent>

//         <CardFooter className="border-t px-6 py-4">
//           <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
//             <div className="text-sm text-muted-foreground">
//               Showing{" "}
//               <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
//               <span className="font-medium">
//                 {Math.min(indexOfLastItem, filteredData.length)}
//               </span>{" "}
//               of <span className="font-medium">{filteredData.length}</span>{" "}
//               entries
//             </div>

//             <div className="flex items-center gap-2 sm:flex-row flex-col justify-between sm:whitespace-nowrap whitespace-wrap   space-x-6 lg:space-x-8">
//               <div className="flex items-center space-x-2">
//                 <p className="text-sm font-medium">Rows per page</p>
//                 <Select
//                   value={`${itemsPerPage}`}
//                   onValueChange={(value) => {
//                     setItemsPerPage(Number(value));
//                     setCurrentPage(1);
//                   }}
//                 >
//                   <SelectTrigger className="h-8 w-[70px]">
//                     <SelectValue placeholder={itemsPerPage} />
//                   </SelectTrigger>
//                   <SelectContent side="top">
//                     {[5, 10, 20, 30, 40, 50].map((pageSize) => (
//                       <SelectItem key={pageSize} value={`${pageSize}`}>
//                         {pageSize}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <Pagination className="w-auto">
//                 <PaginationContent>
//                   <PaginationItem>
//                     <PaginationPrevious
//                       href="#"
//                       onClick={(e) => {
//                         e.preventDefault();
//                         prevPage();
//                       }}
//                       disabled={currentPage === 1}
//                     />
//                   </PaginationItem>
//                   <PaginationItem>
//                     <div className="flex items-center justify-center h-8 w-8 text-sm rounded-md border bg-transparent font-medium">
//                       {currentPage}
//                     </div>
//                   </PaginationItem>
//                   <PaginationItem>
//                     <PaginationNext
//                       href="#"
//                       onClick={(e) => {
//                         e.preventDefault();
//                         nextPage();
//                       }}
//                       disabled={currentPage === totalPages || totalPages === 0}
//                     />
//                   </PaginationItem>
//                 </PaginationContent>
//               </Pagination>
//             </div>
//           </div>
//         </CardFooter>
//       </Card>
//     </div>
//   );
// };

// export default DbBadgeTable;