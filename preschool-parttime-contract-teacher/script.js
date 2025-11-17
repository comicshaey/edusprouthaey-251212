// 251117월 수정

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function formatWon(n) {
  return n.toLocaleString("ko-KR") + "원";
}

function floorTo10(n) {
  return Math.floor(n / 10) * 10;
}

// 날짜 YYYY-MM-DD
function fmtDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 월 키 YYYY-MM
function fmtMonthKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// 문자열 → Date
function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d;
}

// 날짜 범위 순회
function eachDate(startStr, endStr, cb) {
  const s = parseDate(startStr);
  const e = parseDate(endStr);
  if (!s || !e || e < s) return;
  const cur = new Date(s.getTime());
  while (cur <= e) {
    cb(new Date(cur.getTime()));
    cur.setDate(cur.getDate() + 1);
  }
}

// 봉급표 (정상근무 8시간 기준 월봉급액)
const payTable = {
  1: 1915100,
  2: 1973100,
  3: 2031900,
  4: 2090500,
  5: 2149600,
  6: 2208600,
  7: 2267000,
  8: 2325100,
  9: 2365500,
  10: 2387800,
  11: 2408300,
  12: 2455700,
  13: 2567600,
  14: 2679900,
  15: 2792000,
  16: 2904500,
  17: 3015500,
  18: 3131900,
  19: 3247500,
  20: 3363300,
  21: 3478900,
  22: 3607300,
  23: 3734600,
  24: 3862300,
  25: 3989800,
  26: 4117800,
  27: 4251300,
  28: 4384500,
  29: 4523800,
  30: 4663600,
  31: 4803000,
  32: 4942200,
  33: 5083700,
  34: 5224600,
  35: 5365800,
  36: 5506400,
  37: 5628700,
  38: 5751200,
  39: 5873900,
  40: 5995800
};

// 주당 소정근로시간 고정
const SEM_WEEKLY_HOURS = 20; // 학기중
const VAC_WEEKLY_HOURS = 40; // 방학
const WEEK_TO_MONTH = 52 / 12; // 주 → 월 환산 계수 (≈ 4.333)

// 호봉 선택 시 기본급 세팅
function updateBasePayFromStep() {
  const stepSelect = document.getElementById("stepSelect");
  const base8Input = document.getElementById("basePay8");
  const sem4Input = document.getElementById("basePay4Sem");
  const vac8Input = document.getElementById("basePay8Vac");

  const stepVal = stepSelect.value;
  if (!stepVal) return;

  const base = payTable[stepVal] || 0; // 정상근무(8h) 월봉급액
  base8Input.value = base || "";

  // 학기중: 주20h(4h×5일) → 정상근무(40h)의 1/2
  const base4 = base * 0.5;
  sem4Input.value = base4 ? Math.round(base4) : "";

  // 방학: 주40h(8h×5일) → 정상근무와 동일
  vac8Input.value = base ? Math.round(base) : "";
}

// 기본급 수동입력 시 파생값 재계산
function syncBasePayDerived() {
  const base8Input = document.getElementById("basePay8");
  const sem4Input = document.getElementById("basePay4Sem");
  const vac8Input = document.getElementById("basePay8Vac");

  const base = toNumber(base8Input.value);
  const base4 = base * 0.5;
  sem4Input.value = base4 ? Math.round(base4) : "";
  vac8Input.value = base ? Math.round(base) : "";
}

// 수당 행 추가
function addAllowanceRow() {
  const tbody = document.getElementById("allowanceBody");
  const tr = document.createElement("tr");
  tr.className = "allowance-row";
  tr.innerHTML = `
    <td><input type="text" class="allow-name" placeholder="기타 수당" /></td>
    <td><input type="number" class="allow-semester" placeholder="0" /></td>
    <td><input type="number" class="allow-vacation" placeholder="0" /></td>
  `;
  tbody.appendChild(tr);
}

// 연단위 수당 행 추가
function addAnnualRow() {
  const tbody = document.getElementById("annualBody");
  const tr = document.createElement("tr");
  tr.className = "annual-row";
  tr.innerHTML = `
    <td><input type="text" class="annual-name" placeholder="기타 연 단위 수당" /></td>
    <td><input type="number" class="annual-amount" placeholder="0" /></td>
  `;
  tbody.appendChild(tr);
}

// 방학 구간 행 추가
function addVacRow() {
  const tbody = document.getElementById("vacationBody");
  const tr = document.createElement("tr");
  tr.className = "vac-row";
  tr.innerHTML = `
    <td><input type="date" class="vac-start" /></td>
    <td><input type="date" class="vac-end" /></td>
    <td><input type="text" class="vac-note" placeholder="예: 여름방학 2차" /></td>
  `;
  tbody.appendChild(tr);
}

// 방과후 미운영 구간 행 추가
function addNoAfRow() {
  const tbody = document.getElementById("noAfBody");
  const tr = document.createElement("tr");
  tr.className = "noaf-row";
  tr.innerHTML = `
    <td><input type="date" class="noaf-start" /></td>
    <td><input type="date" class="noaf-end" /></td>
    <td><input type="text" class="noaf-note" placeholder="예: 방과후 미운영기간 2" /></td>
  `;
  tbody.appendChild(tr);
}

// 6. 월별 학기중/방학/미운영 "달력 일수" 자동 계산
// → 요일 필터 없이, 계약기간 내 모든 날짜(월~일)를 타입별로 카운트
function buildMonthTable() {
  const monthError = document.getElementById("monthError");
  monthError.textContent = "";

  const startStr = document.getElementById("contractStart").value;
  const endStr = document.getElementById("contractEnd").value;
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  if (!start || !end || end < start) {
    monthError.textContent = "계약 시작일/종료일을 올바르게 입력하세요.";
    return;
  }

  // 기본: 계약기간 전체를 '학기중(sem)'으로 세팅
  const dayType = {}; // dateKey -> 'sem' | 'vac' | 'noaf'
  eachDate(startStr, endStr, d => {
    dayType[fmtDateKey(d)] = "sem";
  });

  // 방학 구간: 'vac'로 덮어쓰기
  document.querySelectorAll(".vac-row").forEach(row => {
    const s = row.querySelector(".vac-start").value;
    const e = row.querySelector(".vac-end").value;
    eachDate(s, e, d => {
      const key = fmtDateKey(d);
      if (key in dayType) dayType[key] = "vac";
    });
  });

  // 방학 중 방과후 미운영 구간: 'noaf'가 최우선 (vac보다 우선)
  document.querySelectorAll(".noaf-row").forEach(row => {
    const s = row.querySelector(".noaf-start").value;
    const e = row.querySelector(".noaf-end").value;
    eachDate(s, e, d => {
      const key = fmtDateKey(d);
      if (key in dayType) dayType[key] = "noaf";
    });
  });

  // 월별 집계 (달력 기준: 요일 상관없이 모두 카운트)
  const monthMap = {}; // monthKey -> {semDays, vacDays, noafDays}
  let cur = new Date(start.getTime());
  while (cur <= end) {
    const key = fmtDateKey(cur);
    const monthKey = fmtMonthKey(cur);

    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { semDays: 0, vacDays: 0, noafDays: 0 };
    }

    if (dayType[key]) {
      const t = dayType[key];
      if (t === "sem") monthMap[monthKey].semDays += 1;
      else if (t === "vac") monthMap[monthKey].vacDays += 1;
      else if (t === "noaf") monthMap[monthKey].noafDays += 1;
    }

    cur.setDate(cur.getDate() + 1);
  }

  const monthKeys = Object.keys(monthMap).sort();
  if (monthKeys.length === 0) {
    monthError.textContent =
      "계약기간 내 달력 일수가 계산되지 않았습니다. 기간/방학 구간을 확인하세요.";
    return;
  }

  const wrap = document.getElementById("monthTableWrap");
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>연·월</th>
        <th>학기 중 일수 (달력 기준)</th>
        <th>방학 일수 (달력 기준)</th>
        <th>미운영 일수 (달력 기준)</th>
      </tr>
    </thead>
    <tbody>
      ${monthKeys
        .map(mk => {
          const d = monthMap[mk];
          return `
            <tr class="month-row" data-month="${mk}">
              <td>${mk}</td>
              <td><input type="number" class="m-sem" value="${d.semDays}" /></td>
              <td><input type="number" class="m-vac" value="${d.vacDays}" /></td>
              <td><input type="number" class="m-noaf" value="${d.noafDays}" /></td>
            </tr>
          `;
        })
        .join("")}
    </tbody>
  `;
  const div = document.createElement("div");
  div.className = "table-wrap";
  div.appendChild(table);
  wrap.innerHTML = "";
  wrap.appendChild(div);
}

// 7. 월별 인건비 계산 (주20/40 고정 + 시간당 단가 방식)
function calcMonthly() {
  const err = document.getElementById("calcError");
  err.textContent = "";
  const resultWrap = document.getElementById("resultWrap");
  resultWrap.innerHTML = "";

  // 기본급
  const base8 = toNumber(document.getElementById("basePay8").value);
  const base4Sem = toNumber(document.getElementById("basePay4Sem").value);
  const base8Vac = toNumber(document.getElementById("basePay8Vac").value);

  if (!base8 || !base4Sem || !base8Vac) {
    err.textContent = "호봉을 선택하거나 기본급을 입력하세요.";
    return;
  }

  // 월 단위 기본 수당 합산
  let allowSemSum = 0;
  let allowVacSum = 0;
  document.querySelectorAll(".allowance-row").forEach(row => {
    const s = row.querySelector(".allow-semester");
    const v = row.querySelector(".allow-vacation");
    allowSemSum += toNumber(s && s.value);
    allowVacSum += toNumber(v && v.value);
  });

  // 학기 중 / 방학 기준 월 총액 (기본급 + 월 정기수당)
  const semMonthTotal = base4Sem + allowSemSum;
  const vacMonthTotal = base8Vac + allowVacSum;

  // 기준 월 소정근로시간(시간) = 주당 소정근로시간 × 52주 ÷ 12개월
  const semMonthHoursBase = SEM_WEEKLY_HOURS * WEEK_TO_MONTH;
  const vacMonthHoursBase = VAC_WEEKLY_HOURS * WEEK_TO_MONTH;

  if (semMonthHoursBase <= 0 || vacMonthHoursBase <= 0) {
    err.textContent = "주당 소정근로시간 설정을 확인하세요.";
    return;
  }

  // 시간당 단가
  const semHourRate = semMonthTotal / semMonthHoursBase;
  const vacHourRate = vacMonthTotal / vacMonthHoursBase;

  // 연 단위 수당 총합
  let annualTotal = 0;
  document.querySelectorAll(".annual-row").forEach(row => {
    const a = row.querySelector(".annual-amount");
    annualTotal += toNumber(a && a.value);
  });

  // 월별 일수
  const monthRows = document.querySelectorAll(".month-row");
  if (!monthRows.length) {
    err.textContent = "먼저 '월별 일수 계산하기'를 눌러 표를 생성하세요.";
    return;
  }

  const SEM_DAILY_HOURS = 4; // 학기중·미운영 1일 4시간
  const VAC_DAILY_HOURS = 8; // 방학 1일 8시간

  const months = [];
  let totalWorkHours = 0;
  monthRows.forEach(row => {
    const monthKey = row.getAttribute("data-month");
    const semDays = toNumber(row.querySelector(".m-sem").value);
    const vacDays = toNumber(row.querySelector(".m-vac").value);
    const noafDays = toNumber(row.querySelector(".m-noaf").value);

    // 달력 일수지만, 인건비는 "해당 타입에 해당하는 일 × 그 타입의 일일 소정근로시간"으로 환산
    const semHours = semDays * SEM_DAILY_HOURS;
    const vacHours = vacDays * VAC_DAILY_HOURS;
    const noafHours = noafDays * SEM_DAILY_HOURS; // 미운영도 4시간

    const workHours = semHours + vacHours + noafHours;
    totalWorkHours += workHours;

    months.push({
      monthKey,
      semDays,
      vacDays,
      noafDays,
      semHours,
      vacHours,
      noafHours,
      workHours
    });
  });

  if (totalWorkHours <= 0) {
    err.textContent = "근무시간이 0입니다. 월별 일수를 다시 확인하세요.";
    return;
  }

  // 보험료 비율 (건강+연금+고용+산재+장기요양)
  const health = 0.03545;
  const pension = 0.045;
  const employment = 0.0175;
  const accident = 0.00966;
  const ltc = health * 0.1295; // 장기요양: 건강보험료의 12.95%
  const employerRate = health + pension + employment + accident + ltc;

  let totalWageAll = 0;
  let totalAnnualAll = 0;
  let totalEmployerAll = 0;
  let totalFinalAll = 0;

  const table = document.createElement("table");
  let tbodyHtml = "";

  months.forEach(m => {
    // 학기중·미운영 시간 임금
    const semHoursTotal = m.semHours + m.noafHours;
    const semWage = semHourRate * semHoursTotal;

    // 방학 시간 임금
    const vacWage = vacHourRate * m.vacHours;

    const wageSubTotal = semWage + vacWage;

    // 연단위 수당 배분: 총 근무시간 비례
    const annualForMonth = (annualTotal * m.workHours) / totalWorkHours;

    const wageTotal = wageSubTotal + annualForMonth;
    const employer = wageTotal * employerRate;
    const grand = wageTotal + employer;
    const grandFinal = floorTo10(grand);

    totalWageAll += wageSubTotal;
    totalAnnualAll += annualForMonth;
    totalEmployerAll += employer;
    totalFinalAll += grandFinal;

    tbodyHtml += `
      <tr>
        <td>${m.monthKey}</td>
        <td class="numeric">${m.semDays}</td>
        <td class="numeric">${m.vacDays}</td>
        <td class="numeric">${m.noafDays}</td>
        <td class="numeric">${formatWon(Math.round(wageSubTotal))}</td>
        <td class="numeric">${formatWon(Math.round(annualForMonth))}</td>
        <td class="numeric">${formatWon(Math.round(employer))}</td>
        <td class="numeric">${formatWon(grandFinal)}</td>
      </tr>
    `;
  });

  table.innerHTML = `
    <thead>
      <tr>
        <th>연·월</th>
        <th>학기중 일수(달력)</th>
        <th>방학 일수(달력)</th>
        <th>미운영 일수(달력)</th>
        <th>시간제 인건비 소계</th>
        <th>연단위 수당 배분액</th>
        <th>기관부담금 합계</th>
        <th>월 최종 합계 (10원 단위 버림)</th>
      </tr>
    </thead>
    <tbody>
      ${tbodyHtml}
    </tbody>
    <tfoot>
      <tr>
        <td>합계</td>
        <td></td>
        <td></td>
        <td></td>
        <td class="numeric">${formatWon(Math.round(totalWageAll))}</td>
        <td class="numeric">${formatWon(Math.round(totalAnnualAll))}</td>
        <td class="numeric">${formatWon(Math.round(totalEmployerAll))}</td>
        <td class="numeric">${formatWon(floorTo10(totalFinalAll))}</td>
      </tr>
    </tfoot>
  `;

  const wrapDiv = document.createElement("div");
  wrapDiv.className = "table-wrap";
  wrapDiv.appendChild(table);

  const note = document.createElement("p");
  note.className = "note small";
  note.textContent =
    "※ 학기중/방학/미운영 일수는 달력 기준(토·일 포함)이며, " +
    "인건비는 해당 일수에 4시간·8시간을 곱해 근무시간으로 환산한 뒤 " +
    "주당 소정근로시간 20시간·40시간을 반영한 시간당 단가로 계산했습니다. " +
    "연단위 수당은 계약기간 전체 근무시간 비율로 배분합니다.";

  resultWrap.innerHTML = "";
  resultWrap.appendChild(wrapDiv);
  resultWrap.appendChild(note);
}

// 이벤트 연결
document.addEventListener("DOMContentLoaded", () => {
  const stepSelect = document.getElementById("stepSelect");
  if (stepSelect) {
    stepSelect.addEventListener("change", updateBasePayFromStep);
  }

  const basePay8 = document.getElementById("basePay8");
  if (basePay8) {
    basePay8.addEventListener("input", syncBasePayDerived);
  }

  const addAllowBtn = document.getElementById("addAllowBtn");
  if (addAllowBtn) addAllowBtn.addEventListener("click", addAllowanceRow);

  const addAnnualBtn = document.getElementById("addAnnualBtn");
  if (addAnnualBtn) addAnnualBtn.addEventListener("click", addAnnualRow);

  const addVacBtn = document.getElementById("addVacBtn");
  if (addVacBtn) addVacBtn.addEventListener("click", addVacRow);

  const addNoAfBtn = document.getElementById("addNoAfBtn");
  if (addNoAfBtn) addNoAfBtn.addEventListener("click", addNoAfRow);

  const buildMonthBtn = document.getElementById("buildMonthBtn");
  if (buildMonthBtn) buildMonthBtn.addEventListener("click", buildMonthTable);

  const calcBtn = document.getElementById("calcBtn");
  if (calcBtn) calcBtn.addEventListener("click", calcMonthly);
});
