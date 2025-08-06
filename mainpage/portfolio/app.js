document.addEventListener("DOMContentLoaded", () => {
  let portfolioChartInstance = null;
  let currentPrices = {}; // Store fetched prices for each company

  document.getElementById('backToMainMenuBtn').addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  // Load portfolio, transactions, and companies on page load
  loadPortfolio();
  loadTransactions();
  populateCompanyDropdowns();

  // Function to fetch stock price from API
  async function fetchStockPrice(ticker, priceDisplayId, retry = true) {
    const priceDisplay = document.getElementById(priceDisplayId);
    if (!priceDisplay) {
      console.error(`Price display element ${priceDisplayId} not found`);
      showToast(`Error: Price display element not found`, false);
      return null;
    }
    priceDisplay.textContent = 'Fetching price...';
    console.log(`Fetching price for ${ticker}`);
    try {
      const res = await fetch(`https://c4rm9elh30.execute-api.us-east-1.amazonaws.com/default/cachedPriceData?ticker=${ticker}`, {
        cache: 'no-store' // Prevent caching
      });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      console.log(`API response for ${ticker}:`, data);
      if (data && data.price_data && data.price_data.low && data.price_data.low.length > 0) {
        const price = parseFloat(data.price_data.low[data.price_data.low.length - 1]);
        priceDisplay.textContent = `$${price.toFixed(2)}`;
        console.log(`Price for ${ticker}: $${price.toFixed(2)}`);
        return price;
      } else {
        throw new Error('Invalid price data: missing or empty price_data.low');
      }
    } catch (error) {
      console.error(`Error fetching price for ${ticker}: ${error.message}`);
      if (retry && (error.message.includes('HTTP error') || error.message.includes('NetworkError'))) {
        console.log(`Retrying price fetch for ${ticker} in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchStockPrice(ticker, priceDisplayId, false);
      }
      priceDisplay.textContent = 'Error fetching price';
      showToast(`Error fetching price for ${ticker}: ${error.message}`, false);
      return null;
    }
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

      // Clear existing options for remove and liquidate dropdowns
      removeAssetSelect.innerHTML = '<option value="">Select a company</option>';
      liquidateAllSelect.innerHTML = '<option value="">Select a company</option>';

      if (result.success && result.data.length > 0) {
        result.data.forEach(item => {
          const option2 = document.createElement('option');
          option2.value = item.company;
          option2.textContent = item.company;
          removeAssetSelect.appendChild(option2);

          const option3 = document.createElement('option');
          option3.value = item.company;
          option3.textContent = item.company;
          liquidateAllSelect.appendChild(option3);
        });
      } else {
        removeAssetSelect.innerHTML = '<option value="">No companies available</option>';
        removeAssetSelect.disabled = true;
        liquidateAllSelect.innerHTML = '<option value="">No companies available</option>';
        liquidateAllSelect.disabled = true;
      }

      // Add event listeners for add and remove modals
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

      // Reset price displays when modals are closed
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

    // Replace form to prevent multiple event bindings
    const form = document.getElementById('liquidateAllForm');
    form.replaceWith(form.cloneNode(true));
    const newForm = document.getElementById('liquidateAllForm');
    const liquidateAllSelect = newForm.querySelector('#liquidateAllCompanySelect');

    // Reattach price fetching event listener to new select element
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

    // Populate dropdown with companies
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
          modal.hide();
        }
      } catch (error) {
        console.error('Error liquidating holdings:', error.message);
        showToast(`Error: ${error.message}`, false);
      }
    });
  });

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
  async function loadTransactions() {
    try {
      const res = await fetch('http://localhost:5001/viewTransactionHistory', {
        cache: 'no-store'
      });
      const data = await res.json();
      const tbody = document.querySelector('#transactionTable tbody');
      tbody.innerHTML = '';

      if (data.success && data.data.length > 0) {
        data.data.forEach(txn => {
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
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
          borderColor: ['#fff'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#000', font: { size: 14 } }
          },
          title: {
            display: true,
            text: 'Portfolio Distribution',
            color: '#000',
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