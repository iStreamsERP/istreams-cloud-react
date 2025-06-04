import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getDashBoardProgressTableDetails } from "@/services/iStDashBoardServices";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { callSoapService } from "@/services/callSoapService";

const ProgressTable = ({ DashBoardID, ProgressTableNo }) => {
  const { userData } = useAuth();
  const [dbData, setDbData] = useState([]);

  useEffect(() => {
    if (DashBoardID && ProgressTableNo) {
      fetchTableData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DashBoardID, ProgressTableNo]);

  const fetchTableData = async () => {
    try {
      const tableParams = { DashBoardID, ProgressTableNo };
 
     const master = await callSoapService(userData.clientURL, "BI_GetDashboard_ProgressTable_Data", tableParams);
      
      console.log("Fetched table data:", master);
      if (Array.isArray(master)) {
        setDbData(master);
      } else {
        console.warn("Expected array, got:", master);
        setDbData([]);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
      setDbData([]);
    }
  };

  const hasNoData = Array.isArray(dbData) && dbData.length === 0;

  const formatHeader = (header) => {
    // Handle null or undefined headers properly
    if (header === null || header === undefined) return "N/A";
    
    // Convert header to string to ensure replace method is available
    const headerStr = String(header);
    const cleaned = headerStr.replace(/[_\-.]/g, " ").toLowerCase();
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  // Determine if a column contains numeric values
  const isNumericColumn = (key) => {
    if (!dbData.length) return false;
    
    // Check if most values in this column are numeric
    const numericCount = dbData.reduce((count, row) => {
      const value = row[key];
      const isNumeric = value !== null && value !== undefined && 
                       !isNaN(parseFloat(value)) && isFinite(value);
      return isNumeric ? count + 1 : count;
    }, 0);
    
    // If more than 70% of values are numeric, consider it a numeric column
    return numericCount / dbData.length > 0.7;
  };

  // Calculate column types once, safely handling empty data
  const columnTypes = dbData.length > 0 && dbData[0] !== null
    ? Object.keys(dbData[0]).reduce((types, key) => {
        types[key] = isNumericColumn(key) ? 'numeric' : 'text';
        return types;
      }, {})
    : {};

  // Calculate totals, safely handling null/undefined values
  const totals = {};
  if (dbData.length > 0 && dbData[0]) {
    Object.keys(dbData[0]).forEach((key) => {
      const total = dbData.reduce((sum, item) => {
        // Check if item[key] exists and is a valid number
        if (item === null || item === undefined) return sum;
        const value = parseFloat(item[key]);
        return !isNaN(value) ? sum + value : sum;
      }, 0);
      totals[key] = total > 0 ? total : "-";
    });
  }

  // Check if we have valid data to render
  if (hasNoData) {
    return (
      <div className="p-4">
        <div className="text-center text-red-500 font-bold text-lg p-4">
          No data available.
        </div>
      </div>
    );
  }

  // Ensure we have a valid first row before rendering the table
  if (!dbData[0]) {
    return (
      <div className="p-4">
        <div className="text-center text-red-500 font-bold text-lg p-4">
          Invalid data structure.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted w-full">
              {Object.keys(dbData[0]).map((key) => (
                <TableHead 
                  key={key} 
                  className={columnTypes[key] === 'numeric' ? 'text-right' : ''}
                >
                  {formatHeader(key)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dbData.map((item, index) => (
              <TableRow key={index}>
                {Object.keys(dbData[0]).map((key) => (
                  <TableCell 
                    key={key} 
                    className={columnTypes[key] === 'numeric' ? 'text-right' : ''}
                  >
                    {item && item[key] !== null && item[key] !== undefined ? item[key] : "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {/* Total Row */}
            <TableRow className="font-semibold bg-muted">
              {Object.keys(dbData[0]).map((key, i) => (
                <TableCell 
                  key={key}
                  className={columnTypes[key] === 'numeric' ? 'text-right' : ''}
                >
                  {i === 0 ? "Total" : totals[key]}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProgressTable;