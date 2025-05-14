// categories.js

document.addEventListener('DOMContentLoaded', () => {
  // Only run on categories.html
  const selectorDiv = document.getElementById('categorySelector');
  if (!selectorDiv) return;

  // Categories metadata
  const categoriesList = [
    { name: 'שכר דירה', icon: 'fa-house', emoji: '🏠', color: '#ffb300' },
    { name: 'חשבונות', icon: 'fa-file-invoice', emoji: '💡', color: '#00bcd4' },
    { name: 'דלק', icon: 'fa-gas-pump', emoji: '⛽', color: '#ff7043' },
    { name: 'גז (גפ״מ)', icon: 'fa-fire', emoji: '🔥', color: '#ff5252' },
    { name: 'אוכל', icon: 'fa-utensils', emoji: '🛒', color: '#43a047' },
    { name: 'בילויים', icon: 'fa-glass-cheers', emoji: '🎉', color: '#7e57c2' },
    { name: 'ביגוד', icon: 'fa-tshirt', emoji: '👕', color: '#29b6f6' },
    { name: 'פינוקים', icon: 'fa-ice-cream', emoji: '🍦', color: '#f06292' },
    { name: 'כללי', icon: 'fa-ellipsis-h', emoji: '📦', color: '#607d8b' }
  ];

  // Global data
  let categoryBudgets = {};
  let totalBudget = 0;
  let transactions = [];

  function getCategory(name) {
    const category = categoriesList.find(c => c.name === name);
    if (!category) {
      console.warn(`Category not found: ${name}`);
      return { icon: 'fa-question', emoji: '❓', color: '#888' };
    }
    return category;
  }

  // Load persisted data and selections
  loadGlobalData();
  const savedSelections = JSON.parse(localStorage.getItem('selectedCategories')) || [];

  // Render category selector
  function renderSelector(filter = '') {
    selectorDiv.innerHTML = '';
    const filtered = categoriesList.filter(cat => cat.name.includes(filter));
    const selected = JSON.parse(localStorage.getItem('selectedCategories')) || [];
    
    filtered.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'selector-btn' + (selected.includes(cat.name) ? ' selected' : '');
      btn.setAttribute('data-category', cat.name);
      
      // Add budget info to the button if available
      const catBudget = categoryBudgets[cat.name] || 0;
      let budgetInfo = '';
      if (catBudget > 0) {
        budgetInfo = ` (${catBudget} ₪)`;
      }
      
      // Use a white or color dot instead of emoji
      const dotColor = cat.name === 'שכר דירה' ? '#ffb300' : cat.color;
      
      btn.innerHTML = `<span class="cat-icon" style="color:${cat.color}"></span> ${cat.name}${budgetInfo}`;
      btn.onclick = () => {
        let sel = JSON.parse(localStorage.getItem('selectedCategories')) || [];
        if (sel.includes(cat.name)) sel = sel.filter(n => n !== cat.name);
        else sel.push(cat.name);
        localStorage.setItem('selectedCategories', JSON.stringify(sel));
        renderSelector(document.getElementById('catSearch').value.trim());
      };
      selectorDiv.appendChild(btn);
    });
  }
  renderSelector();

  // Search
  document.getElementById('catSearch').addEventListener('input', function() {
    renderSelector(this.value.trim());
  });

  // View toggles
  document.getElementById('gridViewBtn').addEventListener('click', function() {
    document.getElementById('gridViewBtn').classList.add('active');
    document.getElementById('listViewBtn').classList.remove('active');
    document.getElementById('category-charts').style.display = 'grid';
  });
  document.getElementById('listViewBtn').addEventListener('click', function() {
    document.getElementById('listViewBtn').classList.add('active');
    document.getElementById('gridViewBtn').classList.remove('active');
    document.getElementById('category-charts').style.display = 'flex';
    document.getElementById('category-charts').style.flexDirection = 'column';
  });

  // Add all charts
  document.getElementById('addChartsBtn').addEventListener('click', function() {
    const selected = JSON.parse(localStorage.getItem('selectedCategories')) || [];
    if (selected.length === 0) {
      selected.push(...categoriesList.map(c => c.name));
      localStorage.setItem('selectedCategories', JSON.stringify(selected));
      renderSelector();
    }
    renderCharts();
  });

  // Close all charts
  document.getElementById('closeChartsBtn').addEventListener('click', function() {
    localStorage.setItem('selectedCategories', JSON.stringify([]));
    renderSelector();
    renderCharts();
  });

  // Load global data (budgets and transactions)
  function loadGlobalData() {
    try {
      const budgetData = localStorage.getItem('budgetData');
      if (budgetData) {
        const data = JSON.parse(budgetData);
        totalBudget = data.maxBudget || 0;
        transactions = data.transactions || [];
        
        // Load category budgets if they exist
        categoryBudgets = data.categoryBudgets || {};
      }
      
      // Also check for category budgets directly (for backward compatibility)
      const catBudgetData = localStorage.getItem('categoryBudgets');
      if (catBudgetData) {
        try {
          const parsedBudgets = JSON.parse(catBudgetData);
          // Only use if we didn't already load from budgetData
          if (Object.keys(categoryBudgets).length === 0) {
            categoryBudgets = parsedBudgets;
          }
        } catch (e) {
          console.error('Error parsing category budgets:', e);
        }
      }
      
      // Update the budget allocation display if it exists
      updateBudgetDisplay();
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }

  // Update budget display
  function updateBudgetDisplay() {
    const totalEl = document.getElementById('totalBudgetValue');
    const allocatedEl = document.getElementById('allocatedBudgetValue');
    const unallocatedEl = document.getElementById('unallocatedBudgetValue');
    
    if (!totalEl || !allocatedEl || !unallocatedEl) return;
    
    // Calculate allocated amount
    let allocatedTotal = 0;
    for (const category in categoryBudgets) {
      allocatedTotal += categoryBudgets[category];
    }
    
    // Update display
    totalEl.textContent = `${totalBudget} ₪`;
    allocatedEl.textContent = `${allocatedTotal} ₪`;
    unallocatedEl.textContent = `${totalBudget - allocatedTotal} ₪`;
    
    // Update category budget list
    updateCategoryBudgetList();
  }

  // Update category budget list
  function updateCategoryBudgetList() {
    const container = document.getElementById('categoryBudgetList');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Create a table for categories
    const table = document.createElement('table');
    table.className = 'budget-allocation-table';
    
    // Add header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width: 35%;">קטגוריה</th>
        <th style="width: 20%;">סכום</th>
        <th style="width: 45%;">תקציב</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Add body
    const tbody = document.createElement('tbody');
    
    // Calculate spending per category from transactions
    const categorySpending = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.category) {
        categorySpending[tx.category] = (categorySpending[tx.category] || 0) + Number(tx.amount);
      }
    });
    
    categoriesList.forEach(category => {
      const budgetAmount = categoryBudgets[category.name] || 0;
      const spentAmount = categorySpending[category.name] || 0;
      
      const row = document.createElement('tr');
      
      // Calculate progress percentage and class
      let progressClass = '';
      let progressWidth = 0;
      let remainingText = '';
      
      if (budgetAmount > 0) {
        progressWidth = Math.min(100, (spentAmount / budgetAmount) * 100);
        
        if (progressWidth > 90) {
          progressClass = 'danger';
        } else if (progressWidth > 70) {
          progressClass = 'warning';
        }
        
        remainingText = `נשאר: ${budgetAmount - spentAmount} ₪`;
      }
      
      row.innerHTML = `
        <td>
          <div class="cat-budget-row">
            <div class="cat-budget-info">
              <div class="cat-name"><span style="color:${category.color}">${category.emoji}</span> ${category.name}</div>
              ${budgetAmount > 0 ? `
                <div class="budget-progress">
                  <div class="budget-progress-bar ${progressClass}" style="width: ${progressWidth}%"></div>
                </div>
                <div class="budget-remaining">${remainingText}</div>
              ` : ''}
            </div>
          </div>
        </td>
        <td>${budgetAmount} ₪</td>
        <td>
          <div class="cat-budget-input">
            <input type="number" min="0" max="${totalBudget}" value="${budgetAmount}" id="budget-${category.name}" placeholder="הקצאה">
            <button class="set-budget-btn" data-category="${category.name}">הגדר</button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Add event listeners to budget buttons
    document.querySelectorAll('.set-budget-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const category = this.getAttribute('data-category');
        const inputEl = document.getElementById(`budget-${category}`);
        const budgetValue = parseInt(inputEl.value) || 0;
        
        // Calculate allocated amount excluding this category
        let allocatedTotal = 0;
        for (const cat in categoryBudgets) {
          if (cat !== category) {
            allocatedTotal += categoryBudgets[cat];
          }
        }
        
        // Check if the new allocation would exceed the total budget
        if (allocatedTotal + budgetValue > totalBudget) {
          showToast(`החלוקה חורגת מהתקציב הכולל (${totalBudget} ₪)`);
          return;
        }
        
        // Set the budget for this category
        categoryBudgets[category] = budgetValue;
        saveData();
        updateBudgetDisplay();
        renderSelector(); // Update selector with new budget info
        showToast(`התקציב ל-${category} עודכן ל-${budgetValue} ₪`);
      });
    });
  }

  // Save data
  function saveData() {
    try {
      // Get existing budget data
      const budgetData = localStorage.getItem('budgetData');
      if (budgetData) {
        const data = JSON.parse(budgetData);
        // Update with category budgets
        data.categoryBudgets = categoryBudgets;
        localStorage.setItem('budgetData', JSON.stringify(data));
      }
      
      // Also save category budgets separately
      localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
    } catch (e) {
      console.error('Error saving data:', e);
    }
  }

  // Render category charts
  function renderCharts() {
    const container = document.getElementById('category-charts');
    const selected = JSON.parse(localStorage.getItem('selectedCategories')) || [];
    
    container.innerHTML = '';
    
    if (selected.length === 0) {
      container.innerHTML = '<p class="no-cat">לא נבחרו קטגוריות להצגה</p>';
      return;
    }
    
    selected.forEach(catName => {
      const cat = getCategory(catName);
      
      const catCard = document.createElement('div');
      catCard.className = 'cat-card';
      
      const canvasId = `chart-${catName}`;
      
      catCard.innerHTML = `
        <div class="cat-header">
          <span class="cat-icon" style="color:${cat.color}"><i class="fas ${cat.icon}"></i> ${cat.emoji}</span>
          <h3 class="cat-title">${catName}</h3>
        </div>
        <canvas id="${canvasId}"></canvas>
        <div class="cat-actions">
          <input type="number" placeholder="סכום" class="cat-amount-input">
          <input type="text" placeholder="תיאור הוצאה" class="cat-desc-input">
          <button class="addCatExpenseBtn" data-category="${catName}"><i class="fas fa-plus"></i> הוסף הוצאה</button>
        </div>
        <ul class="cat-expense-list" id="expense-list-${catName}"></ul>
      `;
      
      container.appendChild(catCard);
      
      // Filter transactions for this category
      const catTransactions = transactions.filter(t => t.category === catName && t.type === 'expense');
      
      // Get budget for this category
      const catBudget = categoryBudgets[catName] || 0;
      
      // Calculate spent amount
      const catSpent = catTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Set up chart data
      let chartData, chartOptions, chartPlugins;
      
      // Create a doughnut chart similar to index.html
      if (catBudget === 0 && catSpent === 0) {
        // No budget and no spending - show green circle
        chartData = {
          datasets: [{
            data: [1],
            backgroundColor: ['#00c851'], // Show green when empty
            borderWidth: 0
          }]
        };
      } else if (catBudget === 0) {
        // No budget but has spending - show only spending with category color
        chartData = {
          datasets: [{
            data: [catSpent],
            backgroundColor: [cat.color], // Use category color instead of gray
            borderWidth: 0
          }]
        };
        
        // Log for debugging
        console.log(`Category with no budget: ${cat.name}, Color: ${cat.color}, Spent: ${catSpent}`);
      } else {
        // Has budget - show spent and remaining similar to index.html
        // Calculate remaining amount (never negative)
        const remaining = Math.max(0, catBudget - catSpent);
        
        // Set up data arrays
        let chartDataArray = [];
        let chartColorsArray = [];
        
        // Add remaining budget if any
        if (remaining > 0) {
          chartDataArray.push(remaining);
          chartColorsArray.push('var(--accent)'); // Green for remaining budget
        }
        
        // Add spent amount if any
        if (catSpent > 0) {
          // Color for spent portion based on percentage
          let spentColor = cat.color; // יש להשתמש בצבע הקטגוריה כברירת מחדל
          const spentPercentage = catSpent / catBudget;
          
          if (spentPercentage > 0.9) {
            spentColor = '#ff4444'; // Red if over 90%
          } else if (spentPercentage > 0.7) {
            spentColor = '#ff9800'; // Orange if over 70%
          }
          // אחרת משתמשים בצבע הקטגוריה המקורי
          
          chartDataArray.push(catSpent);
          chartColorsArray.push(spentColor);
        }
        
        // If somehow both are zero, show a full green circle
        if (chartDataArray.length === 0) {
          chartDataArray = [1];
          chartColorsArray = ['#00c851'];
        }
        
        // צריך לוודא שיש בדיקת דיבוג לראות את הצבעים שנבחרו
        console.log(`Category: ${cat.name}, Color: ${cat.color}, Data: ${JSON.stringify(chartDataArray)}, Colors: ${JSON.stringify(chartColorsArray)}`);
        
        chartData = {
          datasets: [{
            data: chartDataArray,
            backgroundColor: chartColorsArray,
            borderWidth: 0
          }]
        };
      }
      
      // Center text plugin to show budget info
      const centerTextPlugin = {
        id: 'centerText',
        beforeDraw(chart) {
          const { ctx, chartArea: { width, height, left, top } } = chart;
          ctx.save();
          
          if (catBudget === 0) {
            // No budget defined - single line text
            ctx.font = 'bold 14px Assistant';
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${catSpent} ₪`, left + width/2, top + height/2);
          } else {
            // Budget defined - show remaining and total on separate lines
            const remaining = Math.max(0, catBudget - catSpent);
            
            // Remaining amount on top line
            ctx.font = 'bold 14px Assistant';
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`נשאר: ${remaining} ₪`, left + width/2, top + height/2 - 8);
            
            // Total budget on bottom line
            ctx.font = '12px Assistant';
            ctx.fillText(`מתוך ${catBudget} ₪`, left + width/2, top + height/2 + 12);
          }
          
          ctx.restore();
        }
      };
      
      // Chart options
      chartOptions = { 
        cutout: '65%', 
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        animation: { 
          duration: 1000, 
          easing: 'easeOutQuart' 
        }, 
        plugins: { 
          legend: { display: false }, 
          tooltip: { 
            enabled: true,
            titleFont: {
              size: 12
            },
            bodyFont: {
              size: 12
            },
            callbacks: {
              label: function(context) {
                return `${context.raw} ₪`;
              }
            }
          } 
        } 
      };
      
      // Create the chart
      const ctx = document.getElementById(canvasId).getContext('2d');
      new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: chartOptions,
        plugins: [centerTextPlugin]
      });
      
      // Add expense list
      const expenseListEl = document.getElementById(`expense-list-${catName}`);
      
      if (catTransactions.length === 0) {
        expenseListEl.innerHTML = '<li style="text-align:center;color:#bbb;">אין הוצאות</li>';
      } else {
        // Sort by date descending
        const sortedTx = [...catTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Take only the 3 most recent (changed from 5)
        sortedTx.slice(0, 3).forEach(tx => {
          const li = document.createElement('li');
          const date = new Date(tx.date).toLocaleDateString('he-IL');
          
          li.innerHTML = `
            <span>${tx.desc || 'ללא תיאור'}: ${tx.amount} ₪</span>
            <span>${date}</span>
          `;
          
          expenseListEl.appendChild(li);
        });
      }
      
      // Add expense handler
      catCard.querySelector('.addCatExpenseBtn').addEventListener('click', function() {
        const descInput = this.parentNode.querySelector('.cat-desc-input');
        const amountInput = this.parentNode.querySelector('.cat-amount-input');
        
        const desc = descInput.value.trim();
        const amount = Number(amountInput.value);
        
        if (amount <= 0) {
          showToast('אנא הזן סכום חוקי');
          return;
        }
        
        // Add the expense
        const now = new Date();
        const p = n => String(n).padStart(2,'0');
        const dt = `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
        
        const newTx = {
          type: 'expense',
          amount,
          desc,
          date: dt,
          category: catName
        };
        
        // Add to transactions and save
        transactions.push(newTx);
        saveTransactionData();
        
        // Clear inputs
        descInput.value = '';
        amountInput.value = '';
        
        // Show appropriate toast message
        let toastMessage = 'הוצאה נוספה!';
        
        // Check if this category has a budget and if it's exceeded
        if (categoryBudgets[catName] && categoryBudgets[catName] > 0) {
          // Calculate total spent in this category including the new expense
          const categorySpent = catSpent + amount;
          
          if (categorySpent > categoryBudgets[catName]) {
            toastMessage = `חרגת מתקציב הקטגוריה ${catName}!`;
          }
        }
        
        showToast(toastMessage);
        
        // Reload the page to refresh charts
        setTimeout(() => location.reload(), 1000);
      });
    });
  }
  
  // Save transaction data
  function saveTransactionData() {
    try {
      // Get existing budget data
      const budgetData = localStorage.getItem('budgetData');
      if (budgetData) {
        const data = JSON.parse(budgetData);
        // Update transactions
        data.transactions = transactions;
        
        // Recalculate current spent
        data.current = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        localStorage.setItem('budgetData', JSON.stringify(data));
      }
    } catch (e) {
      console.error('Error saving transaction data:', e);
    }
  }
  
  // Toast notification
  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
  
  // Initial render
  renderCharts();

  // Mobile touch improvements
  document.addEventListener('DOMContentLoaded', function() {
    // Add tap highlight for mobile
    const clickableElements = document.querySelectorAll('.selector-btn, .panel-item, .view-toggle, button');
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
    
    // Prevent zooming when tapping inputs on iOS
    const metas = document.getElementsByTagName('meta');
    for (let i = 0; i < metas.length; i++) {
      if (metas[i].name === 'viewport') {
        metas[i].content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
        break;
      }
    }
  });
  
  // Update chart-drawing for better mobile performance
  function optimizeChartsForMobile() {
    const isMobile = window.innerWidth < 600;
    if (isMobile) {
      // Reduce animation duration for mobile
      Chart.defaults.animation.duration = 500;
    }
  }
  
  window.addEventListener('resize', optimizeChartsForMobile);
  document.addEventListener('DOMContentLoaded', optimizeChartsForMobile);

  // Set total budget button
  const setMaxBtn = document.getElementById('setMaxBtn');
  if (setMaxBtn) {
    setMaxBtn.addEventListener('click', function() {
      const maxInputEl = document.getElementById('maxInput');
      const newMax = parseInt(maxInputEl.value) || 0;
      totalBudget = newMax;
      // Persist in localStorage
      const existing = JSON.parse(localStorage.getItem('budgetData')) || {};
      existing.maxBudget = totalBudget;
      existing.transactions = existing.transactions || transactions;
      existing.categoryBudgets = categoryBudgets;
      localStorage.setItem('budgetData', JSON.stringify(existing));
      // Refresh displays
      updateBudgetDisplay();
      showToast(`התקציב הכולל הוגדר ל-${totalBudget} ₪`);
    });
  }
}); 