Investment Dashboard
A web-based application for managing stock portfolios and settlement accounts, featuring a responsive UI built with Bootstrap, Chart.js for visualizations, and a dynamic gradient background. The app allows users to track stock holdings, manage funds, and view transaction history with an interactive dashboard.
Table of Contents

Features
Technologies
Installation
Usage
Project Structure
API Endpoints
Contributing
License

Features

Main Dashboard: Navigate to Portfolio Manager and Settlement Account.
Portfolio Manager:
Add, remove, or liquidate stock holdings.
View portfolio summary and transaction history.
Visualize portfolio distribution with a pie chart.


Settlement Account:
Add or withdraw funds.
View current balance and account statement.
Track balance trends with a line chart.


Responsive design with animated gradient backgrounds.
Toast notifications for user actions.
Tooltips for enhanced user interaction.

Technologies

Frontend:
HTML5, CSS3, JavaScript (ES6+)
Bootstrap 5.3.3
Chart.js for data visualizations
Animate.css for animations


External Libraries:
Bootstrap Icons
Google Fonts (Inter, Poppins)


Backend (assumed, not included):
REST API (running on http://localhost:5001)



Installation

Clone the repository:git clone https://github.com/your-username/investment-dashboard.git


Navigate to the project directory:cd investment-dashboard


Serve the application using a local server (e.g., Live Server in VS Code or any static file server).
Ensure the backend API is running on http://localhost:5001 with the required endpoints.

Usage

Open the application in a browser.
From the main dashboard (index.html), navigate to:
Portfolio Manager: Manage stock holdings, view transactions, and see portfolio distribution.
Settlement Account: Add/withdraw funds, view balance, and track statement history.


Use modals to add/remove assets or funds, with real-time updates to tables and charts.
Toast notifications confirm actions or display errors.

Project Structure
investment-dashboard/
├── main/
│   ├── index.html        # Main dashboard
│   ├── app.js            # Main dashboard logic
│   └── style.css         # Main dashboard styles
├── portfolio/
│   ├── index.html        # Portfolio Manager page
│   ├── app.js            # Portfolio logic
│   └── style.css         # Portfolio styles
├── settlement/
│   ├── index.html        # Settlement Account page
│   ├── app.js            # Settlement logic
│   └── style.css         # Settlement styles
└── README.md             # Project documentation

API Endpoints
The frontend interacts with a backend API (not included) at http://localhost:5001. Required endpoints:

Portfolio Manager:
GET /viewPortfolioCompanies: Fetch available companies.
POST /addHoldings: Add stock holdings.
POST /removeHoldings: Remove stock holdings.
POST /removeAllHoldings: Liquidate all holdings for a company.
GET /viewPortfolio: Fetch portfolio data.
GET /viewTransactionHistory: Fetch transaction history.


Settlement Account:
POST /addtoSettlementAcct: Add funds.
POST /withdrawFromSettlementAcct: Withdraw funds.
GET /viewAcctBalance: Fetch current balance.
GET /viewAcctStatement: Fetch account statement.



Contributing

Fork the repository.
Create a feature branch (git checkout -b feature/your-feature).
Commit changes (git commit -m "Add your feature").
Push to the branch (git push origin feature/your-feature).
Open a pull request.

License
This project is licensed under the MIT License.