import React, { useContext, useEffect, useRef, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import { LCContext } from "./LC";
import {
  AxisScrollStrategies,
  AxisTickStrategies,
  ChartXY,
  DataSetXY,
  PointLineAreaSeries,
  Themes,
} from "@lightningchart/lcjs";

function App() {
  const lc = useContext(LCContext);
  const chartRef = useRef<{
    chart: ChartXY;
    dataSet?: DataSetXY;
    seriesMap?: Record<string, PointLineAreaSeries>;
  }>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8090`);
    ws.onmessage = (e) => {
      if (!chartRef.current) return;
      const chart = chartRef.current.chart;
      try {
        const msg = JSON.parse(e.data);
        if (msg.length <= 0) return;
        if (!chartRef.current.dataSet) {
          // When first data message arrives, create data set and series
          const keys = Object.keys(msg[0]).filter((key) => key !== "timestamp");
          const dataSet = new DataSetXY({
            schema: {
              timestamp: { pattern: "progressive" },
              ...Object.fromEntries(
                keys.map((key) => [key, { pattern: null }])
              ),
            },
          }).setMaxSampleCount(1_000_000);
          chartRef.current.dataSet = dataSet;

          chartRef.current.seriesMap = Object.fromEntries(
            keys.map((key, i) => {
              const axisY = chart
                .addAxisY({ iStack: -i })
                .setTitle(key)
                .setTitleRotation(0)
                .setMargins(3, 3);
              const series = chart
                .addLineSeries({ axisY })
                .setDataSet(dataSet, { x: "timestamp", y: key })
                .setName(key);
              series.addEventListener("visiblechange", (event) =>
                axisY.setVisible(event.isVisible)
              );
              return [key, series];
            })
          );
        }

        // For later data messages, just push them directly to data set
        chartRef.current.dataSet.appendJSON(msg);
      } catch (e) {
        console.error(e);
      }
    };
    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    const container = document.getElementById("chart") as HTMLDivElement;
    if (!container || !lc) return;
    const chart = lc.ChartXY({
      container,
      theme: Themes.darkGold,
      defaultAxisX: { type: "linear-highPrecision" },
    });
    chart.axisX
      .setTickStrategy(AxisTickStrategies.DateTime)
      .setScrollStrategy(AxisScrollStrategies.scrolling)
      .setDefaultInterval((state) => ({
        end: state.dataMax ?? 0,
        start: (state.dataMax ?? 0) - 30_000,
        stopAxisAfter: false,
      }));
    chart.axisY.dispose();
    chartRef.current = { chart };
    return () => {
      chart.dispose();
      chartRef.current = null;
    };
  }, [lc]);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <div id="chart" style={{ width: "100%", height: "50vh" }}></div>
      </header>
    </div>
  );
}

export default App;
