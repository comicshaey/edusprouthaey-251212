// 251120 유치원 시간제근무 기간제교원 인건비 계산기 스크립트

// 졸리다

function $(id) {
  return document.getElementById(id);
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// 원단위 절삭(10원 단위 버림: 1111 → 1110)
function floorTo10(v) {
  const n = Number(v) || 0;
  return Math.floor(n / 10) * 10;
}

// 날짜 파싱 (yyyy-mm-dd)
function parseDate(str) {
  if (!str) return null;
  const d = new Date(str + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// 두 날짜 사이 일수(양끝 포함)
function diffDaysInclusive(start, end) {
  const ms = end - start;
  const one = 1000 * 60 * 60 * 24;
  return Math.floor(ms / one) + 1;
}

// 금액 포맷
function formatWon(v) {
  if (!Number.isFinite(v)) return "-";
  return v.toLocaleString("ko-KR") + "원";
}

// ----- 근무시간·비례 상수 -----
const WEEK_HOURS_SEM = 20;   // 학기중 주당 소정근로시간
const WEEK_HOURS_VAC = 40;   // 방학중 주당 소정근로시간
const WEEK_TO_MONTH = 4.345; // 평균 주수

// 가족수당·식비·교직수당 상수 (정상근무 기준)
const FAMILY_SPOUSE = 40000; // 배우자 가족수당

// 고정 정액급식비/교직수당 (시간제용: 8시간·4시간 기준)
const MEAL_8H = 140000;
const MEAL_4H = 70000;
const TEACH_ALLOW_8H = 250000;
const TEACH_ALLOW_4H = 125000;

// ----- 경력연수·수당 산정 -----
function getCareerYearsFloat() {
  const yEl = $("careerYears");
  const mEl = $("careerMonths");
  const dEl = $("careerDays");
  const y = yEl ? toNumber(yEl.value) : 0;
  const m = mEl ? toNumber(mEl.value) : 0;
  const d = dEl ? toNumber(dEl.value) : 0;
  if (!y && !m && !d) return 0;
  return y + m / 12 + d / 365;
}

// 교원연구비 (정상근무 기준 월액) – 필요 시 금액 조정
function calcTeacherResearchFull(careerYears) {
  if (!careerYears || careerYears < 0) return 0;
  // 예시: 5년 미만 75,000원 / 5년 이상 60,000원 (실제 금액은 지침에 맞게 수정)
  return careerYears >= 5 ? 60000 : 75000;
}

// 정근수당 가산금 (정상근무 기준 월액) – 구간/금액은 업무지침에 맞게 조정해서 사용
function calcLongevityAddonFullMonthly(careerYears) {
  if (!careerYears || careerYears < 0) return 0;

  if (careerYears >= 20) return 80000;
  if (careerYears >= 15) return 60000;
  if (careerYears >= 10) return 40000;
  if (careerYears >= 5) return 20000;
  return 0;
}

// 가족수당(정상근무 기준 월액)
function calcFamilyFullMonthly() {
  const spouseInput = document.querySelector('input[name="spouseFlag"]:checked');
  const hasSpouse = spouseInput ? spouseInput.value === "Y" : false;

  const firstEl = $("childFirst");
  const secondEl = $("childSecond");
  const thirdPlusEl = $("childThirdPlus");

  let first = firstEl ? toNumber(firstEl.value) : 0;
  let second = secondEl ? toNumber(secondEl.value) : 0;
  let thirdPlus = thirdPlusEl ? toNumber(thirdPlusEl.value) : 0;

  // 음수/소수 방지
  first = Math.max(0, Math.floor(first));
  second = Math.max(0, Math.floor(second));
  thirdPlus = Math.max(0, Math.floor(thirdPlus));

  const childCount = first + second + thirdPlus;

  let total = 0;

  if (hasSpouse) {
    total += FAMILY_SPOUSE;
  }

  // 자녀수당 총액 (정상근무 기준)
  if (childCount >= 1) {
    if (childCount === 1) total += 50000;
    else if (childCount === 2) total += 80000;
    else total += 120000;
  }

  return total;
}

// 월별 수당 입력행 자동 반영
function applyAutoAllowances() {
  const rows = document.querySelectorAll(".allowance-row");
  if (!rows || !rows.length) return;

  const fullFamily = calcFamilyFullMonthly();
  const careerYears = getCareerYearsFloat();
  const fullResearch = calcTeacherResearchFull(careerYears);
  const fullLongevity = calcLongevityAddonFullMonthly(careerYears);

  const semFamily = fullFamily * 0.5; // 학기중 4시간(주20시간)
  const vacFamily = fullFamily;       // 방학중 8시간(주40시간)
  const semResearch = fullResearch * 0.5;
  const vacResearch = fullResearch;
  const semLongevity = fullLongevity * 0.5;
  const vacLongevity = fullLongevity;

  rows.forEach((row) => {
    const nameInput = row.querySelector(".allow-name");
    const semInput = row.querySelector(".allow-semester");
    const vacInput = row.querySelector(".allow-vacation");
    if (!nameInput || !semInput || !vacInput) return;

    const name = (nameInput.value || "").trim();

    if (name === "정액급식비") {
      semInput.value = MEAL_4H;
      vacInput.value = MEAL_8H;
    } else if (name === "교직수당") {
      semInput.value = TEACH_ALLOW_4H;
      vacInput.value = TEACH_ALLOW_8H;
    } else if (name === "가족수당") {
      if (fullFamily > 0) {
        semInput.value = floorTo10(semFamily);
        vacInput.value = floorTo10(vacFamily);
      } else {
        semInput.value = "";
        vacInput.value = "";
      }
    } else if (name === "교원연구비") {
      if (fullResearch > 0) {
        semInput.value = floorTo10(semResearch);
        vacInput.value = floorTo10(vacResearch);
      } else {
        semInput.value = "";
        vacInput.value = "";
      }
    } else if (name === "정근수당 가산금") {
      if (fullLongevity > 0) {
        semInput.value = floorTo10(semLongevity);
        vacInput.value = floorTo10(vacLongevity);
      } else {
        semInput.value = "";
        vacInput.value = "";
      }
    }
    // 나머지 수당은 수동 입력 유지
  });
}

// 기본급·수당 → 시간당 단가 계산
function buildBasePay() {
  const base8 = toNumber($("basePay8").value);
  if (!base8) return null;

  const base4Sem = base8 / 2;
  const base8Vac = base8;

  applyAutoAllowances();

  let allowSem = 0;
  let allowVac = 0;

  document.querySelectorAll(".allowance-row").forEach((row) => {
    const name = row.querySelector(".allow-name")?.value || "";
    const sem = toNumber(row.querySelector(".allow-semester")?.value);
    const vac = toNumber(row.querySelector(".allow-vacation")?.value);
    if (!name) return;
    allowSem += sem;
    allowVac += vac;
  });

  const semMonthTotal = base4Sem + allowSem;
  const vacMonthTotal = base8Vac + allowVac;

  const semMonthHours = WEEK_HOURS_SEM * WEEK_TO_MONTH;
  const vacMonthHours = WEEK_HOURS_VAC * WEEK_TO_MONTH;

  const semHour = semMonthHours ? semMonthTotal / semMonthHours : 0;
  const vacHour = vacMonthHours ? vacMonthTotal / vacMonthHours : 0;

  return {
    base8,
    base4Sem,
    base8Vac,
    semHour,
    vacHour,
    allowSem,
    allowVac,
  };
}

// ----- 날짜 타입 구분 -----
const DAY_TYPE_SEMESTER = "SEM";
const DAY_TYPE_VACATION = "VAC";
const DAY_TYPE_NOAF = "NOAF";

function inRange(date, ranges) {
  const time = date.getTime();
  return ranges.some((r) => time >= r.start && time <= r.end);
}

function buildRanges(tbodySelector, startClass, endClass) {
  const ranges = [];
  document.querySelectorAll(tbodySelector + " tr").forEach((row) => {
    const s = row.querySelector("." + startClass)?.value;
    const e = row.querySelector("." + endClass)?.value;
    if (!s || !e) return;
    const sd = parseDate(s);
    const ed = parseDate(e);
    if (!sd || !ed || ed < sd) return;
    ranges.push({ start: sd, end: ed });
  });
  return ranges;
}

// ----- 2단계: 월별 일수 계산 -----
function buildMonthTable() {
  const startStr = $("contractStart").value;
  const endStr = $("contractEnd").value;
  const errEl = $("monthError");
  const wrap = $("monthTableWrap");
  errEl.textContent = "";
  wrap.innerHTML = "";

  const start = parseDate(startStr);
  const end = parseDate(endStr);
  if (!start || !end || end < start) {
    errEl.textContent = "근로계약 시작·종료일자를 정확히 입력하세요.";
    return;
  }

  const vacRanges = buildRanges("#vacationBody", "vac-start", "vac-end");
  const noAfRanges = buildRanges("#noAfBody", "noaf-start", "noaf-end");

  const monthMap = new Map(); // key: yyyy-mm, value: {sem, vac, noaf}

  let cur = new Date(start.getTime());
  while (cur <= end) {
    const ym = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;

    if (!monthMap.has(ym)) monthMap.set(ym, { sem: 0, vac: 0, noaf: 0 });
    const cell = monthMap.get(ym);

    let type = DAY_TYPE_SEMESTER;
    if (inRange(cur, vacRanges)) type = DAY_TYPE_VACATION;
    if (inRange(cur, noAfRanges)) type = DAY_TYPE_NOAF;

    if (type === DAY_TYPE_VACATION) cell.vac += 1;
    else if (type === DAY_TYPE_NOAF) cell.noaf += 1;
    else cell.sem += 1;

    cur.setDate(cur.getDate() + 1);
  }

  let html = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>월</th>
            <th>학기중 일수(4시간)</th>
            <th>방학 일수(8시간)</th>
            <th>방학중 방과후 미운영일수(4시간)</th>
          </tr>
        </thead>
        <tbody>
  `;

  const keys = Array.from(monthMap.keys()).sort();
  keys.forEach((ym) => {
    const data = monthMap.get(ym);
    html += `
      <tr class="month-row" data-month="${ym}">
        <td>${ym}</td>
        <td><input type="number" class="sem-days" value="${data.sem}" /></td>
        <td><input type="number" class="vac-days" value="${data.vac}" /></td>
        <td><input type="number" class="noaf-days" value="${data.noaf}" /></td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  wrap.innerHTML = html;
}

// 정근수당 연간 기준액 → 학사일정 기준 일할계산해서 annual "정근수당" 행에 반영
function autoFillAnnualLongevityBySchedule() {
  const baseInput = $("longevityBaseAnnual");
  if (!baseInput) return;
  const baseAnnual = toNumber(baseInput.value);
  if (!baseAnnual) return;

  const monthRows = document.querySelectorAll(".month-row");
  if (!monthRows.length) return;

  let totalDays = 0;
  monthRows.forEach((row) => {
    const semDays = toNumber(row.querySelector(".sem-days")?.value);
    const vacDays = toNumber(row.querySelector(".vac-days")?.value);
    const noafDays = toNumber(row.querySelector(".noaf-days")?.value);
    totalDays += semDays + vacDays + noafDays;
  });

  if (!totalDays) return;

  // 기준: 1년 365일로 보고, 계약기간 달력일수 비율만큼 일할계산
  const prorated = baseAnnual * (totalDays / 365);
  const proratedRounded = floorTo10(prorated);

  const annualRows = document.querySelectorAll(".annual-row");
  annualRows.forEach((row) => {
    const name = (row.querySelector(".annual-name")?.value || "").trim();
    if (name === "정근수당") {
      const amtInput = row.querySelector(".annual-amount");
      if (amtInput) amtInput.value = proratedRounded;
    }
  });
}

// ----- 3단계: 월별 인건비 + 퇴직금 계산 -----
function calcMonthly() {
  const errEl = $("calcError");
  const resultWrap = $("resultWrap");
  errEl.textContent = "";
  resultWrap.innerHTML = "";

  const baseInfo = buildBasePay();
  if (!baseInfo) {
    errEl.textContent = "1단계를 먼저 실행해 기본급과 수당을 반영하세요.";
    return;
  }

  const monthRows = document.querySelectorAll(".month-row");
  if (!monthRows.length) {
    errEl.textContent = "2단계로 월별 일수를 먼저 계산하세요.";
    return;
  }

  // 정근수당 연간 기준액이 있으면 학사일정 기준 일할계산해서 annual "정근수당" 행 자동 반영
  autoFillAnnualLongevityBySchedule();

  // 4대보험 비율 (기관부담 기준, 근사치)
  const R_PENSION_ORG = 0.045;
  const R_HEALTH_ORG = 0.03545;
  const R_LTC_ORG = 0.1267 * R_HEALTH_ORG;
  const R_EMPLOY_ORG = 0.009;

  let tbodyHtml = "";
  let totalWageAll = 0;
  let totalAnnualAll = 0;
  let totalOrg4Ins = 0;
  let totalDays = 0;

  const annualRows = document.querySelectorAll(".annual-row");
  let annualTotal = 0;
  annualRows.forEach((row) => {
    const amt = toNumber(row.querySelector(".annual-amount")?.value);
    annualTotal += amt;
  });

  const monthCount = monthRows.length;
  const annualPerMonthRaw = monthCount ? annualTotal / monthCount : 0;
  const annualPerMonth = floorTo10(annualPerMonthRaw);

  const months = [];

  monthRows.forEach((row) => {
    const ym = row.getAttribute("data-month") || "";
    const semDays = toNumber(row.querySelector(".sem-days")?.value);
    const vacDays = toNumber(row.querySelector(".vac-days")?.value);
    const noafDays = toNumber(row.querySelector(".noaf-days")?.value);

    const daysSum = semDays + vacDays + noafDays;
    totalDays += daysSum;

    const semHours = (semDays + noafDays) * 4;
    const vacHours = vacDays * 8;
    const monthHours = semHours + vacHours;

    // ----- 핵심 변경: 방학·미운영 0일인 달은 4시간 기준 "전액 지급" -----
    let wageMonthRaw = 0;

    if (vacDays === 0 && noafDays === 0 && (semDays > 0)) {
      // 학기중만 있는 달 → 학기중 기본급(4시간) + 학기중 수당 전액
      wageMonthRaw = baseInfo.base4Sem + baseInfo.allowSem;
    } else {
      // 그 외 달 → 기존처럼 시간당 단가 × 실제 근무시간으로 일할계산
      const wageSem = baseInfo.semHour * (semDays + noafDays) * 4;
      const wageVac = baseInfo.vacHour * vacDays * 8;
      wageMonthRaw = wageSem + wageVac;
    }

    const wageMonth = floorTo10(wageMonthRaw);
    const annualMonth = annualPerMonth; // 이미 10원단위 절삭

    const pensionOrg = wageMonth * R_PENSION_ORG;
    const healthOrg = wageMonth * R_HEALTH_ORG;
    const ltcOrg = wageMonth * R_LTC_ORG;
    const employOrg = wageMonth * R_EMPLOY_ORG;

    const org4 = floorTo10(pensionOrg + healthOrg + ltcOrg + employOrg);

    totalWageAll += wageMonth;
    totalAnnualAll += annualMonth;
    totalOrg4Ins += org4;

    months.push({
      ym,
      semDays,
      vacDays,
      noafDays,
      monthHours,
      wageMonth,
      annualMonth,
      org4,
    });
  });

  const totalIncomeAll = totalWageAll + totalAnnualAll;

  tbodyHtml = months
    .map((m) => {
      const totalMonthIncome = m.wageMonth + m.annualMonth;
      return `
        <tr>
          <td>${m.ym}</td>
          <td>${m.semDays}</td>
          <td>${m.vacDays}</td>
          <td>${m.noafDays}</td>
          <td>${m.monthHours}</td>
          <td>${formatWon(m.wageMonth)}</td>
          <td>${formatWon(m.annualMonth)}</td>
          <td>${formatWon(totalMonthIncome)}</td>
          <td>${formatWon(m.org4)}</td>
        </tr>
      `;
    })
    .join("");

  const table = document.createElement("div");
  table.className = "table-wrap";
  table.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>월</th>
          <th>학기중 일수</th>
          <th>방학 일수</th>
          <th>방학중 미운영일수</th>
          <th>월 총 근무시간</th>
          <th>월 임금(기본급+월별수당)</th>
          <th>연 단위 수당 배분액</th>
          <th>월 총 지급액</th>
          <th>기관부담 4대보험(대략)</th>
        </tr>
      </thead>
      <tbody>
        ${tbodyHtml}
      </tbody>
      <tfoot>
        <tr>
          <th colspan="5">계</th>
          <th>${formatWon(totalWageAll)}</th>
          <th>${formatWon(totalAnnualAll)}</th>
          <th>${formatWon(totalIncomeAll)}</th>
          <th>${formatWon(totalOrg4Ins)}</th>
        </tr>
      </tfoot>
    </table>
  `;

  resultWrap.appendChild(table);

  const note = document.createElement("p");
  note.className = "hint";
  note.innerHTML = `
    ·4대보험 기관부담금은 대략 반영값으로 실제 고지액과는 차이가 날 수 있습니다.<br/>
    ·월별 수당·연 단위 수당 금액(정근수당·정기상여금·명절휴가비 등)은 업무편람·운영지침에 따라 별도 확인 필요.
  `;
  resultWrap.appendChild(note);

  // 퇴직금(계약 1년 초과 시)
  let retireInfo = null;
  const startStr = $("contractStart").value;
  const endStr = $("contractEnd").value;
  const start = parseDate(startStr);
  const end = parseDate(endStr);

  if (start && end && end >= start) {
    const diff = diffDaysInclusive(start, end);
    if (diff > 365 && totalDays > 0) {
      const avgDaily = (totalWageAll + totalAnnualAll) / totalDays;
      const raw = avgDaily * 30;
      const retirePay = floorTo10(raw);
      retireInfo = { eligible: true, diffDays: diff, retirePay };
    } else {
      retireInfo = { eligible: false, diffDays: diff };
    }
  }

  if (retireInfo) {
    const card = document.createElement("div");
    card.className = "card";
    if (retireInfo.eligible) {
      card.innerHTML = `
        <h3 style="margin-top:0;font-size:15px;">퇴직금 개략 산정 (계약기간 1년 초과 시)</h3>
        <p class="hint">
          ·계약기간 달력일수: ${retireInfo.diffDays}일 기준<br/>
          ·계약기간 전체 임금을 달력일수로 나눈 1일 평균임금 × 30일을 10원 단위로 버림한 값입니다.
        </p>
        <p><b>예상 퇴직금(개략): ${formatWon(retireInfo.retirePay)}</b></p>
      `;
    } else {
      card.innerHTML = `
        <h3 style="margin-top:0;font-size:15px;">퇴직금 개략 산정</h3>
        <p>계약기간이 1년을 초과하지 않아 퇴직금 지급 대상이 아닙니다.</p>
      `;
    }
    resultWrap.appendChild(card);
  }
}

// ----- 행 추가 -----
function addAllowanceRow() {
  const tbody = $("allowanceBody");
  const tr = document.createElement("tr");
  tr.className = "allowance-row";
  tr.innerHTML = `
    <td><input type="text" class="allow-name" placeholder="수당명" /></td>
    <td><input type="number" class="allow-semester" placeholder="0" /></td>
    <td><input type="number" class="allow-vacation" placeholder="0" /></td>
  `;
  tbody.appendChild(tr);
}

function addAnnualRow() {
  const tbody = $("annualBody");
  const tr = document.createElement("tr");
  tr.className = "annual-row";
  tr.innerHTML = `
    <td><input type="text" class="annual-name" placeholder="수당명" /></td>
    <td><input type="number" class="annual-amount" placeholder="0" /></td>
  `;
  tbody.appendChild(tr);
}

function addVacRow() {
  const tbody = $("vacationBody");
  const tr = document.createElement("tr");
  tr.className = "vac-row";
  tr.innerHTML = `
    <td><input type="date" class="vac-start" /></td>
    <td><input type="date" class="vac-end" /></td>
    <td><input type="text" class="vac-note" placeholder="예: 여름방학" /></td>
  `;
  tbody.appendChild(tr);
}

function addNoAfRow() {
  const tbody = $("noAfBody");
  const tr = document.createElement("tr");
  tr.className = "noaf-row";
  tr.innerHTML = `
    <td><input type="date" class="noaf-start" /></td>
    <td><input type="date" class="noaf-end" /></td>
    <td><input type="text" class="noaf-note" placeholder="예: 여름방학 중 방과후 미운영기간" /></td>
  `;
  tbody.appendChild(tr);
}

// ----- 직종별 구비서류 안내 -----
const DOC_GUIDES = {
  "time-part": [
    "기본증명서(필요 시)",
    "교원자격증 사본 또는 자격인정조서",
    "행정정보공동이용 사전동의서",
    "경력증명서(해당자)",
    "호봉획정을 위한 경력기간 합산신청서(해당자, 본인 직접 작성)",
    "평가에 대한 동의서",
    "최종학력증명서",
    "성범죄·아동학대 관련 범죄경력 조회 동의서",
    "장애인학대관련범죄 등 경력 조회 동의서(특수학교·특수학급·특수교육지원센터 해당)",
    "가족 채용 제한 여부 확인서",
    "공무원채용신체검사서(유효기간 1년)",
    "주민등록초본(병적사항 기재, 해당자)",
    "마약류 중독 여부 검사 결과 통보서",
    "사진, 개인정보 이용·제공 동의서 등"
  ],
  "retired": [
    "개인정보 이용·제공 동의서",
    "성범죄·아동학대 관련 범죄경력 조회 동의서",
    "장애인학대관련범죄 등 경력 조회 동의서(특수학교·특수학급·특수교육지원센터 해당)",
    "가족 채용 제한 여부 확인서",
    "평가에 대한 동의서",
    "행정정보공동이용 사전동의서",
    "일반채용신체검사서 또는 건강검진 결과 통보서",
    "경력증명서(해당자, 과목 입력 필수)",
    "호봉획정을 위한 경력기간 합산신청서(해당자, 본인 직접 작성)",
    "마약류 중독 여부 검사 결과 통보서"
  ]
};

function renderDocGuide() {
  const box = $("docGuide");
  const select = $("docTypeSelect");
  if (!box || !select) return;

  const key = select.value || "time-part";
  const items = DOC_GUIDES[key] || [];

  if (!items.length) {
    box.innerHTML = '<p class="hint">구비서류 안내 데이터가 없습니다.</p>';
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "doc-list";
  items.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    ul.appendChild(li);
  });

  box.innerHTML = "";
  box.appendChild(ul);
}

// ----- DOMContentLoaded -----
document.addEventListener("DOMContentLoaded", () => {
  const base8Input = $("basePay8");
  const stepSelect = $("stepSelect");

  // 호봉 선택시: TeacherStepCore 이용
  if (stepSelect) {
    stepSelect.addEventListener("change", () => {
      const step = stepSelect.value;

      if (typeof TeacherStepCore !== "undefined") {
        const pay = TeacherStepCore.getMonthlyBasePay8h(step);
        base8Input.value = pay ? pay : "";
      } else {
        base8Input.value = "";
      }

      const baseInfo = buildBasePay();
      if (baseInfo) {
        $("basePay4Sem").value = Math.round(baseInfo.base4Sem);
        $("basePay8Vac").value = Math.round(baseInfo.base8Vac);
      } else {
        $("basePay4Sem").value = "";
        $("basePay8Vac").value = "";
      }
    });
  }

  if (base8Input) {
    base8Input.addEventListener("input", () => {
      const baseInfo = buildBasePay();
      if (baseInfo) {
        $("basePay4Sem").value = Math.round(baseInfo.base4Sem);
        $("basePay8Vac").value = Math.round(baseInfo.base8Vac);
      } else {
        $("basePay4Sem").value = "";
        $("basePay8Vac").value = "";
      }
    });
  }

  // 1단계 버튼: 호봉·경력·가족수당 반영
  const stepBaseBtn = $("stepBaseBtn");
  if (stepBaseBtn) {
    stepBaseBtn.addEventListener("click", () => {
      const stepSel = $("stepSelect");
      if (stepSel && typeof TeacherStepCore !== "undefined") {
        const step = stepSel.value;
        if (step) {
          const pay = TeacherStepCore.getMonthlyBasePay8h(step);
          if (pay) base8Input.value = pay;
        }
      }
      const baseInfo = buildBasePay();
      if (baseInfo) {
        $("basePay4Sem").value = Math.round(baseInfo.base4Sem);
        $("basePay8Vac").value = Math.round(baseInfo.base8Vac);
      } else {
        $("basePay4Sem").value = "";
        $("basePay8Vac").value = "";
      }
    });
  }

  const addAllowBtn = $("addAllowBtn");
  if (addAllowBtn) addAllowBtn.addEventListener("click", addAllowanceRow);

  const addAnnualBtn = $("addAnnualBtn");
  if (addAnnualBtn) addAnnualBtn.addEventListener("click", addAnnualRow);

  const addVacBtn = $("addVacBtn");
  if (addVacBtn) addVacBtn.addEventListener("click", addVacRow);

  const addNoAfBtn = $("addNoAfBtn");
  if (addNoAfBtn) addNoAfBtn.addEventListener("click", addNoAfRow);

  const buildMonthBtn = $("buildMonthBtn");
  if (buildMonthBtn) buildMonthBtn.addEventListener("click", buildMonthTable);

  const calcBtn = $("calcBtn");
  if (calcBtn) calcBtn.addEventListener("click", calcMonthly);

  // 가족사항/경력연수 변경 시 1단계 내용 재계산
  [
    "careerYears",
    "careerMonths",
    "careerDays",
    "childFirst",
    "childSecond",
    "childThirdPlus"
  ].forEach((id) => {
    const el = $(id);
    if (el) {
      el.addEventListener("input", () => {
        const baseInfo = buildBasePay();
        if (baseInfo) {
          $("basePay4Sem").value = Math.round(baseInfo.base4Sem);
          $("basePay8Vac").value = Math.round(baseInfo.base8Vac);
        } else {
          $("basePay4Sem").value = "";
          $("basePay8Vac").value = "";
        }
      });
    }
  });

  document.querySelectorAll('input[name="spouseFlag"]').forEach((el) => {
    el.addEventListener("change", () => {
      const baseInfo = buildBasePay();
      if (baseInfo) {
        $("basePay4Sem").value = Math.round(baseInfo.base4Sem);
        $("basePay8Vac").value = Math.round(baseInfo.base8Vac);
      } else {
        $("basePay4Sem").value = "";
        $("basePay8Vac").value = "";
      }
    });
  });

  // 구비서류 안내
  const docSelect = $("docTypeSelect");
  if (docSelect) {
    docSelect.addEventListener("change", renderDocGuide);
    renderDocGuide();
  }
});
