import React from 'react';

export default function TestDashboard() {
  console.log('TestDashboard component rendered');
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Loaded Successfully!</h1>
        <p className="text-gray-600 mb-4">If you can see this, the routing and component rendering works.</p>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">✅ React components working</p>
          <p className="text-sm text-gray-500">✅ Tailwind CSS working</p>
          <p className="text-sm text-gray-500">✅ Authentication flow working</p>
        </div>
      </div>
    </div>
  );
}
