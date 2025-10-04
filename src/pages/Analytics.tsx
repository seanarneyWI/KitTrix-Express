import React from 'react';

const Analytics: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Analytics Dashboard</h1>
          <div className="text-center py-8">
            <p className="text-gray-600">Analytics and reporting features will be implemented here.</p>
            <p className="text-sm text-gray-500 mt-2">Charts, metrics, and performance data visualization.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;