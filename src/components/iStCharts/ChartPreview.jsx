import React, { useEffect, useState } from "react";
import { GrossSalaryChart } from "./demo";
import { callSoapService } from "@/api/callSoapService";
import { useAuth } from "@/contexts/AuthContext";

const ChartPreview = () => {
  const [data, setData] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [groupedData, setGroupedData] = useState([]);
  const { userData } = useAuth();

  useEffect(() => {
    const stored = sessionStorage.getItem("chartPreviewData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setData(parsed);
      fetchChartData(
        parsed.DashBoardID,
        parsed.ChartNo,
        parsed.chartXAxis,
        parsed.chartYAxis
      );
    }
  }, []);

  const fetchChartData = async (DashBoardID, ChartNo, chartXAxis, chartYAxis) => {
    try {
      const chartID = { DashBoardID, ChartNo };
      const res = await callSoapService(
        userData.clientURL,
        "BI_GetDashboard_Chart_Data",
        chartID
      );
      if (Array.isArray(res)) {
        setRawData(res);
        groupChartData(res, chartXAxis, chartYAxis);
      } else {
        setRawData([]);
        setGroupedData([]);
        console.error("Expected array but got:", res);
      }
    } catch (err) {
      console.error("Error fetching chart data:", err);
    }
  };

  const groupChartData = (data, groupByKey, yAxisRaw) => {
    // Extract function and field name (e.g., SUM(GROSS_SALARY))
    const match = yAxisRaw.match(/(SUM|AVG|COUNT)\((.+)\)/i);
    let func = "SUM";
    let field = yAxisRaw;

    if (match) {
      func = match[1].toUpperCase();
      field = match[2];
    }

    const grouped = {};

    data.forEach((item) => {
      const group = item[groupByKey];
      const value = parseFloat(item[field]) || 0;

      if (!grouped[group]) {
        grouped[group] = { total: 0, count: 0 };
      }

      grouped[group].total += value;
      grouped[group].count += 1;
    });

    const finalData = Object.entries(grouped).map(([key, val]) => {
      let result;
      if (func === "AVG") {
        result = val.total / val.count;
      } else if (func === "COUNT") {
        result = val.count;
      } else {
        result = val.total;
      }

      return {
        [groupByKey]: key,
        [yAxisRaw]: result.toFixed(2),
      };
    });

    setGroupedData(finalData);
  };

  if (!data) return <p>Loading preview...</p>;

  const { chartXAxis, chartYAxis } = data;

  return (
    <div className="p-6 space-y-10">
      <GrossSalaryChart
        DashBoardID={data.DashBoardID}
        ChartNo={data.ChartNo}
        chartTitle={data.chartTitle}
        chartXAxis={chartXAxis}
        chartYAxis={chartYAxis}
      />

    
    </div>
  );
};

export default ChartPreview;
