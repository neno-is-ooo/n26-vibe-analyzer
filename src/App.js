import React, { useState } from 'react';
import FinancialDashboard from './components/FinancialDashboard';
import './App.css';

function App() {
  const [csvData, setCsvData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    // Check if file is a CSV
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      setIsLoading(false);
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        setCsvData(e.target.result);
        setIsLoading(false);
      } catch (err) {
        setError('Error reading CSV file: ' + err.message);
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file.');
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {!csvData ? (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6 text-center">Financial Dashboard</h1>
            
            <p className="mb-4 text-gray-700">
              Upload your transaction CSV file to generate a comprehensive financial analysis dashboard.
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                id="csv-upload"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="mt-2 text-sm text-gray-500">
                  Click to upload CSV file
                </span>
              </label>
            </div>

            {isLoading && (
              <div className="mt-4 text-center text-gray-600">
                Loading your data...
              </div>
            )}

            {error && (
              <div className="mt-4 text-center text-red-600">
                {error}
              </div>
            )}

            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Required CSV Format:</h2>
              <p className="text-sm text-gray-600 mb-2">
                Your CSV file must have these exact column names (case-sensitive):
              </p>
              <ul className="text-sm text-gray-600 list-disc pl-5 mb-4">
                <li>Booking Date</li>
                <li>Value Date</li>
                <li>Partner Name</li>
                <li>Partner Iban</li>
                <li>Type</li>
                <li>Payment Reference</li>
                <li>Account Name</li>
                <li>Amount (EUR)</li>
                <li>Original Amount</li>
                <li>Original Currency</li>
                <li>Exchange Rate</li>
              </ul>
              <p className="text-sm text-gray-600">
                Dates should be in YYYY-MM-DD format and "Amount (EUR)" should contain values with a decimal point.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <FinancialDashboard csvData={csvData} />
      )}
    </div>
  );
}

export default App;