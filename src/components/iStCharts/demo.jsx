import { useEffect, useState } from "react"
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip, LineChart, Line, AreaChart, Area, PieChart, Pie } from "recharts"
import {
  Tooltip as FormateTooltip,
  TooltipProvider,
  TooltipContent ,
  TooltipTrigger ,
} from "@/components/ui/tooltip"
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import html2canvas from "html2canvas"
import { callSoapService } from "@/services/callSoapService"
export function GrossSalaryChart({ DashBoardID, ChartNo, chartTitle ,chartType: initialChartType = "bar"}) {
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

  // Line/Area chart specific options
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [showDots, setShowDots] = useState(true)
  const [fillOpacity, setFillOpacity] = useState(0.6)
  const [curveType, setCurveType] = useState("monotone") // monotone, linear, cardinal

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

  const fetchChartData = async () => {
    try {
      const chartID = { DashBoardID, ChartNo }
      const res = await callSoapService(userData.clientURL, "BI_GetDashboard_Chart_Data", chartID);
      console.log("Fetched chart data:", res)
      setTasks(res)

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
        
        // Set defaults
        if (textFieldsList.length > 0 && selectedXAxes.length === 0) {
          setSelectedXAxes([textFieldsList[0]])
        }
        if (numericFieldsList.length > 0 && selectedYAxes.length === 0) {
          setSelectedYAxes([numericFieldsList[0]])
        }
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
  const isINR = userData?.companyCurrIsIndianStandard === true;
  const prefix = shouldShowCurrency ? currencySymbol : '';

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

case "horizontalBar":
  return (
    <BarChart 
      {...commonProps} 
      layout="vertical"  // Changed from "horizontal" to "vertical"
      barGap={barGap}
      margin={{ top: 20, right: 50, left: 150, bottom: 20 }} // Increased right margin for labels
    >
      <XAxis 
        type="number"
        tickLine={false}
        axisLine={false}
        fontSize={fontSize}
        tickFormatter={formatValue}
        grid={showGrid}
      />
      <YAxis 
        type="category"
        dataKey="combinedKey"
        tickLine={false}
        axisLine={false}
        fontSize={fontSize}
        width={140}
        tickFormatter={(value) => {
          return String(value).length > 20 
            ? String(value).substring(0, 20) + "..." 
            : String(value)
        }}
      />
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
          radius={[0, barRadius, barRadius, 0]} // Horizontal bar radius
          name={formatFieldName(field)}
        >
          {showDataLabels && (
            <LabelList
              dataKey={field}
              position="right"
              formatter={(value) => formatValue(value, field)}
              className="fill-foreground"
              fontSize={fontSize - 2}
            />
          )}
        </Bar>
      ))}
    </BarChart>
  )

// Also replace the horizontalStackedBar case with this fixed version:

case "horizontalStackedBar":
  return (
    <BarChart 
      {...commonProps} 
      layout="vertical"  // Changed from "horizontal" to "vertical"
      barGap={barGap}
      margin={{ top: 20, right: 50, left: 150, bottom: 20 }}
    >
      <XAxis 
        type="number"
        tickLine={false}
        axisLine={false}
        fontSize={fontSize}
        tickFormatter={formatValue}
        grid={showGrid}
      />
      <YAxis 
        type="category"
        dataKey="combinedKey"
        tickLine={false}
        axisLine={false}
        fontSize={fontSize}
        width={140}
        tickFormatter={(value) => {
          return String(value).length > 20 
            ? String(value).substring(0, 20) + "..." 
            : String(value)
        }}
      />
      {showTooltip && <Tooltip content={<CustomTooltip />} />}
      
      {/* Always show legend for stacked charts */}
      <Legend 
        formatter={(value) => formatFieldName(value)}
        wrapperStyle={{ paddingTop: "20px" , fontSize: `${legendFontSize}px`}}
        layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
        align={legendPosition === "left" ? "left" : legendPosition === "right" ? "right" : "center"}
        verticalAlign={legendPosition === "top" ? "top" : "bottom"}
      />

      {selectedYAxes.map((field, index) => (
        <Bar 
          key={field}
          dataKey={field} 
          stackId="horizontalStack"
          fill={getFieldColor(index)}
          radius={index === selectedYAxes.length - 1 ? [0, barRadius, barRadius, 0] : [0, 0, 0, 0]}
          name={formatFieldName(field)}
        >
          {showDataLabels && (
            <LabelList
              dataKey={field}
                           position={dataLabelPosition === "center" ? "inside" : getDataLabelPosition()}
              formatter={(value) => formatValue(value, field)}
              className="fill-foreground"
              fontSize={fontSize - 2}
            />
          )}
        </Bar>
      ))}
    </BarChart>
  )
      case "line":
        return (
          <LineChart {...commonProps}>
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            
            {selectedYAxes.length > 1 && showLegend && (
              <Legend 
                formatter={(value) => formatFieldName(value)}
                wrapperStyle={{ paddingTop: "20px", fontSize: `${legendFontSize}px` }}
              />
            )}

            {selectedYAxes.map((field, index) => (
              <Line
                key={field}
                type={curveType}
                dataKey={field}
                stroke={getFieldColor(index)}
                strokeWidth={strokeWidth}
                dot={showDots ? { r: 4 } : false}
                name={formatFieldName(field)}
              />
            ))}
          </LineChart>
        )

      case "area":
        return (
          <AreaChart {...commonProps}>
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            
            {selectedYAxes.length > 1 && showLegend && (
              <Legend 
                formatter={(value) => formatFieldName(value)}
                wrapperStyle={{ paddingTop: "20px", fontSize: `${legendFontSize}px` }}
              />
            )}

            {selectedYAxes.map((field, index) => (
              <Area
                key={field}
                type={curveType}
                dataKey={field}
                stroke={getFieldColor(index)}
                fill={getFieldColor(index)}
                fillOpacity={fillOpacity}
                strokeWidth={strokeWidth}
                name={formatFieldName(field)}
              />
            ))}
          </AreaChart>
        )

case "stackedBar":
   return (
    <BarChart {...commonProps} barGap={barGap}>
      <XAxis {...xAxisProps} />
      <YAxis {...yAxisProps} />
      {showTooltip && <Tooltip content={<CustomTooltip />} />}
      
      {/* Always show legend for stacked charts */}
      <Legend 
        formatter={(value) => formatFieldName(value)}
        wrapperStyle={{ paddingTop: "20px", fontSize: `${legendFontSize}px` }}
        layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
        align={legendPosition === "left" ? "left" : legendPosition === "right" ? "right" : "center"}
        verticalAlign={legendPosition === "top" ? "top" : "bottom"}
      />

      {selectedYAxes.map((field, index) => (
        <Bar 
          key={field}
          dataKey={field} 
          stackId="stack1" // This creates the stacking effect
          fill={getFieldColor(index)}
          radius={index === selectedYAxes.length - 1 ? [barRadius, barRadius, 0, 0] : [0, 0, 0, 0]} // Only round top bar
          name={formatFieldName(field)}
        >
          {showDataLabels && (
            <LabelList
              dataKey={field}
              position={dataLabelPosition === "center" ? "inside" : getDataLabelPosition()}
              formatter={(value) => formatValue(value, field)}
              className="fill-foreground"
              fontSize={fontSize - 2}
            />
          )}
        </Bar>
      ))}
    </BarChart>
  )

case "pie":
case "donut":
case "stackedPie":
case "stackedDonut":
  const effectiveType = getEffectiveChartType()
  const isStacked = effectiveType === "stackedPie" || effectiveType === "stackedDonut"
  const isDonut = effectiveType === "donut" || effectiveType === "stackedDonut"
  
  // For regular pie/donut with single Y-axis
  if (!isStacked) {
    return (
      <PieChart {...commonProps}>
        {showTooltip && <Tooltip content={<CustomTooltip />} />}
        
        {showLegend && chartData.length > 1 && (
          <Legend
            formatter={(value) => value}
            layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
            align={legendPosition === "left" ? "left" : legendPosition === "right" ? "right" : "center"}
             verticalAlign={legendPosition === "top" ? "top" : "bottom"}
            wrapperStyle={{ paddingTop: "20px", fontSize: `${legendFontSize}px` }}

          />
        )}
        
        <Pie
          data={chartData}
          dataKey={selectedYAxes[0]}
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={pieOuterRadius}
          innerRadius={isDonut ? pieInnerRadius : 0}
          fill="#8884d8"
          label={renderCustomLabel}
          labelLine={false}
          startAngle={pieStartAngle}
          endAngle={pieEndAngle}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getFieldColor(index)} />
          ))}
        </Pie>
      </PieChart>
    )
  }
  
  // For stacked pie/donut with multiple Y-axis fields
  if (selectedYAxes.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <PieChartIcon className="h-12 w-12 mb-4 mx-auto" />
          <p className="text-lg mb-2">Stacked {isDonut ? 'Donut' : 'Pie'} Chart</p>
          <p className="text-sm">Multiple Y-axis fields detected. Showing stacked view.</p>
        </div>
      </div>
    )
  }

  return (
    <PieChart {...commonProps}>
      {showTooltip && <Tooltip content={<CustomTooltip />} />}
      {showLegend && (
        <Legend
          formatter={(value) => formatFieldName(value)}
          layout={legendPosition === "left" || legendPosition === "right" ? "vertical" : "horizontal"}
          align={legendPosition === "left" ? "left" : legendPosition === "right" ? "right" : "center"}
          verticalAlign={legendPosition === "top" ? "top" : "bottom"}
        />
      )}
      
      {/* Outer ring (first Y-axis field) */}
      <Pie
        data={chartData}
        dataKey={selectedYAxes[0]}
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={pieOuterRadius}
        innerRadius={isDonut ? pieInnerRadius : pieInnerRadius}
        fill="#8884d8"
        label={showPieLabels ? renderCustomLabel : false}
        labelLine={false}
        startAngle={pieStartAngle}
        endAngle={pieEndAngle}
      >
        {chartData.map((entry, index) => (
          <Cell key={`outer-cell-${index}`} fill={getFieldColor(index)} />
        ))}
      </Pie>

      {/* Inner rings for additional Y-axis fields */}
      {selectedYAxes.slice(1).map((field, fieldIndex) => {
        const ringIndex = fieldIndex + 1
        const currentOuterRadius = Math.max(30, pieOuterRadius - (ringIndex * 25))
        const currentInnerRadius = Math.max(10, currentOuterRadius - 20)
        
        return (
          <Pie
            key={`ring-${fieldIndex}`}
            data={chartData}
            dataKey={field}
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={currentOuterRadius}
            innerRadius={currentInnerRadius}
            fill="#82ca9d"
            startAngle={pieStartAngle}
            endAngle={pieEndAngle}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`ring-${fieldIndex}-cell-${index}`} 
                fill={getFieldColor(index + (ringIndex * selectedYAxes.length))} 
              />
            ))}
          </Pie>
        )
      })}
    </PieChart>
  )

// Also add this notification in the chart configuration area, replace the existing pie chart notice with:

{(chartType === "pie" || chartType === "donut") && selectedYAxes.length > 1 && (
  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    <div className="flex items-start gap-2">
      <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded">
        <PieChartIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
          Auto-Stacked {chartType === "donut" ? "Donut" : "Pie"} Chart
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Multiple Y-axis fields detected ({selectedYAxes.length} fields). 
          Automatically switched to stacked {chartType} chart to display all data series.
        </p>
      </div>
    </div>
  </div>
)}

// Update the Advanced Options section for pie/donut charts:

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
  
      {/* Title and Display Format */}
  

    <Separator />

    {/* Totals Display */}
    {selectedYAxes.length > 0 && (
      
      <div className="mt-4 sm:mt-6 flex flex-row items-center justify-between">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-3 ">
          
          {selectedYAxes.map(field => (
            <div key={field} className="bg-white dark:bg-slate-950 p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs font-medium text-muted-foreground mb-1 truncate">
                {formatFieldName(field)}
              </div>
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
               {formatValue(calculateTotal(field), field)}
              </div>
            </div>
          ))}
          
        </div>

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