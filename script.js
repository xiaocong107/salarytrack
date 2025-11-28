let workLogs = JSON.parse(localStorage.getItem('workLogs')) || [];
let monthlySummaryRecords = JSON.parse(localStorage.getItem('monthlySummaryRecords')) || []; 
let globalSelectedDate = null; 

// 頁面載入時執行初始化
window.onload = function() {
    const now = new Date();
    
    // 1. 初始化時薪和扣款金額
    document.getElementById('hourlyRate').value = localStorage.getItem('hourlyRate') || '183';
    document.getElementById('insuranceDeduction').value = localStorage.getItem('insuranceDeduction') || '1000';

    // 2. 設定月份追蹤器
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('monthTracker').value = currentMonth;
    
    // 3. 綁定設定變動事件 
    document.getElementById('hourlyRate').addEventListener('change', function() {
        localStorage.setItem('hourlyRate', this.value);
        renderAll();
    });
    
    document.getElementById('insuranceDeduction').addEventListener('change', function() { 
        localStorage.setItem('insuranceDeduction', this.value);
        renderAll();
    });

    // 4. 初始化拉桿顯示
    updateTimeDisplay(); 
    renderAll();
    
    // 5. 初始顯示設定
    document.getElementById('editPanel').style.display = 'none';
    showPage('calendarPage', true); 
};

/**
 * 頁面切換邏輯 (修復版)
 */
function showPage(pageId, initialLoad = false) {
    const pages = ['calendarPage', 'settingsPage', 'historyPage'];
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    
    // 隱藏所有頁面內容
    pages.forEach(id => {
        const page = document.getElementById(id);
        if (page) {
            page.style.display = 'none';
        }
    });
    // 隱藏編輯面板
    document.getElementById('editPanel').style.display = 'none';

    // 顯示選定頁面
    document.getElementById(pageId).style.display = 'block';
    
    // 僅在日曆頁面顯示頂部總結
    document.getElementById('mainHeader').style.display = (pageId === 'calendarPage') ? 'block' : 'none';

    // 更新導航列 active 狀態
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector(`#nav-${pageId.replace('Page', '')}`).classList.add('active');
    
    // 如果切換到歷史頁面，則渲染清單
    if (pageId === 'historyPage') {
        renderHistoryPage();
    }
}


// ------------------------------------------------------------------
// 歷史紀錄功能
// ------------------------------------------------------------------

/**
 * 儲存本月結算總結為歷史紀錄
 */
function saveCurrentMonthSummary() {
    // 獲取當前月份的計算結果（不需要重新計算，直接讀取顯示值）
    const month = document.getElementById('monthTracker').value;
    const totalHours = parseFloat(document.getElementById('totalHoursDisplay').textContent.replace('h', '')) || 0;
    const totalSalary = parseFloat(document.getElementById('totalSalaryDisplay').textContent.replace('元', '')) || 0;
    const netSalary = parseFloat(document.getElementById('netSalaryDisplay').textContent.replace('元', '')) || 0;
    
    // 讀取扣款金額（直接從輸入框讀取）
    const deduction = parseFloat(document.getElementById('insuranceDeduction').value) || 0;

    if (totalSalary === 0) {
        alert("本月無收入，無需儲存結算紀錄。");
        return;
    }

    const record = {
        month: month,
        hours: totalHours,
        gross: totalSalary,
        deduction: deduction,
        net: netSalary,
        dateSaved: new Date().toLocaleDateString('zh-TW')
    };

    const existingIndex = monthlySummaryRecords.findIndex(r => r.month === month);
    if (existingIndex !== -1) {
        monthlySummaryRecords[existingIndex] = record;
        alert(`${month} 結算紀錄已更新！`);
    } else {
        monthlySummaryRecords.push(record);
        monthlySummaryRecords.sort((a, b) => (a.month < b.month) ? 1 : -1);
        alert(`${month} 結算紀錄已儲存！`);
    }

    localStorage.setItem('monthlySummaryRecords', JSON.stringify(monthlySummaryRecords));
}

/**
 * 渲染歷史紀錄清單頁面
 */
function renderHistoryPage() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';

    if (monthlySummaryRecords.length === 0) {
        list.innerHTML = '<li class="no-record">尚無歷史結算紀錄。</li>';
        return;
    }

    monthlySummaryRecords.forEach((record) => {
        const listItem = document.createElement('li');
        listItem.className = 'history-item';
        listItem.innerHTML = `
            <div class="history-header">
                <strong>${record.month} 總結</strong>
                <span class="history-date">儲存於: ${record.dateSaved}</span>
            </div>
            <div class="history-details">
                <span>工時: ${record.hours.toFixed(1)}h</span>
                <span>應領: NT$ ${record.gross.toFixed(0)}</span>
                <span class="history-net-salary">實拿: NT$ ${record.net.toFixed(0)}</span>
            </div>
        `;
        list.appendChild(listItem);
    });
}

/**
 * 清除所有歷史紀錄
 */
function clearAllHistory() {
    if (confirm("警告：確定要清除所有歷史結算紀錄嗎？此操作不可逆轉！")) {
        monthlySummaryRecords = [];
        localStorage.removeItem('monthlySummaryRecords');
        renderHistoryPage();
        alert("歷史結算紀錄已清除。");
    }
}


// ------------------------------------------------------------------
// 核心計算與日曆邏輯
// ------------------------------------------------------------------

/**
 * 實時更新工時拉桿旁的數字顯示
 */
function updateTimeDisplay() {
    const hours = document.getElementById('workHoursSlider').value;
    const minutes = String(document.getElementById('workMinutesSlider').value).padStart(2, '0');
    
    document.getElementById('workHoursValue').textContent = hours;
    document.getElementById('workMinutesValue').textContent = minutes;
}


/**
 * 核心渲染函數：處理篩選、渲染日曆和總結。
 */
function renderAll() {
    const selectedMonth = document.getElementById('monthTracker').value;
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const dateTitle = `${year}年
