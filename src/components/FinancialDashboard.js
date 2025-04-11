import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ReferenceLine, Area
} from 'recharts';
import Papa from 'papaparse';
import _ from 'lodash';
import SortableTable from './ui/SortableTable';

const FinancialDashboard = ({ csvData }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [balanceView, setBalanceView] = useState('monthly');
  const [transactionView, setTransactionView] = useState('types');
  const [timeRange, setTimeRange] = useState('all');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'];

  useEffect(() => {
    if (!csvData) {
      setError("No CSV data provided");
      setIsLoading(false);
      return;
    }

    try {
      // Parse the CSV data
      const parsedData = Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });
      
      const transactions = parsedData.data;
      
      // Sort transactions by date
      const sortedTransactions = _.sortBy(transactions, t => new Date(t["Booking Date"]).getTime());
      
      // 1. BASIC STATISTICS
      // Date range
      const dates = transactions.map(t => new Date(t["Booking Date"])).sort((a, b) => a - b);
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      
      // Total volume (both positive and negative)
      const totalVolume = _.sumBy(transactions, t => Math.abs(t["Amount (EUR)"]));
      const inflows = _.sumBy(transactions, t => t["Amount (EUR)"] > 0 ? t["Amount (EUR)"] : 0);
      const outflows = _.sumBy(transactions, t => t["Amount (EUR)"] < 0 ? t["Amount (EUR)"] : 0);
      const netFlow = inflows + outflows;
      
      // 2. TRANSACTION PATTERNS OVER TIME
      // Group by month
      const transactionsByMonth = _.groupBy(transactions, t => 
        new Date(t["Booking Date"]).toISOString().slice(0, 7)
      );
      
      // Calculate monthly totals
      const monthlyStats = Object.entries(transactionsByMonth).map(([month, txs]) => {
        const date = new Date(month + "-01");
        const monthName = date.toLocaleString('default', { month: 'short' });
        return {
          month,
          monthDisplay: `${monthName} ${date.getFullYear()}`,
          count: txs.length,
          inflow: _.sumBy(txs, t => t["Amount (EUR)"] > 0 ? t["Amount (EUR)"] : 0),
          outflow: Math.abs(_.sumBy(txs, t => t["Amount (EUR)"] < 0 ? t["Amount (EUR)"] : 0)),
          net: _.sumBy(txs, t => t["Amount (EUR)"])
        };
      }).sort((a, b) => a.month.localeCompare(b.month));
      // Consolidate user's own transfer names before partner analysis
      const nameVariations = ["EUGENIO MARIA BATTAGLIA", "Eugenio Battaglia", "Eugenio Maria Battaglia"];
      const consolidatedSortedTransactions = sortedTransactions.map(tx => {
        const partnerName = tx["Partner Name"];
        // Ensure partnerName is a string before calling string methods
        if (typeof partnerName === 'string' && nameVariations.some(variation => partnerName.toUpperCase() === variation.toUpperCase())) {
           return { ...tx, "Partner Name": "My Transfers" };
        }
        return tx;
      });
      
      
      // 3. PARTNER ANALYSIS
      const partnerVolumes = _.chain(consolidatedSortedTransactions) // Use consolidated data
        .groupBy('Partner Name')
        .map((txs, name) => ({
          name,
          count: txs.length,
          totalVolume: _.sumBy(txs, t => Math.abs(t["Amount (EUR)"])),
          totalIn: _.sumBy(txs, t => t["Amount (EUR)"] > 0 ? t["Amount (EUR)"] : 0),
          totalOut: _.sumBy(txs, t => t["Amount (EUR)"] < 0 ? t["Amount (EUR)"] : 0),
          net: _.sumBy(txs, t => t["Amount (EUR)"])
        }))
        .orderBy(['totalVolume'], ['desc'])
        .value();
      
      // 4. CURRENCY DISTRIBUTION
      const currencyDistribution = _.chain(transactions)
        .groupBy('Original Currency')
        .map((txs, currency) => ({
          name: currency || 'EUR',
          count: txs.length,
          percentage: parseFloat((txs.length / transactions.length * 100).toFixed(1)),
          value: txs.length
        }))
        .orderBy(['value'], ['desc'])
        .value();
      
      // 5. TRANSACTION TYPES
      const typeDistribution = _.chain(transactions)
        .groupBy('Type')
        .map((txs, type) => {
          let displayName = type;
          if (type === 'Presentment') displayName = 'Card Payment';
          if (type === 'Presentment Refund') displayName = 'Card Refund';
          // Add more mappings here if needed
          return {
            name: displayName, // Use renamed label
            count: txs.length,
            percentage: parseFloat((txs.length / transactions.length * 100).toFixed(1)),
            value: _.sumBy(txs, t => Math.abs(t["Amount (EUR)"])),
            totalAmount: _.sumBy(txs, t => t["Amount (EUR)"])
          };
        })
        .orderBy(['count'], ['desc'])
        .value();
      
      // 6. BALANCE CALCULATION
      // Calculate running balance for each day
      let runningBalance = 0;
      const dailyBalances = {};
      
      for (const tx of sortedTransactions) {
        const date = tx["Booking Date"];
        runningBalance += tx["Amount (EUR)"];
        dailyBalances[date] = runningBalance;
      }
      
      // Generate a complete date range from min to max date
      const allDates = Object.keys(dailyBalances).sort();
      const startDate = new Date(allDates[0]);
      const endDate = new Date(allDates[allDates.length - 1]);
      
      // Fill in days with no transactions
      const allDailyBalances = {};
      const currentDate = new Date(startDate);
      let lastBalance = 0;
      
      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().slice(0, 10);
        
        if (dailyBalances[dateString] !== undefined) {
          // If we have a transaction on this day, update the last known balance
          lastBalance = dailyBalances[dateString];
        }
        
        // Store the balance for this day (either from transaction or carried over)
        allDailyBalances[dateString] = lastBalance;
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Calculate daily, weekly, and monthly averages
      // Function to get ISO week number and year
      function getWeekNumber(d) {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        
        return {
          year: date.getFullYear(),
          week: weekNum
        };
      }
      
      // Function to format week key
      function formatWeekKey(year, week) {
        return `${year}-W${week.toString().padStart(2, '0')}`;
      }
      
      // Group daily balances by week and month
      const weeklyBalances = {};
      const monthlyBalances = {};
      
      Object.entries(allDailyBalances).forEach(([date, balance]) => {
        // const d = new Date(date); // Removed unused variable
        
        // Get week and year
        const { year, week } = getWeekNumber(date);
        const weekKey = formatWeekKey(year, week);
        
        // Get month and year
        const monthKey = date.slice(0, 7); // YYYY-MM
        
        // Initialize week and month arrays if they don't exist
        if (!weeklyBalances[weekKey]) weeklyBalances[weekKey] = [];
        if (!monthlyBalances[monthKey]) monthlyBalances[monthKey] = [];
        
        // Add balance to appropriate arrays
        weeklyBalances[weekKey].push(balance);
        monthlyBalances[monthKey].push(balance);
      });
      
      // Calculate weekly average balances
      const weeklyAvgBalances = _.map(weeklyBalances, (balances, week) => {
        // Get first date from the week for display
        const weekDates = Object.keys(allDailyBalances).filter(date => {
          const { year, week: w } = getWeekNumber(date);
          return formatWeekKey(year, w) === week;
        }).sort();
        const firstDateOfWeek = new Date(weekDates[0]);
        const month = firstDateOfWeek.toLocaleString('default', { month: 'short' });
        const day = firstDateOfWeek.getDate();
        
        return {
          period: week,
          periodDisplay: `${month} ${day} (W${week.split('-W')[1]})`,
          avgBalance: _.sum(balances) / balances.length,
          min: _.min(balances),
          max: _.max(balances),
          days: balances.length
        };
      }).sort((a, b) => a.period.localeCompare(b.period));
      
      // Calculate monthly average balances
      const monthlyAvgBalances = _.map(monthlyBalances, (balances, month) => {
        const date = new Date(month + "-01");
        const monthName = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        
        return {
          period: month,
          periodDisplay: `${monthName} ${year}`,
          avgBalance: _.sum(balances) / balances.length,
          min: _.min(balances),
          max: _.max(balances),
          days: balances.length
        };
      }).sort((a, b) => a.period.localeCompare(b.period));
      
      // Calculate yearly average balance
      const totalDays = Object.keys(allDailyBalances).length;
      const sumOfDailyBalances = _.sum(Object.values(allDailyBalances));
      const yearlyAvgBalance = sumOfDailyBalances / totalDays;
      
      // Format daily data for visualization
      const formattedDailyData = Object.entries(allDailyBalances).map(([date, balance]) => {
        const d = new Date(date);
        const month = d.toLocaleString('default', { month: 'short' });
        return {
          date,
          formattedDate: `${month} ${d.getDate()}`,
          balance,
          hasTransaction: dailyBalances[date] !== undefined,
          quarter: Math.floor((d.getMonth() / 3) + 1)
        };
      }).sort((a, b) => a.date.localeCompare(b.date));
      
      // 7. LARGEST TRANSACTIONS
      const largestInflows = _.chain(consolidatedSortedTransactions) // Use consolidated data
        .filter(t => t["Amount (EUR)"] > 0)
        .orderBy(["Amount (EUR)"], ["desc"])
        .take(10) // Show top 10
        .map(t => ({
          name: t["Partner Name"],
          date: t["Booking Date"],
          value: t["Amount (EUR)"],
          type: "inflow"
        }))
        .value();

      const largestOutflows = _.chain(consolidatedSortedTransactions) // Use consolidated data
        .filter(t => t["Amount (EUR)"] < 0)
        .orderBy(["Amount (EUR)"], ["asc"])
        .take(10) // Show top 10
        .map(t => ({
          name: t["Partner Name"],
          date: t["Booking Date"],
          value: Math.abs(t["Amount (EUR)"]),
          type: "outflow"
        }))
        .value();
      
      // Set all data for visualization
      setData({
        basicStats: {
          dateRange: { start: minDate.toISOString().slice(0, 10), end: maxDate.toISOString().slice(0, 10) },
          totalTransactions: transactions.length, // Use original length for stats
          totalVolume,
          inflows,
          outflows,
          netFlow
        },
        monthlyStats,
        partnerVolumes: partnerVolumes.slice(0, 10), // Already uses consolidated data via calculation chain
        currencyDistribution: currencyDistribution.slice(0, 6),
        typeDistribution: typeDistribution.slice(0, 7), // Already uses renamed labels via calculation chain
        dailyBalances: formattedDailyData,
        weeklyBalances: weeklyAvgBalances,
        monthlyBalances: monthlyAvgBalances,
        yearlyBalance: {
          totalDays,
          sumOfDailyBalances,
          yearlyAvgBalance
        },
        largestTransactions: { // Already uses consolidated data via calculation chain
          inflows: largestInflows,
          outflows: largestOutflows
        },
        allTransactions: consolidatedSortedTransactions // Add consolidated transactions to state
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error("Error processing data:", err);
      setError("Failed to process financial data: " + err.message);
      setIsLoading(false);
    }
  }, [csvData]);

  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading comprehensive financial data...</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;
  if (!data) return <div className="text-center p-4">No financial data available</div>;

  // Helper to format currency
  const formatCurrency = (value) => `€${parseFloat(value).toFixed(2)}`;
  
  // Filter daily balance data based on selected time range
  const filteredDailyData = data.dailyBalances.filter(item => {
    if (timeRange === 'all') return true;
    if (timeRange === 'q1') return item.quarter === 1;
    if (timeRange === 'q2') return item.quarter === 2;
    if (timeRange === 'q3') return item.quarter === 3;
    if (timeRange === 'q4') return item.quarter === 4;
    return true;
  });

  return (
    <div className="bg-gray-50 min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Comprehensive Financial Dashboard</h1>
        
        {/* Key Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-xs uppercase">Total Transactions</div>
            <div className="text-2xl font-bold">{data.basicStats.totalTransactions}</div>
            <div className="text-xs text-gray-500 mt-1">
              {data.basicStats.dateRange.start} to {data.basicStats.dateRange.end}
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-xs uppercase">Transaction Volume</div>
            <div className="text-2xl font-bold">{formatCurrency(data.basicStats.totalVolume)}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-xs uppercase">Net Cash Flow</div>
            <div className="text-2xl font-bold" style={{color: data.basicStats.netFlow >= 0 ? '#4CAF50' : '#F44336'}}>
              {formatCurrency(data.basicStats.netFlow)}
            </div>
            <div className="text-xs flex justify-between mt-1">
              <span className="text-green-600">In: {formatCurrency(data.basicStats.inflows)}</span>
              <span className="text-red-600">Out: {formatCurrency(Math.abs(data.basicStats.outflows))}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-500 text-xs uppercase">Avg Daily Balance</div>
            <div className="text-2xl font-bold" style={{color: data.yearlyBalance.yearlyAvgBalance >= 0 ? '#4CAF50' : '#F44336'}}>
              {formatCurrency(data.yearlyBalance.yearlyAvgBalance)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Based on {data.yearlyBalance.totalDays} days</div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap mb-6 bg-white rounded shadow">
          <button 
            className={`px-4 py-2 ${activeTab === 'overview' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'} rounded-tl`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'cashFlow' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveTab('cashFlow')}
          >
            Cash Flow
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'transactions' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'balance' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveTab('balance')}
          >
            Balance
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'partners' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
            onClick={() => setActiveTab('partners')}
          >
            Partners
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="bg-white rounded shadow p-4 mb-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Financial Overview</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Net Flow */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Monthly Net Flow</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.monthlyStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="monthDisplay" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="inflow" name="Inflows" fill="#4CAF50" />
                        <Bar dataKey="outflow" name="Outflows" fill="#F44336" />
                        <Line type="monotone" dataKey="net" name="Net Flow" stroke="#2196F3" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Balance Overview */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Balance Evolution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.dailyBalances}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="formattedDate" 
                          interval={30}
                          tickMargin={10}
                        />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <ReferenceLine 
                          y={data.yearlyBalance.yearlyAvgBalance} 
                          stroke="red" 
                          strokeDasharray="5 5" 
                          label={{ value: 'Avg', position: 'right' }} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="balance" 
                          name="Balance" 
                          stroke="#3273dc" 
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Transaction Types */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Transaction Types</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.typeDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({name, percentage}) => `${name} (${percentage}%)`}
                        >
                          {data.typeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Top Partners */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Top 5 Partners by Volume</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.partnerVolumes.slice(0, 5)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={90} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Bar dataKey="totalVolume" name="Volume" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              {/* Largest Transactions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Largest Inflows</h3>
                  <SortableTable
                    tableName="Largest Inflows"
                    data={data.largestTransactions.inflows}
                    columns={[
                      {
                        key: 'name',
                        header: 'Partner',
                        type: 'string'
                      },
                      {
                        key: 'date',
                        header: 'Date',
                        type: 'date'
                      },
                      {
                        key: 'value',
                        header: 'Amount',
                        type: 'number',
                        className: 'text-right text-green-600',
                        headerClassName: 'text-right',
                        render: (row) => formatCurrency(row.value)
                      }
                    ]}
                  />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">Largest Outflows</h3>
                  <SortableTable
                    tableName="Largest Outflows"
                    data={data.largestTransactions.outflows}
                    columns={[
                      {
                        key: 'name',
                        header: 'Partner',
                        type: 'string'
                      },
                      {
                        key: 'date',
                        header: 'Date',
                        type: 'date'
                      },
                      {
                        key: 'value',
                        header: 'Amount',
                        type: 'number',
                        className: 'text-right text-red-600',
                        headerClassName: 'text-right',
                        render: (row) => `-${formatCurrency(row.value)}`
                      }
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* CASH FLOW TAB */}
          {activeTab === 'cashFlow' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Cash Flow Analysis</h2>
              
              <div className="h-96 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthDisplay" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="inflow" name="Inflows" fill="#4CAF50" />
                    <Bar dataKey="outflow" name="Outflows" fill="#F44336" />
                    <Line type="monotone" dataKey="net" name="Net Flow" stroke="#2196F3" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              <SortableTable
                tableName="Monthly Cash Flow"
                data={[
                  ...data.monthlyStats,
                  {
                    monthDisplay: 'TOTAL',
                    count: data.basicStats.totalTransactions,
                    inflow: data.basicStats.inflows,
                    outflow: Math.abs(data.basicStats.outflows),
                    net: data.basicStats.netFlow,
                    isTotal: true
                  }
                ]}
                columns={[
                  {
                    key: 'monthDisplay',
                    header: 'Month',
                    type: 'string',
                    className: 'border'
                  },
                  {
                    key: 'count',
                    header: 'Transactions',
                    type: 'number',
                    className: 'border text-right',
                    headerClassName: 'text-right border'
                  },
                  {
                    key: 'inflow',
                    header: 'Inflows',
                    type: 'number',
                    className: 'border text-right text-green-600',
                    headerClassName: 'text-right border',
                    render: (row) => formatCurrency(row.inflow)
                  },
                  {
                    key: 'outflow',
                    header: 'Outflows',
                    type: 'number',
                    className: 'border text-right text-red-600',
                    headerClassName: 'text-right border',
                    render: (row) => formatCurrency(row.outflow)
                  },
                  {
                    key: 'net',
                    header: 'Net Flow',
                    type: 'number',
                    className: 'border text-right font-medium',
                    headerClassName: 'text-right border',
                    render: (row) => (
                      <span style={{color: row.net < 0 ? '#F44336' : '#4CAF50'}}>
                        {formatCurrency(row.net)}
                      </span>
                    )
                  }
                ]}
                getRowClassName={(row) =>
                  row.isTotal ? 'font-bold border-t-2 border-gray-300' : (row.net < 0 ? 'bg-red-50' : 'bg-green-50')
                }
              />
            </div>
          )}
          
          {/* TRANSACTIONS TAB */}
          {activeTab === 'transactions' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Transaction Analysis</h2>
              
              <div className="flex justify-center mb-4">
                <div className="flex space-x-2">
                  <button 
                    className={`px-3 py-1 rounded ${transactionView === 'types' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setTransactionView('types')}
                  >
                    Transaction Types
                  </button>
                  <button 
                    className={`px-3 py-1 rounded ${transactionView === 'currencies' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setTransactionView('currencies')}
                  >
                    Currencies
                  </button>
                </div>
              </div>
              
              {transactionView === 'types' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.typeDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({name, percentage}) => `${name} (${percentage}%)`}
                        >
                          {data.typeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <SortableTable
                    tableName="Transaction Types"
                    data={data.typeDistribution}
                    columns={[
                      {
                        key: 'name',
                        header: 'Type',
                        type: 'string',
                        className: 'border'
                      },
                      {
                        key: 'count',
                        header: 'Count',
                        type: 'number',
                        className: 'border text-right',
                        headerClassName: 'text-right border'
                      },
                      {
                        key: 'percentage',
                        header: 'Percentage',
                        type: 'number',
                        className: 'border text-right',
                        headerClassName: 'text-right border',
                        render: (row) => `${row.percentage}%`
                      },
                      {
                        key: 'value',
                        header: 'Volume',
                        type: 'number',
                        className: 'border text-right',
                        headerClassName: 'text-right border',
                        render: (row) => formatCurrency(row.value)
                      },
                      {
                        key: 'totalAmount',
                        header: 'Net Amount',
                        type: 'number',
                        className: 'border text-right',
                        headerClassName: 'text-right border',
                        render: (row) => (
                          <span style={{color: row.totalAmount < 0 ? '#F44336' : '#4CAF50'}}>
                            {formatCurrency(row.totalAmount)}
                          </span>
                        )
                      }
                    ]}
                  />
                </div>
              )}
              
              {/* All Transactions Table */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">All Transactions</h3>
                <SortableTable
                  data={data.allTransactions} // Access consolidated transactions from state
                  columns={[
                    { key: 'Booking Date', header: 'Date', type: 'date' },
                    { key: 'Partner Name', header: 'Partner', type: 'string' },
                    { key: 'Payment Reference', header: 'Reference', type: 'string' },
                    { key: 'Type', header: 'Type', type: 'string', render: (value) => {
                        // Apply renaming for display in this table too
                        if (value === 'Presentment') return 'Card Payment';
                        if (value === 'Presentment Refund') return 'Card Refund';
                        return value;
                      }
                    },
                    {
                      key: 'Amount (EUR)',
                      header: 'Amount (€)',
                      type: 'number',
                      render: (value) => (
                        <span style={{ color: value < 0 ? '#F44336' : '#4CAF50' }}>
                          {formatCurrency(value)}
                        </span>
                      )
                    }
                  ]}
                  defaultSortKey="Booking Date"
                  defaultSortDirection="desc"
                  tableName="All_Transactions"
                  useVirtualization={true} // Enable virtualization
                  virtualHeight={600}      // Set a suitable height for the virtualized area
                  rowHeight={40}           // Set the height for each row
                />
              </div>
              
              {transactionView === 'currencies' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.currencyDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({name, percentage}) => `${name} (${percentage}%)`}
                        >
                          {data.currencyDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <SortableTable
                    tableName="Currency Distribution"
                    data={data.currencyDistribution}
                    columns={[
                      {
                        key: 'name',
                        header: 'Currency',
                        type: 'string',
                        className: 'border'
                      },
                      {
                        key: 'count',
                        header: 'Count',
                        type: 'number',
                        className: 'border text-right',
                        headerClassName: 'text-right border'
                      },
                      {
                        key: 'percentage',
                        header: 'Percentage',
                        type: 'number',
                        className: 'border text-right',
                        headerClassName: 'text-right border',
                        render: (row) => `${row.percentage}%`
                      }
                    ]}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* BALANCE TAB */}
          {activeTab === 'balance' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Balance Analysis</h2>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex space-x-2">
                  <button 
                    className={`px-3 py-1 rounded ${balanceView === 'daily' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setBalanceView('daily')}
                  >
                    Daily
                  </button>
                  <button 
                    className={`px-3 py-1 rounded ${balanceView === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setBalanceView('weekly')}
                  >
                    Weekly
                  </button>
                  <button 
                    className={`px-3 py-1 rounded ${balanceView === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => setBalanceView('monthly')}
                  >
                    Monthly
                  </button>
                </div>
                
                {balanceView === 'daily' && (
                  <div className="flex space-x-2">
                    <button 
                      className={`px-3 py-1 rounded ${timeRange === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                      onClick={() => setTimeRange('all')}
                    >
                      All
                    </button>
                    <button 
                      className={`px-3 py-1 rounded ${timeRange === 'q1' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                      onClick={() => setTimeRange('q1')}
                    >
                      Q1
                    </button>
                    <button 
                      className={`px-3 py-1 rounded ${timeRange === 'q2' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                      onClick={() => setTimeRange('q2')}
                    >
                      Q2
                    </button>
                    <button 
                      className={`px-3 py-1 rounded ${timeRange === 'q3' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                      onClick={() => setTimeRange('q3')}
                    >
                      Q3
                    </button>
                    <button 
                      className={`px-3 py-1 rounded ${timeRange === 'q4' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                      onClick={() => setTimeRange('q4')}
                    >
                      Q4
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded shadow">
                  <div className="text-gray-500 text-sm">Total Days</div>
                  <div className="text-2xl font-bold">{data.yearlyBalance.totalDays}</div>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <div className="text-gray-500 text-sm">Sum of Daily Balances</div>
                  <div className="text-2xl font-bold" style={{color: data.yearlyBalance.sumOfDailyBalances >= 0 ? '#4CAF50' : '#F44336'}}>
                    {formatCurrency(data.yearlyBalance.sumOfDailyBalances)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <div className="text-gray-500 text-sm">Daily Average Balance (Yearly)</div>
                  <div className="text-2xl font-bold" style={{color: data.yearlyBalance.yearlyAvgBalance >= 0 ? '#4CAF50' : '#F44336'}}>
                    {formatCurrency(data.yearlyBalance.yearlyAvgBalance)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Sum of all daily balances ÷ Total days
                  </div>
                </div>
              </div>
              
              <div className="h-96 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  {balanceView === 'daily' && (
                    <LineChart 
                      data={filteredDailyData} 
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="formattedDate" 
                        interval={timeRange === 'all' ? 30 : 5}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <ReferenceLine 
                        y={data.yearlyBalance.yearlyAvgBalance} 
                        stroke="red" 
                        strokeDasharray="5 5" 
                        label="Yearly Avg" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="balance" 
                        name="Daily Balance" 
                        stroke="#3273dc" 
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  )}
                  
                  {balanceView === 'weekly' && (
                    <ComposedChart 
                      data={data.weeklyBalances} 
                      margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="periodDisplay" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        interval={2}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <ReferenceLine 
                        y={data.yearlyBalance.yearlyAvgBalance} 
                        stroke="red" 
                        strokeDasharray="5 5" 
                        label="Yearly Avg" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="min" 
                        fillOpacity={0.1} 
                        fill="#8884d8" 
                        stroke="none" 
                        name="Min Balance"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="max" 
                        fillOpacity={0.1} 
                        fill="#8884d8" 
                        stroke="none" 
                        name="Max Balance"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgBalance" 
                        name="Weekly Avg Balance" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={{r: 3}}
                        activeDot={{ r: 6 }}
                      />
                    </ComposedChart>
                  )}
                  
                  {balanceView === 'monthly' && (
                    <ComposedChart 
                      data={data.monthlyBalances} 
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="periodDisplay"
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <ReferenceLine 
                        y={data.yearlyBalance.yearlyAvgBalance} 
                        stroke="red" 
                        strokeDasharray="5 5" 
                        label="Yearly Avg" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="min" 
                        fillOpacity={0.1} 
                        fill="#8884d8" 
                        stroke="none" 
                        name="Min Balance"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="max" 
                        fillOpacity={0.1} 
                        fill="#8884d8" 
                        stroke="none" 
                        name="Max Balance"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgBalance" 
                        name="Monthly Avg Balance" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={{r: 4}}
                        activeDot={{ r: 8 }}
                      />
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 border">
                        {balanceView === 'daily' ? 'Date' : 
                         balanceView === 'weekly' ? 'Week' : 'Month'}
                      </th>
                      <th className="py-2 px-4 border text-right">Average Balance</th>
                      {balanceView !== 'daily' && (
                        <>
                          <th className="py-2 px-4 border text-right">Min Balance</th>
                          <th className="py-2 px-4 border text-right">Max Balance</th>
                          <th className="py-2 px-4 border text-right">Days</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {balanceView === 'daily' ? (
                      filteredDailyData.filter((_, i) => i % 30 === 0).map((day, index) => (
                        <tr key={index} className={day.balance < 0 ? "bg-red-50" : "bg-green-50"}>
                          <td className="py-2 px-4 border">{day.date}</td>
                          <td className="py-2 px-4 border text-right" style={{color: day.balance < 0 ? '#F44336' : '#4CAF50'}}>
                            {formatCurrency(day.balance)}
                          </td>
                        </tr>
                      ))
                    ) : balanceView === 'weekly' ? (
                      data.weeklyBalances.map((week, index) => (
                        <tr key={index} className={week.avgBalance < 0 ? "bg-red-50" : "bg-green-50"}>
                          <td className="py-2 px-4 border">{week.period}</td>
                          <td className="py-2 px-4 border text-right" style={{color: week.avgBalance < 0 ? '#F44336' : '#4CAF50'}}>
                            {formatCurrency(week.avgBalance)}
                          </td>
                          <td className="py-2 px-4 border text-right" style={{color: week.min < 0 ? '#F44336' : '#4CAF50'}}>
                            {formatCurrency(week.min)}
                          </td>
                          <td className="py-2 px-4 border text-right" style={{color: week.max < 0 ? '#F44336' : '#4CAF50'}}>
                            {formatCurrency(week.max)}
                          </td>
                          <td className="py-2 px-4 border text-right">{week.days}</td>
                        </tr>
                      ))
                    ) : (
                      data.monthlyBalances.map((month, index) => (
                        <tr key={index} className={month.avgBalance < 0 ? "bg-red-50" : "bg-green-50"}>
                          <td className="py-2 px-4 border">{month.periodDisplay}</td>
                          <td className="py-2 px-4 border text-right" style={{color: month.avgBalance < 0 ? '#F44336' : '#4CAF50'}}>
                            {formatCurrency(month.avgBalance)}
                          </td>
                          <td className="py-2 px-4 border text-right" style={{color: month.min < 0 ? '#F44336' : '#4CAF50'}}>
                            {formatCurrency(month.min)}
                          </td>
                          <td className="py-2 px-4 border text-right" style={{color: month.max < 0 ? '#F44336' : '#4CAF50'}}>
                            {formatCurrency(month.max)}
                          </td>
                          <td className="py-2 px-4 border text-right">{month.days}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* PARTNERS TAB */}
          {activeTab === 'partners' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Partner Analysis</h2>
              
              <div className="h-96 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.partnerVolumes}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={140} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="totalVolume" name="Transaction Volume" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <SortableTable
                tableName="Top Partners"
                data={data.partnerVolumes}
                columns={[
                  {
                    key: 'name',
                    header: 'Partner',
                    type: 'string',
                    className: 'border'
                  },
                  {
                    key: 'count',
                    header: 'Transactions',
                    type: 'number',
                    className: 'border text-right',
                    headerClassName: 'text-right border'
                  },
                  {
                    key: 'totalVolume',
                    header: 'Total Volume',
                    type: 'number',
                    className: 'border text-right',
                    headerClassName: 'text-right border',
                    render: (row) => formatCurrency(row.totalVolume)
                  },
                  {
                    key: 'totalIn',
                    header: 'Total Inflows',
                    type: 'number',
                    className: 'border text-right text-green-600',
                    headerClassName: 'text-right border',
                    render: (row) => formatCurrency(row.totalIn)
                  },
                  {
                    key: 'totalOut',
                    header: 'Total Outflows',
                    type: 'number',
                    className: 'border text-right text-red-600',
                    headerClassName: 'text-right border',
                    render: (row) => formatCurrency(Math.abs(row.totalOut))
                  },
                  {
                    key: 'net',
                    header: 'Net Flow',
                    type: 'number',
                    className: 'border text-right',
                    headerClassName: 'text-right border',
                    render: (row) => (
                      <span style={{color: row.net < 0 ? '#F44336' : '#4CAF50'}}>
                        {formatCurrency(row.net)}
                      </span>
                    )
                  }
                ]}
                getRowClassName={(row) => row.net < 0 ? "bg-red-50" : "bg-green-50"}
              />
            </div>
          )}
        </div>
        
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Key Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-1">Cash Flow</h3>
              <ul className="list-disc ml-5 space-y-1">
                <li>Total net flow: {formatCurrency(data.basicStats.netFlow)} for the period</li>
                {data.monthlyStats.length > 0 && (
                  <>
                    <li>Highest inflows in {data.monthlyStats.sort((a, b) => b.inflow - a.inflow)[0].monthDisplay} ({formatCurrency(data.monthlyStats.sort((a, b) => b.inflow - a.inflow)[0].inflow)})</li>
                    <li>Largest outflows in {data.monthlyStats.sort((a, b) => b.outflow - a.outflow)[0].monthDisplay} ({formatCurrency(data.monthlyStats.sort((a, b) => b.outflow - a.outflow)[0].outflow)})</li>
                    <li>Most positive month: {data.monthlyStats.sort((a, b) => b.net - a.net)[0].monthDisplay} ({formatCurrency(data.monthlyStats.sort((a, b) => b.net - a.net)[0].net)})</li>
                    <li>Most negative month: {data.monthlyStats.sort((a, b) => a.net - b.net)[0].monthDisplay} ({formatCurrency(data.monthlyStats.sort((a, b) => a.net - b.net)[0].net)})</li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-1">Balance Trends</h3>
              <ul className="list-disc ml-5 space-y-1">
                <li>Yearly average balance: {formatCurrency(data.yearlyBalance.yearlyAvgBalance)}</li>
                {data.monthlyBalances.length > 0 && (
                  <>
                    <li>Highest monthly average: {data.monthlyBalances.sort((a, b) => b.avgBalance - a.avgBalance)[0].periodDisplay} ({formatCurrency(data.monthlyBalances.sort((a, b) => b.avgBalance - a.avgBalance)[0].avgBalance)})</li>
                    <li>Lowest monthly average: {data.monthlyBalances.sort((a, b) => a.avgBalance - b.avgBalance)[0].periodDisplay} ({formatCurrency(data.monthlyBalances.sort((a, b) => a.avgBalance - b.avgBalance)[0].avgBalance)})</li>
                  </>
                )}
                <li>Ending balance: {formatCurrency(data.dailyBalances[data.dailyBalances.length - 1].balance)}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-1">Transaction Patterns</h3>
              <ul className="list-disc ml-5 space-y-1">
                {data.typeDistribution.length > 0 && (
                  <li>Most common transaction type: {data.typeDistribution[0].name} ({data.typeDistribution[0].percentage}%)</li>
                )}
                {data.currencyDistribution.length > 0 && (
                  <li>Primary currency: {data.currencyDistribution[0].name} ({data.currencyDistribution[0].percentage}%)</li>
                )}
                <li>Average transaction size: {formatCurrency(data.basicStats.totalVolume / data.basicStats.totalTransactions)}</li>
                {data.partnerVolumes.length >= 3 && (
                  <li>Transaction concentration: Top 3 partners account for {((data.partnerVolumes.slice(0, 3).reduce((sum, p) => sum + p.totalVolume, 0) / data.basicStats.totalVolume) * 100).toFixed(0)}% of volume</li>
                )}
                {data.monthlyStats.length > 0 && (
                  <li>Transaction frequency peaks in {data.monthlyStats.sort((a, b) => b.count - a.count)[0].monthDisplay} ({data.monthlyStats.sort((a, b) => b.count - a.count)[0].count} transactions)</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-1">Partner Relationships</h3>
              <ul className="list-disc ml-5 space-y-1">
                {data.partnerVolumes.length > 0 && (
                  <>
                    <li>Top partner by volume: {data.partnerVolumes[0].name} ({formatCurrency(data.partnerVolumes[0].totalVolume)})</li>
                    <li>Most frequent partner: {data.partnerVolumes.sort((a, b) => b.count - a.count)[0].name} ({data.partnerVolumes.sort((a, b) => b.count - a.count)[0].count} transactions)</li>
                  </>
                )}
                {data.largestTransactions.inflows.length > 0 && (
                  <li>Largest single inflow: {formatCurrency(data.largestTransactions.inflows[0].value)} from {data.largestTransactions.inflows[0].name}</li>
                )}
                {data.largestTransactions.outflows.length > 0 && (
                  <li>Largest single outflow: {formatCurrency(data.largestTransactions.outflows[0].value)} to {data.largestTransactions.outflows[0].name}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;