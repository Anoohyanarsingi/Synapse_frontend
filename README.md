# Portfolio Management System - Frontend

## Description
This project is the frontend application for the Portfolio Management System. It provides a user interface for users to manage their portfolio holdings, view transaction history, and interact with their settlement account. It is built using React and communicates with the backend API.

## Features
- View and manage portfolio holdings.
- View transaction history.
- Manage settlement account (view balance, add funds, withdraw funds, view statements).

## Prerequisites
- Node.js (v16 or higher)
- npm (Node Package Manager)

## Setup Instructions
1. Clone the repository to your local machine.
2. Navigate to the project directory:
   ```bash
   cd frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Ensure the backend server is running and note its URL (e.g., `http://localhost:5000`).
5. Create a `.env` file in the project root with the following content:
   ```plaintext
   REACT_APP_API_URL=<backend-url>
   ```
   Replace `<backend-url>` with the actual URL of the backend server.
6. Start the development server:
   ```bash
   npm start
   ```
7. Open your browser and navigate to `http://localhost:3000` to access the application.

## Main Pages
- **Portfolio**: Allows users to view their current holdings, add new holdings, remove specific holdings, or remove all holdings of a company.
- **Transaction History**: Displays a list of past transactions.
- **Settlement Account**: Shows the current balance, allows users to add or withdraw funds, and view account statements.

## Project Structure
```
Actual-frontend/
├── public/                     # Public assets
├── src/                        # Source files
│   ├── components/             # Reusable components
│   ├── pages/                  # Page components
│   ├── services/               # API service
│   ├── App.js                  # Main App component
│   ├── index.js                # Entry point
│   └── ...
├── .env                        # Environment variables
├── package.json                # Project dependencies and scripts
└── README.md                   # Project documentation
```

## License
This project is licensed under the ISC License.
