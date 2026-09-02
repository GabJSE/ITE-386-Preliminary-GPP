import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function StatsChart({ stats }) {
  // Build a platform overview using available metrics. Support several shapes.
  const usersValue = stats.totalUsers ?? ((stats.totalJobseekers || 0) + (stats.totalEmployers || 0));
  const jobsValue = stats.totalActiveJobs ?? stats.totalJobs ?? 0;
  const appsValue = stats.totalApplications ?? stats.totalApplications ?? 0;

  const data = [
    { name: 'Users', value: usersValue },
    { name: 'Active Jobs', value: jobsValue },
    { name: 'Applications', value: appsValue },
  ];

  const containerStyle = {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '10px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    marginTop: '24px',
  };

  const headingStyle = {
    marginBottom: '16px',
    color: '#333',
    fontSize: '20px',
    fontWeight: '600',
  };

  const handleBarClick = (data, index) => {
    console.log(`Clicked on ${data.name}: ${data.value}`);
    // You can trigger modal, toast, or drill-down here
  };

  return (
    <div style={containerStyle}>
      <h3 style={headingStyle}>Platform Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} onClick={handleBarClick}>
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#0078D4" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
