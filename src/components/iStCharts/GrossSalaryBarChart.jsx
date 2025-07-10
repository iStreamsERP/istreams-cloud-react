import { useEffect, useState, useRef, useCallback } from "react"
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip, LineChart, Line, AreaChart, Area, PieChart, Pie } from "recharts"
import { Tooltip as FormateTooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
import { ChevronDown, X, BarChart3, TrendingUp, Settings, Palette, Eye, Download, Activity, AreaChart as AreaChartIcon, BarChart4, PieChart as PieChartIcon, MessageCircle, Sparkles, Zap, Brain, Cpu } from "lucide-react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import html2canvas from "html2canvas"
import { callSoapService } from "@/api/callSoapService"
import { useNavigate } from "react-router-dom"
import ChatbotUI from "../ChatbotUI"
export function GrossSalaryChart({ DashBoardID, ChartNo, chartTitle, chartType: initialChartType = "bar", chartXAxis, chartYAxis }) {
  const { userData } = useAuth()
  const [tasks, setTasks] = useState([])
  const [displayFormat, setDisplayFormat] = useState("D") // D: Default, K: Thousands, M: Millions
  const [selectedXAxes, setSelectedXAxes] = useState([])
  const [selectedYAxes, setSelectedYAxes] = useState([])
  const [textFields, setTextFields] = useState([])
  const [numericFields, setNumericFields] = useState([])
  const [yAxisAggregations, setYAxisAggregations] = useState({});

  // Chart type selection - Added pie and donut
  const [chartType, setChartType] = useState(initialChartType) // bar, horizontalBar, line, area, pie, donut
  const [dbData, setDbData] = useState([])
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
    if (typeof value === 'number') return true
    const numValue = Number(value)
    return !isNaN(numValue) && isFinite(numValue)
  }

  useEffect(() => {
    if (DashBoardID && ChartNo) {
      fetchChartData()
    }
  }, [DashBoardID, ChartNo])
  useEffect(() => {
    if (dbData.length > 0 && DashBoardID) {
      // Find the configuration for current chart
      const chartConfig = dbData.find(config =>
        config[`CHART${DashBoardID}_X_AXIS1`] || config[`CHART${DashBoardID}_Y_AXIS1`]
      )

      if (chartConfig) {
        // Set default X-axis field
        const defaultXField = chartConfig[`CHART${DashBoardID}_X_AXIS1`]
        if (defaultXField && textFields.includes(defaultXField) && selectedXAxes.length === 0) {
          setSelectedXAxes([defaultXField])
        }

        // Set default Y-axis field  
        const defaultYField = chartConfig[`CHART${DashBoardID}_Y_AXIS1`]
        if (defaultYField && numericFields.includes(defaultYField) && selectedYAxes.length === 0) {
          setSelectedYAxes([defaultYField])
        }
      }
    }
  }, [dbData, DashBoardID, textFields, numericFields, selectedXAxes.length, selectedYAxes.length])
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
      const chartID = { DashBoardID, ChartNo };
      const res = await callSoapService(userData.clientURL, "BI_GetDashboard_Chart_Data", chartID);

      console.log("Fetched chart data:", res);

      if (!Array.isArray(res) || res.length === 0) {
        console.warn("No data returned from BI_GetDashboard_Chart_Data");
        setTasks([]);
        return;
      }

      const sampleData = res[0];
      const allFields = Object.keys(sampleData);

      const textFieldsList = [];
      const numericFieldsList = [];

      allFields.forEach(field => {
        if (isNumericField(field, sampleData)) {
          numericFieldsList.push(field);
        } else {
          textFieldsList.push(field);
        }
      });

      setTextFields(textFieldsList);
      setNumericFields(numericFieldsList);

      // Determine X and Y axes
      const processedChartXAxis = chartXAxis?.includes(":")
        ? chartXAxis.split(":")[1].trim()
        : chartXAxis;

      const processedChartYAxis = chartYAxis?.includes(":")
        ? chartYAxis.split(":")[1].trim()
        : chartYAxis;

      let finalXAxes = [...selectedXAxes];
      if (finalXAxes.length === 0) {
        if (processedChartXAxis && textFieldsList.includes(processedChartXAxis)) {
          finalXAxes = [processedChartXAxis];
        } else if (textFieldsList.length > 0) {
          finalXAxes = [textFieldsList[0]];
        }
        setSelectedXAxes(finalXAxes);
      }

      let finalYAxes = [...selectedYAxes];
      if (finalYAxes.length === 0) {
        if (processedChartYAxis && numericFieldsList.includes(processedChartYAxis)) {
          finalYAxes = [processedChartYAxis];
        } else if (numericFieldsList.length > 0) {
          finalYAxes = [numericFieldsList[0]];
        }
        setSelectedYAxes(finalYAxes);
      }

      // Grouping API logic
      if (finalXAxes.length > 0 && finalYAxes.length > 0) {
        // Escape JSON for SOAP XML
        const rawJsonString = JSON.stringify(res);
        const escapedJson = rawJsonString
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        const groupColumns = finalXAxes.join(",");
        const summaryColumns = finalYAxes
          .map(col => {
            const agg = yAxisAggregations[col] || "SUM";
            return `${agg}:${col}`;
          })
          .join(",");

        const groupingPayload = {
          inputJSONData: escapedJson,
          FilterCondition: "",
          groupColumns: groupColumns,
          summaryColumns: summaryColumns
        };

        console.log("Sending to Data_Group_JSONValues:", groupingPayload);

        try {
          const groupedData = await callSoapService(userData.clientURL, "Data_Group_JSONValues", groupingPayload);
          console.log("Grouped chart data:", groupedData);
          setTasks(groupedData);
        } catch (groupingError) {
          console.error("Grouping API failed:", groupingError);
          setTasks(res); // Fallback to raw data
        }
      } else {
        console.warn("X or Y axis not selected properly. Showing raw data.");
        setTasks(res);
      }

    } catch (error) {
      console.error("Failed to fetch chart data", error);
      setTasks([]);
    }
  };

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
  useEffect(() => {
    if (DashBoardID && ChartNo && selectedYAxes.length > 0) {
      fetchChartData();
    }
  }, [yAxisAggregations]);

  const handleAggregationChange = (field, aggType) => {
    setYAxisAggregations(prev => ({
      ...prev,
      [field]: aggType
    }));
  };
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
          return
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
    const agg = yAxisAggregations[field] || "SUM";
    const values = chartData.map(item => parseFloat(item[field]) || 0).filter(v => !isNaN(v));

    switch (agg) {
      case "AVG":
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      case "COUNT":
        return values.length;
      case "SUM":
      default:
        return values.reduce((a, b) => a + b, 0);
    }
  };

  const formatValue = (value, fieldName = '') => {
    if (typeof value !== 'number') return value

    const aggType = yAxisAggregations[fieldName] || "SUM";

    //  Skip currency symbol if aggregation is COUNT
    if (aggType === "COUNT") {
      return value.toLocaleString();
    }
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

  const [customColors, setCustomColors] = useState([
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"
  ])
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false)
  const getColorSchemes = () => {
    const schemes = {
      default: [
        "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
        "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
        "#6366f1", "#06b6d4", "#84cc16", "#f43f5e"
      ],
      ocean: [
        "#0ea5e9", "#06b6d4", "#0891b2", "#0e7490",
        "#155e75", "#164e63", "#1e40af", "#1d4ed8"
      ],
      forest: [
        "#16a34a", "#15803d", "#166534", "#14532d",
        "#65a30d", "#84cc16", "#a3e635", "#bef264"
      ],
      sunset: [
        "#f97316", "#ea580c", "#dc2626", "#b91c1c",
        "#991b1b", "#7c2d12", "#f59e0b", "#d97706"
      ],
      purple: [
        "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6",
        "#4c1d95", "#a855f7", "#c084fc", "#ddd6fe"
      ],
      monochrome: [
        "#374151", "#4b5563", "#6b7280", "#9ca3af",
        "#d1d5db", "#e5e7eb", "#1f2937", "#111827"
      ],
      custom: customColors
    }
    return schemes[colorScheme] || schemes.default
  }
  // Function to update a specific custom color
  const updateCustomColor = (index, color) => {
    const newColors = [...customColors]
    newColors[index] = color
    setCustomColors(newColors)
  }

  // Function to add a new custom color
  const addCustomColor = () => {
    if (customColors.length < 12) {
      setCustomColors([...customColors, "#000000"])
    }
  }

  // Function to remove a custom color
  const removeCustomColor = (index) => {
    if (customColors.length > 1) {
      const newColors = customColors.filter((_, i) => i !== index)
      setCustomColors(newColors)
    }
  }
  const getFieldColor = (fieldIndex) => {
    const colors = getColorSchemes()
    return colors[fieldIndex % colors.length]
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

    console.log("Bar clicked - Category:", selectedCategory)
    console.log("Clicked data:", clickedData)
    console.log("X-Axis fields:", selectedXAxes)
    console.log("Y-Axis fields:", selectedYAxes)

    // Navigate to chart details page with comprehensive drill-down data
    navigate('/Chartdetails', {
      state: {
        dashboardId: DashBoardID,
        chartNo: ChartNo,
        chartTitle: customTitle,
        selectedCategory: selectedCategory, // The clicked category value (e.g., "Sales | North" for multiple fields)
        xAxisFields: selectedXAxes, // Array of X-axis fields for filter construction
        yAxisFields: selectedYAxes, // Array of Y-axis fields for reference
        // Additional context for filtering and display
        filterContext: {
          rangeMin: rangeMin,
          rangeMax: rangeMax,
          selectedRangeField: selectedRangeField,
          selectedCategories: selectedCategories,
          displayFormat: displayFormat,
          currencySymbol: currencySymbol,
          companyCurrDecimals: userData?.companyCurrDecimals || 0,
          companyCurrIsIndianStandard: userData?.companyCurrIsIndianStandard
        },
        // Raw clicked data for additional context
        clickedBarData: clickedData
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
      margin: {
        top: 20,
        right: 30,
        left: chartType === "horizontalBar" ? 100 : 20,
        bottom: chartType === "pie" || chartType === "donut" ? 10 : 60 // Reduced bottom margin
      }
    };

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
        height: 50,
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
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
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
              wrapperStyle={{ paddingTop: "20px", fontSize: `${legendFontSize}px` }}
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
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
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
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
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
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
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
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
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
                outerRadius={Math.min(pieOuterRadius, 80)}
                innerRadius={isDonut ? pieInnerRadius : 0}
                fill="#8884d8"
                label={renderCustomLabel}
                labelLine={false}
                startAngle={pieStartAngle}
                endAngle={pieEndAngle}
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
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
              onClick={handleBarClick}
              style={{ cursor: 'pointer' }}
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
                  onClick={handleBarClick}
                  style={{ cursor: 'pointer' }}
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
      default:
        return null
    }
  }

  const exportToPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const chartElement = document.querySelector(`#chart-container-${ChartNo}`);
      if (!chartElement) {
        console.error('Chart element not found');
        setIsGeneratingPDF(false);
        return;
      }

      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('userData')) || JSON.parse(sessionStorage.getItem('userData'));
      const currentUserImageData = userData?.userAvatar
        ? (userData.userAvatar.startsWith('data:') ? userData.userAvatar : `data:image/jpeg;base64,${userData.userAvatar}`)
        : null;
      const currentUserName = userData?.userName || '';
      const companyLogoData = userData?.companyLogo
        ? (userData.companyLogo.startsWith('data:') ? userData.companyLogo : `data:image/jpeg;base64,${userData.companyLogo}`)
        : null;

      // Create a temporary container with fixed dimensions
      const tempContainer = document.createElement('div');
      tempContainer.style.width = '1000px';
      tempContainer.style.padding = '20px';
      tempContainer.style.paddingTop = '10px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.boxSizing = 'border-box';
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.color = '#000000';
      tempContainer.style.fontFamily = 'Arial, sans-serif';

      // Create header container with three columns
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'flex-start';
      header.style.marginBottom = '20px';
      header.style.borderBottom = '1px solid #ddd';
      header.style.paddingBottom = '15px';

      // Left column - Company logo and details
      const leftColumn = document.createElement('div');
      leftColumn.style.flex = '0 0 auto';
      leftColumn.style.display = 'flex';
      leftColumn.style.alignItems = 'flex-start';

      // Company logo
      if (companyLogoData) {
        const companyLogo = document.createElement('img');
        companyLogo.src = companyLogoData;
        companyLogo.style.width = '100px';
        companyLogo.style.height = '80px';
        companyLogo.style.objectFit = 'cover';
        leftColumn.appendChild(companyLogo);
      }

      // Company details container
      const companyDetailsContainer = document.createElement('div');
      companyDetailsContainer.style.display = 'flex';
      companyDetailsContainer.style.flexDirection = 'column';

      const companyTitle = document.createElement('h3');
      companyTitle.textContent = userData?.companyName || 'N/A';
      companyTitle.style.fontSize = '18px';
      companyTitle.style.fontWeight = 'bold';
      companyTitle.style.marginBottom = '5px';
      companyTitle.style.color = '#1e40af';

      const companyAddress = document.createElement('div');
      companyAddress.innerHTML = `Company Address: ${userData?.companyAddress || 'N/A'}<br>`;
      companyAddress.style.fontSize = '13px';
      companyAddress.style.lineHeight = '1.4';
      companyAddress.style.marginBottom = '5px';

      const companyContact = document.createElement('div');
      companyContact.innerHTML = `Email: ${userData?.userEmail || 'N/A'}<br>`;
      companyContact.style.fontSize = '13px';
      companyContact.style.lineHeight = '1.4';

      companyDetailsContainer.appendChild(companyTitle);
      companyDetailsContainer.appendChild(companyAddress);
      companyDetailsContainer.appendChild(companyContact);
      leftColumn.appendChild(companyDetailsContainer);

      header.appendChild(leftColumn);

      // Middle column - PDF title (centered)
      const middleColumn = document.createElement('div');
      middleColumn.style.flex = '1';
      middleColumn.style.textAlign = 'center';
      middleColumn.style.display = 'flex';
      middleColumn.style.flexDirection = 'column';
      middleColumn.style.alignItems = 'center';
      middleColumn.style.justifyContent = 'center';

      const pdfTitle = document.createElement('h3');
      pdfTitle.textContent = 'HR Overview';
      pdfTitle.style.fontSize = '22px';
      pdfTitle.style.fontWeight = 'bold';
      pdfTitle.style.marginBottom = '5px';
      pdfTitle.style.color = 'black';

      middleColumn.appendChild(pdfTitle);
      header.appendChild(middleColumn);

      // Right column - Date and time
      const rightColumn = document.createElement('div');
      rightColumn.style.flex = '0 0 auto';
      rightColumn.style.textAlign = 'right';

      header.appendChild(rightColumn);
      tempContainer.appendChild(header);

      // Add centered title
      const title = document.createElement('h2');
      title.textContent = customTitle;
      title.style.fontSize = '22px';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '20px';
      title.style.textAlign = 'center';
      title.style.color = '#000000';
      title.style.textRendering = 'optimizeLegibility';
      title.style.webkitFontSmoothing = 'antialiased';
      tempContainer.appendChild(title);

      // Rest of your existing content (chart, table, etc.)
      const chartClone = chartElement.cloneNode(true);

      // Apply light mode styles to the cloned chart
      chartClone.style.backgroundColor = 'white';
      chartClone.style.color = '#000000';

      // Find and modify all elements within the chart to ensure visibility
      const elements = chartClone.querySelectorAll('*');
      elements.forEach(el => {
        // Force text color to black and improve rendering
        el.style.color = '#000000';

        // Improve text rendering for all text elements
        if (el.tagName === 'text' || el.tagName === 'tspan') {
          el.style.fill = '#000000';
          el.style.stroke = 'none';
          el.style.textRendering = 'optimizeLegibility';
          el.style.webkitFontSmoothing = 'antialiased';
        }

        // Force background to white if it's dark
        if (window.getComputedStyle(el).backgroundColor.includes('rgb(3, 7, 18)') ||
          window.getComputedStyle(el).backgroundColor.includes('rgba(0, 0, 0, 0)')) {
          el.style.backgroundColor = 'white';
        }

        // Force stroke colors to be visible
        if (el.tagName === 'path' || el.tagName === 'line' || el.tagName === 'rect') {
          const stroke = el.getAttribute('stroke');
          if (stroke && (stroke === 'currentColor' || stroke.includes('rgb(255, 255, 255)'))) {
            el.setAttribute('stroke', '#000000');
          }
        }
      });

      chartClone.style.width = '100%';
      chartClone.style.marginBottom = '20px';
      tempContainer.appendChild(chartClone);

      // Create table with improved text rendering
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontFamily = 'Arial, sans-serif';
      table.style.fontSize = '15px';
      table.style.marginTop = '20px';
      table.style.color = '#000000';
      table.style.textRendering = 'optimizeLegibility';
      table.style.webkitFontSmoothing = 'antialiased';

      // Table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headerRow.style.backgroundColor = '#f0f0f0';
      headerRow.style.border = '1px solid #000000';

      const categoryHeader = document.createElement('th');
      categoryHeader.textContent = 'Category';
      categoryHeader.style.padding = '10px';
      categoryHeader.style.textAlign = 'left';
      categoryHeader.style.border = '1px solid #000000';
      categoryHeader.style.fontWeight = 'bold';
      categoryHeader.style.fontSize = '15px';
      headerRow.appendChild(categoryHeader);

      selectedYAxes.forEach(field => {
        const th = document.createElement('th');
        th.textContent = formatFieldName(field);
        th.style.padding = '10px';
        th.style.textAlign = 'right';
        th.style.border = '1px solid #000000';
        th.style.fontWeight = 'bold';
        th.style.fontSize = '15px';
        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Table body
      const tbody = document.createElement('tbody');
      chartData.slice(0, 40).forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.style.border = '1px solid #000000';
        tr.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f8f8';

        const categoryCell = document.createElement('td');
        categoryCell.textContent = row.combinedKey.length > 45 ?
          row.combinedKey.substring(0, 42) + '...' : row.combinedKey;
        categoryCell.style.padding = '8px';
        categoryCell.style.textAlign = 'left';
        categoryCell.style.border = '1px solid #000000';
        tr.appendChild(categoryCell);

        selectedYAxes.forEach(field => {
          const td = document.createElement('td');
          td.textContent = formatValue(row[field]);
          td.style.padding = '8px';
          td.style.textAlign = 'right';
          td.style.border = '1px solid #000000';
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tempContainer.appendChild(table);

      // Create footer with date/time on right and page number centered
      const footer = document.createElement('div');
      footer.style.display = 'flex';
      footer.style.justifyContent = 'space-between';
      footer.style.alignItems = 'center';
      footer.style.marginTop = '20px';
      footer.style.paddingTop = '10px';
      footer.style.borderTop = '1px solid #ddd';
      footer.style.fontSize = '12px';
      footer.style.color = '#666';

      // Current date/time for footer (right side)
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

      const dateTimeFooter = document.createElement('div');
      dateTimeFooter.textContent = formattedDateTime;
      dateTimeFooter.style.textAlign = 'right';

      // Page number placeholder (centered)
      const pageInfo = document.createElement('div');
      pageInfo.id = 'page-info';
      pageInfo.style.textAlign = 'center';
      pageInfo.style.flex = '1'; // Take up remaining space to center properly

      // Empty div to balance the flex layout
      const emptyDiv = document.createElement('div');
      emptyDiv.style.width = dateTimeFooter.offsetWidth + 'px'; // Match width of dateTimeFooter

      footer.appendChild(emptyDiv);
      footer.appendChild(pageInfo);
      footer.appendChild(dateTimeFooter);
      tempContainer.appendChild(footer);

      // Add to document temporarily
      document.body.appendChild(tempContainer);

      // Generate high-quality canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Ensure all fonts are loaded in the cloned document
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

      // Create PDF with vector-like quality
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Convert canvas to high-quality image with smart compression
      let quality = 0.95;
      let imgData;
      let attempts = 0;
      const maxAttempts = 5;

      do {
        imgData = canvas.toDataURL('image/png'); // Use PNG for text clarity

        // Check approximate size
        const approximateSize = (imgData.length * 0.75) / (1024 * 1024); // Size in MB

        if (approximateSize <= 2 || attempts >= maxAttempts) {
          break;
        }

        // If too large, reduce quality and try JPEG
        quality -= 0.1;
        imgData = canvas.toDataURL('image/jpeg', quality);
        attempts++;
      } while (attempts < maxAttempts);

      // Calculate dimensions to fit the page while maintaining aspect ratio
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Reduce margins to start content at top (minimal top margin)
      const marginTop = 5; // Very small top margin
      const marginSide = 10; // Side margins
      const marginBottom = 15; // Bottom margin for page numbers

      const maxWidth = pdfWidth - (marginSide * 2);
      const maxHeight = pdfHeight - marginTop - marginBottom;

      const canvasAspectRatio = canvas.width / canvas.height;
      const pageAspectRatio = maxWidth / maxHeight;

      let finalWidth, finalHeight;

      if (canvasAspectRatio > pageAspectRatio) {
        // Canvas is wider relative to page
        finalWidth = maxWidth;
        finalHeight = maxWidth / canvasAspectRatio;
      } else {
        // Canvas is taller relative to page
        finalHeight = maxHeight;
        finalWidth = maxHeight * canvasAspectRatio;
      }

      const centerX = (pdfWidth - finalWidth) / 2;
      const startY = marginTop; // Start from top with minimal margin

      // Add image with optimal settings for text clarity
      pdf.addImage(
        imgData,
        imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG',
        centerX,
        startY,
        finalWidth,
        finalHeight,
        undefined,
        'SLOW' // Use SLOW compression for better quality
      );

      // Add page numbers centered and date/time on right side
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(100);

        // Add page number centered
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pdfWidth / 2,
          pdfHeight - 10,
          { align: 'center' }
        );

        // Add date/time on right side
        pdf.text(
          formattedDateTime,
          pdfWidth - 15,
          pdfHeight - 10,
          { align: 'right' }
        );
      }

      // Clean up
      document.body.removeChild(tempContainer);

      // Save with progress indication
      setTimeout(() => {
        pdf.save(`${customTitle.replace(/\s+/g, '_')}_chart.pdf`);
        setIsGeneratingPDF(false);
      }, 500);

    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setIsGeneratingPDF(false);
    }
  };


  return (
    <Card className="w-full bg-white dark:bg-slate-950 border shadow-sm">
      <CardHeader className="p-2 sm:p-2">
        {/* Top row: Title and Controls */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Title and Display Format */}
          <div className="flex gap-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center min-w-0 flex-shrink">
              <h3 className="flex flex-col gap-1 font-bold">
                <span className="text-sm sm:text-lg truncate">{chartTitle}
                  <span className="ml-1 text-sm font-normal">(in {userData.companyCurrName})</span></span>
              </h3>
            </div>
          </div>

          {/* Chart Type and Action Buttons */}
          <div className="flex flex-wrap gap-2 items-center justify-between sm:justify-between min-w-fit">


            {/* Range Slider - Inline */}
            <div className="flex gap-2">
              <div className="w-[200px]">
                {selectedYAxes.length > 0 && selectedRangeField && (
                  <div className="flex-1 space-y-2">

                    <div className="p-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
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
                        <div className="relative w-full h-3 flex items-center" ref={sliderRef}>
                          <div className="absolute w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-inner"></div>
                          <div
                            className="absolute h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-md"
                            style={{
                              left: `${valueToPercent(rangeMin)}%`,
                              width: `${valueToPercent(rangeMax) - valueToPercent(rangeMin)}%`
                            }}
                          ></div>

                          {/* Min thumb */}
                          <div
                            className={`absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full shadow-lg cursor-pointer transform -translate-x-1/2 z-20 transition-transform hover:scale-110 ${isDragging.min ? 'scale-110' : ''
                              }`}
                            style={{ left: `${valueToPercent(rangeMin)}%` }}
                            onMouseDown={handleMouseDown('min')}
                          />

                          {/* Max thumb */}
                          <div
                            className={`absolute w-3 h-3 bg-indigo-500 border-2 border-white rounded-full shadow-lg cursor-pointer transform -translate-x-1/2 z-20 transition-transform hover:scale-110 ${isDragging.max ? 'scale-110' : ''
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
              <TooltipProvider>
                <div className="flex flex-row items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <FormateTooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={displayFormat === "D" ? "default" : "ghost"}
                        onClick={() => setDisplayFormat("D")}
                        className={`text-xs px-2 py-1 ${displayFormat === "D" ? "shadow-sm" : ""}`}
                      >
                        D
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
                        className={`text-xs px-2 py-1 ${displayFormat === "K" ? "shadow-sm" : ""}`}
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
                        className={`text-xs px-2 py-1 ${displayFormat === "M" ? "shadow-sm" : ""}`}
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

            {/* Chart Type Selection */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 rounded-lg border">
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-full sm:w-48 border-0 bg-white dark:bg-slate-950 shadow-sm text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Vertical Bar Chart</span>
                      <span className="sm:hidden">V-Bar</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="stackedBar">
                    <div className="flex items-center gap-2">
                      <BarChart4 className="h-4 w-4" />
                      <span className="hidden sm:inline">Stacked Bar Chart</span>
                      <span className="sm:hidden">S-Bar</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="horizontalBar">
                    <div className="flex items-center gap-2">
                      <BarChart4 className="h-4 w-4" />
                      <span className="hidden sm:inline">Horizontal Bar Chart</span>
                      <span className="sm:hidden">H-Bar</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="horizontalStackedBar">
                    <div className="flex items-center gap-2">
                      <BarChart4 className="h-4 w-4" />
                      <span className="hidden sm:inline">Horizontal Stacked Bar</span>
                      <span className="sm:hidden">HS-Bar</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Line Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="area">
                    <div className="flex items-center gap-2">
                      <AreaChartIcon className="h-4 w-4" />
                      Area Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Pie Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="donut">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Donut Chart
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex z-50 gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none z-50 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 border-purple-200 dark:border-purple-700 hover:shadow-lg transition-all duration-200"
                  >
                    <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-4xl max-h-[90vh] z-50 overflow-y-auto">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Chart Customization</h4>
                        <p className="text-sm text-muted-foreground">Fine-tune your chart appearance and behavior</p>
                      </div>
                      {/* Export Button */}
                    </div>

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
                              <ScrollArea className="h-40">
                                <div className="space-y-3">
                                  {numericFields.length > 0 ? (
                                    numericFields.map(field => (
                                      <div key={`y-${field}`} className="space-y-2 p-2 border rounded-md bg-gray-50 dark:bg-slate-900">
                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`y-${field}`}
                                            checked={selectedYAxes.includes(field)}
                                            onCheckedChange={(checked) => handleYAxisChange(field, checked)}
                                          />
                                          <label
                                            htmlFor={`y-${field}`}
                                            className="text-xs cursor-pointer flex-1 truncate font-medium"
                                          >
                                            {formatFieldName(field)}
                                          </label>
                                        </div>

                                        {/* Aggregation type buttons - only show if field is selected */}
                                        {selectedYAxes.includes(field) && (
                                          <div className="ml-6 space-y-2">
                                            {/* <label className="text-xs text-muted-foreground block">Aggregation Type:</label> */}
                                            <div className="flex gap-1">
                                              {['SUM', 'AVG', 'COUNT'].map((aggType) => (
                                                <button
                                                  key={aggType}
                                                  type="button"
                                                  onClick={() => handleAggregationChange(field, aggType)}
                                                  className={`px-2 py-1 text-xs rounded-md border transition-all duration-200 ${(yAxisAggregations[field] || 'SUM') === aggType
                                                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                                    }`}
                                                >
                                                  {aggType}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}
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
                    {/* Basic Settings Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Color Scheme */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Color Scheme:</Label>
                        <Select value={colorScheme} onValueChange={setColorScheme}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="ocean">Ocean</SelectItem>
                            <SelectItem value="forest">Forest</SelectItem>
                            <SelectItem value="sunset">Sunset</SelectItem>
                            <SelectItem value="purple">Purple</SelectItem>
                            <SelectItem value="monochrome">Monochrome</SelectItem>
                            <SelectItem value="custom">
                              <div className="flex items-center gap-2">
                                <Palette className="h-4 w-4" />
                                Custom Colors
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Custom Color Picker Section */}
                        {colorScheme === "custom" && (
                          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="text-sm font-medium">Custom Color Palette</h6>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={addCustomColor}
                                disabled={customColors.length >= 12}
                                className="h-7 px-2"
                              >
                                <span className="text-xs">+ Add Color</span>
                              </Button>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                              {customColors.map((color, index) => (
                                <div key={index} className="relative group">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="color"
                                      value={color}
                                      onChange={(e) => updateCustomColor(index, e.target.value)}
                                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                      title={`Color ${index + 1}`}
                                    />
                                    {customColors.length > 1 && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeCustomColor(index)}
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-3 w-3 text-red-500" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="text-xs text-center mt-1 text-gray-500 font-mono">
                                    {color.toUpperCase()}
                                  </div>
                                </div>
                              ))}
                            </div>

                          </div>
                        )}
                      </div>


                      {/* sort by A to Z */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Sort order:</Label>
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="asc">Value: Ascending</SelectItem>
                            <SelectItem value="desc">Value: Descending</SelectItem>
                            <SelectItem value="alphaAsc">Name: A to Z</SelectItem>
                            <SelectItem value="alphaDesc">Name: Z to A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Chart Height */}
                      <div className="space-y-2">
                        <Label className="text-sm">Chart Height:</Label>
                        <Input
                          type="number"
                          value={chartHeight}
                          onChange={(e) => setChartHeight(Number(e.target.value))}
                          min="300"
                          max="800"
                        />
                      </div>
                    </div>
                    <Separator />
                    {/* Data Labels and Legend */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Data Labels */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-sm">Data Labels</h5>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="dataLabels"
                            checked={chartType === "pie" || chartType === "donut" ? showPieLabels : showDataLabels}
                            onCheckedChange={chartType === "pie" || chartType === "donut" ? setShowPieLabels : setShowDataLabels}
                          />
                          <Label htmlFor="dataLabels" className="text-sm">Show Data Labels</Label>
                        </div>

                        {((chartType === "pie" || chartType === "donut") ? showPieLabels : showDataLabels) &&
                          (chartType !== "pie" && chartType !== "donut") && (
                            <div className="ml-6 space-y-2">
                              <Label className="text-sm">Label Position:</Label>
                              <Select value={dataLabelPosition} onValueChange={setDataLabelPosition}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="top">Top (Outside)</SelectItem>
                                  <SelectItem value="inside">Inside</SelectItem>
                                  <SelectItem value="center">Center</SelectItem>
                                  <SelectItem value="bottom">Bottom</SelectItem>
                                </SelectContent>
                              </Select>

                              <div className="space-y-2">
                                <Label className="text-sm">Font Size:</Label>
                                <Input
                                  type="number"
                                  value={fontSize}
                                  onChange={(e) => setFontSize(Number(e.target.value))}
                                  min="8"
                                  max="20"
                                />
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Legend Options */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-sm">Legend</h5>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showLegend"
                            checked={showLegend}
                            onCheckedChange={setShowLegend}
                          />
                          <Label htmlFor="showLegend" className="text-sm">Show Legend</Label>
                        </div>

                        {showLegend && (
                          <div className="ml-6 space-y-2">
                            <Label className="text-sm">Legend Position:</Label>
                            <Select value={legendPosition} onValueChange={setLegendPosition}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="top">Top</SelectItem>
                                <SelectItem value="bottom">Bottom</SelectItem>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>


                            <div className="space-y-2">
                              <Label className="text-sm">Legend Font Size:</Label>
                              <Input
                                type="number"
                                value={legendFontSize}
                                onChange={(e) => setLegendFontSize(Number(e.target.value))}
                                min="8"
                                max="20"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Max Items:</Label>
                        <Input
                          type="number"
                          value={maxBarsToShow}
                          onChange={(e) => setMaxBarsToShow(Number(e.target.value))}
                          min="5"
                          max="100"
                        />
                      </div>

                    </div>
                    <Separator />

                    {/* Chart Type Specific Options */}
                    {(chartType === "line" || chartType === "area") && (
                      <div className="space-y-4">
                        <h5 className="font-medium text-sm">Line/Area Options</h5>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm">Stroke Width:</Label>
                            <Input
                              type="number"
                              value={strokeWidth}
                              onChange={(e) => setStrokeWidth(Number(e.target.value))}
                              min="1"
                              max="10"
                            />
                          </div>

                          {chartType === "area" && (
                            <div className="space-y-2">
                              <Label className="text-sm">Fill Opacity:</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={fillOpacity}
                                onChange={(e) => setFillOpacity(Number(e.target.value))}
                                min="0"
                                max="1"
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Curve Type:</Label>
                          <Select value={curveType} onValueChange={setCurveType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monotone">Monotone (Smooth)</SelectItem>
                              <SelectItem value="linear">Linear (Straight)</SelectItem>
                              <SelectItem value="cardinal">Cardinal (Curved)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {chartType === "line" && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="showDots"
                              checked={showDots}
                              onCheckedChange={setShowDots}
                            />
                            <Label htmlFor="showDots" className="text-sm">Show Data Points</Label>
                          </div>
                        )}
                      </div>
                    )}

                    {(chartType === "bar" || chartType === "horizontalBar" || chartType === "stackedBar" || chartType === "horizontalStackedBar") && (
                      <div className="space-y-4">
                        <h5 className="font-medium text-sm">Bar Options</h5>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm">Bar Radius:</Label>
                            <Input
                              type="number"
                              value={barRadius}
                              onChange={(e) => setBarRadius(Number(e.target.value))}
                              min="0"
                              max="20"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Bar Gap:</Label>
                            <Input
                              type="number"
                              value={barGap}
                              onChange={(e) => setBarGap(Number(e.target.value))}
                              min="0"
                              max="20"
                            />
                          </div>
                        </div>

                        {(chartType === "stackedBar" || chartType === "horizontalStackedBar") && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong>Stacked Bar Chart:</strong> Values are stacked {chartType === "horizontalStackedBar" ? "horizontally" : "vertically"}.
                              Legend is automatically enabled to distinguish between series.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {(chartType === "pie" || chartType === "donut" || chartType === "stackedPie") && (
                      <div className="space-y-4">
                        <h5 className="font-medium text-sm">
                          {chartType === "stackedPie" ? "Stacked Pie Options" : "Pie/Donut Options"}
                        </h5>

                        {chartType === "stackedPie" && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong>Stacked Pie Chart:</strong> Creates nested pie charts with multiple data series.
                              Each Y-axis field creates a new ring. Requires at least 2 Y-axis fields.
                            </p>
                          </div>
                        )}

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

                          {(chartType === "donut" || chartType === "stackedPie") && (
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
                            {chartType === "stackedPie" ? "Show Labels (Outer Ring Only)" : "Show Pie Labels"}
                          </Label>
                        </div>
                      </div>
                    )}
                    <Separator />


                    {/* General Options */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm">General Settings</h5>

                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showGrid"
                            checked={showGrid}
                            onCheckedChange={setShowGrid}
                          />
                          <Label htmlFor="showGrid" className="text-sm">Show Grid</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showTooltip"
                            checked={showTooltip}
                            onCheckedChange={setShowTooltip}
                          />
                          <Label htmlFor="showTooltip" className="text-sm">Show Tooltip</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 border-green-200 dark:border-green-700 hover:shadow-md transition-all duration-200">
                    <Download className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-40 p-2">
                  <div className="space-y-1">
                    <Button variant="ghost" size="sm" onClick={exportChartData} className="w-full justify-start text-sm">
                      Export CSV
                    </Button>

                    <Button variant="ghost" size="sm" onClick={exportToPDF} className="w-full justify-start text-sm" disabled={isGeneratingPDF}>
                      {isGeneratingPDF ? 'Generating...' : 'Export PDF'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <TooltipProvider>
                <FormateTooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transition-all duration-300 hover:scale-90 hover:shadow-xl"
                      onClick={() => {
                        localStorage.setItem("chatbot_context", JSON.stringify({
                          DashBoardID,
                          ChartNo,
                          chartTitle
                        }));
                        document.getElementById("open-chatbot-btn")?.click();
                      }}
                    >
                      <Sparkles className=" h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>ASK AI</p>
                  </TooltipContent>
                </FormateTooltip>

              </TooltipProvider>


            </div>
          </div>
        </div>


        <Separator />

        {/* Totals Display */}
        {selectedYAxes.length > 0 && (

          <div className="flex flex-row items-center justify-between">

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 ">

              {selectedYAxes.map(field => (
                <div key={field} className="bg-white dark:bg-slate-900 p-2 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-medium mb-1">
                    {(yAxisAggregations[field] || 'SUM')} of {formatFieldName(field)} - {formatValue(calculateTotal(field), field)}
                  </div>
                  {/* <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                    {formatValue(calculateTotal(field), field)}
                  </div> */}
                </div>
              ))}

            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="relative p-0">
        {chartData.length > 0 && selectedXAxes.length > 0 && selectedYAxes.length > 0 ? (
          <div
            id={`chart-container-${ChartNo}`}
            className="w-full h-full min-h-[300px]"
            style={{
              height: `${chartHeight}px`,
              maxHeight: 'calc(100vh - 300px)' // Adjust based on your layout
            }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              debounce={150} // Helps with resize performance
            >
              {renderChart()}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
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