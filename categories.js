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

  function getCategory(name) {
    return categoriesList.find(c => c.name === name) || { icon: 'fa-question', emoji: '❓', color: '#888' };
  }

  // Load persisted data and selections
  loadData();
  const savedSelections = JSON.parse(localStorage.getItem('selectedCategories')) || [];

  // Render category selector
  function renderSelector(filter = '') {
    selectorDiv.innerHTML = '';
    const filtered = categoriesList.filter(cat => cat.name.includes(filter));
    const selected = JSON.parse(localStorage.getItem('selectedCategories')) || [];
    filtered.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'selector-btn' + (selected.includes(cat.name) ? ' selected' : '');
      btn.innerHTML = `<span class="cat-icon">${cat.emoji}</span> ${cat.name}`;
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
  document.getElementById('catSearch').addEventListener('input', e => renderSelector(e.target.value.trim()));

  // View toggles
  let view = 'grid';
  document.getElementById('gridViewBtn').onclick = () => {
    view = 'grid';
    document.getElementById('category-charts').style.display = 'grid';
    document.getElementById('gridViewBtn').classList.add('active');
    document.getElementById('listViewBtn').classList.remove('active');
  };
  document.getElementById('listViewBtn').onclick = () => {
    view = 'list';
    const container = document.getElementById('category-charts');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    document.getElementById('gridViewBtn').classList.remove('active');
    document.getElementById('listViewBtn').classList.add('active');
  };

  // Render charts
  function renderCharts() {
    const sel = JSON.parse(localStorage.getItem('selectedCategories')) || [];
    const container = document.getElementById('category-charts');
    container.innerHTML = '';
    if (!sel.length) {
      container.innerHTML = '<p class="no-cat">לא נוספו עדיין קטגוריות - נא להוסיף :)</p>';
      return;
    }
    const expenses = transactions.filter(t => t.type === 'expense');
    sel.forEach((name, idx) => {
      const cat = getCategory(name);
      const sum = expenses.filter(t => t.category === name).reduce((s, t) => s + t.amount, 0);
      let percent = maxBudget ? sum / maxBudget : 0;
      let bg = `linear-gradient(135deg, ${cat.color}22 0%, var(--card-bg) 100%)`;
      if (percent > 1) bg = `linear-gradient(135deg, #ff4444 0%, var(--card-bg) 100%)`;
      else if (percent > 0.8) bg = `linear-gradient(135deg, #ff9800 0%, var(--card-bg) 100%)`;
      else if (percent > 0.5) bg = `linear-gradient(135deg, #00c851 0%, var(--card-bg) 100%)`;

      const card = document.createElement('div');
      card.className = 'cat-card'; card.style.background = bg;
      card.innerHTML = `
        <div class="cat-header">
          <span class="cat-icon"><i class="fas ${cat.icon}"></i> ${cat.emoji}</span>
          <span class="cat-title">${name}</span>
        </div>
        <canvas id="catChart${idx}"></canvas>
        <div class="cat-actions">
          <input type="text" id="descInput${idx}" placeholder="תיאור הוצאה">
          <input type="number" id="amountInput${idx}" placeholder="סכום" min="0">
          <button class="addCatExpenseBtn" data-cat="${name}" data-idx="${idx}"><i class="fas fa-plus"></i> הוסף הוצאה</button>
        </div>
        <ul class="cat-expense-list" id="expenseList${idx}"></ul>
      `;
      container.appendChild(card);

      // Doughnut chart
      const ctx = card.querySelector('canvas').getContext('2d');
      new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [sum, Math.max(maxBudget - sum, 0)], backgroundColor: [cat.color, '#424242'], borderWidth: 0 }] },
        options: { cutout:'70%', responsive:true, animation:{duration:1200}, plugins:{legend:{display:false}, tooltip:{enabled:false}} },
        plugins: [{ id:'centerText', beforeDraw(chart) {
          const { ctx, chartArea:{width,height,left,top} } = chart;
          ctx.save(); ctx.font='bold 16px Assistant'; ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text'); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(`${sum}/${maxBudget}`, left+width/2, top+height/2); ctx.restore();
        }}]
      });

      // Expense list
      const ul = document.getElementById(`expenseList${idx}`);
      const catExps = expenses.filter(t => t.category === name);
      catExps.slice(-5).reverse().forEach(exp => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span>${exp.desc} <span style="color:#bbb;font-size:0.93em;">(${exp.amount}₪)</span></span>
          <span class="expense-actions">
            <button class="edit" title="ערוך"><i class="fas fa-pen"></i></button>
            <button class="delete" title="מחק"><i class="fas fa-trash"></i></button>
          </span>
        `;
        li.querySelector('.edit').onclick = () => {
          const nd = prompt('ערוך תיאור:', exp.desc);
          const na = +prompt('ערוך סכום:', exp.amount);
          if (nd && na > 0) {
            exp.desc = nd; exp.amount = na;
            saveData(); renderCharts(); showToast('הוצאה עודכנה!');
          }
        };
        li.querySelector('.delete').onclick = () => {
          if (confirm('למחוק הוצאה זו?')) {
            const i = transactions.indexOf(exp);
            if (i > -1) transactions.splice(i, 1);
            saveData(); renderCharts(); showToast('הוצאה נמחקה!');
          }
        };
        ul.appendChild(li);
      });

      // Add new expense
      card.querySelector('.addCatExpenseBtn').onclick = e => {
        const idxA = e.currentTarget.dataset.idx;
        const catName = e.currentTarget.dataset.cat;
        const d = document.getElementById(`descInput${idxA}`).value.trim();
        const a = +document.getElementById(`amountInput${idxA}`).value;
        if (d && a > 0) {
          const dt = new Date().toISOString().slice(0,16);
          transactions.push({ type:'expense', amount:a, desc:d, date:dt, category:catName });
          saveData(); renderCharts(); showToast('הוצאה נוספה!');
        } else showToast('אנא מלא תיאור וסכום תקינים');
      };
    });

    // Apply view layout
    const cont = document.getElementById('category-charts');
    if (view === 'list') cont.style.display = 'flex';
    else cont.style.display = 'grid';
  }

  // Attach buttons
  document.getElementById('addChartsBtn').onclick = renderCharts;
  document.getElementById('closeChartsBtn').onclick = () => {
    localStorage.removeItem('selectedCategories'); renderSelector(document.getElementById('catSearch').value.trim());
    document.getElementById('category-charts').innerHTML = '<p class="no-cat">לא נוספו עדיין קטגוריות - נא להוסיף :)</p>';
  };

  // Initial render
  if (savedSelections.length) renderCharts();
}); 