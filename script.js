let workLogs = JSON.parse(localStorage.getItem('workLogs')) || [];
let monthlyRecords = JSON.parse(localStorage.getItem('monthlyRecords')) || [];

// 頁面載入時執行初始化
window.onload = function() {
    const now = new Date();
    
    // 1. 自動載入時薪與預設日期
    const storedRate = localStorage.getItem('hourlyRate');
    if (storedRate) {
        document.getElementById('hourlyRate').value = storedRate;
    }
    const today = now.toISOString().split('T')[0];
    document.getElementById('logDate').value = today;

    // 2. 設定月份篩選器
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('monthFilter').value = currentMonth;
    
    // 3. 監聽與綁定事件
    document.getElementById('hourlyRate').addEventListener('change', function() {
        localStorage.setItem('hourlyRate', this.value);
        renderAll();
    });
    document.getElementById('monthFilter').addEventListener('change', renderAll); 
    
    document.getElementById('labourInsurance').addEventListener('change', function() {
        localStorage.setItem('labourInsurance', this.value);
        calculateNetSalary();
    });
    document.getElementById('healthInsurance').addEventListener('change', function() {
        localStorage.setItem('healthInsurance', this.value);
        calculateNetSalary();
    });
    
    // 載入儲存的扣除額
    document.getElementById('labourInsurance').value = localStorage.getItem('labourInsurance') || '0';
    document.getElementById('healthInsurance').value = localStorage.getItem('healthInsurance') || '0';

    // 監聽拉桿，實時更新顯示
    document.getElementById('workHoursSlider').addEventListener('input', updateTimeDisplay);
    document.getElementById('workMinutesSlider').addEventListener('input', updateTimeDisplay);
    updateTimeDisplay(); // 初始載入時顯示一次

    renderAll();
};

/**
 * 實時更新工時拉桿旁的數字顯示 (c04)
 */
function updateTimeDisplay() {
    const hours = document.getElementById('workHoursSlider').value;
    const minutes = String(document.getElementById('workMinutesSlider').value).padStart(2, '0');
    
    document.getElementById('workHoursValue').textContent = hours;
    document.getElementById('workMinutesValue').textContent = minutes;
}

/**
 * 核心渲染函數：處理篩選、渲染清單和日曆。
 */
function renderAll() {
    const selectedMonth = document.getElementById('monthFilter').value;
    if (!selectedMonth) return;

    const [year, month] = selectedMonth.split('-').map(Number);

    const filteredLogs = workLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate.getFullYear() === year && (logDate.getMonth() + 1) === month;
    });

    renderLogs(filteredLogs);      
    updateSummary(filteredLogs);   
    renderCalendar(year, month, filteredLogs); 
    calculateNetSalary(); 
    renderMonthlyRecords(); 
    saveLogs();
}

/**
 * 處理月份切換的邏輯。
 */
function changeMonth(delta) {
    const monthFilterInput = document.getElementById('monthFilter');
    const currentMonthValue = monthFilterInput.value; 

    const [year, month] = currentMonthValue.split('-').map(Number);
    const date = new Date(year, month - 1, 1); 

    date.setMonth(date.getMonth() + delta);

    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    
    const newMonthValue = `${newYear}-${newMonth}`;

    monthFilterInput.value = newMonthValue;
    renderAll();
}

/**
 * 新增工時紀錄 (使用拉桿數據) (c04)
 */
function addSliderLog() {
    const hourlyRate = parseFloat(document.getElementById('hourlyRate').value) || 0;
    const logDate = document.getElementById('logDate').value;
    const workHours = parseFloat(document.getElementById('workHoursSlider').value) || 0;
    const workMinutes = parseFloat(document.getElementById('workMinutesSlider').value) || 0;
    
    if (!hourlyRate || !logDate) {
        alert("請確保時薪和日期都已填寫。");
        return;
    }
    if (workHours === 0 && workMinutes === 0) {
        alert("請設定工時！");
        return;
    }

    // 將總分鐘數轉換為總小時數
    const totalHours = workHours + (workMinutes / 60.0);
    const calculatedSalary = totalHours * hourlyRate;

    const newLog = {
        date: logDate,
        type: '工時',
        // 移除 startTime, endTime, breakMinutes
        totalHours: totalHours,
        salary: calculatedSalary,
        // 新增顯示用的工時資訊 (c04)
        workHoursDisplay: `${workHours} 小時 ${workMinutes} 分`
    };

    workLogs.push(newLog);
    renderAll();
}

function addLeave(type) {
    const logDate = document.getElementById('logDate').value;
    if (!logDate) {
        alert("請輸入請假/排休的日期。");
        return;
    }

    const newLog = {
        date: logDate,
        type: type, 
        totalHours: 0,
        salary: 0
    };

    const existingIndex = workLogs.findIndex(log => log.date === logDate && (log.type === '排休' || log.type === '請假'));
    if (existingIndex !== -1) {
        workLogs[existingIndex] = newLog;
    } else {
        workLogs.push(newLog);
    }
    
    renderAll();
}

/**
 * 更新總結區塊的數據，並更新實領結算區的應領金額。
 */
function updateSummary(logs) {
    let totalHoursAccumulated = logs.reduce((sum, log) => sum + log.totalHours, 0);
    let totalSalaryAccumulated = logs.reduce((sum, log) => sum + log.salary, 0);
    
    document.getElementById('totalHours').textContent = totalHoursAccumulated.toFixed(2);
    document.getElementById('totalSalary').textContent = totalSalaryAccumulated.toFixed(0);
    
    document.getElementById('payableSalary').textContent = totalSalaryAccumulated.toFixed(0);
}

/**
 * 計算實際到手薪資。
 */
function calculateNetSalary() {
    const payableSalaryText = document.getElementById('payableSalary').textContent;
    const payableSalary = parseFloat(payableSalaryText) || 0;
    
    const labourInsurance = parseFloat(document.getElementById('labourInsurance').value) || 0;
    const healthInsurance = parseFloat(document.getElementById('healthInsurance').value) || 0;
    
    const netSalary = payableSalary - labourInsurance - healthInsurance;
    
    document.getElementById('netSalary').textContent = Math.max(0, netSalary).toFixed(0);
}

/**
 * 儲存本月結算紀錄
 */
function saveMonthlyRecord() {
    const month = document.getElementById('monthFilter').value;
    const payableSalary = parseFloat(document.getElementById('payableSalary').textContent) || 0;
    const labourInsurance = parseFloat(document.getElementById('labourInsurance').value) || 0;
    const healthInsurance = parseFloat(document.getElementById('healthInsurance').value) || 0;
    const netSalary = parseFloat(document.getElementById('netSalary').textContent) || 0;
    
    if (payableSalary === 0) {
        alert("本月無應領薪資，無法儲存結算紀錄。");
        return;
    }

    const record = {
        month: month,
        payable: payableSalary,
        labour: labourInsurance,
        health: healthInsurance,
        net: netSalary,
        dateSaved: new Date().toLocaleDateString('zh-TW')
    };

    const existingIndex = monthlyRecords.findIndex(r => r.month === month);
    if (existingIndex !== -1) {
        monthlyRecords[existingIndex] = record;
        alert(`${month} 結算紀錄已更新！`);
    } else {
        monthlyRecords.push(record);
        monthlyRecords.sort((a, b) => (a.month < b.month) ? 1 : -1);
        alert(`${month} 結算紀錄已儲存！`);
    }

    localStorage.setItem('monthlyRecords', JSON.stringify(monthlyRecords));
    renderMonthlyRecords();
}

/**
 * 渲染月結算歷史紀錄清單
 */
function renderMonthlyRecords() {
    const list = document.getElementById('monthlyRecordList');
    list.innerHTML = '';

    if (monthlyRecords.length === 0) {
        list.innerHTML = '<li class="no-record">尚無結算紀錄。</li>';
        return;
    }

    monthlyRecords.forEach((record) => {
        const listItem = document.createElement('li');
        listItem.className = 'monthly-record-item';
        listItem.innerHTML = `
            <div class="record-header">
                <strong>${record.month} 月結算</strong>
                <span class="date-saved">儲存於: ${record.dateSaved}</span>
            </div>
            <div class="record-details">
                <span>應領: NT$ ${record.payable.toFixed(0)}</span>
                <span>扣除: NT$ ${(record.labour + record.health).toFixed(0)}</span>
                <span class="final-net">實拿: NT$ ${record.net.toFixed(0)}</span>
            </div>
        `;
        list.appendChild(listItem);
    });
}

/**
 * 清除所有月結算紀錄
 */
function clearMonthlyRecords() {
    if (confirm("確定要清除所有月結算紀錄嗎？")) {
        monthlyRecords = [];
        localStorage.removeItem('monthlyRecords');
        renderMonthlyRecords();
        alert("月結算紀錄已清除。");
    }
}

function saveLogs() { localStorage.setItem('workLogs', JSON.stringify(workLogs)); }

function deleteLog(originalIndex) { 
    workLogs.splice(originalIndex, 1); 
    renderAll(); 
}

function clearLogs() {
    if (confirm("您確定要清除所有工時/請假紀錄嗎？")) {
        workLogs = [];
        localStorage.removeItem('workLogs');
        localStorage.removeItem('hourlyRate'); 
        localStorage.removeItem('labourInsurance'); 
        localStorage.removeItem('healthInsurance');
        renderAll();
        document.getElementById('hourlyRate').value = '183';
        document.getElementById('labourInsurance').value = '0';
        document.getElementById('healthInsurance').value = '0';
    }
}

// 渲染詳細紀錄清單。
function renderLogs(logs) {
    const logList = document.getElementById('logList');
    logList.innerHTML = '';
    
    logs.forEach(log => {
        const originalIndex = workLogs.indexOf(log); 
        const listItem = document.createElement('li');
        let detailText = '';
        let itemClass = '';

        if (log.type === '工時') {
            // 使用新的 workHoursDisplay 屬性 (c04)
            detailText = `(總時數: ${log.workHoursDisplay}) | 工時: ${log.totalHours.toFixed(2)} 小時 | 收入: NT$ ${log.salary.toFixed(0)}`;
            itemClass = 'log-work';
        } else {
            detailText = `**${log.type}** (不計薪)`;
            itemClass = 'log-leave';
        }

        listItem.className = itemClass;
        listItem.innerHTML = `
            <strong>${log.date}</strong> ${detailText}
            <button class="delete-btn" onclick="deleteLog(${originalIndex})">刪除</button>
        `;
        logList.appendChild(listItem);
    });
}

// 渲染日曆總結 (月曆) (與 V5.0 相同，為精簡版面省略)
function renderCalendar(year, month, logs) {
    const calendarDisplay = document.getElementById('calendarDisplay');
    calendarDisplay.innerHTML = '';

    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyData = {};

    logs.forEach(log => {
        const day = new Date(log.date).getDate();
        if (!dailyData[day]) {
            dailyData[day] = { hours: 0, salary: 0, type: '無紀錄' };
        }
        
        if (log.type === '工時') {
            dailyData[day].hours += log.totalHours;
            dailyData[day].salary += log.salary;
            dailyData[day].type = '工時';
        } else {
            dailyData[day].type = log.type; 
        }
    });

    const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); 
    
    for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) { 
         const emptyCell = document.createElement('div');
         emptyCell.className = 'calendar-day empty';
         calendarDisplay.appendChild(emptyCell);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        const data = dailyData[day];

        if (data && data.type !== '無紀錄') {
            if (data.type === '工時') {
                 dayCell.classList.add('day-work');
                 dayCell.innerHTML = `
                    <span class="day-number">${day}</span>
                    <span class="day-info hour">${data.hours.toFixed(1)} 小時</span>
                    <span class="day-info salary">NT$ ${data.salary.toFixed(0)}</span>
                `;
            } else if (data.type === '排休') {
                dayCell.classList.add('day-off');
                dayCell.innerHTML = `<span class="day-number">${day}</span><span class="day-info status">排休</span>`;
            } else if (data.type === '請假') {
                dayCell.classList.add('day-leave');
                dayCell.innerHTML = `<span class="day-number">${day}</span><span class="day-info status">請假</span>`;
            }
        } else {
             dayCell.innerHTML = `<span class="day-number">${day}</span>`;
        }

        calendarDisplay.appendChild(dayCell);
    }
}