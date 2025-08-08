document.addEventListener("DOMContentLoaded", () => {
  let portfolioChartInstance = null;
  let priceTrendChartInstance = null;
  let currentPrices = {};
  let allTransactions = [];
  let allCompaniesPriceData = []; // Store price data for all companies
  

  document.getElementById('backToMainMenuBtn').addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  // Load portfolio, transactions, companies, balance, and price trend dropdown on page load
  loadPortfolio();
  loadTransactions();
  populateCompanyDropdowns();
  loadCurrentBalance();

  // Function to fetch stock price from API
  async function fetchStockPrice(ticker, priceDisplayId, forChart = false, retry = true) {
    const priceDisplay = priceDisplayId ? document.getElementById(priceDisplayId) : null;
    if (priceDisplay) {
      priceDisplay.textContent = 'Fetching price...';
    }
    console.log(`Fetching price for ${ticker}${forChart ? ' (for chart)' : ''}`);
    try {
      const res = await fetch(`https://c4rm9elh30.execute-api.us-east-1.amazonaws.com/default/cachedPriceData?ticker=${ticker}`, {
        cache: 'no-store'
      });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      console.log(`API response for ${ticker}:`, data);
      if (data && data.price_data && data.price_data.low && data.price_data.low.length > 0) {
        if (forChart) {
          return data.price_data; // Return full price data for chart
        } else {
          const price = parseFloat(data.price_data.low[data.price_data.low.length - 1]);
          if (priceDisplay) {
            priceDisplay.textContent = `$${price.toFixed(2)}`;
          }
          console.log(`Price for ${ticker}: $${price.toFixed(2)}`);
          return price;
        }
      } else {
        throw new Error('Invalid price data: missing or empty price_data.low');
      }
    } catch (error) {
      console.error(`Error fetching price for ${ticker}: ${error.message}`);
      if (retry && (error.message.includes('HTTP error') || error.message.includes('NetworkError'))) {
        console.log(`Retrying price fetch for ${ticker} in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchStockPrice(ticker, priceDisplayId, forChart, false);
      }
      if (priceDisplay) {
        priceDisplay.textContent = 'Error fetching price';
      }
      showToast(`Error fetching price for ${ticker}: ${error.message}`, false);
      return null;
    }
  }

  // Filter last 24 hours of price data
  function filterLast24Hours(priceData) {
    const latestTimestamp = new Date(priceData.timestamp[priceData.timestamp.length - 1] + "-04:00"); // Assume EDT
    const oneDayAgo = new Date(latestTimestamp.getTime() - 24 * 60 * 60 * 1000);
    const filtered = { timestamps: [], closes: [] };

    priceData.timestamp.forEach((ts, index) => {
      const timestamp = new Date(ts + "-04:00"); // Assume EDT
      if (timestamp >= oneDayAgo && timestamp <= latestTimestamp) {
        filtered.timestamps.push(ts.split(' ')[1].slice(0, 5)); // Show only time (HH:mm)
        filtered.closes.push(parseFloat(priceData.open[index]));
      }
    });

    return filtered;
  }

  // Combine price data from multiple companies
  function combinePriceData(priceDataArray) {
    const combined = {
      timestamps: [],
      closes: [],
      companies: []
    };

    priceDataArray.forEach((priceData, index) => {
      if (priceData && priceData.timestamp) {
        // Use the first company's timestamps as reference
        if (index === 0) {
          priceData.timestamp.forEach(ts => {
            combined.timestamps.push(ts.split(' ')[1].slice(0, 5)); // Format as HH:mm
          });
        }

        // Add closing prices for this company
        const companyCloses = [];
        priceData.close.forEach((closePrice, idx) => {
          companyCloses.push({
            x: priceData.timestamp[idx].split(' ')[1].slice(0, 5),
            y: parseFloat(closePrice)
          });
        });
        combined.closes.push(companyCloses);
        combined.companies.push(priceData.ticker || `Company ${index + 1}`);
      }
    });

    return combined;
  }

  // Render price trend chart for single company or all companies
  function renderPriceTrendChart(data, isCombined = false) {
    const ctx = document.getElementById('priceTrendChart').getContext('2d');
    if (priceTrendChartInstance) {
      priceTrendChartInstance.destroy();
    }

    const datasets = [];
    const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#a278ff', '#10b981', '#f59e0b'];

    if (isCombined && data.companies && data.companies.length > 0) {
      // Create a dataset for each company
      data.companies.forEach((company, index) => {
        datasets.push({
          label: company,
          data: data.closes[index],
          borderColor: colors[index % colors.length],
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          tension: 0.1,
          pointRadius: 2
        });
      });
    } else {
      // Single company dataset
      datasets.push({
        label: 'Close Price ($)',
        data: data.closes,
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        fill: true,
        tension: 0.1
      });
    }

    priceTrendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.timestamps,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: 'Time (HH:mm)', color: '#e5e7eb' },
            ticks: { color: '#e5e7eb', maxTicksLimit: 10 }
          },
          y: {
            title: { display: true, text: 'Price ($)', color: '#e5e7eb' },
            ticks: { color: '#e5e7eb' }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#e5e7eb', font: { size: 14 } }
          },
          title: {
            display: true,
            text: isCombined ? 'All Companies Price Trends' : 'Price Trend (Last 24 Hours)',
            color: '#e5e7eb',
            font: { size: 18 }
          }
        }
      }
    });
  }

  // Function to populate company dropdowns and attach price fetching logic
  async function populateCompanyDropdowns() {
    try {
      const res = await fetch('http://localhost:5001/viewPortfolioCompanies', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });
      const result = await res.json();
      console.log('Portfolio companies API response:', result);

      const removeAssetSelect = document.getElementById('removeAssetCompanySelect');
      const liquidateAllSelect = document.getElementById('liquidateAllCompanySelect');
      const companyFilterSelect = document.getElementById('companyFilterSelect');
      const priceTrendSelect = document.getElementById('priceTrendCompanySelect');

      removeAssetSelect.innerHTML = '<option value="">Select a company</option>';
      liquidateAllSelect.innerHTML = '<option value="">Select a company</option>';
      companyFilterSelect.innerHTML = '<option value="">Select a company</option>';
      priceTrendSelect.innerHTML = '<option value="">Show All Companies</option>';

      if (result.success && result.data.length > 0) {
        // Fetch price data for all companies in parallel
        const priceDataPromises = result.data.map(item => fetchStockPrice(item.company, null, true));
        allCompaniesPriceData = await Promise.all(priceDataPromises);
        
        result.data.forEach(item => {
          const option1 = document.createElement('option');
          option1.value = item.company;
          option1.textContent = item.company;
          removeAssetSelect.appendChild(option1);

          const option2 = document.createElement('option');
          option2.value = item.company;
          option2.textContent = item.company;
          liquidateAllSelect.appendChild(option2);

          const option3 = document.createElement('option');
          option3.value = item.company;
          option3.textContent = item.company;
          companyFilterSelect.appendChild(option3);

          const option4 = document.createElement('option');
          option4.value = item.company;
          option4.textContent = item.company;
          priceTrendSelect.appendChild(option4);
        });

        // Render initial chart with all companies data
        if (allCompaniesPriceData.length > 0) {
          const combinedData = combinePriceData(allCompaniesPriceData);
          renderPriceTrendChart(combinedData, true);
        }
      } else {
        removeAssetSelect.innerHTML = '<option value="">No companies available</option>';
        removeAssetSelect.disabled = true;
        liquidateAllSelect.innerHTML = '<option value="">No companies available</option>';
        liquidateAllSelect.disabled = true;
        companyFilterSelect.innerHTML = '<option value="">No companies available</option>';
        companyFilterSelect.disabled = true;
        priceTrendSelect.innerHTML = '<option value="">No companies available</option>';
        priceTrendSelect.disabled = true;
      }

      // Attach price trend chart update logic
      priceTrendSelect.addEventListener('change', async (e) => {
        const ticker = e.target.value;
        if (ticker) {
          // Show selected company
          const priceData = await fetchStockPrice(ticker, null, true);
          if (priceData) {
            const filteredData = filterLast24Hours(priceData);
            if (filteredData.timestamps.length > 0) {
              renderPriceTrendChart(filteredData);
            } else {
              showToast(`No price data available for ${ticker} in the last 24 hours`, false);
            }
          }
        } else {
          // Show all companies when "Show All" is selected
          if (allCompaniesPriceData.length > 0) {
            const combinedData = combinePriceData(allCompaniesPriceData);
            renderPriceTrendChart(combinedData, true);
          }
        }
      });

      const addAssetSelect = document.getElementById('addAssetCompanySelect');
      addAssetSelect.addEventListener('change', async (e) => {
        const ticker = e.target.value;
        if (ticker) {
          const price = await fetchStockPrice(ticker, 'addAssetPriceDisplay');
          if (price) {
            currentPrices[ticker] = price;
          }
        } else {
          document.getElementById('addAssetPriceDisplay').textContent = 'Select a company to fetch price';
        }
      });

      removeAssetSelect.addEventListener('change', async (e) => {
        const ticker = e.target.value;
        if (ticker) {
          const price = await fetchStockPrice(ticker, 'removeAssetPriceDisplay');
          if (price) {
            currentPrices[ticker] = price;
          }
        } else {
          document.getElementById('removeAssetPriceDisplay').textContent = 'Select a company to fetch price';
        }
      });

      ['addAssetModal', 'removeAssetModal', 'liquidateAllModal'].forEach(modalId => {
        document.getElementById(modalId).addEventListener('hidden.bs.modal', () => {
          const priceDisplay = document.getElementById(`${modalId.replace('Modal', 'PriceDisplay')}`);
          if (priceDisplay) {
            priceDisplay.textContent = 'Select a company to fetch price';
          }
        });
      });
    } catch (error) {
      console.error('Error loading companies:', error.message);
      showToast(`Error loading companies: ${error.message}`, false);
    }
  }

  // [Rest of your existing code remains exactly the same...]
  // Add Asset Form Submission
  document.getElementById('addAssetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const company = form.company.value;
    const price = currentPrices[company];

    if (!company || !price) {
      showToast('Please select a company and ensure price is fetched.', false);
      return;
    }

    const data = {
      company: company,
      quantity: parseInt(form.quantity.value),
      price: price,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " ")
    };

    try {
      const res = await fetch('http://localhost:5001/addHoldings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      showToast(result.success ? 'Asset added successfully!' : `Error: ${result.message}`, result.success);
      if (result.success) {
        form.reset();
        document.getElementById('addAssetPriceDisplay').textContent = 'Select a company to fetch price';
        loadPortfolio();
        loadTransactions();
        populateCompanyDropdowns();
        loadCurrentBalance();
        document.getElementById('addAssetModal').querySelector('.btn-close').click();
      }
    } catch (error) {
      console.error('Error adding asset:', error.message);
      showToast(`Error: ${error.message}`, false);
    }
  });

  // Remove Asset Form Submission
  document.getElementById('removeAssetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const company = form.company.value;
    const price = currentPrices[company];

    if (!company || !price) {
      showToast('Please select a company and ensure price is fetched.', false);
      return;
    }

    const data = {
      company: company,
      quantity: parseInt(form.quantity.value),
      price: price,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " ")
    };

    try {
      const res = await fetch('http://localhost:5001/removeHoldings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      showToast(result.success ? 'Asset removed successfully!' : `Error: ${result.message}`, result.success);
      if (result.success) {
        form.reset();
        document.getElementById('removeAssetPriceDisplay').textContent = 'Select a company to fetch price';
        loadPortfolio();
        loadTransactions();
        populateCompanyDropdowns();
        loadCurrentBalance();
        document.getElementById('removeAssetModal').querySelector('.btn-close').click();
      }
    } catch (error) {
      console.error('Error removing asset:', error.message);
      showToast(`Error: ${error.message}`, false);
    }
  });

  // Remove All Assets
  document.getElementById('removeAllAssetsBtn').addEventListener('click', async () => {
    const modal = new bootstrap.Modal(document.getElementById('liquidateAllModal'));
    modal.show();

    const form = document.getElementById('liquidateAllForm');
    form.replaceWith(form.cloneNode(true));
    const newForm = document.getElementById('liquidateAllForm');
    const liquidateAllSelect = newForm.querySelector('#liquidateAllCompanySelect');

    liquidateAllSelect.addEventListener('change', async (e) => {
      const ticker = e.target.value;
      if (ticker) {
        const price = await fetchStockPrice(ticker, 'liquidateAllPriceDisplay');
        if (price) {
          currentPrices[ticker] = price;
        }
      } else {
        document.getElementById('liquidateAllPriceDisplay').textContent = 'Select a company to fetch price';
      }
    });

    try {
      const res = await fetch('http://localhost:5001/viewPortfolioCompanies', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });
      const result = await res.json();
      console.log('Portfolio companies for liquidate modal:', result);
      liquidateAllSelect.innerHTML = '<option value="">Select a company</option>';
      if (result.success && result.data.length > 0) {
        result.data.forEach(item => {
          const option = document.createElement('option');
          option.value = item.company;
          option.textContent = item.company;
          liquidateAllSelect.appendChild(option);
        });
      } else {
        liquidateAllSelect.innerHTML = '<option value="">No companies available</option>';
        liquidateAllSelect.disabled = true;
      }
    } catch (error) {
      console.error('Error loading companies for liquidate modal:', error.message);
      showToast(`Error loading companies: ${error.message}`, false);
    }

    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const company = newForm.querySelector('select[name="company"]').value;
      const price = currentPrices[company];

      if (!company || !price) {
        showToast('Please select a company and ensure price is fetched.', false);
        return;
      }

      const data = {
        company: company,
        price: price,
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " ")
      };

      try {
        const res = await fetch('http://localhost:5001/removeAllHoldings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await res.json();
        showToast(result.success ? 'All holdings removed.' : `Error: ${result.message}`, result.success);
        if (result.success) {
          document.getElementById('liquidateAllPriceDisplay').textContent = 'Select a company to fetch price';
          loadPortfolio();
          loadTransactions();
          populateCompanyDropdowns();
          loadCurrentBalance();
          modal.hide();
        }
      } catch (error) {
        console.error('Error liquidating holdings:', error.message);
        showToast(`Error: ${error.message}`, false);
      }
    });
  });

  // Load Current Balance
  async function loadCurrentBalance() {
    try {
      const res = await fetch('http://localhost:5001/viewAcctBalance', {
        cache: 'no-store'
      });
      const data = await res.json();
      console.log('Balance response:', data);
      const balanceDisplay = document.getElementById('currentBalance');
      if (data.success && data.data !== null && data.data !== undefined) {
        const balance = parseInt(data.data);
        balanceDisplay.textContent = `$${balance.toFixed(0)}`;
      } else {
        balanceDisplay.textContent = '$0';
        showToast('No balance data found.', false);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
      document.getElementById('currentBalance').textContent = '$0';
      showToast(`Error loading balance: ${error.message}`, false);
    }
  }

  // Load Portfolio Data
  async function loadPortfolio() {
    try {
      const res = await fetch('http://localhost:5001/viewPortfolio', {
        cache: 'no-store'
      });
      const data = await res.json();
      const tbody = document.querySelector('#portfolioTable tbody');
      tbody.innerHTML = '';

      if (data.success && data.data.length > 0) {
        data.data.forEach(item => {
          tbody.innerHTML += `
            <tr>
              <td>${item.company}</td>
              <td>${item.quantity}</td>
              <td>$${item.avg_price.toFixed(2)}</td>
              <td>${new Date(item.time_stamp).toLocaleString()}</td>
            </tr>`;
        });
        updatePortfolioChart(data.data);
      } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No holdings found.</td></tr>';
        updatePortfolioChart([]);
      }
    } catch (error) {
      console.error('Error loading portfolio:', error.message);
      showToast(`Error loading portfolio: ${error.message}`, false);
    }
  }

  // Load Transaction History
  async function loadTransactions(filters = {}) {
    try {
      const res = await fetch('http://localhost:5001/viewTransactionHistory', {
        cache: 'no-store'
      });
      const data = await res.json();
      const tbody = document.querySelector('#transactionTable tbody');
      tbody.innerHTML = '';

      allTransactions = data.success && data.data.length > 0 ? data.data : [];

      let filteredTransactions = allTransactions;
      if (Object.keys(filters).length > 0) {
        filteredTransactions = allTransactions.filter(txn => {
          let matches = true;
          if (filters.company && filters.company !== '') {
            matches = matches && txn.company === filters.company;
          }
          if (filters.action && filters.action !== '') {
            matches = matches && txn.action.toLowerCase() === filters.action.toLowerCase();
          }
          if (filters.date && filters.date !== '') {
            const txnDate = new Date(txn.time_stamp).toISOString().split('T')[0];
            matches = matches && txnDate === filters.date;
          }
          return matches;
        });
      }

      if (filteredTransactions.length > 0) {
        filteredTransactions.forEach(txn => {
          tbody.innerHTML += `
            <tr>
              <td>${new Date(txn.time_stamp).toLocaleString()}</td>
              <td>${txn.company}</td>
              <td>${txn.action}</td>
              <td>$${txn.price.toFixed(2)}</td>
              <td>${txn.quantity}</td>
            </tr>`;
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No transactions found.</td></tr>';
      }
    } catch (error) {
      console.error('Error loading transactions:', error.message);
      showToast(`Error loading transactions: ${error.message}`, false);
    }
  }

  // Filter Transactions Modal Logic
  const filterModal = new bootstrap.Modal(document.getElementById('filterTransactionsModal'));
  const companyFilterCheckbox = document.getElementById('companyFilterCheckbox');
  const actionFilterCheckbox = document.getElementById('actionFilterCheckbox');
  const dateFilterCheckbox = document.getElementById('dateFilterCheckbox');
  const companyFilter = document.getElementById('companyFilter');
  const actionFilter = document.getElementById('actionFilter');
  const dateFilter = document.getElementById('dateFilter');

  companyFilterCheckbox.addEventListener('change', (e) => {
    companyFilter.style.display = e.target.checked ? 'block' : 'none';
  });
  actionFilterCheckbox.addEventListener('change', (e) => {
    actionFilter.style.display = e.target.checked ? 'block' : 'none';
  });
  dateFilterCheckbox.addEventListener('change', (e) => {
    dateFilter.style.display = e.target.checked ? 'block' : 'none';
  });

  document.getElementById('filterTransactionsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const filters = {};

    if (companyFilterCheckbox.checked) {
      const companyValue = document.getElementById('companyFilterSelect').value;
      if (!companyValue) {
        showToast('Please select a company for the company filter.', false);
        return;
      }
      filters.company = companyValue;
    }
    if (actionFilterCheckbox.checked) {
      const actionValue = document.getElementById('actionFilterSelect').value;
      if (!actionValue) {
        showToast('Please select an action for the action filter.', false);
        return;
      }
      filters.action = actionValue;
    }
    if (dateFilterCheckbox.checked) {
      const dateValue = document.getElementById('dateFilterInput').value;
      if (!dateValue) {
        showToast('Please select a date for the date filter.', false);
        return;
      }
      filters.date = dateValue;
    }

    if (Object.keys(filters).length === 0) {
      showToast('Please select at least one filter criterion.', false);
      return;
    }

    loadTransactions(filters);
    filterModal.hide();
  });

  document.getElementById('resetFilterBtn').addEventListener('click', () => {
    companyFilterCheckbox.checked = false;
    actionFilterCheckbox.checked = false;
    dateFilterCheckbox.checked = false;
    companyFilter.style.display = 'none';
    actionFilter.style.display = 'none';
    dateFilter.style.display = 'none';
    document.getElementById('companyFilterSelect').value = '';
    document.getElementById('actionFilterSelect').value = '';
    document.getElementById('dateFilterInput').value = '';
    loadTransactions();
    filterModal.hide();
  });

  // Update Portfolio Chart (Pie Chart)
  function updatePortfolioChart(portfolio) {
    const ctx = document.getElementById('portfolioChart').getContext('2d');
    const labels = portfolio.map(item => item.company);
    const values = portfolio.map(item => item.quantity * item.avg_price);

    if (portfolioChartInstance) {
      portfolioChartInstance.destroy();
    }

    portfolioChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: 'Portfolio Value by Company ($)',
          data: values,
          backgroundColor: ['#ec4899', '#8b5cf6', '#3b82f6', '#a278ff'],
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#e5e7eb', font: { size: 14 } }
          },
          title: {
            display: true,
            text: 'Portfolio Distribution',
            color: '#e5e7eb',
            font: { size: 18 }
          }
        }
      }
    });
  }

  // Toast Notification
  function showToast(message, success) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast align-items-center ${success ? 'bg-success' : 'bg-danger'} text-white border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    setTimeout(() => toast.remove(), 3000);
  }
});
