document.addEventListener("DOMContentLoaded", () => {
    // Redirect to Portfolio Manager
    const portfolioBtn = document.getElementById('portfolioBtn');
    if (portfolioBtn) {
      portfolioBtn.addEventListener('click', () => {
        console.log('Navigating to Portfolio Manager');
        window.location.href = 'portfolio/index.html';
      });
    } else {
      console.error('Portfolio button not found');
    }
    const settlementBtn = document.getElementById('settlementBtn');
    if (settlementBtn) {
      settlementBtn.addEventListener('click', () => {
        console.log('Navigating to Settlement Account');
        window.location.href = 'settlement/index.html';
      });
    } else {
      console.error('Settlement button not found');
    }
  
    // Initialize Tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    if (tooltipTriggerList.length > 0) {
      tooltipTriggerList.forEach(element => {
        new bootstrap.Tooltip(element);
      });
    } else {
      console.warn('No tooltip elements found');
    }
  });