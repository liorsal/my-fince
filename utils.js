// utils.js

// Data & storage
function saveData() {
  console.log('Saving data to localStorage:', { maxBudget, transactions, capital, fixedExpenses });
  localStorage.setItem('budgetData', JSON.stringify({ maxBudget, transactions, capital, fixedExpenses }));
}

function loadData() {
  console.log('Loading data from localStorage');
  try {
    const savedRaw = localStorage.getItem('budgetData');
    console.log('Raw localStorage data:', savedRaw);
    
    const saved = JSON.parse(savedRaw);
    console.log('Parsed data:', saved);
    
    if (saved) {
      maxBudget = saved.maxBudget || 0;
      transactions = saved.transactions || [];
      fixedExpenses = saved.fixedExpenses || [];
      current = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      if (saved.capital !== undefined) capital = saved.capital;
      
      console.log('Data loaded:', { 
        maxBudget, 
        transactionsCount: transactions.length, 
        fixedExpensesCount: fixedExpenses.length,
        fixedExpenses: fixedExpenses,
        current,
        capital
      });
    } else {
      console.log('No saved data found, using defaults');
    }
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
  }
}

// Toast message
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Theme persistence and loader
document.addEventListener('DOMContentLoaded', () => {
  // Hide loader if present
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';

  // Apply saved theme
  const isLight = localStorage.getItem('theme') === 'light';
  if (isLight) document.documentElement.classList.add('light-theme');
  const themeToggleIcon = document.querySelector('#themeToggle i');
  if (themeToggleIcon) themeToggleIcon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';

  // Setup theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const nowLight = document.documentElement.classList.toggle('light-theme');
      localStorage.setItem('theme', nowLight ? 'light' : 'dark');
      themeToggleIcon.className = nowLight ? 'fas fa-sun' : 'fas fa-moon';
    });
  }
}); 