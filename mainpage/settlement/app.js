document.addEventListener("DOMContentLoaded", () => {
  let balanceChartInstance = null;

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
      transaction_amount: Math.round(amount), // Round to match INT in DB
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " ")
    };

    try {
      const res = await fetch('http://localhost:5001/addtoSettlementAcct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      console.log('Add funds response:', result); // Debug log
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
      transaction_amount: Math.round(amount), // Round to match INT in DB
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " ")
    };

    try {
      const res = await fetch('http://localhost:5001/withdrawFromSettlementAcct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      console.log('Withdraw funds response:', result); // Debug log
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
        cache: 'no-store' // Prevent caching
      });
      const data = await res.json();
      console.log('Balance response:', data); // Debug log
      if (data.success && data.data !== null && data.data !== undefined) {
        const balance = parseInt(data.data); // Ensure INT parsing
        document.getElementById('currentBalance').textContent = `$${balance.toFixed(0)}`; // No decimals for INT
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
  async function loadAccountStatement() {
    try {
      const res = await fetch('http://localhost:5001/viewAcctStatement', {
        cache: 'no-store' // Prevent caching
      });
      const data = await res.json();
      console.log('Statement response:', data); // Debug log
      const tbody = document.querySelector('#statementTable tbody');
      tbody.innerHTML = '';

      if (data.success && data.data.length > 0) {
        data.data.forEach(item => {
          tbody.innerHTML += `
            <tr>
              <td>${new Date(item.time_stamp).toLocaleString()}</td>
              <td>${item.action}</td>
              <td>$${parseInt(item.transaction_amount).toFixed(0)}</td>
              <td>$${parseInt(item.current_balance).toFixed(0)}</td>
            </tr>`;
        });
        updateBalanceChart(data.data);
      } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No transactions found.</td></tr>';
        updateBalanceChart([]);
      }
    } catch (error) {
      console.error('Error loading statement:', error);
      showToast(`Error loading statement: ${error.message}`, false);
    }
  }

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