// 251118화 수정. 통상임금 ordinary-wage-core.js 모듈에서 불러옴

// 원 단위 절삭
function floor10(v) {
  const n = Number(v) || 0;
  return Math.floor(n / 10) * 10;
}

document.addEventListener('DOMContentLoaded', () => {
  // DOM 참조
  const vacAuto     = document.getElementById('vacAuto');
  const vacBasic    = document.getElementById('vacBasic');
  const vacMeal     = document.getElementById('vacMeal');
  const vacDays     = document.getElementById('vacDays');
  const vacEduH     = document.getElementById('vacEduHours');
  const vacMinWage  = document.getElementById('vacMinWage');
  const vacResult   = document.getElementById('vacResult');
  const vacCalcBtn  = document.getElementById('vacCalcBtn');
  const vacResetBtn = document.getElementById('vacResetBtn');

  const eduUseManual    = document.getElementById('eduUseManual');
  const eduManualHourly = document.getElementById('eduManualHourly');
  const eduMultiplier   = document.getElementById('eduMultiplier');
  const eduHours        = document.getElementById('eduHours');
  const outEduBase      = document.getElementById('outEduBaseHourly');
  const outEduOver      = document.getElementById('outEduOverHourly');
  const outEduAmount    = document.getElementById('outEduAmount');

  // 통상임금 코어에서 넘겨받을 상태들
  let snapRef   = null;   // data.snapshot
  let lastJob   = null;   // 현재 직종 객체
  let lastHourly = 0;     // 통상임금 시급
  let initialized = false;

  // 통상임금 코어 모듈 함수 사용
  const money = (n) => OrdinaryWageCore.money(n);

  // 방학 집체교육: 자동모드일 때 직종 기준 기본급/정액급식비 채워넣기
  function applyVacAuto() {
    if (!vacAuto || !vacBasic || !vacMeal) return;
    if (!snapRef || !lastJob) return;

    if (vacAuto.checked) {
      const fixed = snapRef.fixedAmounts || {};
      const base  = Number(lastJob.기본급 || 0);
      const meal  = Number(fixed['정액급식비'] || 0);

      vacBasic.value = base ? String(base) : '';
      vacMeal.value  = meal ? String(meal) : '';

      vacBasic.disabled = true;
      vacMeal.disabled  = true;
      vacBasic.classList.add('disabled');
      vacMeal.classList.add('disabled');
    } else {
      vacBasic.disabled = false;
      vacMeal.disabled  = false;
      vacBasic.classList.remove('disabled');
      vacMeal.classList.remove('disabled');
    }
  }

  // 방학 집체교육 계산
  function calcVacation() {
    if (!vacBasic || !vacMeal || !vacDays || !vacEduH || !vacMinWage || !vacResult) return;

    const basic   = Number(vacBasic.value)   || 0;
    const meal    = Number(vacMeal.value)    || 0;
    const days    = Number(vacDays.value)    || 0;
    const eduH    = Number(vacEduH.value)    || 0;
    const minWage = Number(vacMinWage.value) || 0;

    if (!basic || !days || !eduH || !minWage) {
      vacResult.style.display = 'block';
      vacResult.innerHTML = '<p>기본급, 달력상 월 일수, 교육시간, 최저시급 모두 입력하쇼</p>';
      return;
    }

    const monthlyTotal = basic + meal;
    const dailyRaw     = monthlyTotal / days;
    const dailyPay     = floor10(dailyRaw); // 원 단위 절삭

    const hourlyRaw    = dailyPay / 8;
    const hourlyPay    = floor10(hourlyRaw); // 원 단위 절삭

    const eduRaw       = hourlyPay * eduH;
    const eduPay       = floor10(eduRaw); // 원 단위 절삭

    const minPayRaw    = minWage * eduH;
    const minPay       = floor10(minPayRaw); // 원 단위 절삭

    let extra    = 0;
    let finalPay = eduPay;

    if (eduPay < minPay) {
      extra    = minPay - eduPay;
      finalPay = minPay;
    }

    vacResult.style.display = 'block';
    vacResult.innerHTML = `
      <table>
        <tr><th>항목</th><th>금액</th></tr>
        <tr><td>월임금 (기본급 +정액급식비)</td><td>${money(monthlyTotal)}</td></tr>
        <tr><td>일급 (월임금/월일수, 원 단위 절사)</td><td>${money(dailyPay)}</td></tr>
        <tr><td>통상임금 (일급/8시간, 원 단위 절사)</td><td>${money(hourlyPay)}</td></tr>
        <tr><td>교육시간 임금 (통상임금*${eduH}시간, 10원 단위 절사)</td><td>${money(eduPay)}</td></tr>
        <tr><td>최저임금 기준 (최저임금*${eduH}시간, 10원 단위 절사)</td><td>${money(minPay)}</td></tr>
        <tr><td>최저임금 보전금액</td><td>${money(extra)}</td></tr>
        <tr><td class="result-strong">최종 지급액</td><td class="result-strong">${money(finalPay)}</td></tr>
      </table>
    `;
  }

  function resetVacation() {
    if (!vacAuto || !vacDays || !vacEduH || !vacMinWage || !vacResult) return;
    vacAuto.checked    = true;
    vacDays.value      = '31';
    vacEduH.value      = '6';
    vacMinWage.value   = '10030';
    vacResult.style.display = 'none';
    vacResult.innerHTML     = '';
    applyVacAuto();
  }

  // 학기 중 주말 온라인 교육 계산
  function recalcEdu() {
    if (!outEduBase || !outEduOver || !outEduAmount) return;

    const useManual = eduUseManual && eduUseManual.checked;
    let baseHourly  = 0;

    if (useManual) {
      const manual = Number(eduManualHourly.value || 0);
      baseHourly = manual;
    } else {
      baseHourly = lastHourly;
    }

    const eduH = Number(eduHours?.value || 0);
    const mult = Number(eduMultiplier?.value || 0);

    // 기준시급 또는 배율/시간이 없으면 결과만 표시하고 계산은 보류
    if (!baseHourly || !mult || !eduH) {
      outEduBase.textContent   = baseHourly ? money(baseHourly) : '-';
      outEduOver.textContent   = '-';
      outEduAmount.textContent = '0';
      return;
    }

    const overHourlyRaw = baseHourly * mult;
    const overHourly    = floor10(overHourlyRaw);
    const amountRaw     = overHourly * eduH;
    const amount        = floor10(amountRaw);

    outEduBase.textContent   = money(baseHourly);
    outEduOver.textContent   = money(overHourly);
    outEduAmount.textContent = money(amount);
  }

  function resetEdu() {
    if (!eduUseManual || !eduManualHourly || !eduMultiplier || !eduHours) return;
    eduUseManual.checked      = false;
    eduManualHourly.value     = '';
    eduManualHourly.disabled  = true;
    eduMultiplier.value       = '1.5';
    eduHours.value            = '6';
    recalcEdu();
  }

  // 통상임금 코어 초기화
  OrdinaryWageCore.initCalculator({
    ids: {
      job:       'job',
      calcDate:  'calcDate',
      startDate: 'startDate',
      years:     'years',
      yearsMode: 'yearsMode',
      allowBox:  'allowBox',
      outBase:   'outBase',
      outTenure: 'outTenure',
      outSum:    'outSum',
      outHourly: 'outHourly',
      resetBtn:  'resetBtn',
      note:      'note'
    },
    // 수당 목록은 기본(DEFAULT_ALLOWANCE_NAMES) 사용
    onCalculated(ctx) {
      // 통상임금 계산 결과를 이 계산기에 반영
      snapRef    = ctx.snap;
      lastJob    = ctx.job;
      lastHourly = ctx.hourly;

      if (!initialized) {
        initialized = true;
        resetVacation();
        resetEdu();
      } else {
        applyVacAuto();
        recalcEdu();
      }
    }
  }).catch(e => {
    console.error('[ordinary-wage-core] 초기화 오류:', e);
    const jobSel = document.getElementById('job');
    if (jobSel) jobSel.innerHTML = '<option>초기화 실패 (F12 Console 확인)</option>';
  });

  // 이벤트 바인딩 - 방학 집체교육
  if (vacCalcBtn)  vacCalcBtn.addEventListener('click', calcVacation);
  if (vacResetBtn) vacResetBtn.addEventListener('click', resetVacation);
  if (vacAuto) {
    vacAuto.addEventListener('change', applyVacAuto);
  }

  // 이벤트 바인딩 - 학기 중 온라인 교육
  if (eduUseManual) {
    eduUseManual.addEventListener('change', () => {
      const useManual = eduUseManual.checked;
      eduManualHourly.disabled = !useManual;
      if (!useManual) {
        eduManualHourly.value = '';
      }
      recalcEdu();
    });
  }
  if (eduHours)      eduHours.addEventListener('input', recalcEdu);
  if (eduMultiplier) eduMultiplier.addEventListener('input', recalcEdu);
  if (eduManualHourly) eduManualHourly.addEventListener('input', recalcEdu);
});
