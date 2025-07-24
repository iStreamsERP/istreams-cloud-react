// import React, { useEffect, useState } from "react";
// import { GrossSalaryChart } from "./demo";
// import { callSoapService } from "@/api/callSoapService";
// import { useAuth } from "@/contexts/AuthContext";

// const ChartPreview = () => {
//   const [data, setData] = useState(null);
//   const [rawData, setRawData] = useState([]);
//   const [groupedData, setGroupedData] = useState([]);
//   const { userData } = useAuth();

//   useEffect(() => {
//     const stored = sessionStorage.getItem("chartPreviewData");
//     if (stored) {
//       const parsed = JSON.parse(stored);
//       setData(parsed);
//       fetchChartData(
//         parsed.DashBoardID,
//         parsed.ChartNo,
//         parsed.chartXAxis,
//         parsed.chartYAxis
//       );
//     }
//   }, []);

//   const fetchChartData = async (DashBoardID, ChartNo, chartXAxis, chartYAxis) => {
//     try {
//       const chartID = { DashBoardID, ChartNo };
//       const res = await callSoapService(
//         userData.clientURL,
//         "BI_GetDashboard_Chart_Data",
//         chartID
//       );
//       if (Array.isArray(res)) {
//         setRawData(res);
//         groupChartData(res, chartXAxis, chartYAxis);
//       } else {
//         setRawData([]);
//         setGroupedData([]);
//         console.error("Expected array but got:", res);
//       }
//     } catch (err) {
//       console.error("Error fetching chart data:", err);
//     }
//   };

//   const groupChartData = (data, groupByKey, yAxisRaw) => {
//     // Extract function and field name (e.g., SUM(GROSS_SALARY))
//     const match = yAxisRaw.match(/(SUM|AVG|COUNT)\((.+)\)/i);
//     let func = "SUM";
//     let field = yAxisRaw;

//     if (match) {
//       func = match[1].toUpperCase();
//       field = match[2];
//     }

//     const grouped = {};

//     data.forEach((item) => {
//       const group = item[groupByKey];
//       const value = parseFloat(item[field]) || 0;

//       if (!grouped[group]) {
//         grouped[group] = { total: 0, count: 0 };
//       }

//       grouped[group].total += value;
//       grouped[group].count += 1;
//     });

//     const finalData = Object.entries(grouped).map(([key, val]) => {
//       let result;
//       if (func === "AVG") {
//         result = val.total / val.count;
//       } else if (func === "COUNT") {
//         result = val.count;
//       } else {
//         result = val.total;
//       }

//       return {
//         [groupByKey]: key,
//         [yAxisRaw]: result.toFixed(2),
//       };
//     });

//     setGroupedData(finalData);
//   };

//   if (!data) return <p>Loading preview...</p>;

//   const { chartXAxis, chartYAxis } = data;

//   return (
//     <div className="p-6 space-y-10">
//       <GrossSalaryChart
//         DashBoardID={data.DashBoardID}
//         ChartNo={data.ChartNo}
//         chartTitle={data.chartTitle}
//         chartXAxis={chartXAxis}
//         chartYAxis={chartYAxis}
//       />

    
//     </div>
//   );
// };

// export default ChartPreview;

// pages/ChartPreview.jsx
import React, { useEffect, useState } from 'react';

const ChartPreview = ({  data}) => {
  const [header, setHeader] = useState("Item");
  const [tableData, setTableData] = useState([]);

  const extractFromDepartmentSummary = (text) => {
    const output = [];

    // Try to detect dynamic header like "Department-wise"
    const headerMatch = text.match(/###\s*(.+?)\s*Summary/i);
    const dynamicHeader = headerMatch ? headerMatch[1].trim() : "Item";
    setHeader(dynamicHeader);

    // Split by department entries: - **Department Name**
    const sections = text.split(/-\s+\*\*(.+?)\*\*/g); // ["", dept1, body1, dept2, body2,...]

    for (let i = 1; i < sections.length; i += 2) {
      const departmentName = sections[i].trim();
      const body = sections[i + 1];

      const lines = body.split('\n').filter(Boolean);
      const item = { [dynamicHeader]: departmentName };

      lines.forEach((line) => {
        const match = line.match(/-\s*(.+?):\s*(.+)/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          item[key] = value;
        }
      });

      output.push(item);
    }

    return output;
  };

  useEffect(() => {
    if (data && typeof data === 'string') {
      try {
        const parsed = extractFromDepartmentSummary(data);
        setTableData(parsed);
      } catch (err) {
        console.error("Error parsing data:", err);
      }
    }
  }, [data]);

  const renderTable = () => {
    if (tableData.length === 0) {
      return <p>No data available.</p>;
    }

    const allKeys = new Set();
    tableData.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
    const headers = Array.from(allKeys);

    return (
      <div className="overflow-x-auto p-4">
        <table className="min-w-full text-sm text-left border border-collapse border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-2 border border-gray-300">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr key={idx} className="even:bg-gray-50">
                {headers.map((key) => (
                  <td key={key} className="px-4 py-2 border border-gray-300">
                    {row[key] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-white text-gray-800 p-4">
      <h1 className="text-xl font-semibold mb-4">Chart Data Preview</h1>
      {renderTable()}
    </div>
  );
};

export default ChartPreview;
