document.addEventListener("DOMContentLoaded", () => {
  let balanceChartInstance = null;
  let allStatements = []; // Store all account statement transactions for filtering

  document.getElementById('backToMainMenuBtn').addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  // Load account data on page load
  loadAccountBalance();
  loadAccountStatement();

  // Add Funds Form Submission
  document.getElementById('addFundsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const amount = parseFloat(form.amount.value);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid positive amount.', false);
      return;
    }
    const data = {
      transaction_amount: Math.round(amount),
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " ")
    };

    try {
      const res = await fetch('http://localhost:5001/addtoSettlementAcct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      console.log('Add funds response:', result);
      showToast(result.success ? 'Funds added successfully!' : `Error: ${result.message}`, result.success);
      if (result.success) {
        form.reset();
        await loadAccountBalance();
        await loadAccountStatement();
        document.getElementById('addFundsModal').querySelector('.btn-close').click();
      }
    } catch (error) {
      console.error('Add funds error:', error);
      showToast(`Error: ${error.message}`, false);
    }
  });

  // Withdraw Funds Form Submission
  document.getElementById('withdrawFundsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const amount = parseFloat(form.amount.value);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid positive amount.', false);
      return;
    }

    // Client-side balance check
    const currentBalanceText = document.getElementById('currentBalance').textContent;
    const currentBalance = parseFloat(currentBalanceText.replace('$', '')) || 0;
    if (amount > currentBalance) {
      showToast('Insufficient balance to withdraw this amount.', false);
      return;
    }

    const data = {
      transaction_amount: Math.round(amount),
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " ")
    };

    try {
      const res = await fetch('http://localhost:5001/withdrawFromSettlementAcct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      console.log('Withdraw funds response:', result);
      showToast(result.success ? 'Funds withdrawn successfully!' : `Error: ${result.message}`, result.success);
      if (result.success) {
        form.reset();
        await loadAccountBalance();
        await loadAccountStatement();
        document.getElementById('withdrawFundsModal').querySelector('.btn-close').click();
      }
    } catch (error) {
      console.error('Withdraw funds error:', error);
      showToast(`Error: ${error.message}`, false);
    }
  });

  // Load Account Balance
  async function loadAccountBalance() {
    try {
      const res = await fetch('http://localhost:5001/viewAcctBalance', {
        cache: 'no-store'
      });
      const data = await res.json();
      console.log('Balance response:', data);
      if (data.success && data.data !== null && data.data !== undefined) {
        const balance = parseInt(data.data);
        document.getElementById('currentBalance').textContent = `$${balance.toFixed(0)}`;
      } else {
        document.getElementById('currentBalance').textContent = '$0';
        showToast('No balance data found.', false);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
      document.getElementById('currentBalance').textContent = '$0';
      showToast(`Error loading balance: ${error.message}`, false);
    }
  }

  // Load Account Statement
  async function loadAccountStatement(filters = {}) {
    try {
      const res = await fetch('http://localhost:5001/viewAcctStatement', {
        cache: 'no-store'
      });
      const data = await res.json();
      console.log('Statement response:', data);
      const tbody = document.querySelector('#statementTable tbody');
      tbody.innerHTML = '';

      // Store all transactions for filtering
      allStatements = data.success && data.data.length > 0 ? data.data : [];

      // Apply filters if provided
      let filteredStatements = allStatements;
      if (Object.keys(filters).length > 0) {
        filteredStatements = allStatements.filter(item => {
          let matches = true;
          if (filters.action && filters.action !== '') {
            matches = matches && item.action.toLowerCase() === filters.action.toLowerCase();
          }
          if (filters.date && filters.date !== '') {
            const itemDate = new Date(item.time_stamp).toISOString().split('T')[0];
            matches = matches && itemDate === filters.date;
          }
          return matches;
        });
      }

      if (filteredStatements.length > 0) {
        filteredStatements.forEach(item => {
          tbody.innerHTML += `
            <tr>
              <td>${new Date(item.time_stamp).toLocaleString()}</td>
              <td>${item.action}</td>
              <td>$${parseInt(item.transaction_amount).toFixed(0)}</td>
              <td>$${parseInt(item.current_balance).toFixed(0)}</td>
            </tr>`;
        });
        updateBalanceChart(filteredStatements);
      } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No transactions found.</td></tr>';
        updateBalanceChart([]);
      }
    } catch (error) {
      console.error('Error loading statement:', error);
      showToast(`Error loading statement: ${error.message}`, false);
      updateBalanceChart([]);
    }
  }

  // Filter Statement Modal Logic
  const filterModal = new bootstrap.Modal(document.getElementById('filterStatementModal'));
  const actionFilterCheckbox = document.getElementById('actionFilterCheckbox');
  const dateFilterCheckbox = document.getElementById('dateFilterCheckbox');
  const actionFilter = document.getElementById('actionFilter');
  const dateFilter = document.getElementById('dateFilter');

  // Toggle filter input visibility based on checkbox
  actionFilterCheckbox.addEventListener('change', (e) => {
    actionFilter.style.display = e.target.checked ? 'block' : 'none';
  });
  dateFilterCheckbox.addEventListener('change', (e) => {
    dateFilter.style.display = e.target.checked ? 'block' : 'none';
  });

  document.getElementById('filterStatementForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const filters = {};

    if (actionFilterCheckbox.checked) {
      const actionValue = document.getElementById('actionFilterSelect').value;
      if (!actionValue) {
        showToast('Please select an action (Add, Withdraw, Liquidate, or Purchase).', false);
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

    loadAccountStatement(filters);
    filterModal.hide();
  });

  document.getElementById('resetFilterBtn').addEventListener('click', () => {
    actionFilterCheckbox.checked = false;
    dateFilterCheckbox.checked = false;
    actionFilter.style.display = 'none';
    dateFilter.style.display = 'none';
    document.getElementById('actionFilterSelect').value = '';
    document.getElementById('dateFilterInput').value = '';
    loadAccountStatement();
    filterModal.hide();
  });

  // Update Balance Chart (Line Chart)
  function updateBalanceChart(statement) {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    const labels = statement.slice(0, 10).reverse().map(item => new Date(item.time_stamp).toLocaleDateString());
    const balances = statement.slice(0, 10).reverse().map(item => parseInt(item.current_balance));

    if (balanceChartInstance) {
      balanceChartInstance.destroy();
    }

    balanceChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Balance Trend ($)',
          data: balances,
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#36A2EB',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Balance ($)', color: '#fff', font: { size: 14 } },
            ticks: { color: '#fff' },
            grid: { color: '#333' }
          },
          x: {
            title: { display: true, text: 'Date', color: '#fff', font: { size: 14 } },
            ticks: { color: '#fff' },
            grid: { color: '#333' }
          }
        },
        plugins: {
          legend: { labels: { color: '#fff', font: { size: 14 } } },
          title: {
            display: true,
            text: 'Balance Trend Over Time',
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