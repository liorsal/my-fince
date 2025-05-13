// index.js

// Global variables
let maxBudget = 0, current = 0, capital = 0;
let transactions = [];
let fixedExpenses = [];
let categoryBudgets = {}; // Add support for category budgets

// Global debug function to manually toggle settings menu
window.toggleSettings = function() {
  const settingsMenu = document.getElementById('settingsMenu');
  const backdrop = document.getElementById('backdrop');
  if (settingsMenu && backdrop) {
    console.log('Manual settings toggle called');
    settingsMenu.classList.toggle('active');
    backdrop.classList.toggle('active');
    console.log('Settings menu classes after toggle:', settingsMenu.className);
    return true;
  } else {
    console.error('Settings elements not found for manual toggle');
    return false;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Only run on index.html
  const expenseCanvas = document.getElementById('expenseChart');
  if (!expenseCanvas) return;

  // Check if we're on a mobile device
  const isMobile = window.innerWidth < 600;
  
  // Data loaded by utils.js
  loadData();
  
  // Mobile-specific chart optimizations
  if (isMobile) {
    Chart.defaults.animation.duration = 300;
    Chart.defaults.scales.display = false;
    Chart.defaults.plugins.tooltip.enabled = false;
  }

  // Setup settings toggle with debug logs
  document.querySelector('.settings-toggle').addEventListener('click', () => {
    console.log('Settings gear icon clicked - event triggered');
    const settingsMenu = document.getElementById('settingsMenu');
    const backdrop = document.getElementById('backdrop');
    if (settingsMenu && backdrop) {
      console.log('Toggling settings menu visibility');
      settingsMenu.classList.toggle('active');
      backdrop.classList.toggle('active');
      console.log('Settings menu classes after toggle:', settingsMenu.className);
    } else {
      console.error('Settings elements not found during click event');
    }
  });

  // Category icons map
  const categoryIcons = {
    'שכר דירה': { icon: 'fa-house', emoji: '🏠', color: '#ffb300' },
    'חשבונות': { icon: 'fa-file-invoice', emoji: '💡', color: '#00bcd4' },
    'דלק': { icon: 'fa-gas-pump', emoji: '⛽', color: '#ff7043' },
    'גז (גפ״מ)': { icon: 'fa-fire', emoji: '🔥', color: '#ff5252' },
    'אוכל': { icon: 'fa-utensils', emoji: '🛒', color: '#43a047' },
    'בילויים': { icon: 'fa-glass-cheers', emoji: '🎉', color: '#7e57c2' },
    'ביגוד': { icon: 'fa-tshirt', emoji: '👕', color: '#29b6f6' },
    'פינוקים': { icon: 'fa-ice-cream', emoji: '🍦', color: '#f06292' },
    'כללי': { icon: 'fa-ellipsis-h', emoji: '📦', color: '#607d8b' }
  };

  // Setup doughnut chart with center text plugin
  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw(chart) {
      const { ctx, chartArea: { width, height, left, top } } = chart;
      ctx.save();
      ctx.font = 'bold 22px Assistant';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (maxBudget === 0 && current === 0 && fixedExpenses.length === 0) {
        // מאופס לגמרי - הצג 0 מתוך 0 ₪
        ctx.fillText(`0 מתוך 0 ₪`, left+width/2, top+height/2);
      } else if (maxBudget === 0) {
        ctx.fillText(`אין תקציב מוגדר`, left+width/2, top+height/2);
      } else {
        const fixedSum = fixedExpenses.reduce((sum, f) => sum + Number(f.amount), 0);
        const remaining = Math.max(maxBudget - current - fixedSum, 0);
        ctx.fillText(`נשאר לך: ${remaining} ₪`, left+width/2, top+height/2 - 10);
        ctx.font = '16px Assistant';
        ctx.fillText(`מתוך ${maxBudget} ₪`, left+width/2, top+height/2 + 16);
      }
      ctx.restore();
    }
  };
  
  const chartData = { datasets: [{ data: [1], backgroundColor: ['#424242'], borderWidth: 0 }] };
  const chartOptions = { 
    cutout: '70%', 
    responsive: true, 
    animation: { 
      duration: isMobile ? 300 : 500, 
      easing: 'easeOutQuad' 
    }, 
    plugins: { 
      legend: { display: false }, 
      tooltip: { enabled: !isMobile }  // Disable tooltips on mobile
    },
    // Phone optimizations
    events: isMobile ? [] : ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
    elements: {
      arc: {
        borderWidth: 0
      }
    },
    layout: {
      padding: isMobile ? 5 : 10
    }
  };
  
  const expenseCtx = expenseCanvas.getContext('2d');
  const expenseChart = new Chart(expenseCtx, { 
    type: 'doughnut', 
    data: chartData, 
    options: chartOptions, 
    plugins: [centerTextPlugin] 
  });

  // UI elements
  const transactionsList = document.getElementById('transactions');
  const categorySelect = document.getElementById('categorySelect');

  // Update functions
  function updateStatus() {
    const fixedSum = fixedExpenses.reduce((s, f) => s + Number(f.amount), 0);
    const statusEl = document.getElementById('statusText');
    
    if (maxBudget === 0 && current === 0 && fixedExpenses.length === 0) {
      // מאופס לגמרי - מציג ירוק ו-0 מתוך 0 ₪
      statusEl.className = `status-budget status-green`;
      statusEl.textContent = `0 מתוך 0 ₪`;
    } else {
      // מצב רגיל
      const percent = maxBudget ? (current + fixedSum) / maxBudget : 0;
      const statusClass = percent > 0.9 ? 'status-red' : (percent > 0.6 ? 'status-orange' : 'status-green');
      statusEl.className = `status-budget ${statusClass}`;
      statusEl.textContent = `נשאר לך: ${maxBudget - current - fixedSum} ₪ מתוך ${maxBudget} ₪`;
    }
  }

  function updateCapital() {
    document.getElementById('capitalText').textContent = `ההון שלך הוא: ${capital} ₪`;
  }

  function updateTransactions() {
    transactionsList.innerHTML = '';
    transactions.slice().reverse().forEach(t => {
      const li = document.createElement('li'); li.className = 'expense-item';
      const cat = categoryIcons[t.category] || { icon: 'fa-question', emoji: '❓', color: '#888' };
      const date = t.date ? t.date.replace('T', ' ') : 'תאריך לא ידוע';
      li.innerHTML = `
        <span class="expense-icon" style="color:${cat.color}"><i class="fas ${cat.icon}"></i> ${cat.emoji}</span>
        <span class="expense-cat">${t.category}</span>
        <span class="expense-amount">${t.amount} ₪</span>
        <span>${t.desc}</span>
        <span class="expense-date">${date}</span>
      `;
      transactionsList.append(li);
    });
  }

  function updateChart() {
    // סכומים
    const fixedSum = fixedExpenses.reduce((s, f) => s + Number(f.amount), 0);
    const regularSpent = current;
    const totalSpent = fixedSum + regularSpent;
    const remaining = Math.max(maxBudget - totalSpent, 0);

    // צבע להוצאות רגילות
    let regularExpenseColor = '#00c851';
    if (maxBudget > 0) {
      const percent = totalSpent / maxBudget;
      if (percent > 0.9) regularExpenseColor = '#ff4444';
      else if (percent > 0.6) regularExpenseColor = '#ff9800';
    } else {
      regularExpenseColor = '#888'; // שינוי מ-#424242 (שחור) ל-#888 (אפור)
    }

    // תמיד מציגים עיגול מלא (התקציב), ומעליו הוצאות קבועות (אפור) והוצאות רגילות (דינמי)
    let chartDataArray = [];
    let chartColorsArray = [];

    if (maxBudget === 0 && current === 0 && fixedExpenses.length === 0) {
      // מאופס לגמרי - מעגל ירוק
      chartDataArray = [1];
      chartColorsArray = ['#00c851']; // צבע ירוק
    } else if (maxBudget === 0) {
      // אין תקציב - מעגל אפור בהיר במקום שחור
      chartDataArray = [1];
      chartColorsArray = ['#888']; // שינוי מ-#424242 (שחור) ל-#888 (אפור)
    } else if (totalSpent === 0) {
      // יש תקציב אבל אין הוצאות - מעגל אפור (0 מתוך 0 הוצאות)
      chartDataArray = [1];
      chartColorsArray = ['#888'];
    } else {
      // סדר: נשאר, קבועות, רגילות (רק אם יש מהם)
      chartDataArray = [];
      chartColorsArray = [];
      
      if (remaining > 0) {
        chartDataArray.push(remaining);
        chartColorsArray.push('var(--accent)');
      }
      
      if (fixedSum > 0) {
        chartDataArray.push(fixedSum);
        chartColorsArray.push('#888'); // אפור במקום שחור
      }
      
      if (regularSpent > 0) {
        chartDataArray.push(regularSpent);
        chartColorsArray.push(regularExpenseColor);
      }
      
      // אם משום מה אין נתונים, תציג מעגל ירוק במקום אפור
      if (chartDataArray.length === 0) {
        chartDataArray = [1];
        chartColorsArray = ['#00c851']; // ירוק במקום שחור
      }
    }

    // עדכון נתוני הגרף
    expenseChart.data.datasets[0].data = chartDataArray;
    expenseChart.data.datasets[0].backgroundColor = chartColorsArray;
    expenseChart.update();
  }

  function updateFixedList() {
    const ul = document.getElementById('fixedExpensesList'); ul.innerHTML = '';
    if (!fixedExpenses.length) {
      ul.innerHTML = '<li style="color:#bbb;text-align:center;">לא הוגדרו הוצאות קבועות</li>';
      return;
    }
    fixedExpenses.forEach((f, i) => {
      const li = document.createElement('li'); li.className = 'expense-item';
      li.innerHTML = `
        <span class="expense-icon" style="color:#888"><i class="fas fa-thumbtack"></i></span>
        <span class="expense-cat">${f.desc}</span>
        <span class="expense-amount">${f.amount} ₪</span>
        <button class="action-btn edit-fixed" style="background:#1976d2;padding:4px 10px;font-size:0.95em;">ערוך</button>
        <button class="action-btn delete-fixed" style="background:#ff4444;padding:4px 10px;font-size:0.95em;">מחק</button>
      `;
      li.querySelector('.edit-fixed').onclick = () => {
        const newDesc = prompt('ערוך תיאור:', f.desc);
        const newAmt = +prompt('ערוך סכום:', f.amount);
        if (newDesc && newAmt > 0) {
          f.desc = newDesc; f.amount = newAmt;
          saveData(); updateAll(); showToast('עודכן!');
        }
      };
      li.querySelector('.delete-fixed').onclick = () => {
        if (confirm('למחוק הוצאה קבועה זו?')) {
          fixedExpenses.splice(i,1);
          saveData(); updateAll(); showToast('נמחק!');
        }
      };
      ul.append(li);
    });
  }

  function updatePanelStats() {
    // Update budget value
    const budgetValueEl = document.getElementById('budget-value');
    if (budgetValueEl) {
      budgetValueEl.textContent = `${maxBudget} ₪`;
    }
    
    // Update remaining value
    const remainingValueEl = document.getElementById('remaining-value');
    if (remainingValueEl) {
      const fixedSum = fixedExpenses.reduce((s, f) => s + Number(f.amount), 0);
      const remaining = Math.max(maxBudget - current - fixedSum, 0);
      remainingValueEl.textContent = `${remaining} ₪`;
    }
    
    // Update capital value
    const capitalValueEl = document.getElementById('capital-value');
    if (capitalValueEl) {
      capitalValueEl.textContent = `${capital} ₪`;
    }
  }

  function updateAll() {
    updateStatus(); 
    updateCapital(); 
    updateChart(); 
    updateTransactions(); 
    updateFixedList();
    updatePanelStats();
  }

  function saveData() {
    try {
      // Save all budget data including category budgets
      localStorage.setItem('budgetData', JSON.stringify({
        maxBudget, current, transactions, capital, fixedExpenses, categoryBudgets
      }));
    } catch (err) {
      console.error('Error saving data:', err);
    }
  }

  function loadData() {
    try {
      const saved = localStorage.getItem('budgetData');
      if (saved) {
        const data = JSON.parse(saved);
        maxBudget = data.maxBudget || 0;
        transactions = data.transactions || [];
        capital = data.capital || 0;
        fixedExpenses = data.fixedExpenses || [];
        categoryBudgets = data.categoryBudgets || {}; // Load category budgets

        // Calculate current spending
        current = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }

  // Event handlers
  document.getElementById('setMaxBtn').addEventListener('click', function() {
    const val = +document.getElementById('maxInput').value;
    if (val > 0) { 
      // Get old budget for comparison
      const oldBudget = maxBudget;
      
      // Update max budget
      maxBudget = val; 
      
      // If budget increased and there are existing category allocations, 
      // we'll automatically adjust them proportionally
      if (oldBudget > 0 && Object.keys(categoryBudgets).length > 0) {
        const ratio = val / oldBudget;
        
        // Only adjust if budget increased
        if (ratio > 1) {
          for (const cat in categoryBudgets) {
            // Scale each category budget by the same ratio
            categoryBudgets[cat] = Math.round(categoryBudgets[cat] * ratio);
          }
        }
      }
      
      saveData(); 
      updateAll(); 
      showToast('תקציב הוגדר!'); 
      settingsMenu.classList.remove('active');
      backdrop.classList.remove('active');
    } else {
      showToast('אנא הזן ערך תקציב חוקי');
    }
  });

  document.getElementById('setCapitalBtn').addEventListener('click', function() {
    const val = +document.getElementById('capitalInput').value;
    if (!isNaN(val) && val >= 0) { 
      capital = val; 
      saveData(); 
      updateCapital(); 
      showToast('ההון התעדכן!'); 
      settingsMenu.classList.remove('active');
      backdrop.classList.remove('active');
    } else {
      showToast('אנא הזן ערך הון חוקי');
    }
  });

  document.getElementById('resetBtn').addEventListener('click', function() {
    if (confirm('האם אתה בטוח שברצונך לאפס את התקציב?')) {
      current = 0; 
      maxBudget = 0;
      transactions = []; 
      // Do not clear fixedExpenses so they persist
      saveData(); 
      updateAll(); 
      showToast('תקציב אופס!');
      settingsMenu.classList.remove('active');
      backdrop.classList.remove('active');
    }
  });

  document.getElementById('exportBtn').addEventListener('click', function() {
    let csv = 'type,desc,amount,date\n'; 
    transactions.forEach(t => csv += `${t.type},${t.desc},${t.amount},${t.date}\n`);
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = 'transactions.csv'; 
    a.click();
    URL.revokeObjectURL(a.href);
    settingsMenu.classList.remove('active');
    backdrop.classList.remove('active');
  });

  document.getElementById('backupBtn').addEventListener('click', function() {
    const data = JSON.stringify({ maxBudget, transactions, capital, fixedExpenses });
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = 'budget_backup.json'; 
    a.click(); 
    URL.revokeObjectURL(a.href); 
    showToast('גיבוי נוצר בהצלחה!');
    settingsMenu.classList.remove('active');
    backdrop.classList.remove('active');
  });

  document.getElementById('restoreBtn').addEventListener('click', function() {
    const inp = document.createElement('input'); 
    inp.type = 'file'; 
    inp.accept = '.json';
    inp.onchange = e => { 
      const f = e.target.files[0]; 
      if (!f) return; 
      const r = new FileReader(); 
      r.onload = ev => { 
        try { 
          const d = JSON.parse(ev.target.result); 
          if (d.maxBudget !== undefined && Array.isArray(d.transactions)) { 
            maxBudget = d.maxBudget; 
            transactions = d.transactions; 
            capital = d.capital || 0; 
            fixedExpenses = d.fixedExpenses || []; 
            current = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0); 
            saveData(); 
            updateAll(); 
            showToast('נתונים שוחזרו בהצלחה!'); 
            settingsMenu.classList.remove('active');
            backdrop.classList.remove('active');
          } else {
            showToast('פורמט קובץ לא תקין!'); 
          }
        } catch { 
          showToast('שגיאה בשחזור הנתונים!'); 
        } 
      }; 
      r.readAsText(f); 
    };
    inp.click();
  });

  // Add a debug function to check localStorage functionality
  function debugLocalStorageState() {
    console.log('--- localStorage Debug Info ---');
    try {
      const savedRaw = localStorage.getItem('budgetData');
      console.log('Raw localStorage budgetData:', savedRaw);
      
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        console.log('Parsed localStorage data:', parsed);
        
        if (parsed.fixedExpenses) {
          console.log('Fixed expenses count in localStorage:', parsed.fixedExpenses.length);
          console.log('Fixed expenses in localStorage:', parsed.fixedExpenses);
        } else {
          console.error('No fixedExpenses array found in localStorage');
        }
      } else {
        console.log('No budgetData found in localStorage');
      }
    } catch (error) {
      console.error('Error retrieving localStorage data:', error);
    }
    console.log('--- End localStorage Debug Info ---');
  }
  
  // Call the debug function after initial load
  debugLocalStorageState();
  
  // Handle fixed expense form submission
  document.getElementById('addFixedExpenseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const descEl = document.getElementById('fixedDescInput');
    const amtEl = document.getElementById('fixedAmountInput');
    const desc = descEl.value.trim();
    const amount = +amtEl.value;
    if (desc && amount > 0) {
      fixedExpenses.push({ desc, amount });
      saveData();
      updateAll();
      showToast('הוצאה קבועה נוספה!');
      descEl.value = '';
      amtEl.value = '';
    } else {
      showToast('אנא מלא תיאור וסכום תקינים');
    }
  });

  // Settings menu functionality
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsMenu = document.getElementById('settingsMenu');
  const backdrop = document.getElementById('backdrop');

  // Debug logging
  console.log('Settings elements found:', { 
    settingsBtn: settingsBtn ? 'Yes' : 'No',
    settingsMenu: settingsMenu ? 'Yes' : 'No',
    backdrop: backdrop ? 'Yes' : 'No'
  });

  // Only add event listeners if elements exist
  if (settingsBtn && settingsMenu && backdrop) {
    // Open/close settings menu
    settingsBtn.addEventListener('click', function() {
      console.log('Settings button clicked');
      settingsMenu.classList.toggle('active');
      backdrop.classList.toggle('active');
      console.log('Settings menu class list after toggle:', settingsMenu.classList);
    });

    document.getElementById('closeSettingsBtn').addEventListener('click', function() {
      console.log('Close settings button clicked');
      settingsMenu.classList.remove('active');
      backdrop.classList.remove('active');
    });

    backdrop.addEventListener('click', function() {
      console.log('Backdrop clicked');
      settingsMenu.classList.remove('active');
      backdrop.classList.remove('active');
    });
  } else {
    console.error('ERROR: One or more settings elements not found in DOM');
    
    // Try again after a short delay in case of delayed DOM loading
    setTimeout(() => {
      const retrySettingsBtn = document.getElementById('settingsBtn');
      const retrySettingsMenu = document.getElementById('settingsMenu');
      const retryBackdrop = document.getElementById('backdrop');
      
      console.log('Retry finding settings elements:', {
        settingsBtn: retrySettingsBtn ? 'Yes' : 'No',
        settingsMenu: retrySettingsMenu ? 'Yes' : 'No', 
        backdrop: retryBackdrop ? 'Yes' : 'No'
      });
      
      if (retrySettingsBtn && retrySettingsMenu && retryBackdrop) {
        retrySettingsBtn.addEventListener('click', function() {
          console.log('Settings button clicked (retry)');
          retrySettingsMenu.classList.toggle('active');
          retryBackdrop.classList.toggle('active');
        });
      }
    }, 1000);
  }

  // Add expense button handler
  const addExpenseBtn = document.getElementById('addExpenseBtn');
  const descInput = document.getElementById('expenseDescInput');
  const amtInput = document.getElementById('expenseInput');
  const catSelect = document.getElementById('categorySelect');

  console.log('Expense input elements found:', { 
    descInput: descInput ? 'Yes' : 'No',
    amtInput: amtInput ? 'Yes' : 'No',
    catSelect: catSelect ? 'Yes' : 'No',
    addExpenseBtn: addExpenseBtn ? 'Yes' : 'No'
  });

  if (addExpenseBtn && descInput && amtInput && catSelect) {
    addExpenseBtn.addEventListener('click', () => {
      console.log('Add expense button clicked.');
      const desc = descInput.value.trim();
      const cat = catSelect.value;
      const amt = +amtInput.value;
      console.log('Attempting to add expense with values:', { description: desc, category: cat, amount: amt });
      if (desc && amt > 0) {
        console.log('Input validation passed.');
        const now = new Date(); const p = n=>String(n).padStart(2,'0');
        const dt = `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
        transactions.push({ type:'expense', amount:amt, desc, date:dt, category:cat });
        console.log('Transaction added:', transactions[transactions.length - 1]);
        current += amt; 
        console.log('Current spent updated:', current);
        saveData(); 
        console.log('Data saved.');
        updateAll(); 
        console.log('updateAll called.');
        
        // Show appropriate toast based on budget status
        let toastMessage = 'הוצאה נוספה!';
        
        // Check if this category has a budget and if it's exceeded
        if (categoryBudgets[cat] && categoryBudgets[cat] > 0) {
          // Calculate total spent in this category
          const categorySpent = transactions
            .filter(t => t.type === 'expense' && t.category === cat)
            .reduce((sum, t) => sum + Number(t.amount), 0);
          
          if (categorySpent > categoryBudgets[cat]) {
            toastMessage = `חרגת מתקציב הקטגוריה ${cat}!`;
          }
        } else if (current > maxBudget) {
          toastMessage = 'חרגת מהתקציב הכללי!';
        }
        
        showToast(toastMessage);
        
        descInput.value=''; 
        amtInput.value='';
        console.log('Input fields cleared.');
      } else {
        showToast('אנא מלא תיאור וסכום');
        console.warn('Invalid expense input: description or amount missing/invalid.', { description: desc, amount: amt });
      }
    });
  }

  // Add left panel quick action handlers
  const quickExpenseBtn = document.getElementById('quick-expense');
  if (quickExpenseBtn) {
    quickExpenseBtn.addEventListener('click', () => {
      const expenseInputs = document.querySelector('.add-expense-card');
      if (expenseInputs) {
        // Scroll to expense inputs
        expenseInputs.scrollIntoView({ behavior: 'smooth' });
        // Focus on the first input
        setTimeout(() => {
          document.getElementById('expenseDescInput').focus();
        }, 500);
      }
    });
  }
  
  const quickFixedExpenseBtn = document.getElementById('quick-fixed-expense');
  if (quickFixedExpenseBtn) {
    quickFixedExpenseBtn.addEventListener('click', () => {
      const fixedExpenseForm = document.getElementById('addFixedExpenseForm');
      if (fixedExpenseForm) {
        // Scroll to fixed expense form
        fixedExpenseForm.scrollIntoView({ behavior: 'smooth' });
        // Focus on the first input
        setTimeout(() => {
          document.getElementById('fixedDescInput').focus();
        }, 500);
      }
    });
  }
  
  const quickSetBudgetBtn = document.getElementById('quick-set-budget');
  if (quickSetBudgetBtn) {
    quickSetBudgetBtn.addEventListener('click', () => {
      // Open settings menu
      const settingsMenu = document.getElementById('settingsMenu');
      const backdrop = document.getElementById('backdrop');
      if (settingsMenu && backdrop) {
        settingsMenu.classList.add('active');
        backdrop.classList.add('active');
        // Focus on budget input
        setTimeout(() => {
          document.getElementById('maxInput').focus();
        }, 300);
      }
    });
  }
  
  const quickSetCapitalBtn = document.getElementById('quick-set-capital');
  if (quickSetCapitalBtn) {
    quickSetCapitalBtn.addEventListener('click', () => {
      // Open settings menu
      const settingsMenu = document.getElementById('settingsMenu');
      const backdrop = document.getElementById('backdrop');
      if (settingsMenu && backdrop) {
        settingsMenu.classList.add('active');
        backdrop.classList.add('active');
        // Focus on capital input
        setTimeout(() => {
          document.getElementById('capitalInput').focus();
        }, 300);
      }
    });
  }
  
  // Tool buttons
  const toolResetBtn = document.getElementById('tool-reset');
  if (toolResetBtn) {
    toolResetBtn.addEventListener('click', () => {
      if (confirm('האם אתה בטוח שברצונך לאפס את התקציב?')) {
        current = 0; 
        maxBudget = 0;
        transactions = []; 
        fixedExpenses = []; 
        saveData(); 
        updateAll(); 
        showToast('תקציב אופס!');
      }
    });
  }
  
  const toolExportBtn = document.getElementById('tool-export');
  if (toolExportBtn) {
    toolExportBtn.addEventListener('click', () => {
      let csv = 'type,desc,amount,date\n'; 
      transactions.forEach(t => csv += `${t.type},${t.desc},${t.amount},${t.date}\n`);
      const blob = new Blob([csv], {type: 'text/csv'});
      const a = document.createElement('a'); 
      a.href = URL.createObjectURL(blob); 
      a.download = 'transactions.csv'; 
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('ייצוא CSV בוצע בהצלחה!');
    });
  }
  
  const toolBackupBtn = document.getElementById('tool-backup');
  if (toolBackupBtn) {
    toolBackupBtn.addEventListener('click', () => {
      const data = JSON.stringify({ maxBudget, transactions, capital, fixedExpenses });
      const blob = new Blob([data], {type: 'application/json'});
      const a = document.createElement('a'); 
      a.href = URL.createObjectURL(blob); 
      a.download = 'budget_backup.json'; 
      a.click(); 
      URL.revokeObjectURL(a.href); 
      showToast('גיבוי נוצר בהצלחה!');
    });
  }
  
  const toolRestoreBtn = document.getElementById('tool-restore');
  if (toolRestoreBtn) {
    toolRestoreBtn.addEventListener('click', () => {
      const inp = document.createElement('input'); 
      inp.type = 'file'; 
      inp.accept = '.json';
      inp.onchange = e => { 
        const f = e.target.files[0]; 
        if (!f) return; 
        const r = new FileReader(); 
        r.onload = ev => { 
          try { 
            const d = JSON.parse(ev.target.result); 
            if (d.maxBudget !== undefined && Array.isArray(d.transactions)) { 
              maxBudget = d.maxBudget; 
              transactions = d.transactions; 
              capital = d.capital || 0; 
              fixedExpenses = d.fixedExpenses || []; 
              current = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0); 
              saveData(); 
              updateAll(); 
              showToast('נתונים שוחזרו בהצלחה!'); 
            } else {
              showToast('פורמט קובץ לא תקין!'); 
            }
          } catch { 
            showToast('שגיאה בשחזור הנתונים!'); 
          } 
        }; 
        r.readAsText(f); 
      };
      inp.click();
    });
  }

  // Initial UI update
  updateAll();

  // Mobile touch improvements
  document.addEventListener('DOMContentLoaded', function() {
    // Add tap highlight for mobile
    const clickableElements = document.querySelectorAll('.panel-item, button, .action-btn');
    clickableElements.forEach(el => {
      el.addEventListener('touchstart', function() {
        this.style.opacity = '0.7';
      });
      
      el.addEventListener('touchend', function() {
        this.style.opacity = '1';
        // Add small delay to make tap effect visible
        setTimeout(() => {
          this.style.opacity = '1';
        }, 150);
      });
    });
    
    // Make sure the panel is visible on mobile
    const leftPanel = document.querySelector('.left-panel');
    if (leftPanel && window.innerWidth < 600) {
      leftPanel.style.display = 'block';
    }
    
    // Prevent zooming when tapping inputs on iOS
    const metas = document.getElementsByTagName('meta');
    for (let i = 0; i < metas.length; i++) {
      if (metas[i].name === 'viewport') {
        metas[i].content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
        break;
      }
    }
    
    // Optimize chart rendering for mobile
    function optimizeChartsForMobile() {
      const isMobile = window.innerWidth < 600;
      if (isMobile) {
        // Reduce animation duration for mobile
        Chart.defaults.animation.duration = 500;
      }
    }
    
    window.addEventListener('resize', optimizeChartsForMobile);
    optimizeChartsForMobile();
  });
}); 