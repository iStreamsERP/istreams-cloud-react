import React, { useEffect, useState } from "react";
import { GrossSalaryChart } from "./demo";
import { callSoapService } from "@/api/callSoapService";
import { useAuth } from "@/contexts/AuthContext";

const ChartPreview = () => {
  const [data, setData] = useState(null);
  const [rawData, setRawData] = useState([]);
  const { userData } = useAuth();

  useEffect(() => {
    const stored = sessionStorage.getItem("chartPreviewData");
    if (stored) {
      const parsed = JSON.parse(stored);
      setData(parsed);
      fetchChartData(parsed.DashBoardID, parsed.ChartNo);
    }
  }, []);

  const fetchChartData = async (DashBoardID, ChartNo) => {
    try {
      const chartID = { DashBoardID, ChartNo };
      const res = await callSoapService(userData.clientURL, "BI_GetDashboard_Chart_Data", chartID);
      if (Array.isArray(res)) {
        setRawData(res);
      } else {
        console.error("Expected array but got:", res);
        setRawData([]);
      }
    } catch (err) {
      console.error("Error fetching chart data:", err);
    }
  };

  if (!data) return <p>Loading preview...</p>;

  // Get table headers from the first row keys
  const tableHeaders = rawData.length > 0 ? Object.keys(rawData[0]) : [];

  return (
    <div className="p-6 space-y-10">
      <GrossSalaryChart
        DashBoardID={data.DashBoardID}
        ChartNo={data.ChartNo}
        chartTitle={data.chartTitle}
        chartXAxis={data.chartXAxis}
        chartYAxis={data.chartYAxis}
      />

   
    </div>
  );
};

export default ChartPreview;
