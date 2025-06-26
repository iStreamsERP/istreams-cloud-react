import { useEffect, useState , useRef, useCallback} from "react"
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip, LineChart, Line, AreaChart, Area, PieChart, Pie } from "recharts"
import {Tooltip as FormateTooltip,TooltipProvider, TooltipContent , TooltipTrigger} from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ChevronDown, X, BarChart3, TrendingUp, Settings, Palette, Eye, Download, Activity, AreaChart as AreaChartIcon, BarChart4, PieChart as PieChartIcon } from "lucide-react"
import { callSoapService } from "@/services/callSoapService"
import { useNavigate } from "react-router-dom"
export function GrossSalaryChart({ DashBoardID, ChartNo, chartTitle ,chartType: initialChartType = "bar",chartXAxis,chartYAxis}) {
  const { userData } = useAuth()
  const [tasks, setTasks] = useState([])
  const [displayFormat, setDisplayFormat] = useState("D") // D: Default, K: Thousands, M: Millions
  const [selectedXAxes, setSelectedXAxes] = useState([])
  const [selectedYAxes, setSelectedYAxes] = useState([])
  const [textFields, setTextFields] = useState([])
  const [numericFields, setNumericFields] = useState([])
  
  // Chart type selection - Added pie and donut
  const [chartType, setChartType] = useState(initialChartType) // bar, horizontalBar, line, area, pie, donut
  
  // Enhanced chart options
  const [showDataLabels, setShowDataLabels] = useState(true)
  const [dataLabelPosition, setDataLabelPosition] = useState("top") // top, inside, outside, center
  const [chartHeight, setChartHeight] = useState(450)
  const [barRadius, setBarRadius] = useState(4)
  const [showGrid, setShowGrid] = useState(false)
  const [colorScheme, setColorScheme] = useState("default")
  const [showLegend, setShowLegend] = useState(true)
  const [legendPosition, setLegendPosition] = useState("bottom")
  const [barGap, setBarGap] = useState(4)
  const [fontSize, setFontSize] = useState(12)
  const [showTooltip, setShowTooltip] = useState(true)
  const [sortOrder, setSortOrder] = useState("none") // none, asc, desc
  const [legendFontSize, setLegendFontSize] = useState(14)
  const [maxBarsToShow, setMaxBarsToShow] = useState(50)
  const [customTitle, setCustomTitle] = useState(chartTitle)

 

  // Pie/Donut chart specific options
  const [pieOuterRadius, setPieOuterRadius] = useState(100)
  const [pieInnerRadius, setPieInnerRadius] = useState(0) // 0 for pie, >0 for donut
  const [showPieLabels, setShowPieLabels] = useState(true)
  const [pieStartAngle, setPieStartAngle] = useState(0)
  const [pieEndAngle, setPieEndAngle] = useState(360)

  const [selectedRangeField, setSelectedRangeField] = useState("")
  const [rangeMin, setRangeMin] = useState(0)
  const [rangeMax, setRangeMax] = useState(100000)
  
  const [selectedCategories, setSelectedCategories] = useState({}) // Object to track selected values per field
  const [availableCategories, setAvailableCategories] = useState({}) // Object to store unique values per field
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const navigate = useNavigate()
  const currencySymbol = userData?.companyCurrSymbol || "$"

  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/[_-]/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  }

  const isNumericField = (fieldName, sampleData) => {
    const value = sampleData[fieldName]
    if (value === null || value === undefined || value === '') return false
    
    // Check if it's already a number
    if (typeof value === 'number') return true
    
    // Check if it can be converted to a valid number
    const numValue = Number(value)
    return !isNaN(numValue) && isFinite(numValue)
  }

  useEffect(() => {
    if (DashBoardID && ChartNo) {
      fetchChartData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DashBoardID, ChartNo])

  useEffect(() => {
  if (initialChartType) {
    setChartType(initialChartType)
  }
}, [initialChartType])
  // Update inner radius when chart type changes
  useEffect(() => {
    if (chartType === "donut") {
      setPieInnerRadius(40) // Set default inner radius for donut
    } else if (chartType === "pie") {
      setPieInnerRadius(0) // No inner radius for pie
    }
  }, [chartType])
useEffect(() => {
  if (selectedYAxes.length > 0) {
    // Automatically set the first Y-axis field as the range field
    const firstYField = selectedYAxes[0];
    setSelectedRangeField(firstYField);
    
    // Auto-calculate range when field is set
    if (tasks.length > 0) {
      const values = tasks.map(task => parseFloat(task[firstYField]) || 0).filter(v => !isNaN(v));
      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        setRangeMin(min);
        setRangeMax(max);
      }
    }
  } else {
    // Clear range field when no Y-axes selected
    setSelectedRangeField("");
  }
}, [selectedYAxes, tasks]);

  useEffect(() => {
  if (chartType === "stackedBar" || chartType === "horizontalStackedBar") {
    setDataLabelPosition("center")
  } else {
    setDataLabelPosition("top") // or whatever your default should be
  }
}, [chartType])
const [isDragging, setIsDragging] = useState({ min: false, max: false });
const sliderRef = useRef(null);

// Add these helper functions
const dataMin = Math.min(...tasks.map(t => parseFloat(t[selectedRangeField]) || 0));
const dataMax = Math.max(...tasks.map(t => parseFloat(t[selectedRangeField]) || 0));

const valueToPercent = (value) => {
  return ((value - dataMin) / (dataMax - dataMin)) * 100;
};

const getValueFromPosition = useCallback((clientX) => {
  if (!sliderRef.current) return dataMin;
  
  const rect = sliderRef.current.getBoundingClientRect();
  const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  return dataMin + (percent / 100) * (dataMax - dataMin);
}, [dataMin, dataMax]);

const handleMouseDown = (type) => (e) => {
  e.preventDefault();
  setIsDragging({ ...isDragging, [type]: true });
};

const handleMouseMove = useCallback((e) => {
  if (!isDragging.min && !isDragging.max) return;
  
  const newValue = getValueFromPosition(e.clientX);
  
  if (isDragging.min) {
    const maxAllowed = rangeMax - (dataMax - dataMin) * 0.01;
    const adjustedValue = Math.max(dataMin, Math.min(newValue, maxAllowed));
   setRangeMin(Math.floor(adjustedValue));
  }
  
  if (isDragging.max) {
    const minAllowed = rangeMin + (dataMax - dataMin) * 0.01;
    const adjustedValue = Math.min(dataMax, Math.max(newValue, minAllowed));
    setRangeMax(Math.floor(adjustedValue));
  }
}, [isDragging, rangeMin, rangeMax, dataMin, dataMax, getValueFromPosition]);

const handleMouseUp = useCallback(() => {
  setIsDragging({ min: false, max: false });
}, []);

// Add this useEffect for global event listeners
useEffect(() => {
  if (isDragging.min || isDragging.max) {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }
}, [isDragging, handleMouseMove, handleMouseUp]);

const getFieldMaxValue = (fieldName) => {
  if (!fieldName || tasks.length === 0) return 100000; // default fallback
  
  const values = tasks
    .map(task => parseFloat(task[fieldName]) || 0)
    .filter(value => !isNaN(value) && isFinite(value));
  
  if (values.length === 0) return 100000; // fallback if no valid values
  
  const maxValue = Math.max(...values);
  // Round up to nearest significant number for better UX
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  return Math.ceil(maxValue / magnitude) * magnitude;
};

const getFieldMinValue = (fieldName) => {
  if (!fieldName || tasks.length === 0) return 0; // default fallback
  
  const values = tasks
    .map(task => parseFloat(task[fieldName]) || 0)
    .filter(value => !isNaN(value) && isFinite(value));
  
  if (values.length === 0) return 0; // fallback if no valid values
  
  const minValue = Math.min(...values);
  // Round down to nearest significant number for better UX
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(minValue))));
  return Math.floor(minValue / magnitude) * magnitude;
};


const getEffectiveChartType = () => {
  // If pie or donut chart has more than 1 Y-axis field, make it stacked
  if ((chartType === "pie" || chartType === "donut") && selectedYAxes.length > 1) {
    return chartType === "pie" ? "stackedPie" : "stackedDonut"
  }
  return chartType
}
useEffect(() => {
  // Re-fetch data when X or Y axes selections change
  if (DashBoardID && ChartNo && (selectedXAxes.length > 0 || selectedYAxes.length > 0)) {
    fetchChartData()
  }
}, [selectedXAxes, selectedYAxes])
const fetchChartData = async () => {
  try {
    const chartID = { DashBoardID, ChartNo }
    const res = await callSoapService(userData.clientURL, "BI_GetDashboard_Chart_Data", chartID);
    
    console.log("Fetched chart data:", res)
    
    // Separate fields by type
    if (res.length > 0) {
      const sampleData = res[0]
      const allFields = Object.keys(sampleData)
               
      const textFieldsList = []
      const numericFieldsList = []
               
      allFields.forEach(field => {
        if (isNumericField(field, sampleData)) {
          numericFieldsList.push(field)
        } else {
          textFieldsList.push(field)
        }
      })
               
      setTextFields(textFieldsList)
      setNumericFields(numericFieldsList)
      
      // Set default axes if not already selected
      if (selectedXAxes.length === 0) {
        if (chartXAxis && textFieldsList.includes(chartXAxis)) {
          setSelectedXAxes([chartXAxis])
        } else if (textFieldsList.length > 0) {
          setSelectedXAxes([textFieldsList[0]])
        }
      }
      
      if (selectedYAxes.length === 0) {
        if (chartYAxis && numericFieldsList.includes(chartYAxis)) {
          setSelectedYAxes([chartYAxis])
        } else if (numericFieldsList.length > 0) {
          setSelectedYAxes([numericFieldsList[0]])
        }
      }
      
      // Call grouping API only if we have both X and Y axes selected
      if ((selectedXAxes.length > 0 || (chartXAxis && textFieldsList.includes(chartXAxis))) && 
          (selectedYAxes.length > 0 || (chartYAxis && numericFieldsList.includes(chartYAxis)))) {
        
        // Prepare data for grouping API call
        const inputJSONData = JSON.stringify(res); // Raw JSON data from first API call
        
        // Use selected X-axes or fallback to default
        const groupColumns = selectedXAxes.length > 0 ? 
          selectedXAxes.join(",") : 
          (chartXAxis && textFieldsList.includes(chartXAxis) ? chartXAxis : "");
        
        // Use selected Y-axes or fallback to default
        let yAxisColumns = [];
        if (selectedYAxes.length > 0) {
          yAxisColumns = selectedYAxes;
        } else if (chartYAxis && numericFieldsList.includes(chartYAxis)) {
          yAxisColumns = [chartYAxis];
        } else if (numericFieldsList.length > 0) {
          yAxisColumns = [numericFieldsList[0]];
        }
        
        const summaryColumns = yAxisColumns.map(col => `SUM:${col}`).join(",");
        
        const jsonDataID = {
          inputJSONData: inputJSONData,
          FilterCondition: "",
          groupColumns: groupColumns,
          summaryColumns: summaryColumns
        }
        
        console.log("Grouped json:", inputJSONData);
        console.log("Grouped col:", groupColumns);
        console.log("Grouped sum:", summaryColumns);

        // Call the grouping API with processed data
        const groupedData = await callSoapService(userData.clientURL, "Data_Group_JSONValues", jsonDataID);
        console.log("Grouped chart data:", groupedData);
        
        // Use the grouped data for the chart
        setTasks(groupedData)
      } else {
        // If no axes selected, use original data
        setTasks(res)
      }
    } else {
      // If no data from first API call, set empty tasks
      setTasks([])
    }
  } catch (error) {
    console.error("Failed to fetch chart data", error)
  }
}
  const handleXAxisChange = (field, checked) => {
    if (checked) {
      setSelectedXAxes([...selectedXAxes, field])
    } else {
      setSelectedXAxes(selectedXAxes.filter(f => f !== field))
    }
  }

  const handleYAxisChange = (field, checked) => {
    if (checked) {
      setSelectedYAxes([...selectedYAxes, field])
    } else {
      setSelectedYAxes(selectedYAxes.filter(f => f !== field))
    }
  }

  const removeXAxisField = (field) => {
    setSelectedXAxes(selectedXAxes.filter(f => f !== field))
  }

  const removeYAxisField = (field) => {
    setSelectedYAxes(selectedYAxes.filter(f => f !== field))
  }

  useEffect(() => {
  if (tasks.length > 0 && selectedXAxes.length > 0) {
    const categoriesPerField = {}
    const selectedPerField = {}
    
    selectedXAxes.forEach(xField => {
      const uniqueValues = new Set()
      
      tasks.forEach(task => {
        const value = task[xField] || "Unknown"
        uniqueValues.add(String(value))
      })
      
      const sortedValues = Array.from(uniqueValues).sort()
      categoriesPerField[xField] = sortedValues
      
      // If no categories are selected for this field, select all by default
      if (!selectedCategories[xField] || selectedCategories[xField].length === 0) {
        selectedPerField[xField] = sortedValues
      } else {
        // Filter out any previously selected values that no longer exist
        selectedPerField[xField] = selectedCategories[xField].filter(val => sortedValues.includes(val))
      }
    })
    
    setAvailableCategories(categoriesPerField)
    setSelectedCategories(selectedPerField)
  } else {
    setAvailableCategories({})
    setSelectedCategories({})
  }
}, [tasks, selectedXAxes])

// Add handlers for category filtering
const handleCategoryChange = (field, value, checked) => {
  setSelectedCategories(prev => {
    const fieldCategories = prev[field] || []
    if (checked) {
      return { ...prev, [field]: [...fieldCategories, value] }
    } else {
      return { ...prev, [field]: fieldCategories.filter(v => v !== value) }
    }
  })
}

const selectAllCategories = (field) => {
  setSelectedCategories(prev => ({
    ...prev,
    [field]: [...(availableCategories[field] || [])]
  }))
}

const deselectAllCategories = (field) => {
  setSelectedCategories(prev => ({
    ...prev,
    [field]: []
  }))
}

const processChartData = () => {
  if (selectedXAxes.length === 0 || selectedYAxes.length === 0) return []

  const grouped = {}

  tasks.forEach(task => {
    // Apply range filter if a Y-axis field is selected for filtering
    if (selectedRangeField && selectedYAxes.includes(selectedRangeField)) {
      const fieldValue = parseFloat(task[selectedRangeField]) || 0
      if (fieldValue < rangeMin || fieldValue > rangeMax) {
        return // Skip this record
      }
    }

    // NEW: Apply category filter - check each X-axis field
    let shouldInclude = true
    for (const xField of selectedXAxes) {
      const fieldValue = String(task[xField] || "Unknown")
      const selectedForField = selectedCategories[xField] || []
      
      if (selectedForField.length > 0 && !selectedForField.includes(fieldValue)) {
        shouldInclude = false
        break
      }
    }
    
    if (!shouldInclude) {
      return // Skip this record
    }

    // Create combined X-axis key from selected X fields (values only, no headers)
    const xKey = selectedXAxes.map(xField => {
      const value = task[xField]
      return value || "Unknown"
    }).join(" | ")
    
    if (!grouped[xKey]) {
      grouped[xKey] = { combinedKey: xKey, name: xKey } // Add 'name' for pie chart
      selectedYAxes.forEach(yField => {
        grouped[xKey][yField] = 0
      })
    }

    selectedYAxes.forEach(yField => {
      const yValue = parseFloat(task[yField]) || 0
      grouped[xKey][yField] += yValue
    })
  })

  let processedData = Object.values(grouped)

  // Apply sorting
  if (sortOrder !== "none" && selectedYAxes.length > 0) {
    const primaryYField = selectedYAxes[0]
    processedData.sort((a, b) => {
      const valueA = a[primaryYField] || 0
      const valueB = b[primaryYField] || 0
      return sortOrder === "asc" ? valueA - valueB : valueB - valueA
    })
  }

  // Limit number of bars
  if (maxBarsToShow > 0) {
    processedData = processedData.slice(0, maxBarsToShow)
  }

  return processedData
}

// 3. Make sure this line comes AFTER the processChartData function:
const chartData = processChartData()

  const calculateTotal = (field) => {
    return chartData.reduce((sum, item) => sum + (item[field] || 0), 0)
  }

const formatValue = (value, fieldName = '') => {
  if (typeof value !== 'number') return value
  
  // Check if field name contains currency-related keywords
  const currencyKeywords = ['currency', 'curr', 'cost', 'value', 'amount', 'salary', 'salaries'];
  const fieldNameStr = String(fieldName || '');
  const shouldShowCurrency = currencyKeywords.some(keyword => 
    fieldNameStr.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Helper function to format numbers in Indian style (lakhs/crores system)
  const formatIndianNumber = (num) => {
    const isNegative = num < 0
    const absNum = Math.abs(num)
    const numStr = absNum.toString()
    
    if (numStr.length <= 3) {
      return (isNegative ? '-' : '') + numStr
    }
    
    // Split into groups: first 3 digits from right, then groups of 2
    const firstThree = numStr.slice(-3)
    const remaining = numStr.slice(0, -3)
    
    let formatted = firstThree
    let remainingStr = remaining
    
    // Add commas for every 2 digits from right to left in the remaining part
    while (remainingStr.length > 0) {
      if (remainingStr.length <= 2) {
        formatted = remainingStr + ',' + formatted
        break
      } else {
        const lastTwo = remainingStr.slice(-2)
        formatted = lastTwo + ',' + formatted
        remainingStr = remainingStr.slice(0, -2)
      }
    }
    
    return (isNegative ? '-' : '') + formatted
  }
  
  // Check if currency is INR (Indian Rupee)
  const isINR = userData.companyCurrIsIndianStandard === false;
  const prefix = shouldShowCurrency ? `${currencySymbol} ` : '';
  switch (displayFormat) {
    case "K":
      if (isINR) {
        return `${prefix}${formatIndianNumber(Math.round(value / 1000))}k`;
      } else {
        return `${prefix}${(value / 1000).toFixed(userData?.companyCurrDecimals || 0)}k`;
      }
    case "M":
      if (isINR) {
        return `${prefix}${formatIndianNumber(Math.round(value / 1_000_000))}M`;
      } else {
        return `${prefix}${(value / 1_000_000).toFixed(userData?.companyCurrDecimals || 0)}M`;
      }
    default:
      if (isINR) {
        return `${prefix}${formatIndianNumber(Math.round(value))}`;
      } else {
        return `${prefix}${value.toLocaleString()}`;
      }
  }
}



  const getDataLabelPosition = () => {
    const positions = {
      top: "top",
      inside: "inside",
      outside: "outside", 
      center: "center",
      bottom: "bottom"
    }
    return positions[dataLabelPosition] || "top"
  }

const handleBarClick = (data, index, event) => {
  if (!data || !data.payload) return
  
  const clickedData = data.payload
  const selectedCategory = clickedData.combinedKey || clickedData.name
  
  // Get the primary Y-axis field (first selected field)
  const primaryField = selectedYAxes[0]
  if (!primaryField) return
  
  const fieldValue = clickedData[primaryField]
  
  // Navigate to chart details page with drill-down data
  navigate('/Chartdetails', {
    state: {
      dashboardId: DashBoardID,
      chartNo: ChartNo,
      chartTitle: customTitle,
      selectedCategory: selectedCategory, // The clicked category value
      filterField: primaryField, // The field being filtered on
      filterValue: fieldValue, // The value being filtered
      xAxisFields: selectedXAxes, // Array of X-axis fields for filter construction
      yAxisFields: selectedYAxes, // Array of Y-axis fields for reference
      // Additional context for filtering
      filterContext: {
        rangeMin: rangeMin,
        rangeMax: rangeMax,
        selectedRangeField: selectedRangeField,
        selectedCategories: selectedCategories,
        displayFormat: displayFormat
      }
    }
  })
}
  const getChartTypeIcon = (type) => {
    switch (type) {
      case "bar":
        return <BarChart3 className="h-4 w-4" />
   case "stackedBar":
    case "horizontalBar":
    case "horizontalStackedBar":
      return <BarChart4 className="h-4 w-4" />
      case "line":
        return <Activity className="h-4 w-4" />
      case "area":
        return <AreaChartIcon className="h-4 w-4" />
      case "pie":
      case "donut":
        return <PieChartIcon className="h-4 w-4" />
        case "stackedPie":
  return <PieChartIcon className="h-4 w-4" />
      default:
        return <BarChart3 className="h-4 w-4" />
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
  if (!showTooltip || !active || !payload || !payload.length) return null
  
  return (
    <div className="bg-white dark:bg-slate-800 p-3 border rounded-lg shadow-lg max-w-xs">
      <p className="font-medium mb-2 text-sm break-words">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm">
          <span style={{ color: entry.color }}>●</span>
          {` ${formatFieldName(entry.dataKey || entry.name)}: ${formatValue(entry.value, entry.dataKey || entry.name)}`}
        </p>
      ))}
    </div>
  )
}

  // Custom label function for pie/donut charts
 const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value, dataKey }) => {
  if (!showPieLabels) return null
  
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 30
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text 
      x={x} 
      y={y} 
      fill="currentColor" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={fontSize}
      className="fill-foreground"
    >
      {`${name}: ${formatValue(value, dataKey || name)} (${(percent * 100).toFixed(1)}%)`}
    </text>
  )
}

  const exportChartData = () => {
    const csvContent = [
      // Headers
      ['Category', ...selectedYAxes.map(formatFieldName)].join(','),
      // Data rows
      ...chartData.map(row => [
        row.combinedKey,
        ...selectedYAxes.map(field => row[field] || 0)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${customTitle.replace(/\s+/g, '_')}_data.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: chartType === "horizontalBar" 
        ? { top: 20, right: 30, left: 100, bottom: 20 }
        : { top: 20, right: 30, left: 20, bottom: 100 }
    }

    const xAxisProps = chartType === "horizontalBar" 
      ? {
          type: "number",
          tickLine: false,
          axisLine: false,
          fontSize: fontSize,
          tickFormatter: formatValue
        }
      : {
          dataKey: "combinedKey",
          tickLine: false,
          axisLine: false,
          tickMargin: 10,
          fontSize: fontSize,
          angle: -45,
          textAnchor: "end",
          height: 120,
          tickFormatter: (value) => {
            return String(value).length > 30 
              ? String(value).substring(0, 30) + "..." 
              : String(value)
          }
        }

    const yAxisProps = chartType === "horizontalBar"
      ? {
          type: "category",
          dataKey: "combinedKey",
          tickLine: false,
          axisLine: false,
          fontSize: fontSize,
          width: 100,
          tickFormatter: (value) => {
            return String(value).length > 15 
              ? String(value).substring(0, 15) + "..." 
              : String(value)
          }
        }
      : {
          tickLine: false,
          axisLine: false,
          fontSize: fontSize,
          tickFormatter: formatValue,
          grid: showGrid
        }

    switch (chartType) {
      case "bar":
        return (
          <BarChart {...commonProps} barGap={barGap}>
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            
            {selectedYAxes.length > 1 && showLegend && (
              <Legend 
                formatter={(value) => formatFieldName(value)}
                wrapperStyle={{ paddingTop: "20px", fontSize: `${legendFontSize}px` }}
                layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
                align={legendPosition === "left" ? "left" : legendPosition === "right" ? "right" : "center"}
                verticalAlign={legendPosition === "top" ? "top" : "bottom"}
              />
            )}

            {selectedYAxes.map((field, index) => (
              <Bar 
                key={field}
                dataKey={field} 
                fill={getFieldColor(index)}
                radius={barRadius}
                name={formatFieldName(field)}
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
              >
                {showDataLabels && (
                  <LabelList
                    dataKey={field}
                    position={getDataLabelPosition()}
                    formatter={(value) => formatValue(value, field)}
                    className="fill-foreground"
                    fontSize={fontSize - 2}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        )
       // Replace the horizontalBar case in your renderChart() function with this fixed version:

{(chartType === "pie" || chartType === "donut" || getEffectiveChartType().includes("stacked")) && (
  <div className="space-y-4">
    <h5 className="font-medium text-sm">
      {getEffectiveChartType().includes("stacked") ? 
        `Stacked ${chartType === "donut" ? "Donut" : "Pie"} Options` : 
        "Pie/Donut Options"
      }
    </h5>
    
    {getEffectiveChartType().includes("stacked") && (
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Auto-Stacked {chartType === "donut" ? "Donut" : "Pie"} Chart:</strong> Creates nested rings with multiple data series. 
          Each Y-axis field creates a new ring automatically when multiple fields are selected.
        </p>
      </div>
    )}
    
    {/* Rest of the pie/donut options remain the same */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm">Outer Radius:</Label>
        <Input
          type="number"
          value={pieOuterRadius}
          onChange={(e) => setPieOuterRadius(Number(e.target.value))}
          min="50"
          max="150"
        />
      </div>
      
      {(chartType === "donut" || getEffectiveChartType().includes("stacked")) && (
        <div className="space-y-2">
          <Label className="text-sm">Inner Radius:</Label>
          <Input
            type="number"
            value={pieInnerRadius}
            onChange={(e) => setPieInnerRadius(Number(e.target.value))}
            min="0"
            max="100"
          />
        </div>
      )}
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm">Start Angle:</Label>
        <Input
          type="number"
          value={pieStartAngle}
          onChange={(e) => setPieStartAngle(Number(e.target.value))}
          min="0"
          max="360"
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm">End Angle:</Label>
        <Input
          type="number"
          value={pieEndAngle}
          onChange={(e) => setPieEndAngle(Number(e.target.value))}
          min="0"
          max="360"
        />
      </div>
    </div>

    <div className="flex items-center space-x-2">
      <Checkbox
        id="showPieLabels"
        checked={showPieLabels}
        onCheckedChange={setShowPieLabels}
      />
      <Label htmlFor="showPieLabels" className="text-sm">
        {getEffectiveChartType().includes("stacked") ? "Show Labels (Outer Ring Only)" : "Show Pie Labels"}
      </Label>
    </div>
  </div>
)}
      default:
        return null
    }
  }

return (
<Card className="w-full bg-white dark:bg-slate-950 border shadow-sm">
  <CardHeader className="p-2 sm:p-4">
    {/* Top row: Title and Controls */}
  <div className="flex flex-wrap gap-4 items-center justify-between">
      {/* Title and Display Format */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center min-w-0 flex-shrink">
        <h3 className="text-lg sm:text-xl font-bold truncate flex flex-col gap-1 ">     
          {chartTitle}
          <span className="text-sm">CurrencyType:{userData.companyCurrName}</span>
        </h3>
       
      </div>
      
      {/* Chart Type and Action Buttons */}
      <div className="flex flex-wrap gap-2 items-center justify-between sm:justify-between min-w-fit">
     
      </div>
    </div>


    <div className="space-y-4 mb-4 sm:mb-6 flex flex-row gap-2 items-center justify-between flex-wrap">
       
      {/* Single line: X-Axis, Y-Axis, and Range */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        
       
      {/* X-Axis Selection */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded flex-shrink-0">
              <BarChart3 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              X-Axis
            </label>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow text-xs h-9"
              >
                <span className="truncate">
                  {selectedXAxes.length > 0 ? selectedXAxes.map(field => formatFieldName(field)).join(', ') : 'Select'}
                </span>
                <ChevronDown className="h-3 w-3 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] sm:w-96" align="start">
              <div className="space-y-4">
                {/* Field Selection Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-xs">Select Text/String Fields</h4>
                    <Badge variant="secondary" className="text-xs">
                      {textFields.length}
                    </Badge>
                  </div>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {textFields.length > 0 ? (
                        textFields.map(field => (
                          <div key={`x-${field}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`x-${field}`}
                              checked={selectedXAxes.includes(field)}
                              onCheckedChange={(checked) => handleXAxisChange(field, checked)}
                            />
                            <label
                              htmlFor={`x-${field}`}
                              className="text-xs cursor-pointer flex-1 truncate"
                            >
                              {formatFieldName(field)}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No text fields found
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Category Filters Section - Only show if fields are selected */}
                {selectedXAxes.length > 0 && Object.keys(availableCategories).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-orange-100 dark:bg-orange-900 rounded flex-shrink-0">
                          <Eye className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h4 className="font-medium text-xs">Category Filters</h4>
                      </div>
                      
                      <ScrollArea className="h-48">
                        <div className="space-y-3">
                          {selectedXAxes.map(field => (
                            <div key={`category-filter-${field}`} className="space-y-2 p-2 border rounded-md bg-gray-50 dark:bg-slate-900">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                                  {formatFieldName(field)}
                                </label>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {(selectedCategories[field] || []).length}/{(availableCategories[field] || []).length}
                                  </Badge>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => selectAllCategories(field)}
                                      className="text-xs h-5 px-1"
                                    >
                                      All
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deselectAllCategories(field)}
                                      className="text-xs h-5 px-1"
                                    >
                                      None
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="max-h-24 overflow-y-auto">
                                <div className="space-y-1">
                                  {(availableCategories[field] || []).map(value => (
                                    <div key={`${field}-${value}`} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${field}-${value}`}
                                        checked={(selectedCategories[field] || []).includes(value)}
                                        onCheckedChange={(checked) => handleCategoryChange(field, value, checked)}
                                      />
                                      <label
                                        htmlFor={`${field}-${value}`}
                                        className="text-xs cursor-pointer flex-1 break-words"
                                        title={value}
                                      >
                                        {String(value).length > 20 ? `${String(value).substring(0, 20)}...` : String(value)}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground text-center border-t pt-1">
                                {(selectedCategories[field] || []).length} of {(availableCategories[field] || []).length} selected
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Y-Axis Selection */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-green-100 dark:bg-green-900 rounded flex-shrink-0">
              <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            </div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Y-Axis
            </label>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow text-xs h-9"
              >
                <span className="truncate">
                  {selectedYAxes.length > 0 ? selectedYAxes.map(field => formatFieldName(field)).join(', ') : 'Select'}
                </span>
                <ChevronDown className="h-3 w-3 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] sm:w-80" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-xs">Select Numeric Fields</h4>
                  <Badge variant="secondary" className="text-xs">
                    {numericFields.length}
                  </Badge>
                </div>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {numericFields.length > 0 ? (
                      numericFields.map(field => (
                        <div key={`y-${field}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`y-${field}`}
                            checked={selectedYAxes.includes(field)}
                            onCheckedChange={(checked) => handleYAxisChange(field, checked)}
                          />
                          <label
                            htmlFor={`y-${field}`}
                            className="text-xs cursor-pointer flex-1 truncate"
                          >
                            {formatFieldName(field)}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No numeric fields found
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>
        </div>
    
      </div>
       {/* Range Slider - Inline */}
      <div className="w-[200px]">
            {selectedYAxes.length > 0 && selectedRangeField && (
          <div className="flex-1 space-y-2">
           
            <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-700 dark:text-blue-300 truncate">
                    {formatFieldName(selectedRangeField)}
                  </span>
                 <div className="flex items-center space-x-1 font-mono bg-white dark:bg-slate-800 px-1 py-1 rounded border text-xs">
  <input
    type="text"
    value={rangeMin}
    onChange={(e) => {
      const raw = e.target.value;
      const num = Number(raw);
      if (!isNaN(num)) setRangeMin(num);
    }}
    className="w-10 bg-transparent text-blue-600 dark:text-blue-400 text-right outline-none"
  />
  <span className="text-gray-400">-</span>
  <input
    type="text"
    value={rangeMax}
    onChange={(e) => {
      const raw = e.target.value;
      const num = Number(raw);
      if (!isNaN(num)) setRangeMax(num);
    }}
    className="w-10 bg-transparent text-blue-600 dark:text-blue-400 text-right outline-none"
  />
</div>

                </div>
                
                {/* Compact Range Slider */}
                <div className="relative w-full h-6 flex items-center" ref={sliderRef}>
  <div className="absolute w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-inner"></div>
  <div
    className="absolute h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-md"
    style={{
      left: `${valueToPercent(rangeMin)}%`,
      width: `${valueToPercent(rangeMax) - valueToPercent(rangeMin)}%`
    }}
  ></div>
  
  {/* Min thumb */}
  <div
    className={`absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg cursor-pointer transform -translate-x-1/2 z-20 transition-transform hover:scale-110 ${
      isDragging.min ? 'scale-110' : ''
    }`}
    style={{ left: `${valueToPercent(rangeMin)}%` }}
    onMouseDown={handleMouseDown('min')}
  />
  
  {/* Max thumb */}
  <div
    className={`absolute w-4 h-4 bg-indigo-500 border-2 border-white rounded-full shadow-lg cursor-pointer transform -translate-x-1/2 z-20 transition-transform hover:scale-110 ${
      isDragging.max ? 'scale-110' : ''
    }`}
    style={{ left: `${valueToPercent(rangeMax)}%` }}
    onMouseDown={handleMouseDown('max')}
  />
  
  {/* Hidden range inputs for accessibility and keyboard support */}
  <input
    type="range"
    min={dataMin}
    max={dataMax}
    step={(dataMax - dataMin) / 100}
    value={rangeMin}
    onChange={(e) => {
      const value = Number(e.target.value);
      const adjustedValue = Math.max(dataMin, Math.min(value, rangeMax - (dataMax - dataMin) * 0.01));
      setRangeMin(Math.floor(adjustedValue));
    }}
    className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer opacity-0 z-10"
  />
  
  <input
    type="range"
    min={dataMin}
    max={dataMax}
    step={(dataMax - dataMin) / 100}
    value={rangeMax}
    onChange={(e) => {
      const value = Number(e.target.value);
      const adjustedValue = Math.min(dataMax, Math.max(value, rangeMin + (dataMax - dataMin) * 0.01));
      setRangeMax(Math.floor(adjustedValue));
    }}
    className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer opacity-0 z-10"
  />
</div>
              </div>
            </div>
          </div>
        )}
      </div>
         
     
    </div>

    <Separator />

    {/* Totals Display */}
    {selectedYAxes.length > 0 && (
      
      <div className="mt-4 sm:mt-6 flex flex-row items-center justify-between">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-3 gap-3 ">
          
          {selectedYAxes.map(field => (
            <div key={field} className="bg-white dark:bg-slate-950 p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-medium text-muted-foreground mb-1 truncate">
                {formatFieldName(field)}
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
               {formatValue(calculateTotal(field), field)}
              </div>
            </div>
          ))}
          
        </div>
  <TooltipProvider>
  <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
    <FormateTooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant={displayFormat === "D" ? "default" : "ghost"}
          onClick={() => setDisplayFormat("D")}
          className={`flex-1 text-xs px-2 py-1 ${displayFormat === "D" ? "shadow-sm" : ""}`}
        >
          Default
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Show values in default</p>
      </TooltipContent>
    </FormateTooltip>
    
    <FormateTooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant={displayFormat === "K" ? "default" : "ghost"}
          onClick={() => setDisplayFormat("K")}
          className={`flex-1 text-xs px-2 py-1 ${displayFormat === "K" ? "shadow-sm" : ""}`}
        >
          K
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Show values in thousands</p>
      </TooltipContent>
    </FormateTooltip>
    
    <FormateTooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant={displayFormat === "M" ? "default" : "ghost"}
          onClick={() => setDisplayFormat("M")}
          className={`flex-1 text-xs px-2 py-1 ${displayFormat === "M" ? "shadow-sm" : ""}`}
        >
          M
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Show values in millions</p>
      </TooltipContent>
    </FormateTooltip>
  </div>
</TooltipProvider>
      </div>
    )}
  </CardHeader>

  <CardContent className="p-2 sm:p-4 pt-0">
     {chartData.length > 0 && selectedXAxes.length > 0 && selectedYAxes.length > 0 ? (
          <div id={`chart-container-${ChartNo}`} style={{ width: "100%", height: chartHeight }}>
            <ResponsiveContainer>{renderChart()}</ResponsiveContainer>
          </div>
        ): (
      <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-muted-foreground">
        {getChartTypeIcon(chartType)}
        <div className="mt-4 text-center px-4">
          <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 mb-4 mx-auto" />
          <p className="text-base sm:text-lg mb-2">Configure Your Chart</p>
          <p className="text-xs sm:text-sm">Select fields from the dropdowns above to display your chart</p>
        </div>
      </div>
    )}
  </CardContent>
</Card>
)
}