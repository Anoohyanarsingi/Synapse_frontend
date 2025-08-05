document.addEventListener("DOMContentLoaded", () => {
  let portfolioChartInstance = null;
  document.getElementById('backToMainMenuBtn').addEventListener('click', () => {
    window.location.href = '../index.html';
  });
  // Load portfolio, transactions, and companies on page load
  loadPortfolio();
  loadTransactions();
  populateCompanyDropdowns();

  // Function to populate company dropdowns for Remove Asset and Liquidate All modals
  async function populateCompanyDropdowns() {
    try {
      const res = await fetch('http://localhost:5001/viewPortfolioCompanies', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await res.json();

      const removeAssetSelect = document.getElementById('removeAssetCompanySelect');
      const liquidateAllSelect = document.getElementById('liquidateAllCompanySelect');

      // Clear existing options
      removeAssetSelect.innerHTML = '<option value="">Select a company</option>';
      liquidateAllSelect.innerHTML = '<option value="">Select a company</option>';

      if (result.success && result.data.length > 0) {
        // Populate both dropdowns with company names
        result.data.forEach(item => {
          const option1 = document.createElement('option');
          option1.value = item.company;
          option1.textContent = item.company; // Display company name (e.g., AAPL)
          removeAssetSelect.appendChild(option1);

          const option2 = document.createElement('option');
          option2.value = item.company;
          option2.textContent = item.company;
          liquidateAllSelect.appendChild(option2);
        });
      } else {
        // Disable dropdowns if no companies are available
        removeAssetSelect.innerHTML = '<option value="">No companies available</option>';
        removeAssetSelect.disabled = true;
        liquidateAllSelect.innerHTML = '<option value="">No companies available</option>';
        liquidateAllSelect.disabled = true;
      }
    } catch (error) {
      showToast(`Error loading companies: ${error.message}`, false);
    }
  }

  // Add Asset Form Submission
  document.getElementById('addAssetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      company: form.company.value,
      quantity: parseInt(form.quantity.value),
      price: parseFloat(form.price.value),
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
        loadPortfolio();
        loadTransactions();
        populateCompanyDropdowns(); // Refresh dropdowns
        document.getElementById('addAssetModal').querySelector('.btn-close').click();
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, false);
    }
  });

  // Remove Asset Form Submission
  document.getElementById('removeAssetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      company: form.company.value,
      quantity: parseInt(form.quantity.value),
      price: parseFloat(form.price.value),
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
        loadPortfolio();
        loadTransactions();
        populateCompanyDropdowns(); // Refresh dropdowns
        document.getElementById('removeAssetModal').querySelector('.btn-close').click();
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, false);
    }
  });

  // Remove All Assets
  document.getElementById('removeAllAssetsBtn').addEventListener('click', async () => {
    const modal = new bootstrap.Modal(document.getElementById('liquidateAllModal'));
    modal.show();

    // Remove any existing submit listeners to prevent multiple bindings
    const form = document.getElementById('liquidateAllForm');
    form.replaceWith(form.cloneNode(true)); // Clone to remove old listeners
    const newForm = document.getElementById('liquidateAllForm');

    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const company = newForm.querySelector('select[name="company"]').value;
      const price = newForm.querySelector('input[name="price"]').value;
      if (!company || !price) {
        showToast("Please provide both company and price.", false);
        return;
      }

      const data = {
        company: company,
        price: parseFloat(price),
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
          loadPortfolio();
          loadTransactions();
          populateCompanyDropdowns(); // Refresh dropdowns
          modal.hide();
        }
      } catch (error) {
        showToast(`Error: ${error.message}`, false);
      }
    });
  });

  // Load Portfolio Data
  async function loadPortfolio() {
    try {
      const res = await fetch('http://localhost:5001/viewPortfolio');
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
      showToast(`Error loading portfolio: ${error.message}`, false);
    }
  }

  // Load Transaction History
  async function loadTransactions() {
    try {
      const res = await fetch('http://localhost:5001/viewTransactionHistory');
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
            labels: { color: '#fff', font: { size: 14 } }
          },
          title: {
            display: true,
            text: 'Portfolio Distribution',
            color: '#fff',
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