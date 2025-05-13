// script.js

// Data & storage
let maxBudget = 0, current = 0, capital = 0;
let transactions = [];
let fixedExpenses = [];

function saveData() {
  localStorage.setItem('budgetData', JSON.stringify({ maxBudget, transactions, capital, fixedExpenses }));
}

function loadData() {
  const saved = JSON.parse(localStorage.getItem('budgetData'));
  if (saved) {
    maxBudget = saved.maxBudget || 0;
    transactions = saved.transactions || [];
    fixedExpenses = saved.fixedExpenses || [];
    current = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    if (saved.capital !== undefined) capital = saved.capital;
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // Shared theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.documentElement.classList.toggle('light-theme');
      const icon = document.querySelector('#themeToggle i');
      icon.className = document.documentElement.classList.contains('light-theme') ? 'fas fa-sun' : 'fas fa-moon';
      if (document.getElementById('expenseChart')) updateAll();
    });
  }

  // INDEX PAGE
  if (document.getElementById('expenseChart')) {
    // Category icons
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

    // Setup chart
    const expenseCtx = document.getElementById('expenseChart').getContext('2d');
    const chartData = { datasets: [{ data: [0, 0], backgroundColor: ['var(--accent)', '#424242'], borderWidth: 0 }] };
    const chartOptions = { cutout: '70%', responsive: true, animation: { duration: 1200, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { enabled: true } } };
    const centerTextPlugin = {
      id: 'centerText',
      beforeDraw(chart) {
        const { ctx, chartArea: { width, height, left, top } } = chart;
        ctx.save();
        ctx.font = 'bold 22px Assistant';
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let fixedSum = fixedExpenses.reduce((s, f) => s + Number(f.amount), 0);
        ctx.fillText(`נשאר לך: ${maxBudget - current - fixedSum} ₪`, left + width / 2, top + height / 2 - 10);
        ctx.font = '16px Assistant';
        ctx.fillText(`מתוך ${maxBudget} ₪`, left + width / 2, top + height / 2 + 16);
        ctx.restore();
      }
    };
    const expenseChart = new Chart(expenseCtx, { type: 'doughnut', data: chartData, options: chartOptions, plugins: [centerTextPlugin] });

    // UI elements
    const transactionsList = document.getElementById('transactions');
    const categorySelect = document.getElementById('categorySelect');

    function updateStatusText() {
      let fixedSum = fixedExpenses.reduce((s, f) => s + Number(f.amount), 0);
      let percent = maxBudget ? (current + fixedSum) / maxBudget : 0;
      let status = percent > 0.9 ? 'status-red' : percent > 0.6 ? 'status-orange' : 'status-green';
      const statusEl = document.getElementById('statusText');
      statusEl.className = 'status-budget ' + status;
      statusEl.textContent = `נשאר לך: ${maxBudget - current - fixedSum} ₪ מתוך ${maxBudget} ₪`;
    }

    function updateCapitalText() {
      document.getElementById('capitalText').textContent = `ההון שלך הוא: ${capital} ₪`;
    }

    function updateTransactionsList() {
      transactionsList.innerHTML = '';
      transactions.slice().reverse().forEach(t => {
        const li = document.createElement('li');
        li.className = 'expense-item';
        const cat = categoryIcons[t.category] || { icon: 'fa-question', emoji: '❓', color: '#888' };
        const dt = t.date ? t.date.replace('T', ' ') : 'תאריך לא ידוע';
        li.innerHTML = `
          <span class="expense-icon" style="color:${cat.color}"><i class="fas ${cat.icon}"></i> ${cat.emoji}</span>
          <span class="expense-cat">${t.category}</span>
          <span class="expense-amount">${t.amount} ₪</span>
          <span>${t.desc}</span>
          <span class="expense-date">${dt}</span>
        `;
        transactionsList.append(li);
      });
    }

    function updateExpenseChart() {
      let fixedSum = fixedExpenses.reduce((s, f) => s + Number(f.amount), 0);
      let percent = maxBudget ? (current + fixedSum) / maxBudget : 0;
      let color = percent > 0.9 ? '#ff4444' : percent > 0.6 ? '#ff9800' : '#00c851';
      expenseChart.data.datasets[0].data = [fixedSum, current, Math.max(maxBudget - current - fixedSum, 0)];
      expenseChart.data.datasets[0].backgroundColor = ['#888', color, '#424242'];
      expenseChart.update();
    }

    function updateFixedExpensesList() {
      const ul = document.getElementById('fixedExpensesList');
      ul.innerHTML = '';
      if (!fixedExpenses.length) {
        ul.innerHTML = '<li style="color:#bbb;text-align:center;">לא הוגדרו הוצאות קבועות</li>';
        return;
      }
      fixedExpenses.forEach((f, i) => {
        const li = document.createElement('li');
        li.className = 'expense-item';
        li.innerHTML = `
          <span class="expense-icon" style="color:#888"><i class="fas fa-thumbtack"></i></span>
          <span class="expense-cat">${f.desc}</span>
          <span class="expense-amount">${f.amount} ₪</span>
          <button class="action-btn edit-fixed" style="background:#1976d2;padding:4px 10px;font-size:0.95em;">ערוך</button>
          <button class="action-btn delete-fixed" style="background:#ff4444;padding:4px 10px;font-size:0.95em;">מחק</button>
        `;
        li.querySelector('.edit-fixed').onclick = () => {
          const newDesc = prompt('ערוך תיאור:', f.desc);
          const newAmount = +prompt('ערוך סכום:', f.amount);
          if (newDesc && newAmount > 0) {
            f.desc = newDesc;
            f.amount = newAmount;
            saveData();
            updateAll();
            showToast('עודכן!');
          }
        };
        li.querySelector('.delete-fixed').onclick = () => {
          if (confirm('למחוק הוצאה קבועה זו?')) {
            fixedExpenses.splice(i, 1);
            saveData();
            updateAll();
            showToast('נמחק!');
          }
        };
        ul.appendChild(li);
      });
    }

    function updateAll() {
      updateStatusText();
      updateCapitalText();
      updateExpenseChart();
      updateTransactionsList();
      updateFixedExpensesList();
    }

    // Events
    document.getElementById('setMaxBtn').addEventListener('click', () => {
      const val = +document.getElementById('maxInput').value;
      if (val > 0) { maxBudget = val; saveData(); updateAll(); showToast('תקציב הוגדר!'); }
      else showToast('אנא הזן ערך תקציב חוקי');
    });

    document.getElementById('addExpenseBtn').addEventListener('click', () => {
      const desc = document.getElementById('expenseDescInput').value.trim();
      const category = categorySelect.value;
      const val = +document.getElementById('expenseInput').value;
      if (desc && val > 0) {
        const now = new Date(); const pad = n => String(n).padStart(2, '0');
        const dateTime = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        transactions.push({ type: 'expense', amount: val, desc, date: dateTime, category });
        current += val;
        saveData(); updateAll(); showToast(current > maxBudget ? 'חרגת מהתקציב!' : 'הוצאה נוספה!');
        document.getElementById('expenseDescInput').value = '';
        document.getElementById('expenseInput').value = '';
      } else showToast('אנא מלא תיאור וסכום');
    });

    function handleActionBtn(id, fn) {
      document.getElementById(id).addEventListener('click', fn);
      document.getElementById(id.replace(/Btn$/, 'Dropdown')).addEventListener('click', fn);
    }
    handleActionBtn('resetBtn', () => { current = 0; transactions = []; saveData(); updateAll(); });
    handleActionBtn('exportBtn', () => {
      let csv = 'type,desc,amount,date\n';
      transactions.forEach(t => csv += `${t.type},${t.desc},${t.amount},${t.date}\n`);
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'transactions.csv'; a.click();
      URL.revokeObjectURL(a.href);
    });

    document.getElementById('setCapitalBtn').addEventListener('click', () => {
      const val = +document.getElementById('capitalInput').value;
      if (!isNaN(val) && val >= 0) { capital = val; saveData(); updateCapitalText(); showToast('ההון התעדכן!'); }
      else showToast('אנא הזן ערך הון חוקי');
    });

    handleActionBtn('backupBtn', () => {
      const data = JSON.stringify({ maxBudget, transactions, capital, fixedExpenses });
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'budget_backup.json'; a.click();
      URL.revokeObjectURL(a.href); showToast('גיבוי נוצר בהצלחה!');
    });

    handleActionBtn('restoreBtn', () => {
      const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
      input.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const d = JSON.parse(ev.target.result);
            if (d && d.maxBudget !== undefined && Array.isArray(d.transactions)) {
              maxBudget = d.maxBudget; transactions = d.transactions; capital = d.capital || 0; fixedExpenses = d.fixedExpenses || [];
              current = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
              saveData(); updateAll(); showToast('נתונים שוחזרו בהצלחה!');
            } else showToast('פורמט קובץ לא תקין!');
          } catch { showToast('שגיאה בשחזור הנתונים!'); }
        };
        reader.readAsText(file);
      };
      input.click();
    });

    // More popup options
    const moreBtn = document.getElementById('moreBtn');
    const popupMenu = document.getElementById('popupMenu'); let popupOpen = false;
    const openPopup = () => { popupMenu.style.display = 'flex'; popupOpen = true; };
    const closePopup = () => { popupMenu.style.display = 'none'; popupOpen = false; };
    moreBtn.onclick = e => { e.stopPropagation(); popupOpen ? closePopup() : openPopup(); };
    document.body.addEventListener('click', e => { if (popupOpen && !moreBtn.contains(e.target) && !popupMenu.contains(e.target)) closePopup(); }, true);
    window.addEventListener('scroll', closePopup, true);
    popupMenu.querySelectorAll('button').forEach(btn => btn.onclick = closePopup);

    function handlePopupBtn(id, fn) { document.getElementById(id).addEventListener('click', fn); }
    handlePopupBtn('resetBtnPopup', () => { current = 0; transactions = []; saveData(); updateAll(); });
    handlePopupBtn('exportBtnPopup', () => {
      let csv = 'type,desc,amount,date\n'; transactions.forEach(t => csv += `${t.type},${t.desc},${t.amount},${t.date}\n`);
      const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'transactions.csv'; a.click(); URL.revokeObjectURL(a.href);
    });
    handlePopupBtn('backupBtnPopup', () => {
      const d = JSON.stringify({ maxBudget, transactions, capital, fixedExpenses });
      const blob = new Blob([d], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'budget_backup.json'; a.click(); URL.revokeObjectURL(a.href); showToast('גיבוי נוצר בהצלחה!');
    });
    handlePopupBtn('restoreBtnPopup', () => {
      const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
      input.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader(); reader.onload = ev => {
          try {
            const d = JSON.parse(ev.target.result);
            if (d && d.maxBudget !== undefined && Array.isArray(d.transactions)) {
              maxBudget = d.maxBudget; transactions = d.transactions; capital = d.capital || 0; fixedExpenses = d.fixedExpenses || [];
              current = transactions.filter(t => t.type==='expense').reduce((s,t)=>s+t.amount,0);
              saveData(); updateAll(); showToast('נתונים שוחזרו בהצלחה!');
            } else showToast('פורמט קובץ לא תקין!');
          } catch { showToast('שגיאה בשחזור הנתונים!'); }
        };
        reader.readAsText(file);
      };
      input.click();
    });

    document.getElementById('addFixedExpenseForm').addEventListener('submit', e => {
      e.preventDefault(); const desc = document.getElementById('fixedDescInput').value.trim(); const amount = +document.getElementById('fixedAmountInput').value;
      if (desc && amount > 0) { fixedExpenses.push({ desc, amount }); saveData(); updateAll(); showToast('הוצאה קבועה נוספה!'); document.getElementById('fixedDescInput').value=''; document.getElementById('fixedAmountInput').value=''; }
      else showToast('אנא מלא תיאור וסכום תקינים');
    });

    // Initialize UI
    updateAll();
  }

  // CATEGORIES PAGE
  if (document.getElementById('categorySelector')) {
    const categories = [
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

    function getCategoryByName(name) {
      return categories.find(c => c.name === name) || { color: '#888', icon: 'fa-question', emoji: '❓' };
    }

    const selDiv = document.getElementById('categorySelector');
    function renderSelector(filter = '') {
      selDiv.innerHTML = '';
      const savedCats = JSON.parse(localStorage.getItem('selectedCategories')) || [];
      categories.filter(cat => cat.name.includes(filter)).forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'selector-btn' + (savedCats.includes(cat.name) ? ' selected' : '');
        btn.innerHTML = `<span class="cat-icon">${cat.emoji}</span> ${cat.name}`;
        btn.onclick = () => {
          let selected = JSON.parse(localStorage.getItem('selectedCategories')) || [];
          if (selected.includes(cat.name)) selected = selected.filter(c => c !== cat.name);
          else selected.push(cat.name);
          localStorage.setItem('selectedCategories', JSON.stringify(selected));
          renderSelector(document.getElementById('catSearch').value.trim());
        };
        selDiv.appendChild(btn);
      });
    }
    renderSelector();

    document.getElementById('catSearch').addEventListener('input', e => {
      renderSelector(e.target.value.trim());
    });

    let selectedView = 'grid';
    document.getElementById('gridViewBtn').addEventListener('click', () => {
      selectedView = 'grid';
      document.getElementById('category-charts').style.display = 'grid';
      document.geophpquerySelector('#gridViewBtn').classList.add('active');
      document.getElementById('listViewBtn').classList.remove('active');
    });

    document.getElementById('listViewBtn').addEventListener('click', () => {
      selectedView = 'list';
      document.getElementById('category-charts').style.display = 'flex'; document.getElementById('category-charts').style.flexDirection = 'column';
      document.getElementById('gridViewBtn').classList.remove('active');
      document.getElementById('listViewBtn').classList.add('active');
    });

    function renderCharts() {
      const checked = JSON.parse(localStorage. getItem('selected categories')) || [];
      const container = document.getElementById('category-charts');
      container.innerHTML = '';
      if (!checked.length) {
        container.innerHTML = '<p class="no-cat">לא נוספו עדיין קטגוריות - נא להוסיף :)</p>';
        return;
      }
      const expenses = transactions.filter(t => t.type === 'expense');
      checked.forEach((catName, idx) => {
        const cat = getCategoryByName(catName);
        const sum = expenses.filter(t => t.category === catName).reduce((s, t) => s + t.amount, 0);
        let percent = maxBudget ? sum / maxBudget : 0;
        let bg = `linear-gradient(135deg, ${cat.color}22 0%, var(--card-bg) 100%)`;
        if (percent > 1) bg = `linear-gradient(135deg, #ff4444 0%, var(--card-bg) 100%)`;
        else if (percent > 0.8) bg = `linear-gradient(135deg, #ff9800 0%, var(--card-bg) 100%)`;
        else if (percent > 0.5) bg = `linear-gradient(135deg, #00c851 0%, var(--card-bg) 100%)`;
        const card = document.createElement('div'); card.className = 'cat-card'; card.style.background = bg;
        card.innerHTML = `
          <div class="cat-header">
            <span class="cat-icon"><i class="fas ${cat.icon}"></i> ${cat.emoji}</span>
            <span class="cat-title">${catName}</span>
          </div>
          <canvas id="catChart${idx}"></canvas>
          <div class="cat-actions">
            <input type="text" id="descInput${idx}" placeholder="תיאור הוצאה">
            <input type="number" id="amountInput${idx}" placeholder="סכום" min="0">
            <button class="addCatExpenseBtn" data-cat="${catName}" data-idx="${idx}"><i class="fas fa-plus"></i> הוסף הוצאה</button>
          </div>
          <ul class="cat-expense-list" id="expenseList${idx}"></ul>
        `;
        container.appendChild(card);
        const ctx = card.querySelector('canvas').getContext('2d');
        new Chart(ctx, {
          type: 'doughnut', data: { datasets: [{ data: [sum, Math.max(maxBudget - sum, 0)], backgroundColor: [cat.color, '#424242'], borderWidth: 0 }] },
          options: { cutout:'70%', responsive:true, animation:{duration:1200}, plugins:{legend:{display:false}, tooltip:{enabled:false}} },
          plugins: [{ id:'centerText', beforeDraw(chart) {
            const { ctx, chartArea:{width,height,left,top} } = chart;
            ctx.save(); ctx.font='bold 16px Assistant'; ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text'); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(`${sum}/${maxBudget}`, left+width/2, top+height/2); ctx.restore();
          }}]
        });
        const ul = card.querySelector(`#expenseList${idx}`);
        const catExpenses = expenses.filter(t => t.category === catName);
        catExpenses.slice(-5).reverse().forEach(exp => {
          const li = document.createElement('li');
          li.innerHTML = `
            <span>${exp.desc} <span style="color:#bbb;font-size:0.93em;">(${exp.amount}₪)</span></span>
            <span class="expense-actions">
              <button class="edit" title="ערוך"><i class="fas fa-pen"></i></button>
              <button class="delete" title="מחק"><i class="fas fa-trash"></i></button>
            </span>
          `;
          li.querySelector('.edit').onclick = () => {
            const newDesc = prompt('ערוך תיאור:', exp.desc);
            const newAmount = +prompt('ערוך סכום:', exp.amount);
            if(newDesc && newAmount>0) {
              exp.desc = newDesc; exp.amount = newAmount;
              saveData(); renderCharts(); showToast('הוצאה עודכנה!');
            }
          };
          li.querySelector('.delete').onclick = () => {
            if(confirm('למחוק הוצאה זו?')) {
              const i = transactions.indexOf(exp); if(i>-1) transactions.splice(i,1);
              saveData(); renderCharts(); showToast('הוצאה נמחקה!');
            }
          };
          ul.appendChild(li);
        });
        card.querySelector('.addCatExpenseBtn').onclick = e => {
          const idxA = e.currentTarget.dataset.idx;
          const catA = e.currentTarget.dataset.cat;
          const desc = document.getElementById(`descInput${idxA}`).value.trim();
          const amount = +document.getElementById(`amountInput${idxA}`).value;
          if(desc && amount>0) {
            const dateTime = new Date().toISOString().slice(0,16);
            transactions.push({ type:'expense', amount, desc, date: dateTime, category: catA });
            saveData(); renderCharts(); showToast('הוצאה נוספה!');
          } else showToast('אנא מלא תיאור וסכום תקינים');
        };
      });
      if(selectedView==='list') { container.style.display='flex'; container.style.flexDirection='column'; }
      else { container.style.display='grid'; container.style.gridTemplateColumns='repeat(auto-fit,minmax(220px,1fr))'; }
    }
    document.getElementById('addChartsBtn').onclick = renderCharts;
    document.getElementById('closeChartsBtn').onclick = () => { localStorage.removeItem('selectedCategories'); renderSelector(document.getElementById('catSearch').value.trim()); document.getElementById('category-charts').innerHTML = '<p class="no-cat">לא נוספו עדיין קטגוריות - נא להוסיף :)</p>'; };
    const savedCats = JSON.parse(localStorage.getItem('selectedCategories')) || [];
    if (savedCats.length) renderCharts();
  }
}); 