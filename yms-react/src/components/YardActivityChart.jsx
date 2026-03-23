import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function YardActivityChart({ data }) {
  const readIsLight = () => document.body?.dataset?.theme === "light";
  const [isLight, setIsLight] = useState(readIsLight);

  useEffect(() => {
    const target = document.body;
    if (!target) return;

    const obs = new MutationObserver(() => setIsLight(readIsLight()));
    obs.observe(target, { attributes: true, attributeFilter: ["data-theme"] });
    setIsLight(readIsLight());

    return () => obs.disconnect();
  }, []);

  return (
    <div className="panel glass">
      <div className="panel-head">
        <h3>Yard Activity</h3>
        <span className="panel-sub">Arrivals, Departures & Idle (Weekly)</span>
      </div>

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} barCategoryGap="25%">
            <CartesianGrid
              stroke={
                isLight
                  ? "rgba(15,23,42,0.18)"
                  : "rgba(255,255,255,0.10)"
              }
              strokeDasharray="3 3"
            />

            {/*(Sun / Mon readable in light) */}
            <XAxis
              dataKey="day"
              axisLine={{
                stroke: isLight ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.75)",
              }}
              tickLine={{
                stroke: isLight ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.75)",
              }}
              stroke={
                isLight
                  ? "rgba(15,23,42,0.85)"
                  : "rgba(255,255,255,0.75)"
              }
              tick={{
                fill: isLight ? "#0f172a" : "rgba(255,255,255,0.85)",
                fontSize: 12,
              }}
            />

    
            <YAxis
              axisLine={{
                stroke: isLight ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.75)",
              }}
              tickLine={{
                stroke: isLight ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.75)",
              }}
              stroke={
                isLight
                  ? "rgba(15,23,42,0.85)"
                  : "rgba(255,255,255,0.75)"
              }
              tick={{
                fill: isLight ? "#0f172a" : "rgba(255,255,255,0.85)",
                fontSize: 12,
              }}
            />

            {/*(light vs dark) */}
            <Tooltip
              contentStyle={{
                background: isLight
                  ? "rgba(255,255,255,0.96)"
                  : "rgba(20, 24, 40, 0.92)",
                border: isLight
                  ? "1px solid rgba(15,23,42,0.16)"
                  : "1px solid rgba(255,255,255,0.14)",
                borderRadius: 12,
                color: isLight ? "#0f172a" : "#ffffff",
              }}
              labelStyle={{
                color: isLight ? "#0f172a" : "#ffffff",
                fontWeight: 700,
              }}
              itemStyle={{
                color: isLight ? "#0f172a" : "#ffffff",
              }}
            />

            <Legend
              wrapperStyle={{
                color: isLight ? "#0f172a" : "#ffffff",
              }}
            />

            <Bar
              dataKey="arrivals"
              name="Arrivals"
              fill="#4cc9f0"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="departures"
              name="Departures"
              fill="#80ed99"
              radius={[8, 8, 0, 0]}
            />

            <Line
              type="monotone"
              dataKey="idle"
              name="Idle"
              stroke="#f72585"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
