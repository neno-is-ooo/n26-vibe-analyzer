# N26 Vibe Analyzer

A comprehensive dashboard for analyzing N26 bank account transaction data. This tool provides visualizations and insights from your N26 CSV statement exports.

## Privacy & Security Notice

⚠️ **IMPORTANT**: This application processes all data **locally in your browser**:
- No data is ever sent to any server
- No data is stored or saved anywhere
- All data is lost when you close or refresh the page
- The application has no backend and does not track or collect any information

## Live Demo

Visit the live demo: [https://neno-is-ooo.github.io/n26-vibe-analyzer](https://neno-is-ooo.github.io/n26-vibe-analyzer)

## How to Export N26 Transaction Data

As of April 11, 2025, you can export your transaction data from N26 by following these steps:

1. Sign in to your [N26 account](https://app.n26.com) via desktop
2. Navigate to: My Account > Main account > Download statements
3. In the CSV box:
   - Select year
   - Select month/day for start date
   - Select month/day for end date 
4. Click "Download CSV"

## Setup Instructions for Mac/Linux Users

If you're not familiar with development tools, here's a complete guide to get started:

### 1. Install Node.js

**On Mac:**
```bash
# Using Homebrew (recommended)
# Install Homebrew first if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Node.js
brew install node

# Alternatively, download the installer from https://nodejs.org/
```

**On Linux (Ubuntu/Debian):**
```bash
# Add Node.js repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs
```

### 2. Clone this Repository

```bash
# Install Git if needed
# Mac: brew install git
# Linux: sudo apt-get install git

# Clone the repository
git clone https://github.com/neno-is-ooo/n26-vibe-analyzer.git
cd n26-vibe-analyzer
```

### 3. Install Dependencies and Run

```bash
# Install dependencies
npm install

# Start the application
npm start
```

The application should automatically open in your default browser at http://localhost:3000.

## Using the Dashboard

1. Click the "Upload CSV file" button on the home screen
2. Select your N26 CSV statement file
3. The dashboard will automatically analyze your data and generate visualizations
4. Navigate between tabs to explore different aspects of your financial data:
   - **Overview**: Summary statistics, charts and largest transactions
   - **Cash Flow**: Detailed monthly inflows and outflows
   - **Transactions**: Breakdown by transaction types and currencies
   - **Balance**: View your account balance trends (daily/weekly/monthly)
   - **Partners**: Analyze your transaction partners and their volume

## Interactive Features

- Switch between daily, weekly, and monthly views for balance analysis
- Filter data by quarter
- Toggle between different visualization types
- Hover over charts for detailed information
- View key financial insights tailored to your data

## Technical Details

This is a client-side only React application built with:
- React.js
- Recharts for data visualization
- PapaParse for CSV parsing
- Lodash for data manipulation
- Tailwind CSS for styling

## CSV Format Requirements

The dashboard is designed to work with N26 CSV exports, which have these column headers:
- Booking Date
- Value Date
- Partner Name
- Partner Iban
- Type
- Payment Reference
- Account Name
- Amount (EUR)
- Original Amount
- Original Currency
- Exchange Rate

## Deployment

To deploy the app to GitHub Pages:

```bash
npm run deploy
```

## License

This project is licensed under the MIT License.
