// =========================
// 공통 유틸
// =========================

// 숫자 변환
function toNumber(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// 3자리 콤마 + " 원"
function formatWon(n) {
  return n.toLocaleString("ko-KR") + " 원";
}

// HTML 이스케이프
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =========================
// 탭 전환 (실무자 / 감사관)
// =========================
const modeTabs = document.querySelectorAll(".mode-tab");
const modeWorker = document.getElementById("mode-worker");
const modeAuditor = document.getElementById("mode-auditor");

modeTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;

    modeTabs.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    if (mode === "worker") {
      modeWorker.style.display = "block";
      modeAuditor.style.display = "none";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      modeWorker.style.display = "none";
      modeAuditor.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
});

// =========================
// A. 실무자용 여비 계산기
// =========================

// 관내/관외 라디오 전환
document.querySelectorAll('input[name="calcType"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const type = document.querySelector('input[name="calcType"]:checked').value;
    document.getElementById("section-inner").style.display =
      type === "inner" ? "block" : "none";
    document.getElementById("section-outer").style.display =
      type === "outer" ? "block" : "none";
  });
});

// ---- 1) 관내 계산 ----
const btnInner = document.getElementById("btnInner");
const innerResultEl = document.getElementById("innerResult");

if (btnInner) {
  btnInner.addEventListener("click", () => {
    const distance = toNumber(
      document.getElementById("innerDistance").value
    );
    const hours = toNumber(document.getElementById("innerHours").value);
    const carUse = document.querySelector(
      'input[name="innerCar"]:checked'
    ).value;
    const actualShort = toNumber(
      document.getElementById("innerActualShort").value
    );

    if (hours <= 0) {
      alert("출장 소요시간을 입력해 주세요.");
      return;
    }

    let base = 0;
    let typeDesc = "";
    const note = [];

    // 왕복 2km 이내: 실비 기준
    if (distance > 0 && distance <= 2) {
      typeDesc =
        "근무지 내 근거리 출장 (왕복 2km 이내, 실비 기준)";
      if (actualShort <= 0) {
        note.push(
          "근거리 출장은 정액 대신 실비 지급 대상입니다. 실제 운임·식비 합계를 입력해야 정확한 금액이 나옵니다."
        );
      }
      const limit = hours < 4 ? 10000 : 20000;
      base = Math.min(actualShort, limit);
      note.push(
        `· 시간 기준 상한: ${formatWon(
          limit
        )} (입력 실비와 비교하여 작은 금액 적용)`
      );
    } else {
      // 일반 관내 정액
      typeDesc = "근무지 내 출장 (관내, 정액 기준)";
      if (hours < 4) {
        base = 10000;
      } else {
        base = 20000;
      }

      if (carUse === "yes") {
        base = Math.max(0, base - 10000);
        note.push("공용차량/임차차량 사용으로 10,000원 감액 적용됨.");
      }
    }

    innerResultEl.style.display = "block";
    innerResultEl.innerHTML = `
      <div class="result-line">
        <div class="result-label">구분</div>
        <div class="result-value">${typeDesc}</div>
      </div>
      <div class="result-line">
        <div class="result-label">산출 여비(1회 기준)</div>
        <div class="result-value"><strong>${formatWon(base)}</strong></div>
      </div>
      <p class="muted local-small" style="margin-top:8px;">
        · 1회 출장 기준 금액입니다. 실제 지급 시에는 1일 상한(예: 관내 20,000원), 운전원 특례 여부 등을 별도로 확인해야 합니다.<br />
        ${note.length ? note.join("<br />") : ""}
      </p>
    `;
  });
}

// ---- 2) 관외 계산 ----
const btnOuter = document.getElementById("btnOuter");
const outerResultEl = document.getElementById("outerResult");

if (btnOuter) {
  btnOuter.addEventListener("click", () => {
    const days = toNumber(
      document.getElementById("outerDays").value
    );
    const nights = toNumber(
      document.getElementById("outerNights").value
    );
    const region = document.getElementById("outerRegion").value;
    const lodgingSpent = toNumber(
      document.getElementById("outerLodgingSpent").value
    );
    const lodgingExtra = document.querySelector(
      'input[name="outerLodgingExtra"]:checked'
    ).value;
    const carDays = toNumber(
      document.getElementById("outerCarDays").value
    );
    const mileageUse = document.querySelector(
      'input[name="outerMileage"]:checked'
    ).value;
    const mealsProvided = toNumber(
      document.getElementById("outerMealsProvided").value
    );
    const longStayRate = Number(
      document.getElementById("outerLongStayRate").value
    );
    const fare = toNumber(document.getElementById("outerFare").value);

    if (days <= 0) {
      alert("출장일수를 1일 이상 입력해 주세요.");
      return;
    }
    if (carDays > days) {
      alert("공용/임차 차량 사용일수가 출장일수보다 많을 수 없습니다.");
      return;
    }

    // 단가 (제2호 기준 예시)
    const PER_DIEM_BASE = 20000; // 일비
    const MEAL_BASE = 20000; // 식비

    // 1) 일비: 일반일 + 차량사용일(1/2)
    const normalDays = Math.max(0, days - carDays);
    const carUseDays = Math.max(0, carDays);
    let perDiem =
      normalDays * PER_DIEM_BASE +
      carUseDays * (PER_DIEM_BASE / 2);

    // 장기체재 감액
    perDiem = Math.round(perDiem * longStayRate);

    // 2) 식비: 1일 정액 - 무료식 제공 1/3씩
    let mealTotal = days * MEAL_BASE;
    const perMeal = Math.round(MEAL_BASE / 3);
    const mealReduction = perMeal * mealsProvided;
    mealTotal = Math.max(0, mealTotal - mealReduction);

    // 3) 숙박비 상한
    let capPerNight = 50000; // 기타·세종·제주
    if (region === "seoul") capPerNight = 70000;
    if (region === "metro") capPerNight = 60000;

    if (lodgingExtra === "yes") {
      capPerNight = Math.round(capPerNight * 1.3);
    }

    const lodgingCapTotal = capPerNight * nights;
    const lodgingAllowed = Math.min(lodgingSpent, lodgingCapTotal);

    // 4) 항공마일리지 사용 시 일비 50% 추가 (절약운임 1/2 한도는 별도 검토 전제)
    let perDiemExtra = 0;
    if (mileageUse === "yes") {
      perDiemExtra = Math.round(perDiem * 0.5);
    }

    // 5) 총액
    const total =
      fare + perDiem + perDiemExtra + mealTotal + lodgingAllowed;

    const notes = [];
    if (lodgingExtra === "yes") {
      notes.push(
        "· 숙박비 상한 30% 가산을 적용한 금액입니다. 실제 지급 시에는 불가피한 사유 인정 여부를 확인해야 합니다."
      );
    }
    if (mileageUse === "yes") {
      notes.push(
        "· 항공마일리지 사용에 따른 일비 50% 추가는 '절약된 항공운임의 1/2 한도'를 별도로 검토해야 합니다."
      );
    }
    if (longStayRate < 1.0) {
      notes.push(
        "· 동일지역 장기체재 일비 감액율을 적용했습니다."
      );
    }

    outerResultEl.style.display = "block";
    outerResultEl.innerHTML = `
      <div class="result-line">
        <div class="result-label">운임(실비)</div>
        <div class="result-value">${formatWon(fare)}</div>
      </div>
      <div class="result-line">
        <div class="result-label">일비 합계</div>
        <div class="result-value">${formatWon(perDiem)}</div>
      </div>
      <div class="result-line">
        <div class="result-label">일비 추가 (마일리지)</div>
        <div class="result-value">${formatWon(perDiemExtra)}</div>
      </div>
      <div class="result-line">
        <div class="result-label">식비 합계</div>
        <div class="result-value">${formatWon(mealTotal)}</div>
      </div>
      <div class="result-line">
        <div class="result-label">숙박비 인정액</div>
        <div class="result-value">
          ${formatWon(lodgingAllowed)} / 상한 ${formatWon(lodgingCapTotal)}
        </div>
      </div>
      <hr />
      <div class="result-line">
        <div class="result-label">총 여비 (참고)</div>
        <div class="result-value"><strong>${formatWon(total)}</strong></div>
      </div>
      <p class="muted local-small" style="margin-top:8px;">
        · 국내 근무지 외 출장(제2호 기준 예시) 여비 산출 결과입니다. 실제 지급 시에는 기관별 세부지침과 증빙서류를 기준으로 다시 검토해야 합니다.<br />
        ${notes.join("<br />")}
      </p>
    `;
  });
}

// =========================
// B. 감사관용 여비 검증기
// =========================

// ---- 1) 월간 집계 검증 ----
const monthlyBtn = document.getElementById("btnVerifyMonthly");
const monthlyResetBtn = document.getElementById("btnResetMonthly");
const monthlyResultEl = document.getElementById("monthlyResult");

if (monthlyBtn) {
  monthlyBtn.addEventListener("click", () => {
    const label =
      document.getElementById("monthLabel").value.trim() ||
      "해당 월 관내여비";
    const decidedTotal = toNumber(
      document.getElementById("decidedTotal").value
    );
    const halfCount = toNumber(
      document.getElementById("halfCount").value
    );
    const fullCount = toNumber(
      document.getElementById("fullCount").value
    );
    const unitHalf = toNumber(
      document.getElementById("unitHalf").value
    );
    const unitFull = toNumber(
      document.getElementById("unitFull").value
    );

    if (halfCount < 0 || fullCount < 0) {
      alert("반일/종일 건수는 0 이상으로 입력해 주세요.");
      return;
    }
    if (unitHalf <= 0 || unitFull <= 0) {
      alert("단가는 0보다 큰 값으로 입력해 주세요.");
      return;
    }
    if (decidedTotal <= 0) {
      alert("지출결의 총액을 입력해 주세요.");
      return;
    }

    const expected = halfCount * unitHalf + fullCount * unitFull;
    const diff = decidedTotal - expected;

    let statusText = "";
    if (diff === 0) {
      statusText =
        "지출결의 총액이 규정상 예상액과 일치합니다.";
    } else if (diff > 0) {
      statusText = `지출결의 총액이 규정상 예상액보다 ${formatWon(
        diff
      )} 만큼 큽니다. (과지급 가능성)`;
    } else {
      statusText = `지출결의 총액이 규정상 예상액보다 ${formatWon(
        Math.abs(diff)
      )} 만큼 작습니다. (미지급 또는 건수 누락 가능성)`;
    }

    monthlyResultEl.style.display = "block";
    monthlyResultEl.innerHTML = `
      <p><strong>${escapeHtml(label)} 검증 결과</strong></p>
      <div class="result-line">
        <div class="result-label">반일 건수 × 단가</div>
        <div class="result-value">
          ${halfCount}건 × ${formatWon(unitHalf)} = ${formatWon(
            halfCount * unitHalf
          )}
        </div>
      </div>
      <div class="result-line">
        <div class="result-label">종일 건수 × 단가</div>
        <div class="result-value">
          ${fullCount}건 × ${formatWon(unitFull)} = ${formatWon(
            fullCount * unitFull
          )}
        </div>
      </div>
      <hr />
      <div class="result-line">
        <div class="result-label">규정상 예상 합계</div>
        <div class="result-value"><strong>${formatWon(
          expected
        )}</strong></div>
      </div>
      <div class="result-line">
        <div class="result-label">지출결의 총액</div>
        <div class="result-value">${formatWon(decidedTotal)}</div>
      </div>
      <div class="result-line">
        <div class="result-label">차이(지출결의 - 예상액)</div>
        <div class="result-value">${formatWon(diff)}</div>
      </div>
      <p class="muted local-small" style="margin-top:8px;">
        · 관내 왕복 2km 이상, 4시간 기준 반일/종일 정액만 고려한 결과입니다.<br />
        · 왕복 2km 이내 근거리 실비, 운전원 특례, 1일 2회 이상 출장 상한 등은 별도로 검토해야 합니다.<br />
        · 2025년 5월 문막초 관내여비 지출결의서(총 450,000원)처럼, 결의서 합계와 나이스 반일/종일 건수 집계를 맞춰보는 용도입니다.
      </p>
    `;
  });
}

if (monthlyResetBtn) {
  monthlyResetBtn.addEventListener("click", () => {
    document.getElementById("monthLabel").value = "";
    document.getElementById("decidedTotal").value = "";
    document.getElementById("halfCount").value = "";
    document.getElementById("fullCount").value = "";
    document.getElementById("unitHalf").value = 10000;
    document.getElementById("unitFull").value = 20000;
    monthlyResultEl.style.display = "none";
    monthlyResultEl.innerHTML = "";
  });
}

// ---- 2) 개별 지급내역 행 단위 검증 ----
const detailTableBody = document.querySelector("#detailTable tbody");
const btnAddRow = document.getElementById("btnAddRow");
const btnClearRows = document.getElementById("btnClearRows");
const btnVerifyDetails = document.getElementById("btnVerifyDetails");
const detailSummaryEl = document.getElementById("detailSummary");

function rebuildRowNumbers() {
  const rows = detailTableBody.querySelectorAll("tr");
  rows.forEach((tr, idx) => {
    const noCell = tr.querySelector("td[data-type='no']");
    if (noCell) noCell.textContent = String(idx + 1);
  });
}

function addDetailRow(name = "", type = "half", amount = "") {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td data-type="no" style="text-align:center;"></td>
    <td>
      <input type="text" class="detail-name" placeholder="성명" value="${escapeHtml(
        name
      )}" />
    </td>
    <td>
      <select class="detail-type">
        <option value="half"${
          type === "half" ? " selected" : ""
        }>관내-반일(4시간 미만)</option>
        <option value="full"${
          type === "full" ? " selected" : ""
        }>관내-종일(4시간 이상)</option>
      </select>
    </td>
    <td>
      <input type="number" class="detail-paid numeric" min="0" step="100"
             placeholder="지급액" value="${
               amount !== "" ? escapeHtml(amount) : ""
             }" />
    </td>
    <td class="detail-expected numeric">-</td>
    <td class="detail-result" style="text-align:left; font-size:0.95rem;">-</td>
  `;
  detailTableBody.appendChild(row);
  rebuildRowNumbers();
}

// 초기 한 줄 생성
if (detailTableBody && detailTableBody.children.length === 0) {
  addDetailRow();
}

if (btnAddRow) {
  btnAddRow.addEventListener("click", () => {
    addDetailRow();
  });
}

if (btnClearRows) {
  btnClearRows.addEventListener("click", () => {
    if (!confirm("모든 행을 삭제하시겠습니까?")) return;
    detailTableBody.innerHTML = "";
    addDetailRow();
    detailSummaryEl.style.display = "none";
    detailSummaryEl.innerHTML = "";
  });
}

if (btnVerifyDetails) {
  btnVerifyDetails.addEventListener("click", () => {
    const unitHalf = toNumber(
      document.getElementById("detailUnitHalf").value
    );
    const unitFull = toNumber(
      document.getElementById("detailUnitFull").value
    );

    if (unitHalf <= 0 || unitFull <= 0) {
      alert("반일/종일 단가를 0보다 큰 값으로 입력해 주세요.");
      return;
    }

    const rows = detailTableBody.querySelectorAll("tr");
    if (rows.length === 0) {
      alert("검증할 행이 없습니다. 행을 추가해 주세요.");
      return;
    }

    let totalExpected = 0;
    let totalPaid = 0;
    let mismatchCount = 0;

    rows.forEach((tr) => {
      const nameInput = tr.querySelector(".detail-name");
      const typeSelect = tr.querySelector(".detail-type");
      const paidInput = tr.querySelector(".detail-paid");
      const expectedCell = tr.querySelector(".detail-expected");
      const resultCell = tr.querySelector(".detail-result");

      const name = (nameInput.value || "").trim();
      const type = typeSelect.value;
      const paid = toNumber(paidInput.value);

      // 이름·금액 모두 비어있으면 빈 행으로 보며 스킵
      if (!name && paid === 0) {
        expectedCell.textContent = "-";
        resultCell.textContent = "입력 없음";
        resultCell.style.color = "#666";
        return;
      }

      const expected = type === "half" ? unitHalf : unitFull;

      expectedCell.textContent = expected.toLocaleString("ko-KR");
      totalExpected += expected;
      totalPaid += paid;

      if (paid === expected) {
        resultCell.textContent = "일치";
        resultCell.style.color = "#15803d"; // 녹색 계열
      } else {
        mismatchCount += 1;
        const diff = paid - expected;
        const diffText =
          diff > 0
            ? `과지급 가능성: +${diff.toLocaleString("ko-KR")}원`
            : `미지급/누락 가능성: ${diff.toLocaleString("ko-KR")}원`;
        resultCell.textContent = `불일치 (${diffText})`;
        resultCell.style.color = "#b91c1c"; // 붉은 계열
      }
    });

    const totalDiff = totalPaid - totalExpected;

    detailSummaryEl.style.display = "block";
    detailSummaryEl.innerHTML = `
      <p><strong>행 단위 검증 요약</strong></p>
      <div class="result-line">
        <div class="result-label">규정상 기대 총액</div>
        <div class="result-value">${formatWon(totalExpected)}</div>
      </div>
      <div class="result-line">
        <div class="result-label">입력된 지급액 총합</div>
        <div class="result-value">${formatWon(totalPaid)}</div>
      </div>
      <div class="result-line">
        <div class="result-label">차이(지급합계 - 기대액)</div>
        <div class="result-value">${formatWon(totalDiff)}</div>
      </div>
      <p class="muted local-small" style="margin-top:8px;">
        · 불일치 행 수: <strong>${mismatchCount}개</strong><br />
        · 수당·실비가 섞여 있거나, 왕복 2km 이내 근거리·운전원 특례 등은 여비명세서·출장명령서와 함께 별도로 검토해야 합니다.
      </p>
    `;
  });
}
