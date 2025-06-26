import { useEffect, useState , useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle,CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Download, Search, Filter, TableIcon, BarChart3, Printer,ChevronDown, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
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
          const filterCondition = filterConditions.length > 0 ? filterConditions.join(" AND ") : ""
          
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
          console.log("Group columns:", groupColumns)
          console.log("Summary columns:", summaryColumns)
          
          // Only call the grouping API if we have valid filter conditions
          if (filterCondition && filterCondition.trim() !== "") {
            const jsonDataID = {
              inputJSONData: inputJSONData,
              FilterCondition: filterCondition,
              groupColumns:  "",
              summaryColumns:  ""
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
          className={`h-6 w-6 p-0 hover:bg-muted ${
            selectedValues.size < values.length ? 'text-blue-600' : ''
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

const handlePrint = () => {
  const printWindow = window.open('', '_blank');
  
  const stylesheets = Array.from(document.styleSheets);
  let styleText = '';
  
  stylesheets.forEach(stylesheet => {
    try {
      const rules = stylesheet.cssRules || stylesheet.rules;
      for (let i = 0; i < rules.length; i++) {
        styleText += rules[i].cssText + '\n';
      }
    } catch (e) {
      console.warn('Could not load stylesheet:', e);
    }
  });
  
  let allDataTableHTML = `
    <table class="w-full border-collapse">
      <thead class="bg-muted/50">
        <tr>
          ${
            filteredData[0] && 
            Object.keys(filteredData[0])
              .map(key => `<th class="p-2 text-left font-medium border">${formatFieldName(key)}</th>`)
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
                      ${formatValue(item[key], key)}
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
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${chartTitle || 'Chart Details'}</title>
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
      <h1>${chartTitle || 'Chart Details'}</h1>
      <p>Total Records: ${filteredData.length}</p>
      ${allDataTableHTML}
    </body>
    </html>
  `;
  
  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  printWindow.onload = function() {
    printWindow.print();
    setTimeout(() => {
      try {
        printWindow.close();
      } catch (e) {
        console.warn('Could not close print window:', e);
      }
    }, 500);
  };
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
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {chartTitle || 'Chart Details'} - {selectedCategory && (
               [ <p className="text-sm text-muted-foreground mt-1">
                  Filtered by: {selectedCategory}
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
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-row justify-between gap-3 w-full">
          <div className="flex gap-2">
            <div className=" w-full sm:w-64  flex middle center gap-2">
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
              <div className="relative w-full sm:w-64 flex  middle center gap-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search "
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                type="search"
                className="pl-8 w-full pt-"
              />
              </div>
             
            </div>
          </div>

          <div className="flex gap-2">

  <Button
    variant="outline"
    onClick={handlePrint}
    disabled={filteredData.length === 0}
    className="flex items-center gap-2"
  >
    <Printer className="h-4 w-4" />
    Print
  </Button>
  <Button
    variant="outline"
    onClick={handleDownloadExcel}
    disabled={filteredData.length === 0}
    className="flex items-center gap-2"
  >
    <Download className="h-4 w-4" />
    Export Excel
  </Button>
  
          </div>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {paginatedData.length > 0 ? (
            <>
              <ScrollArea className="w-full">
                <div className="min-w-full">
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      {allFields.map((field, index) => (
                        <th
                          key={field}
                          className="px-4 py-3 text-left text-sm font-medium text-muted-foreground border-b"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {formatFieldName(field)}
                              {/* {isNumericField(field, sampleData) && (
                                <Badge variant="secondary" className="text-xs">
                                  
                                </Badge>
                              )} */}
                            </div>
                            <ExcelFilter column={field} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                   <tbody>
  {paginatedData.map((row, rowIndex) => (
    <tr
      key={rowIndex}
      className="border-b hover:bg-muted/25 transition-colors"
    >
      {allFields.map((field) => (
       <td
  key={`${rowIndex}-${field}`}
  className={`px-4 py-3 text-sm ${isNumericField(field, sampleData) ? 'text-right' : ''}`}
>
          <div className="max-w-xs truncate" title={String(row[field] || '')}>
            {isNumericField(field, sampleData) ? (
              <span className="font-mono">
                {formatValue(row[field], field)}
              </span>
            ) : (
              <span>{String(row[field] || '')}</span>
            )}
          </div>
        </td>
      ))}
    </tr>
  ))}
  
  {/* ADD THIS TOTALS ROW */}
  <tr className="border-t-2 border-primary/20 bg-muted/30 font-semibold">
    {allFields.map((field, index) => (
     
<td
  key={`total-${field}`}
  className={`px-4 py-3 text-sm ${isNumericField(field, sampleData) ? 'text-right' : ''}`}
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
      </td>
    ))}
  </tr>
</tbody>
                  </table>
                </div>
              </ScrollArea>

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