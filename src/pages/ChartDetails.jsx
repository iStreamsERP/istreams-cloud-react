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
      // You can modify this API call based on your backend requirements
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
      
      setDetailData(res || [])
    } catch (error) {
      console.error("Failed to fetch detail data", error)
      setDetailData([])
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value, fieldName = '') => {
    if (typeof value !== 'number') return value
    
    const currencyKeywords = ['currency', 'curr', 'cost', 'value', 'amount', 'salary', 'salaries']
    const fieldNameStr = String(fieldName || '')
    const shouldShowCurrency = currencyKeywords.some(keyword => 
      fieldNameStr.toLowerCase().includes(keyword.toLowerCase())
    )
    
    const isINR = userData?.companyCurrIsIndianStandard === true
    const prefix = shouldShowCurrency ? currencySymbol : ''

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
      return `${prefix}${formatIndianNumber(Math.round(value))}`
    } else {
      return `${prefix}${value.toLocaleString()}`
    }
  }

  const formatFieldName = (fieldName) => {
    return fieldName
      .replace(/[_-]/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border rounded-lg shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm">
            <span style={{ color: entry.color }}>●</span>
            {` ${formatFieldName(entry.dataKey)}: ${formatValue(entry.value, entry.dataKey)}`}
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
            <p>Loading detail data...</p>
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
                Chart Details: {chartTitle || 'Chart Data'}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Showing details for <strong>{selectedCategory}</strong> in <strong>{formatFieldName(fieldName)}</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Value: {formatValue(fieldValue, fieldName)}
              </p>
            </div>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chart
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Detail Chart */}
      {detailData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Detail Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 400 }}>
              <ResponsiveContainer>
                <BarChart
                  data={detailData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={formatValue}
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mb-4 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Detail Data Available</h3>
              <p className="text-muted-foreground">
                No detailed breakdown is available for the selected category.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Table */}
      {detailData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Category</th>
                    <th className="text-right p-2 font-medium">Value</th>
                    <th className="text-right p-2 font-medium">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.map((item, index) => {
                    const total = detailData.reduce((sum, d) => sum + (d.value || 0), 0)
                    const percentage = total > 0 ? ((item.value || 0) / total * 100).toFixed(1) : '0.0'
                    
                    return (
                      <tr key={index} className="border-b last:border-b-0 hover:bg-muted/50">
                        <td className="p-2">{item.name || 'Unknown'}</td>
                        <td className="p-2 text-right font-mono">
                          {formatValue(item.value, fieldName)}
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {percentage}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}