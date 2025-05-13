// index.js

// Global variables
let maxBudget = 0, current = 0, capital = 0;
let transactions = [];
let fixedExpenses = [];

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

  // Data loaded by utils.js
  loadData();

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
        // תקציב אופס לגמרי - התחלה מחדש
        ctx.fillText(`תקציב אופס`, left+width/2, top+height/2);
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
    animation: { duration: 1200, easing: 'easeOutQuart' }, 
    plugins: { 
      legend: { display: false }, 
      tooltip: { enabled: true } 
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
      // תקציב אופס לגמרי - מציג בירוק
      statusEl.className = `status-budget status-green`;
      statusEl.textContent = `תקציב אופס - 0 מתוך 0 ₪`;
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
      // יש תקציב אבל אין הוצאות - מעגל מלא בצבע אקסנט
      chartDataArray = [1];
      chartColorsArray = ['var(--accent)'];
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

  function updateAll() {
    updateStatus(); updateCapital(); updateChart(); updateTransactions(); updateFixedList();
  }

  // Event handlers
  document.getElementById('setMaxBtn').addEventListener('click', function() {
    const val = +document.getElementById('maxInput').value;
    if (val > 0) { 
      maxBudget = val; 
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
      fixedExpenses = []; 
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

  // Popup menu
  const moreBtn = document.getElementById('moreBtn');
  const popupMenu = document.getElementById('popupMenu'); 
  let popupOpen = false;
  
  moreBtn.onclick = e => { 
    e.stopPropagation(); 
    popupOpen ? popupMenu.style.display = 'none' : popupMenu.style.display = 'flex'; 
    popupOpen = !popupOpen; 
  };
  
  document.body.addEventListener('click', e => { 
    if (popupOpen && !moreBtn.contains(e.target) && !popupMenu.contains(e.target)) {
      popupMenu.style.display = 'none';
      popupOpen = false;
    }
  }, true);
  
  window.addEventListener('scroll', () => {
    popupMenu.style.display = 'none';
    popupOpen = false;
  }, true);
  
  // Setup buttons in the popup menu
  document.getElementById('resetBtnPopup').onclick = () => { 
    current = 0; 
    maxBudget = 0;
    transactions = []; 
    fixedExpenses = []; 
    saveData(); 
    updateAll(); 
    popupMenu.style.display = 'none';
    popupOpen = false;
    showToast('תקציב אופס!');
  };
  
  document.getElementById('exportBtnPopup').onclick = () => {
    let csv = 'type,desc,amount,date\n'; 
    transactions.forEach(t => csv += `${t.type},${t.desc},${t.amount},${t.date}\n`);
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = 'transactions.csv'; 
    a.click();
    URL.revokeObjectURL(a.href);
    popupMenu.style.display = 'none';
    popupOpen = false;
  };
  
  document.getElementById('backupBtnPopup').onclick = () => {
    const data = JSON.stringify({ maxBudget, transactions, capital, fixedExpenses });
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = 'budget_backup.json'; 
    a.click(); 
    URL.revokeObjectURL(a.href); 
    showToast('גיבוי נוצר בהצלחה!');
    popupMenu.style.display = 'none';
    popupOpen = false;
  };
  
  document.getElementById('restoreBtnPopup').onclick = () => {
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
            popupMenu.style.display = 'none';
            popupOpen = false;
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
  };

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
  
  // Add detailed debugging for the fixed expenses feature
  console.log('Initializing fixed expenses feature...');
  console.log('Initial fixed expenses:', fixedExpenses);
  
  try {
    // Validate that DOM elements exist
    const addFixedBtn = document.getElementById('addFixedExpenseBtn');
    if (!addFixedBtn) {
      console.error('ERROR: addFixedExpenseBtn not found in DOM');
    } else {
      console.log('Found addFixedExpenseBtn:', addFixedBtn);
    }
    
    const fixedForm = document.getElementById('addFixedExpenseForm');
    if (!fixedForm) {
      console.error('ERROR: addFixedExpenseForm not found in DOM');
    } else {
      console.log('Found addFixedExpenseForm:', fixedForm);
    }
    
    // Remove the form submit handler and use a direct button click handler instead
    document.getElementById('addFixedExpenseBtn').addEventListener('click', function(e) {
      try {
        console.log('addFixedExpenseBtn clicked');
        e.preventDefault();
        const descEl = document.getElementById('fixedDescInput');
        const amtEl = document.getElementById('fixedAmountInput');
        
        if (!descEl) {
          console.error('ERROR: fixedDescInput not found');
          return;
        }
        if (!amtEl) {
          console.error('ERROR: fixedAmountInput not found');
          return;
        }
        
        const desc = descEl.value.trim(); 
        const amt = +amtEl.value;
        
        console.log('Add Fixed Expense button clicked:', { desc, amount: amt });
        
        if (desc && amt > 0) { 
          const newFixedExpense = { desc, amount: amt };
          console.log('Adding new fixed expense:', newFixedExpense);
          
          fixedExpenses.push(newFixedExpense); 
          console.log('Fixed expenses array after push:', fixedExpenses);
          
          saveData(); 
          console.log('Data saved to localStorage');
          
          // Check if the data was properly saved
          setTimeout(debugLocalStorageState, 100);
          
          updateAll(); 
          console.log('UI updated');
          
          showToast('הוצאה קבועה נוספה!'); 
          descEl.value = ''; 
          amtEl.value = ''; 
          
          // Add a refresh button to manually reload the page if needed
          document.getElementById('fixedExpensesSection').insertAdjacentHTML('afterbegin', 
            `<button id="refreshPageBtn" 
                     style="position:absolute;right:10px;top:10px;background:#1976d2;color:white;
                            border:none;border-radius:5px;padding:5px 10px;cursor:pointer">
               <i class="fas fa-sync-alt"></i> רענן דף
             </button>`
          );
          
          document.getElementById('refreshPageBtn').onclick = function() {
            window.location.reload();
          };
          
          // Check if reload needed flag exists
          if (!window.fixedExpensesAdded) {
            window.fixedExpensesAdded = 0;
          }
          window.fixedExpensesAdded++;
          
          if (window.fixedExpensesAdded > 1) {
            // On second add, reload the page to ensure changes are reflected
            alert('הוצאה קבועה נוספה! הדף יתרענן כעת להצגת השינויים');
            window.location.reload();
          }
        } else {
          console.log('Invalid input - desc:', desc, 'amount:', amt);
          showToast('אנא מלא תיאור וסכום תקינים');
        }
      } catch (error) {
        console.error('ERROR in fixed expense button click handler:', error);
      }
    });
  } catch (error) {
    console.error('ERROR initializing fixed expenses:', error);
  }

  // Also prevent form submission which might interfere with the button click
  document.getElementById('addFixedExpenseForm').addEventListener('submit', function(e) {
    console.log('Form submit event triggered');
    e.preventDefault();
    console.log('Form submit prevented, using button click handler instead');
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
  document.getElementById('addExpenseBtn').onclick = () => {
    const desc = document.getElementById('expenseDescInput').value.trim();
    const cat = categorySelect.value;
    const amt = +document.getElementById('expenseInput').value;
    if (desc && amt > 0) {
      const now = new Date(); const p = n=>String(n).padStart(2,'0');
      const dt = `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
      transactions.push({ type:'expense', amount:amt, desc, date:dt, category:cat });
      current += amt; saveData(); updateAll(); showToast(current>maxBudget?'חרגת מהתקציב!':'הוצאה נוספה!');
      document.getElementById('expenseDescInput').value=''; document.getElementById('expenseInput').value='';
    } else showToast('אנא מלא תיאור וסכום');
  };

  // Initial UI update
  updateAll();
}); 