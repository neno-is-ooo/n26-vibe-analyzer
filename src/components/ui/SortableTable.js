 import React, { useState, useMemo, useCallback } from 'react';
 import { saveAs } from 'file-saver';
 import { FixedSizeList as List } from 'react-window';

/**
 * SortableTable - A reusable table component with column sorting functionality.
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of objects to display in the table
 * @param {Array} props.columns - Column definitions for the table
 *   Each column should be an object with:
 *     - key: string (required) - The property name in data objects
 *     - header: string (required) - The display name for the column header
 *     - type: string (optional) - 'string', 'number', or 'date' - Default: 'string'
 *     - render: function (optional) - Custom render function for cell data
 *     - className: string (optional) - Additional class for the cell
 *     - headerClassName: string (optional) - Additional class for the header
 * @param {string} props.tableName - Optional name for the table (used in export filenames)
 * @param {string} props.className - Optional additional className for the table
 * @param {string} props.headerClassName - Optional additional className for the header row
 * @param {string} props.bodyClassName - Optional additional className for the table body
 * @param {string} props.rowClassName - Optional additional className for table rows
 * @param {Function} props.getRowClassName - Optional function to get className for a row based on its data
 * @param {boolean} props.useVirtualization - Optional flag to enable list virtualization (default: false)
 * @param {number} props.virtualHeight - Optional height for the virtualized list container (default: 400)
 * @param {number} props.rowHeight - Optional fixed height for each row in virtualization (default: 35)
 */
 const SortableTable = ({
   data = [],
   columns = [],
   tableName = 'Table',
   className = '',
   headerClassName = '',
   bodyClassName = '',
   rowClassName = '',
   getRowClassName = () => '',
   useVirtualization = false,
   virtualHeight = 400,
   rowHeight = 35
 }) => {
  // State for tracking sort configuration
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });

  // Memoized sorted data to avoid unnecessary re-sorting
  const sortedData = useMemo(() => {
    // If no sort key, return data as is
    if (!sortConfig.key) return data;

    // Find the column config to determine the type
    const columnConfig = columns.find(col => col.key === sortConfig.key) || {};
    const type = columnConfig.type || 'string';

    // Create a new array to avoid mutating the original data
    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      // Handle different data types
      if (type === 'number') {
        // For number type
        return sortConfig.direction === 'asc' 
          ? (aValue || 0) - (bValue || 0) 
          : (bValue || 0) - (aValue || 0);
      } else if (type === 'date') {
        // For date type
        const dateA = aValue ? new Date(aValue).getTime() : 0;
        const dateB = bValue ? new Date(bValue).getTime() : 0;
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        // Default: string type
        const strA = String(aValue || '').toLowerCase();
        const strB = String(bValue || '').toLowerCase();
        return sortConfig.direction === 'asc' 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      }
    });

    return sorted;
  }, [data, sortConfig, columns]);

  // Handle sort request when clicking on column header
  const requestSort = (key) => {
    // Find the column config to determine the type
    const columnConfig = columns.find(col => col.key === key) || {};
    const type = columnConfig.type || 'string';

    setSortConfig(prevConfig => {
      // If already sorting by this key, toggle direction
      if (prevConfig.key === key) {
        // For numeric/date columns: desc -> asc -> desc
        // For string columns: asc -> desc -> asc
        let newDirection;
        
        if (type === 'number' || type === 'date') {
          // For numbers and dates, prefer desc (high to low) first
          newDirection = prevConfig.direction === 'desc' ? 'asc' : 'desc';
        } else {
          // For strings, prefer asc (A-Z) first
          newDirection = prevConfig.direction === 'asc' ? 'desc' : 'asc';
        }
        
        return { key, direction: newDirection };
      } else {
        // If sorting by a new key, use the default initial direction based on type
        if (type === 'number' || type === 'date') {
          // For numbers and dates, prefer desc (high to low) first
          return { key, direction: 'desc' };
        } else {
          // For strings, prefer asc (A-Z) first
          return { key, direction: 'asc' };
        }
      }
    });
  };

  // Render sort indicator for column headers
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) {
      return <span className="sort-indicator text-gray-300">⬍</span>;
    }
    
    return sortConfig.direction === 'asc' 
      ? <span className="sort-indicator text-blue-500">↑</span>
      : <span className="sort-indicator text-blue-500">↓</span>;
  };

  // Function to export table data to CSV
  const exportToCSV = () => {
    try {
      if (data.length === 0) {
        alert('No data to export');
        return;
      }

      // Create CSV content
      const headerRow = columns.map(col => col.header).join(',');
      
      const dataRows = sortedData.map(row => {
        return columns.map(col => {
          let value = row[col.key];
          
          // Handle different data types and renderings
          if (col.render) {
            // For render functions, try to extract raw value if possible
            if (col.type === 'number') {
              value = Number(row[col.key]);
            } else if (col.type === 'date' && row[col.key]) {
              value = new Date(row[col.key]).toISOString().split('T')[0];
            } else {
              // For more complex render functions, use the raw value
              value = row[col.key];
            }
          }
          
          // Format the value for CSV
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          } else {
            return String(value);
          }
        }).join(',');
      }).join('\n');
      
      const csvContent = `${headerRow}\n${dataRows}`;
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      
      // Generate filename
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `${tableName.replace(/\s+/g, '_')}_${date}.csv`;
      
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export data. See console for details.');
    }
  };

  // Function to export table data to JSON
  const exportToJSON = () => {
    try {
      if (data.length === 0) {
        alert('No data to export');
        return;
      }

      // Map data to respect current sorting
      const exportData = sortedData.map(row => {
        // Return a clean object with just the values needed
        const exportRow = {};
        columns.forEach(col => {
          exportRow[col.header] = row[col.key];
        });
        return exportRow;
      });
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      
      // Generate filename
      const date = new Date().toISOString().slice(0, 10);
      const fileName = `${tableName.replace(/\s+/g, '_')}_${date}.json`;
      
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      alert('Failed to export data. See console for details.');
    }
  };

  // Row renderer for react-window
  const RowRenderer = useCallback(({ index, style, data: listData }) => {
    const { rows, columns: cols, getRowClassName: getRowClass, rowClassName: rowClass } = listData;
    const row = rows[index];
    // Note: We render divs styled as table elements for virtualization
    return (
      <div
        style={style}
        className={`tr flex border-b border-gray-200 ${rowClass} ${getRowClass(row)}`}
      >
        {cols.map((column) => (
          <div
            key={`${index}-${column.key}`}
            className={`td py-1 px-4 flex-grow flex items-center ${column.className || ''}`} // Adjusted padding/alignment
            style={{ flexBasis: column.width || '0', minWidth: column.minWidth || '80px' }} // Basic width handling
          >
            {/* Render cell content, handle potential custom renderers */}
            <span className="truncate"> {/* Prevent text overflow */}
              {column.render ? column.render(row[column.key]) : row[column.key]}
            </span>
          </div>
        ))}
      </div>
    );
  }, []); // Dependencies will be passed via itemData if needed, but structure is static

  // Prepare itemData for react-window List
  const listData = useMemo(() => ({
    rows: sortedData,
    columns: columns,
    getRowClassName: getRowClassName,
    rowClassName: rowClassName
  }), [sortedData, columns, getRowClassName, rowClassName]);

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-end mb-2">
        <div className="space-x-2">
          <button
            onClick={exportToCSV}
            className="px-3 py-1 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            title="Export as CSV"
          >
            Export CSV
          </button>
          <button
            onClick={exportToJSON}
            className="px-3 py-1 text-sm text-white bg-green-500 rounded-md hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            title="Export as JSON"
          >
            Export JSON
          </button>
        </div>
      </div>
      {/* Render Header Separately */}
      <div className={`table-header-container ${className}`}>
        <div className={`tr flex bg-gray-100 ${headerClassName}`}>
          {columns.map((column) => (
            <div
              key={column.key}
              className={`th py-2 px-4 text-left cursor-pointer hover:bg-gray-200 flex-grow flex items-center justify-between ${column.headerClassName || ''}`}
              onClick={() => requestSort(column.key)}
              style={{ flexBasis: column.width || '0', minWidth: column.minWidth || '80px' }} // Match cell width
            >
              <span>{column.header}</span>
              {getSortIndicator(column.key)}
            </div>
          ))}
        </div>
      </div>

      {/* Render Body (Virtualized or Normal) */}
      <div className={`table-body-container ${bodyClassName}`}>
        {!useVirtualization ? (
          // Normal rendering for smaller tables
          sortedData.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={`tr flex border-b border-gray-200 ${rowClassName} ${getRowClassName(row)}`}
            >
              {columns.map((column) => (
                <div
                  key={`${rowIndex}-${column.key}`}
                  className={`td py-1 px-4 flex-grow flex items-center ${column.className || ''}`}
                  style={{ flexBasis: column.width || '0', minWidth: column.minWidth || '80px' }}
                >
                  <span className="truncate">
                    {column.render ? column.render(row) : row[column.key]}
                  </span>
                </div>
              ))}
            </div>
          ))
        ) : (
          // Virtualized rendering for large tables
          <List
            height={virtualHeight}
            itemCount={sortedData.length}
            itemSize={rowHeight}
            width="100%"
            itemData={listData}
          >
            {RowRenderer}
          </List>
        )}
      </div>
    </div>
  );
};

export default SortableTable;