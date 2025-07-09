import { useEffect, useState, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Download, Search, Filter, TableIcon, BarChart3, Printer, ChevronDown, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { callSoapService } from "@/services/callSoapService"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import * as XLSX from 'xlsx'
export default function ChartDetails() {
  const location = useLocation()
  const navigate = useNavigate()
  const { userData } = useAuth()
  const [detailData, setDetailData] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [columnFilters, setColumnFilters] = useState({})
  const [columnValues, setColumnValues] = useState({})
  const tableRef = useRef()
  // Get passed data from navigation state
  const {
    dashboardId,
    chartNo,
    chartTitle,
    selectedCategory,
    filterField,
    filterValue,
    xAxisFields,
    yAxisFields,
    filterContext
  } = location.state || {}

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const badgeTitle = chartTitle || 'Chart Details'

  const currencySymbol = userData?.companyCurrSymbol || "$"

  useEffect(() => {
    if (dashboardId && chartNo) {
      fetchDetailData()
    }
  }, [dashboardId, chartNo, selectedCategory, filterField, filterValue])


  useEffect(() => {
    if (detailData.length > 0) {
      // Extract unique values for each column
      const values = {}
      const firstItem = detailData[0]

      if (firstItem) {
        Object.keys(firstItem).forEach((key) => {
          const uniqueValues = [
            ...new Set(
              detailData.map((item) => {
                const value = String(item[key] || '');
                return value;
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
  }, [detailData]);

  const getFilteredData = () => {
    let result = detailData;

    // Apply search term filter
    if (searchTerm.trim()) {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      result = result.filter((item) => {
        return Object.values(item).some((value) =>
          String(value || '').toLowerCase().includes(lowercasedSearchTerm)
        );
      });
    }

    // Apply column filters (Excel-like)
    if (Object.keys(columnFilters).length > 0) {
      result = result.filter((item) => {
        return Object.entries(columnFilters).every(([column, selectedValues]) => {
          if (!selectedValues || selectedValues.size === 0) return true;

          let itemValue = String(item[column] || '');
          return selectedValues.has(itemValue);
        });
      });
    }

    return result;
  };
  const fetchDetailData = async () => {
    setLoading(true)
    try {
      // First, get the raw chart data
      const chartID = { DashBoardID: dashboardId, ChartNo: chartNo }
      const rawData = await callSoapService(userData.clientURL, "BI_GetDashboard_Chart_Data", chartID)

      console.log("Raw chart data for details:", rawData)

      if (rawData && rawData.length > 0) {
        const inputJSONData = JSON.stringify(rawData);

        // If we have filter criteria from the clicked bar, apply filtering
        if (selectedCategory && xAxisFields && xAxisFields.length > 0) {
          const categoryValues = selectedCategory.split(",")

          // Create proper filter conditions
          let filterConditions = []
          xAxisFields.forEach((field, index) => {
            if (categoryValues[index] && categoryValues[index].trim() !== '') {
              // Escape single quotes in the value and handle different data types
              const cleanValue = categoryValues[index].trim().replace(/'/g, "''")
              filterConditions.push(`[${field}] = '${cleanValue}'`)
            }
          })

          const calculateColumnTotals = () => {
            if (filteredData.length === 0) return {}

            const totals = {}
            const sampleData = filteredData[0]

            // Only calculate totals for numeric fields
            Object.keys(sampleData).forEach(field => {
              if (isNumericField(field, sampleData)) {
                totals[field] = filteredData.reduce((sum, row) => {
                  const value = row[field]
                  const numValue = typeof value === 'number' ? value : Number(String(value).replace(/[,$\s]/g, ''))
                  return sum + (isNaN(numValue) ? 0 : numValue)
                }, 0)
              }
            })

            return totals
          }
          const filterCondition = filterConditions.length > 0 ? filterConditions.join(",") : ""

          // Determine all available fields from the raw data
          const allFields = Object.keys(rawData[0])

          // For grouping, use the X-axis fields or primary key fields
          const groupColumns = xAxisFields && xAxisFields.length > 0 ? xAxisFields.join(",") : ""

          // For summary, use numeric fields (Y-axis fields or detected numeric columns)
          let summaryColumns = ""
          if (yAxisFields && yAxisFields.length > 0) {
            summaryColumns = yAxisFields.join(",")
          } else {
            // Auto-detect numeric fields for summary
            const numericFields = allFields.filter(field => isNumericField(field, rawData[0]))
            summaryColumns = numericFields.join(",")
          }

          console.log("Filter condition:", filterCondition)


          // Only call the grouping API if we have valid filter conditions
          if (filterCondition && filterCondition.trim() !== "") {
            const jsonDataID = {
              inputJSONData: inputJSONData
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;"),
              FilterCondition: filterCondition,
              groupColumns: "",
              summaryColumns: ""
            }

            console.log("Detail query params:", jsonDataID)

            try {
              const detailedData = await callSoapService(userData.clientURL, "Data_Group_JSONValues", jsonDataID)
              console.log("Filtered detail data:", detailedData)

              if (detailedData && Array.isArray(detailedData) && detailedData.length > 0) {
                setDetailData(detailedData)
              } else {
                // If no filtered data returned, fall back to client-side filtering
                console.log("No server-side filtered data, applying client-side filter")
                const clientFilteredData = applyClientSideFilter(rawData, xAxisFields, categoryValues)
                setDetailData(clientFilteredData)
              }
            } catch (apiError) {
              console.error("Server-side filtering failed, falling back to client-side:", apiError)
              // Fall back to client-side filtering
              const clientFilteredData = applyClientSideFilter(rawData, xAxisFields, categoryValues)
              setDetailData(clientFilteredData)
            }
          } else {
            // No valid filter condition, show all data
            console.log("No valid filter condition, showing all data")
            setDetailData(rawData)
          }
        } else {
          // No filter applied, show all data
          console.log("No filter criteria provided, showing all data")
          setDetailData(rawData)
        }
      } else {
        console.log("No raw data available")
        setDetailData([])
      }
    } catch (error) {
      console.error("Failed to fetch chart detail data", error)
      // If everything fails, try to get the raw data one more time
      try {
        const chartID = { DashBoardID: dashboardId, ChartNo: chartNo }
        const fallbackData = await callSoapService(userData.clientURL, "BI_GetDashboard_Chart_Data", chartID)
        setDetailData(fallbackData || [])
      } catch (fallbackError) {
        console.error("Fallback data fetch also failed", fallbackError)
        setDetailData([])
      }
    } finally {
      setLoading(false)
    }
  }

  // Client-side filtering as fallback
  const applyClientSideFilter = (data, xFields, categoryValues) => {
    if (!data || !xFields || !categoryValues) return data

    return data.filter(row => {
      return xFields.every((field, index) => {
        if (!categoryValues[index] || categoryValues[index].trim() === '') return true
        const rowValue = String(row[field] || '').trim()
        const filterValue = String(categoryValues[index] || '').trim()
        return rowValue === filterValue
      })
    })
  }

  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/[_-]/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  }

  const isNumericField = (fieldName, sampleData) => {
    const value = sampleData[fieldName]
    if (value === null || value === undefined || value === '') return false

    if (typeof value === 'number') return true

    // Check if string can be converted to number
    if (typeof value === 'string') {
      const cleanValue = value.replace(/[,$\s]/g, '') // Remove common formatting
      const numValue = Number(cleanValue)
      return !isNaN(numValue) && isFinite(numValue)
    }

    return false
  }

  const formatValue = (value, fieldName = '') => {
    if (value === null || value === undefined) return ''

    // If it's already a formatted value, return as is
    if (typeof value === 'string' && !isNumericField(fieldName, { [fieldName]: value })) {
      return value
    }

    const numValue = typeof value === 'number' ? value : Number(String(value).replace(/[,$\s]/g, ''))

    if (isNaN(numValue) || !isFinite(numValue)) {
      return String(value)
    }

    const currencyKeywords = ['currency', 'curr', 'cost', 'value', 'amount', 'salary', 'salaries', 'price', 'total']
    const fieldNameStr = String(fieldName || '').toLowerCase()
    const shouldShowCurrency = currencyKeywords.some(keyword =>
      fieldNameStr.includes(keyword)
    )

    const isINR = userData?.companyCurrIsIndianStandard === false
    const prefix = shouldShowCurrency ? `${currencySymbol} ` : ''

    if (isINR) {
      return `${numValue.toLocaleString('en-IN')}`
    } else {
      return `${numValue.toLocaleString()}`
    }
  }
  const filteredData = getFilteredData()
  const totalRecords = filteredData.length
  const totalPages = Math.ceil(totalRecords / itemsPerPage) // Use itemsPerPage instead of recordsPerPage
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  // 6. ADD Excel Filter Component (place before the return statement)
  const ExcelFilter = ({ column }) => {
    const [searchFilter, setSearchFilter] = useState("");
    const [filterMode, setFilterMode] = useState("checkbox");
    const [operator, setOperator] = useState("=");
    const [filterValue, setFilterValue] = useState("");
    const [tempSelectedValues, setTempSelectedValues] = useState(new Set());
    const [sortOrder, setSortOrder] = useState("asc");

    const values = columnValues[column] || [];
    const selectedValues = columnFilters[column] || new Set();

    const sortedValues = [...values].sort((a, b) => {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
      }

      const comparison = a.localeCompare(b);
      return sortOrder === "asc" ? comparison : -comparison;
    });

    const filteredValues = sortedValues.filter(value =>
      value.toLowerCase().includes(searchFilter.toLowerCase())
    );

    const isAllSelected = tempSelectedValues.size === values.length;
    const isIndeterminate = tempSelectedValues.size > 0 && tempSelectedValues.size < values.length;

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

      setColumnFilters(prev => ({
        ...prev,
        [column]: matchingValues
      }));
    };

    const resetAdvancedFilter = () => {
      setFilterValue("");
      setOperator("=");
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
            className={`h-6 w-6 p-0 hover:bg-muted ${selectedValues.size < values.length ? 'text-blue-600' : ''
              }`}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
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
              <div className="relative mb-2 mt-2">
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

  const calculateColumnTotals = () => {
    if (filteredData.length === 0) return {}

    const totals = {}
    const sampleData = filteredData[0]

    // Only calculate totals for numeric fields
    Object.keys(sampleData).forEach(field => {
      if (isNumericField(field, sampleData)) {
        totals[field] = filteredData.reduce((sum, row) => {
          const value = row[field]
          const numValue = typeof value === 'number' ? value : Number(String(value).replace(/[,$\s]/g, ''))
          return sum + (isNaN(numValue) ? 0 : numValue)
        }, 0)
      }
    })

    return totals
  }
  const columnTotals = calculateColumnTotals()
  // 7. ADD these utility functions before the return statement
  const clearAllFilters = () => {
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
  const getColumnTypes = () => {
    const types = {}
    if (filteredData.length > 0) {
      const sampleData = filteredData[0]
      Object.keys(sampleData).forEach(key => {
        types[key] = isNumericField(key, sampleData) ? 'numeric' : 'text'
      })
    }
    return types
  }


  const formatHeader = (header) => {
    return header
      .replace(/[_-]/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  }
  const formatDate = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (isNaN(date.getTime())) return value
    return date.toLocaleDateString()
  }
  const columnTypes = getColumnTypes()
  const calculateColumnWidths = (data) => {
    if (!data || data.length === 0) return {}

    const columnWidths = {}
    const headers = Object.keys(data[0])

    headers.forEach(header => {
      // Start with header width
      let maxWidth = formatHeader(header).length * 8 + 20 // 8px per char + padding

      // Check content width for first 10 rows (for performance)
      const sampleRows = data.slice(0, Math.min(10, data.length))
      sampleRows.forEach(row => {
        const cellValue = header.toLowerCase().includes("date")
          ? formatDate(row[header])
          : formatValue(row[header], header)
        const contentWidth = String(cellValue).length * 7 + 20 // 7px per char + padding
        maxWidth = Math.max(maxWidth, contentWidth)
      })

      // Set reasonable min/max limits
      columnWidths[header] = Math.min(Math.max(maxWidth, 60), 200) // min 60px, max 200px
    })

    return columnWidths
  }
  const exportToPDF = async () => {
    try {
      setIsGeneratingPDF(true);

      // Get user data from auth context
      const currentUserImageData = userData?.userAvatar
        ? (userData.userAvatar.startsWith('data:') ? userData.userAvatar : `data:image/jpeg;base64,${userData.userAvatar}`)
        : null;
      const currentUserName = userData?.userName || '';
      const companyLogoData = userData?.companyLogo
        ? (userData.companyLogo.startsWith('data:') ? userData.companyLogo : `data:image/jpeg;base64,${userData.companyLogo}`)
        : null;

      // Calculate optimal column widths
      const columnWidths = calculateColumnWidths(filteredData);
      const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);

      // Adjust container width based on table content
      const containerWidth = Math.max(800, totalTableWidth + 60); // minimum 800px

      // Pagination settings - adjust based on content
      const ROWS_PER_PAGE = 40; // Slightly reduced for better spacing
      const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);

      // Create PDF with landscape orientation for wider tables
      const pdf = new jsPDF({
        orientation: totalTableWidth > 600 ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // A4 dimensions in mm
      const pdfWidth = totalTableWidth > 600 ? 297 : 210;
      const pdfHeight = totalTableWidth > 600 ? 210 : 297;

      // Function to create header content

      const createHeaderContent = () => {
        const headerContainer = document.createElement('div');
        headerContainer.style.width = `${containerWidth}px`;
        headerContainer.style.padding = '15px';
        headerContainer.style.paddingBottom = '12px';
        headerContainer.style.backgroundColor = 'white';
        headerContainer.style.boxSizing = 'border-box';
        headerContainer.style.color = '#000000';
        headerContainer.style.fontFamily = 'Arial, sans-serif';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.flexDirection = 'column';
        header.style.alignItems = 'center';
        header.style.borderBottom = '1px solid #e0e0e0';
        header.style.paddingBottom = '12px';

        // Top row - Company logo (left) and company details (right)
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

        topRow.appendChild(leftColumn);

        // Right column - Company details
        const rightColumn = document.createElement('div');
        rightColumn.style.flex = '0 0 auto';
        rightColumn.style.textAlign = 'right';
        rightColumn.style.display = 'flex';
        rightColumn.style.flexDirection = 'column';
        rightColumn.style.alignItems = 'flex-end';

        const companyTitle = document.createElement('h3');
        companyTitle.textContent = userData?.companyName || 'Company Name';
        companyTitle.style.fontSize = '14px';
        companyTitle.style.fontWeight = 'bold';
        companyTitle.style.marginBottom = '3px';
        companyTitle.style.color = '#1e40af';
        companyTitle.style.margin = '0 0 3px 0';

        const companyAddress = document.createElement('div');
        companyAddress.innerHTML = `Address: ${userData?.companyAddress || 'N/A'}`;
        companyAddress.style.fontSize = '9px';
        companyAddress.style.lineHeight = '1.2';
        companyAddress.style.marginBottom = '3px';

        rightColumn.appendChild(companyTitle);
        rightColumn.appendChild(companyAddress);
        topRow.appendChild(rightColumn);
        header.appendChild(topRow);

        // Middle row - PDF title (centered)
        const titleRow = document.createElement('div');
        titleRow.style.textAlign = 'center';
        titleRow.style.width = '100%';
        titleRow.style.marginBottom = selectedCategory ? '8px' : '0';

        const pdfTitle = document.createElement('h3');
        pdfTitle.textContent = badgeTitle;
        pdfTitle.style.fontSize = '16px';
        pdfTitle.style.fontWeight = 'bold';
        pdfTitle.style.margin = '0';
        pdfTitle.style.color = 'black';

        titleRow.appendChild(pdfTitle);
        header.appendChild(titleRow);

        // Bottom row - Filter information (if selectedCategory exists)
        if (selectedCategory) {
          const filterRow = document.createElement('div');
          filterRow.style.textAlign = 'center';
          filterRow.style.width = '100%';

          const filterInfo = document.createElement('p');
          filterInfo.textContent = `- Filtered by: ${selectedCategory}`;
          filterInfo.style.fontSize = '12px';
          filterInfo.style.margin = '0';
          filterInfo.style.color = '#666666';
          filterInfo.style.fontStyle = 'italic';

          filterRow.appendChild(filterInfo);
          header.appendChild(filterRow);
        }

        headerContainer.appendChild(header);
        return headerContainer;
      };

      // Function to create table for a specific page
      const createTableForPage = (pageData, pageNumber) => {
        const tableContainer = document.createElement('div');
        tableContainer.style.width = `${containerWidth}px`;
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
        table.style.fontSize = '11px';
        table.style.marginTop = '8px';
        table.style.color = '#000000';
        table.style.textRendering = 'optimizeLegibility';
        table.style.webkitFontSmoothing = 'antialiased';
        table.style.tableLayout = 'fixed'; // Enable fixed layout for consistent widths

        // Table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#ffffff';
        headerRow.style.border = '1px solid #d0d0d0';

        if (filteredData[0]) {
          Object.keys(filteredData[0]).forEach(key => {
            const th = document.createElement('th');
            th.textContent = formatHeader(key);
            th.style.padding = '8px 6px';
            th.style.textAlign = columnTypes[key] === 'numeric' ? 'right' : 'left';
            th.style.border = '1px solid #d0d0d0';
            th.style.fontWeight = 'bold';
            th.style.fontSize = '12px';
            th.style.width = `${columnWidths[key]}px`;
            th.style.minWidth = `${columnWidths[key]}px`;
            th.style.wordWrap = 'break-word';
            th.style.whiteSpace = 'normal'; // Allow text wrapping
            headerRow.appendChild(th);
          });
        }

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Table body for current page
        const tbody = document.createElement('tbody');
        pageData.forEach((row, index) => {
          const tr = document.createElement('tr');
          tr.style.border = '1px solid #d0d0d0';
          // tr.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f8f8';
          tr.style.backgroundColor = '#ffffff';


          Object.keys(row).forEach(key => {
            const td = document.createElement('td');
            const cellValue = key.toLowerCase().includes("date") ? formatDate(row[key]) : formatValue(row[key], key);
            td.textContent = cellValue;
            td.style.padding = '6px 4px';
            td.style.textAlign = columnTypes[key] === 'numeric' ? 'right' : 'left';
            td.style.border = '1px solid #d0d0d0';
            td.style.fontSize = '10px';
            td.style.width = `${columnWidths[key]}px`;
            td.style.minWidth = `${columnWidths[key]}px`;
            td.style.wordWrap = 'break-word';
            td.style.whiteSpace = 'normal'; // Allow text wrapping
            td.style.lineHeight = '1.3'; // Better line spacing
            td.style.verticalAlign = 'top'; // Align content to top
            tr.appendChild(td);
          });

          tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tableContainer.appendChild(table);

        return tableContainer;
      };

      // Function to create footer
      const createFooter = (pageNumber, totalPages) => {
        const footerContainer = document.createElement('div');
        footerContainer.style.width = `${containerWidth}px`;
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

        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.alignItems = 'center';
        footer.style.marginTop = '15px';
        footer.style.paddingTop = '8px';
        footer.style.borderTop = '1px solid #e0e0e0';
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

      // Generate each page
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

        // Generate canvas for this page with higher quality
        const canvas = await html2canvas(tempContainer, {
          scale: 2.5, // Increased scale for better text quality
          logging: false,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: containerWidth,
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

        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');

        const marginTop = 8;
        const marginSide = 8;
        const marginBottom = 8;

        const maxWidth = pdfWidth - (marginSide * 2);
        const maxHeight = pdfHeight - marginTop - marginBottom;

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

      // Save PDF
      setTimeout(() => {
        pdf.save(`${badgeTitle.replace(/\s+/g, '_')}`);
        setIsGeneratingPDF(false);
      }, 500);

    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setIsGeneratingPDF(false);
    }
  };
  const handleDownloadExcel = () => {
    const formattedData = filteredData.map(item => {
      const formattedItem = {};
      Object.entries(item).forEach(([key, value]) => {
        formattedItem[key] = formatValue(value, key);
      });
      return formattedItem;
    });

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chart Data");
    XLSX.writeFile(wb, `${(chartTitle || 'chart_details').replace(/[^a-z0-9]/gi, "_")}.xlsx`);
  };



  const exportData = () => {
    if (filteredData.length === 0) return

    const headers = Object.keys(filteredData[0])
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row =>
        headers.map(header => {
          const value = row[header]
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value || ''
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(chartTitle || 'chart_details').replace(/\s+/g, '_')}_data.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading chart details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sampleData = detailData.length > 0 ? detailData[0] : {}
  const allFields = Object.keys(sampleData)

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      {/* Header */}
      <div className="space-y-1 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">
          <div className="flex flex-col gap-1 md-flex md:flex-row md:items-center ">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {chartTitle || 'Chart Details'}</div>  {selectedCategory && (
                [<p className="text-sm text-muted-foreground mt-1">
                  - Filtered by: {selectedCategory}
                </p>]
              )}
          </div>
        </h1>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2  "
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-row justify-between gap-3 w-full">
          <div className="flex gap-2 w-full"> {/* Changed: Added w-full here */}
            <div className="flex gap-2 w-full"> {/* Changed: Removed width constraints, added w-full */}
              <Button
                variant="outline"
                className="gap-2 flex-shrink-0" // Added flex-shrink-0 to prevent button from shrinking
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
              <div className="relative flex-1"> {/* Changed: Removed width constraints, added flex-1 for full remaining width */}
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  type="search"
                  className="pl-8 w-full" // w-full is already there, but keeping it for clarity
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0"> {/* Added flex-shrink-0 to prevent download button from shrinking */}
            {/* Updated Download Dropdown Button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={filteredData.length === 0}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Download</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    onClick={exportToPDF}
                    disabled={filteredData.length === 0 || isGeneratingPDF}
                    className="w-full justify-start gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    {isGeneratingPDF ? 'Generating...' : 'Print PDF'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDownloadExcel}
                    disabled={filteredData.length === 0}
                    className="w-full justify-start gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {paginatedData.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table className="w-full min-w-max"> {/* Changed: removed table-fixed, added min-w-max */}
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      {allFields.map((field, index) => (
                        <TableHead
                          key={field}
                          className="px-4 py-3 text-left text-sm font-medium text-muted-foreground border-b whitespace-nowrap" // Added: whitespace-nowrap
                        >
                          <div className="flex items-center justify-between gap-2 min-w-0"> {/* Added: min-w-0 */}
                            <div className="flex items-center gap-2">
                              {formatFieldName(field)}
                            </div>
                            <ExcelFilter column={field} />
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((row, rowIndex) => (
                      <TableRow
                        key={rowIndex}
                        className="border-b hover:bg-muted/25 transition-colors"
                      >
                        {allFields.map((field) => (
                          <TableCell
                            key={`${rowIndex}-${field}`}
                            className={`px-4 py-3 text-sm whitespace-nowrap ${isNumericField(field, sampleData) ? 'text-right' : ''}`} // Added: whitespace-nowrap
                          >
                            {/* Removed the truncate wrapper div */}
                            {isNumericField(field, sampleData) ? (
                              <span className="font-mono">
                                {formatValue(row[field], field)}
                              </span>
                            ) : (
                              <span>{String(row[field] || '')}</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                    {/* Totals Row */}
                    <TableRow className="border-t-2 border-primary/20 bg-muted/30 font-semibold">
                      {allFields.map((field, index) => (
                        <TableCell
                          key={`total-${field}`}
                          className={`px-4 py-3 text-sm whitespace-nowrap ${isNumericField(field, sampleData) ? 'text-right' : ''}`} // Added: whitespace-nowrap
                        >
                          {index === 0 ? (
                            <span className="font-bold">Total:</span>
                          ) : isNumericField(field, sampleData) ? (
                            <span className="font-mono font-bold">
                              {formatValue(columnTotals[field], field)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>


              {/* Pagination */}


              {/* Pagination Controls */}
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

            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Filter className="h-12 w-12 mb-4" />
              <p className="text-lg mb-2">No Data Found</p>
              <p className="text-sm text-center">
                {searchTerm ?
                  "No records match your search criteria" :
                  "No data available for the selected filters"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}