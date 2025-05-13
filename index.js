// index.js

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
  const expenseCtx = expenseCanvas.getContext('2d');
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
      const fixedSum = fixedExpenses.reduce((sum, f) => sum + Number(f.amount), 0);
      ctx.fillText(`נשאר לך: ${maxBudget - current - fixedSum} ₪`, left + width/2, top + height/2 - 10);
      ctx.font = '16px Assistant';
      ctx.fillText(`מתוך ${maxBudget} ₪`, left + width/2, top + height/2 + 16);
      ctx.restore();
    }
  };
  const expenseChart = new Chart(expenseCtx, { type: 'doughnut', data: chartData, options: chartOptions, plugins: [centerTextPlugin] });

  // UI elements
  const transactionsList = document.getElementById('transactions');
  const categorySelect = document.getElementById('categorySelect');

  // Update functions
  function updateStatus() {
    const fixedSum = fixedExpenses.reduce((s, f) => s + Number(f.amount), 0);
    const percent = maxBudget ? (current + fixedSum) / maxBudget : 0;
    const statusClass = percent > 0.9 ? 'status-red' : (percent > 0.6 ? 'status-orange' : 'status-green');
    const statusEl = document.getElementById('statusText');
    statusEl.className = `status-budget ${statusClass}`;
    statusEl.textContent = `נשאר לך: ${maxBudget - current - fixedSum} ₪ מתוך ${maxBudget} ₪`;
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
    // Show spent (including fixed) vs remaining as two slices
    const spent = fixedExpenses.reduce((s, f) => s + Number(f.amount), 0) + current;
    const remaining = Math.max(maxBudget - spent, 0);
    const percent = maxBudget ? spent / maxBudget : 0;
    let color = '#00c851';
    if (percent > 0.9) color = '#ff4444';
    else if (percent > 0.6) color = '#ff9800';
    // show remaining first in accent, spent second in dynamic color
    expenseChart.data.datasets[0].data = [remaining, spent];
    expenseChart.data.datasets[0].backgroundColor = ['var(--accent)', color];
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
  document.getElementById('setMaxBtn').onclick = () => {
    const val = +document.getElementById('maxInput').value;
    if (val > 0) { maxBudget = val; saveData(); updateAll(); showToast('תקציב הוגדר!'); }
    else showToast('אנא הזן ערך תקציב חוקי');
  };

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

  function handleActionBtn(id, fn) {
    document.getElementById(id).onclick = fn;
    document.getElementById(id+'Dropdown').onclick = fn;
  }
  handleActionBtn('resetBtn', () => { current=0; transactions=[]; saveData(); updateAll(); });
  handleActionBtn('exportBtn', () => {
    let csv='type,desc,amount,date\n'; transactions.forEach(t=>csv+=`${t.type},${t.desc},${t.amount},${t.date}\n`);
    const blob=new Blob([csv],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='transactions.csv'; a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('setCapitalBtn').onclick = () => {
    const val = +document.getElementById('capitalInput').value;
    if (!isNaN(val) && val>=0) { capital = val; saveData(); updateCapital(); showToast('ההון התעדכן!'); }
    else showToast('אנא הזן ערך הון חוקי');
  };

  handleActionBtn('backupBtn', () => {
    const data=JSON.stringify({ maxBudget, transactions, capital, fixedExpenses });
    const blob=new Blob([data],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='budget_backup.json'; a.click(); URL.revokeObjectURL(a.href); showToast('גיבוי נוצר בהצלחה!');
  });

  handleActionBtn('restoreBtn', () => {
    const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
    inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{ try{ const d=JSON.parse(ev.target.result); if(d.maxBudget!==undefined&&Array.isArray(d.transactions)){ maxBudget=d.maxBudget; transactions=d.transactions; capital=d.capital||0; fixedExpenses=d.fixedExpenses||[]; current=transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0); saveData(); updateAll(); showToast('נתונים שוחזרו בהצלחה!'); } else showToast('פורמט קובץ לא תקין!'); }catch{ showToast('שגיאה בשחזור הנתונים!'); } }; r.readAsText(f); };
    inp.click();
  });

  // Popup menu
  const moreBtn = document.getElementById('moreBtn');
  const popupMenu = document.getElementById('popupMenu'); let popupOpen=false;
  moreBtn.onclick=e=>{ e.stopPropagation(); popupOpen?popupMenu.style.display='none':popupMenu.style.display='flex'; popupOpen=!popupOpen; };
  document.body.addEventListener('click',e=>{ if(popupOpen&&!moreBtn.contains(e.target)&&!popupMenu.contains(e.target)) popupMenu.style.display='none'; },true);
  window.addEventListener('scroll',()=>popupMenu.style.display='none',true);
  popupMenu.querySelectorAll('button').forEach(btn=>btn.onclick=()=>popupMenu.style.display='none');

  document.getElementById('addFixedExpenseForm').onsubmit=e=>{
    e.preventDefault(); const desc=document.getElementById('fixedDescInput').value.trim(); const amt=+document.getElementById('fixedAmountInput').value;
    if(desc&&amt>0){ fixedExpenses.push({desc,amount:amt}); saveData(); updateAll(); showToast('הוצאה קבועה נוספה!'); document.getElementById('fixedDescInput').value=''; document.getElementById('fixedAmountInput').value=''; } else showToast('אנא מלא תיאור וסכום תקינים');
  };

  // Initial UI update
  updateAll();
}); 