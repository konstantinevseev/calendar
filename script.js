if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log('Service Worker зарегистрирован'))
    .catch((err) => console.log('Ошибка регистрации SW:', err));
}
let anchorDate = localStorage.getItem('anchorDate');
let customShifts = JSON.parse(localStorage.getItem('customShifts')) || {};
let viewDate = new Date(); 
viewDate.setDate(1);

let swapViewDate = new Date(); 
let setupDays = [];
let activeDate = null;
let dayToSwap = null;

function init() {
    if (!anchorDate) {
        document.getElementById('setupModal').style.display = 'flex';
        renderSetupGrid();
    } else {
        renderCalendar();
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('monthTitle');
    const statusCard = document.getElementById('todayStatus');
    grid.innerHTML = '';

    const monthName = viewDate.toLocaleString('ru', { month: 'long', year: 'numeric' });
    title.innerText = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    let offset = (firstDay.getDay() + 6) % 7; 

    for (let i = 0; i < offset; i++) grid.innerHTML += '<div class="empty"></div>';

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    
    // Получаем текущую дату для точного сравнения
    const now = new Date();
    const tDay = now.getDate();
    const tMonth = now.getMonth();
    const tYear = now.getFullYear();

    for (let day = 1; day <= daysInMonth; day++) {
        const current = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const dateKey = current.toISOString().split('T')[0];

        // Логика расчета 2/2
        const diffDays = Math.floor((current - new Date(anchorDate)) / (1000 * 60 * 60 * 24));
        const cycleDay = ((diffDays % 4) + 4) % 4;
        
        const status = customShifts[dateKey] || (cycleDay < 2 ? 'work' : 'rest');

        const dayEl = document.createElement('div');
        dayEl.className = `day ${status}`;
        
        // Исправленное условие выделения текущего дня
        if (day === tDay && viewDate.getMonth() === tMonth && viewDate.getFullYear() === tYear) {
            dayEl.classList.add('today');
        }

        dayEl.innerText = day;
        dayEl.onclick = () => openDayMenu(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
        grid.appendChild(dayEl);
    }
    updateTodayStatus(statusCard);
}

function updateTodayStatus(card) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dateKey = today.toISOString().split('T')[0];
    const diffDays = Math.floor((today - new Date(anchorDate)) / (1000 * 60 * 60 * 24));
    const cycleDay = ((diffDays % 4) + 4) % 4;
    const status = customShifts[dateKey] || (cycleDay < 2 ? 'work' : 'rest');
    
    const messages = { 'work': 'Сегодня РАБОТА 🛠️', 'rest': 'Сегодня ОТДЫХ 🌿', 'shift': 'Сегодня ЗАМЕНА 🔃' };
    card.innerText = messages[status];
    card.className = `status-card status-${status}`;
}

function openDayMenu(date) {
    activeDate = date;
    document.getElementById('selectedDayTitle').innerText = date.toLocaleDateString('ru');
    document.getElementById('dayActionModal').style.display = 'flex';
}

function setDayStatus(status) {
    customShifts[activeDate.toISOString().split('T')[0]] = status;
    saveAndRefresh();
}

function openSwapDialog() {
    dayToSwap = activeDate;
    swapViewDate = new Date(viewDate);
    document.getElementById('dayActionModal').style.display = 'none';
    document.getElementById('swapModal').style.display = 'flex';
    fillSwapMonthSelect();
    renderSwapGrid();
}

function fillSwapMonthSelect() {
    const select = document.getElementById('swapMonthSelect');
    select.innerHTML = '';
    const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    months.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = name;
        if (i === swapViewDate.getMonth()) opt.selected = true;
        select.appendChild(opt);
    });
    select.onchange = (e) => {
        swapViewDate.setMonth(e.target.value);
        renderSwapGrid();
    };
}

function renderSwapGrid() {
    const grid = document.getElementById('swapGrid');
    grid.innerHTML = '';
    const days = new Date(swapViewDate.getFullYear(), swapViewDate.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= days; i++) {
        const btn = document.createElement('div');
        btn.className = 'day rest';
        btn.innerText = i;
        btn.onclick = () => {
            const swapDate = new Date(swapViewDate.getFullYear(), swapViewDate.getMonth(), i);
            customShifts[dayToSwap.toISOString().split('T')[0]] = 'rest';
            customShifts[swapDate.toISOString().split('T')[0]] = 'shift';
            saveAndRefresh();
        };
        grid.appendChild(btn);
    }
}

function renderSetupGrid() {
    const grid = document.getElementById('setupGrid');
    grid.innerHTML = '';
    const days = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= days; i++) {
        const btn = document.createElement('div');
        btn.className = 'day rest';
        btn.innerText = i;
        btn.onclick = () => {
            if (setupDays.includes(i)) setupDays = setupDays.filter(d => d !== i);
            else if (setupDays.length < 2) setupDays.push(i);
            renderSetupGrid();
            document.getElementById('saveSetup').disabled = setupDays.length !== 2;
        };
        if (setupDays.includes(i)) btn.classList.add('selected-setup');
        grid.appendChild(btn);
    }
}

document.getElementById('saveSetup').onclick = () => {
    setupDays.sort((a,b) => a-b);
    anchorDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), setupDays[0]).toISOString();
    localStorage.setItem('anchorDate', anchorDate);
    document.getElementById('setupModal').style.display = 'none';
    renderCalendar();
};

function saveAndRefresh() {
    localStorage.setItem('customShifts', JSON.stringify(customShifts));
    closeModals();
    renderCalendar();
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

document.getElementById('prevMonth').onclick = () => { viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); };
document.getElementById('nextMonth').onclick = () => { viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); };


init();
