import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BarChart3 } from "lucide-react"
import { callSoapService } from "@/services/callSoapService"

export default function ChartDetails() {
  const { userData } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [detailData, setDetailData] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Get drill-down parameters from navigation state
  const drillDownData = location.state || {}
  const {
    selectedCategory,
    fieldName,
    fieldValue,
    dashboardId,
    chartNo,
    chartTitle
  } = drillDownData

  const currencySymbol = userData?.companyCurrSymbol || "$"

  useEffect(() => {
    if (selectedCategory && fieldName) {
      fetchDetailData()
    }
  }, [selectedCategory, fieldName])

  const fetchDetailData = async () => {
    try {
      setLoading(true)
      // API call to get department and basic salary data
      const chartFilter = { 
        DashBoardID: dashboardId, 
        ChartNo: chartNo,
        FilterField: fieldName,
        FilterValue: selectedCategory
      }
      
      const res = await callSoapService(
        userData.clientURL, 
        "BI_GetDashboard_Chart_Detail_Data", 
        chartFilter
      )
      
      // Transform data to ensure proper structure for department vs basic salary
      const transformedData = (res || []).map(item => ({
        // X-axis: Department name
        department: item.department || item.Department || item.name || 'Unknown Department',
        // Y-axis: Basic salary
        basicSalary: item.basicSalary || item.basic_salary || item.BasicSalary || item.value || 0,
        // Keep original data for reference
        ...item
      }))
      
      setDetailData(transformedData)
    } catch (error) {
      console.error("Failed to fetch detail data", error)
      setDetailData([])
    } finally {
      setLoading(false)
    }
  }

  const formatSalary = (value) => {
    if (typeof value !== 'number') return value
    
    const isINR = userData?.companyCurrIsIndianStandard === true
    
    const formatIndianNumber = (num) => {
      const isNegative = num < 0
      const absNum = Math.abs(num)
      const numStr = absNum.toString()
      
      if (numStr.length <= 3) {
        return (isNegative ? '-' : '') + numStr
      }
      
      const firstThree = numStr.slice(-3)
      const remaining = numStr.slice(0, -3)
      
      let formatted = firstThree
      let remainingStr = remaining
      
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

    if (isINR) {
      return `${currencySymbol}${formatIndianNumber(Math.round(value))}`
    } else {
      return `${currencySymbol}${value.toLocaleString()}`
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border rounded-lg shadow-lg">
        <p className="font-medium mb-2">Department: {label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm">
            <span style={{ color: entry.color }}>●</span>
            {` Basic Salary: ${formatSalary(entry.value)}`}
          </p>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mb-4 mx-auto animate-pulse" />
            <p>Loading department salary data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedCategory || !fieldName) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mb-4 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Detail Data</h2>
              <p className="text-muted-foreground mb-4">
                No drill-down information was provided.
              </p>
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">
                Department Basic Salaries: {chartTitle || 'Salary Analysis'}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Showing basic salaries by department for <strong>{selectedCategory}</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Value: {formatSalary(fieldValue)}
              </p>
            </div>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chart
            </Button>
          </div>
        </CardHeader>
      </Card>

  
 
    </div>
  )
}