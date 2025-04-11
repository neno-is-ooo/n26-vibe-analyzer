# N26 Vibe Analyzer

A minimal dashboard for analyzing your N26 bank account data with powerful visualizations and actionable insights. This application processes your N26 CSV statement exports to provide a clear picture of your financial habits.
<img width="1336" alt="N26 Vibe Analyzer" src="https://github.com/user-attachments/assets/3ed6e2f5-4365-4732-9961-fbe2910cc4d0" />

## Privacy First

**All data processing happens directly in your browser:**
- ✅ 100% client-side processing - no data is ever sent to any server
- ✅ Zero data storage - all data is cleared when you close or refresh the page
- ✅ No tracking or analytics - complete privacy for your financial information
- ✅ No backend required - runs entirely in your web browser

## Live Demo

Try it now: [**N26 Vibe Analyzer**](https://neno-is-ooo.github.io/n26-vibe-analyzer)

Want to test it without your real data? Use our [sample transactions file](https://gist.githubusercontent.com/neno-is-ooo/11f36858bd1ceb1e578b2d7a4b5299fb/raw/d377c4f92e3ca85ee1ec1b656b8f7d1f912ec7a3/dummy-tx.csv).

## How to Export Your N26 Transaction Data

1. Sign in to your [N26 account](https://app.n26.com) (desktop version)
2. Navigate to: **My Account** > **Main account** > **Download statements**
3. For CSV export, select your date range:
   - Choose **year** first
   - Then select **month**
   - Finally select **day**
4. Repeat for the end date
5. Click **Download CSV**

<img width="1317" alt="Screenshot 2025-04-11 at 12 28 55" src="https://github.com/user-attachments/assets/ae30f0a8-6696-41f2-99f5-d661d7130883" />


## Data Format Requirements

The application is designed to work with N26 bank statements, but may be compatible with other banks if formatted correctly.

### Required CSV Column Structure

Your file must include these exact column names (case-sensitive):

| Column Name | Description |
|-------------|-------------|
| Booking Date | Transaction date (YYYY-MM-DD) |
| Value Date | Value date (YYYY-MM-DD) |
| Partner Name | Merchant or sender/recipient name |
| Partner Iban | IBAN number (if applicable) |
| Type | Transaction type |
| Payment Reference | Description or reference |
| Account Name | Your account name |
| Amount (EUR) | Amount in EUR with decimal point |
| Original Amount | Original amount (if currency differs) |
| Original Currency | Original currency code |
| Exchange Rate | Exchange rate (if applicable) |

> **Note:** The application works best with a full year of data, but can process any period.

### Sample CSV Format

```csv
Booking Date,Value Date,Partner Name,Partner Iban,Type,Payment Reference,Account Name,Amount (EUR),Original Amount,Original Currency,Exchange Rate
2023-12-30,2023-12-30,Previous Balance,,Opening Balance,Account opening balance,Personal Account,10000.0,10000.0,EUR,1
2024-01-03,2024-01-03,European Research Foundation,,Credit Transfer,Monthly grant,Personal Account,4999.66,,,
```

## Features

- **Overview Dashboard**: Summary statistics, key financial metrics, and largest transactions
- **Cash Flow Analysis**: Monthly inflows and outflows with detailed breakdowns
- **Transaction Categories**: Automatic categorization and spending patterns
- **Balance Trends**: Track your account balance over time (daily/weekly/monthly)
- **Partner Analysis**: Identify your top spending partners and transaction patterns

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### For Mac/Linux Users

1. **Install Node.js**

   **On Mac:**
   ```bash
   # Using Homebrew
   brew install node

   # Or download installer from https://nodejs.org/
   ```

   **On Linux (Ubuntu/Debian):**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and Set Up**

   ```bash
   # Clone repository
   git clone https://github.com/neno-is-ooo/n26-vibe-analyzer.git
   cd n26-vibe-analyzer

   # Install dependencies
   npm install

   # Start development server
   npm start
   ```

The application will automatically open in your browser at http://localhost:3000

## Using the Dashboard

1. Upload your N26 CSV statement file using the "Upload CSV file" button
2. Explore the automatically generated visualizations across different tabs:
   - **Overview**: Get a quick snapshot of your financial health
   - **Cash Flow**: Analyze income vs. expenses over time
   - **Transactions**: Explore spending by category and currency
   - **Balance**: Track your balance trends with customizable time periods
   - **Partners**: Discover your spending patterns with different merchants

## Technical Architecture

This project is built with modern web technologies:

- **React.js**: Core UI framework
- **Recharts**: Interactive data visualization
- **PapaParse**: CSV parsing and data extraction
- **Lodash**: Data manipulation utilities
- **Tailwind CSS**: Responsive styling

## Deployment

Deploy to GitHub Pages with a single command:

```bash
npm run deploy
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
