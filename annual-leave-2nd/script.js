// yyyy-mm-dd 또는 셀 값에서 날짜 뽑기
function parseDate(idOrEl) {
  var el = typeof idOrEl === "string" ? document.getElementById(idOrEl) : idOrEl;
  var v = el ? (el.value || el.textContent || "") : "";
  if (!v) return null;
  // yyyy-mm-dd 형태만 잘라서 00시로
  return new Date(String(v).slice(0, 10) + "T00:00:00");
}

// 토요일 제외 근무일수 계산
function countDaysExcludingSaturday(start, end) {
  if (!start || !end) return 0;
  var cnt = 0;
  var d = new Date(start);
  while (d <= end) {
    if (d.getDay() !== 6) cnt++;
    d.setDate(d.getDate() + 1);
  }
  return cnt;
}

function yearsBetween(start, end) {
  if (!start || !end) return 0;
  var y = end.getFullYear() - start.getFullYear();
  var tmp = new Date(start);
  tmp.setFullYear(start.getFullYear() + y);
  if (tmp > end) y--;
  return y;
}

// 2자리 0패딩
function z(n) {
  return ("0" + n).slice(-2);
}

/* 나이스 엑셀 관련 유틸 */

var niceWorkbook = null;

// 시간, 분 단위 문자열을 숫자로 변환환
// 기준: 1일 = 8시간
function parseNiceDurationToDays(text) {
  if (!text) return 0;
  var s = String(text).trim();

  var day = 0, hour = 0, min = 0;
  var m;

  m = s.match(/(\d+)\s*일/);
  if (m) day = parseInt(m[1], 10) || 0;

  m = s.match(/(\d+)\s*시간/);
  if (m) hour = parseInt(m[1], 10) || 0;

  m = s.match(/(\d+)\s*분/);
  if (m) min = parseInt(m[1], 10) || 0;

  var totalMinutes = hour * 60 + min;
  var dayFromTime = totalMinutes / (8 * 60); // 8시간 = 1일 기준

  return day + dayFromTime;
}

// 부여일수/사용일수 가지고 미사용일수 다시 계산
function updateUnusedLeave() {
  var grantedEl = document.getElementById("grantedLeaveDays");
  var usedEl    = document.getElementById("usedLeaveFromNice");
  var unusedEl  = document.getElementById("unusedLeaveDays");
  if (!grantedEl || !usedEl || !unusedEl) return;

  var granted = parseFloat(grantedEl.value || "0") || 0;
  var used    = parseFloat(usedEl.value || "0") || 0;
  var unused  = granted - used;
  if (unused < 0) unused = 0;

  if (unused) {
    unusedEl.value = unused.toFixed(3).replace(/\.?0+$/, "");
  } else {
    unusedEl.value = "";
  }
}

// 나이스 엑셀 워크북에서 연차 사용일수 합산
function handleNiceWorkbook(wb) {
  if (!wb || !wb.SheetNames || !wb.SheetNames.length) {
    alert("엑셀 워크북을 읽지 못했습니다.");
    return;
  }

  // 기본값: 첫 번째 시트, 있으면 "근무상황목록" 우선
  var sheetName = wb.SheetNames[0];
  if (wb.SheetNames.indexOf("근무상황목록") !== -1) {
    sheetName = "근무상황목록";
  }
  var ws = wb.Sheets[sheetName];
  if (!ws) {
    alert("시트 '근무상황목록'을 찾을 수 없습니다.");
    return;
  }

  // 헤더 기준 JSON으로 변환
  var rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  var totalDays = 0;

  rows.forEach(function (row) {
    // 열 이름이 살짝 다를 수도 있으니 비슷한 이름도 한 번 더 시도
    var statusType = row["근무상황"] || row["근무 상황"];
    var duration   = row["일수/기간"] || row["일수 / 기간"];
    var leaveType  = row["연가신청구분"] || row["연가 신청구분"];
    var approve    = row["결재상태"] || row["결재 상태"];
    var delFlag    = row["삭제여부"] || row["삭제 여부"];

    // 연가 여부: "연가"라는 단어가 들어간 신청구분만 집계 (금년도연가 포함)
    var isLeaveReq = leaveType && String(leaveType).indexOf("연가") !== -1;

    // 결재상태: "완결"만 인정 (없으면 일단 통과)
    var isApproved = !approve || String(approve).indexOf("완결") !== -1;

    // 삭제여부: '삭제'만 제외, '미삭제'는 포함
    var delText   = (delFlag || "").toString().trim();
    var isDeleted = (delText === "삭제");

    if (!isLeaveReq || !duration || !isApproved || isDeleted) return;

    totalDays += parseNiceDurationToDays(duration);
  });

  var usedEl = document.getElementById("usedLeaveFromNice");
  if (usedEl) {
    if (totalDays) {
      usedEl.value = totalDays.toFixed(3).replace(/\.?0+$/, "");
    } else {
      usedEl.value = "";
    }
  }

  // 사용일수 반영 후 미사용일수 재계산
  updateUnusedLeave();

  alert("나이스 연동 계산: " +
    (totalDays || 0).toFixed(3).replace(/\.?0+$/, "") + "일");
}

/*  제외기간 */

function addEx() {
  var box = document.getElementById("exList");
  if (!box) return;

  var wrap = document.createElement("div");
  wrap.className = "exitem";
  wrap.innerHTML =
    '<div class="row">' +
      '<div>' +
        '<label>사유</label>' +
        '<input type="text" class="exReason" placeholder="예: 무급급휴직">' +
      '</div>' +
      '<div>' +
        '<label>시작</label>' +
        '<input type="date" class="exStart">' +
      '</div>' +
    '</div>' +
    '<div class="row">' +
      '<div>' +
        '<label>종료</label>' +
        '<input type="date" class="exEnd">' +
      '</div>' +
      '<div style="display:flex;align-items:flex-end">' +
        '<button class="btn delExBtn" type="button">삭제</button>' +
      '</div>' +
    '</div>';

  box.appendChild(wrap);

  // 삭제 버튼
  var del = wrap.querySelector(".delExBtn");
  if (del) {
    del.addEventListener("click", function () {
      wrap.remove();
      calc();
    });
  }

  // 행추가 시 자동 계산
  wrap.querySelectorAll("input").forEach(function (el) {
    el.addEventListener("input", calc);
    el.addEventListener("change", calc);
  });

  calc();
}

function calc() {
  // 1. 입력값 수집
  var ps = parseDate("periodStart");
  var pe = parseDate("periodEnd");
  var vac1s = parseDate("vac1Start");
  var vac1e = parseDate("vac1End");
  var vac2s = parseDate("vac2Start");
  var vac2e = parseDate("vac2End");
  var absS = parseDate("absStart");
  var absE = parseDate("absEnd");

  var vac1Work = parseInt(document.getElementById("vac1Work").value || "0", 10);
  var vac2Work = parseInt(document.getElementById("vac2Work").value || "0", 10);

  // 2. 기본 일수 계산 (토요일 제외)
  var total = countDaysExcludingSaturday(ps, pe);        // 달력상 총일수 (토요일 제외)
  var vac1  = countDaysExcludingSaturday(vac1s, vac1e);  // 여름방학
  var vac2  = countDaysExcludingSaturday(vac2s, vac2e);  // 겨울방학
  var abs   = countDaysExcludingSaturday(absS, absE);    // 결근

  // 3. 제외기간 누적
  var excl = (function () {
    var items = document.querySelectorAll("#exList .exitem");
    var t = 0;
    for (var i = 0; i < items.length; i++) {
      var s = items[i].querySelector(".exStart");
      var e = items[i].querySelector(".exEnd");
      if (s && e && s.value && e.value) {
        t += countDaysExcludingSaturday(
          new Date(s.value + "T00:00:00"),
          new Date(e.value + "T00:00:00")
        );
      }
    }
    return t;
  })();

  // 4. 학기 총일수 / 근무일수
  var semester      = total - (vac1 + vac2);              // 학기 총일수
  var daysNoVacWork = semester - excl - abs;              // 방중출근 제외 전
  var worked        = daysNoVacWork + vac1Work + vac2Work; // 실제 근무일수(방중출근 포함)

  // 5. 화면 반영: 일수 관련
  var daysSemesterEl   = document.getElementById("daysSemester");
  var daysNoVacWorkEl  = document.getElementById("daysNoVacWork");
  var daysWorkedEl     = document.getElementById("daysWorked");

  if (daysSemesterEl)  daysSemesterEl.value  = semester      || 0;
  if (daysNoVacWorkEl) daysNoVacWorkEl.value = daysNoVacWork || 0;
  if (daysWorkedEl)    daysWorkedEl.value    = worked        || 0;

  // 6. 근속 / 기본연차 계산
  var type = (document.getElementById("type") || {}).value || "상시근무자";
  var base = (type === "상시근무자") ? 15 : 12; // 방학중비상시는 12일

  // 기준일(연차 부여 기준일): 기간 종료일 + 1일
  var peNext     = pe ? new Date(pe.getTime() + 24 * 3600 * 1000) : null;
  var targetYear = peNext ? peNext.getFullYear() : (new Date()).getFullYear();
  var grantOrg   = (document.getElementById("grantOrg") || {}).value || "기관";
  var ref        = new Date(targetYear, grantOrg === "기관" ? 0 : 2, 1); // 0=1월, 2=3월

  var firstHire = parseDate("firstHire");
  var years     = yearsBetween(firstHire, ref);
  var extra     = firstHire ? Math.floor(Math.max(years - 1, 0) / 2) : 0;

  // 7. 화면 반영: 기본연차/근속/기준일
  var baseLeaveEl   = document.getElementById("baseLeave");
  var yearsEl       = document.getElementById("years");
  var extraLeaveEl  = document.getElementById("extraLeave");
  var refDateEl     = document.getElementById("refDate");

  if (baseLeaveEl)  baseLeaveEl.value  = base;
  if (yearsEl)      yearsEl.value      = years;
  if (extraLeaveEl) extraLeaveEl.value = extra;
  if (ref && refDateEl) {
    refDateEl.value =
      ref.getFullYear() + "." + z(ref.getMonth() + 1) + "." + z(ref.getDate());
  }

  // 8. 연차 부여 규칙 텍스트 (학기 기준 / 달력상 총일수 기준)
  function ratio(a, b) {
    return (b > 0) ? (a / b) : 0;
  }

  var semText = "-";
  if (type !== "상시근무자") {
    var r1 = ratio(worked, semester);
    var r2 = ratio(worked, semester - excl); // 제외기간 빼고 출근율
    if (r1 >= 0.8) {
      semText = (base + extra) + " 일";
    } else if (r1 < 0.8 && r2 >= 0.8) {
      semText = ((base + extra) * (semester - excl) / semester).toFixed(2)
        + " 일 (비율부여)";
    } else {
      semText = "개근 월수만큼 부여";
    }
  }

  var r3 = ratio(worked, total);
  var r4 = ratio(worked, total - excl);
  var calText = "-";
  if (r3 >= 0.8) {
    calText = (15 + extra) + " 일";
  } else if (r3 < 0.8 && r4 >= 0.8) {
    calText = ((15 + extra) * (total - excl) / total).toFixed(2)
      + " 일 (비율부여)";
  } else {
    calText = "개근 월수만큼 부여";
  }

  var ruleSemesterEl = document.getElementById("ruleSemester");
  var ruleCalendarEl = document.getElementById("ruleCalendar");
  if (ruleSemesterEl) ruleSemesterEl.innerText = semText;
  if (ruleCalendarEl) ruleCalendarEl.innerText = calText;

  // 9. 달력 기준 연차 부여일수 숫자만 따로 빼서 input에 저장 (미사용일수 계산용)
  var grantedEl = document.getElementById("grantedLeaveDays");
  if (grantedEl) {
    var mCal = (calText || "").match(/([0-9]+(\.[0-9]+)?)\s*일/);
    if (mCal) {
      grantedEl.value = mCal[1];
    } else {
      grantedEl.value = "";
    }
  }

  // 연차 부여일수 변경됐으니 미사용일수 재계산
  updateUnusedLeave();
}

function downloadHwp() {
  // hwp 구현은 진짜 hwp가 아니라 html 다운로드 트릭
  var jobSel  = document.getElementById("jobSelect");
  var jobVal  = jobSel ? jobSel.value : "";
  var job     = (jobVal === "직접 입력")
    ? ((document.getElementById("jobCustom") || {}).value || "")
    : jobVal;

  var name      = (document.getElementById("empName")    || {}).value || "";
  var firstHire = (document.getElementById("firstHire")  || {}).value || "";
  var orgName   = (document.getElementById("orgName")    || {}).value || "";
  var refDate   = (document.getElementById("refDate")    || {}).value || "";
  var ruleCal   = (document.getElementById("ruleCalendar") || {}).innerText || "";

  var leaveDays = "";
  var m = (ruleCal || "").match(/([0-9]+(\.[0-9]+)?)\s*일/);
  if (m) leaveDays = m[1];

  var ymd = (refDate || new Date().toISOString().slice(0, 10)).replace(/-/g, ".");

  // 출근율 체크용 (학기 기준)
  var ps = parseDate("periodStart");
  var pe = parseDate("periodEnd");
  var vac1s = parseDate("vac1Start");
  var vac1e = parseDate("vac1End");
  var vac2s = parseDate("vac2Start");
  var vac2e = parseDate("vac2End");
  var absS  = parseDate("absStart");
  var absE  = parseDate("absEnd");

  var total = countDaysExcludingSaturday(ps, pe);
  var vac1  = countDaysExcludingSaturday(vac1s, vac1e);
  var vac2  = countDaysExcludingSaturday(vac2s, vac2e);
  var semester = total - (vac1 + vac2);

  var excl = (function () {
    var items = document.querySelectorAll("#exList .exitem");
    var t = 0;
    for (var i = 0; i < items.length; i++) {
      var s = items[i].querySelector(".exStart");
      var e = items[i].querySelector(".exEnd");
      if (s && e && s.value && e.value) {
        t += countDaysExcludingSaturday(
          new Date(s.value + "T00:00:00"),
          new Date(e.value + "T00:00:00")
        );
      }
    }
    return t;
  })();

  var abs   = countDaysExcludingSaturday(absS, absE);
  var daysNoVacWork = semester - excl - abs;
  var vac1Work = parseInt((document.getElementById("vac1Work") || {}).value || "0", 10);
  var vac2Work = parseInt((document.getElementById("vac2Work") || {}).value || "0", 10);
  var worked   = daysNoVacWork + vac1Work + vac2Work;
  var r1       = (semester > 0) ? worked / semester : 0;
  var chk80    = r1 >= 0.8
    ? "80% 이상 ( ○ )<br>80% 미만 (   )"
    : "80% 이상 (   )<br>80% 미만 ( ○ )";

  var html =
    '<html><head><meta charset="utf-8"><title>연차휴가일수 통보서</title></head>' +
    '<body style="font-family:Malgun Gothic,Arial,sans-serif; line-height:1.6">' +
    '<h2 style="text-align:center;margin-top:40px">교육공무직 연차휴가일수 및 보수표 통보서</h2>' +
    '<table border="1" cellspacing="0" cellpadding="8" ' +
    'style="width:100%; border-collapse:collapse; margin-top:24px">' +
    '<tr><th>직 종</th><th>근로자</th><th>최초임용일</th><th>전년도 출근율</th><th>연차휴가일수</th><th>비고</th></tr>' +
    '<tr>' +
    '<td style="text-align:center">' + (job || "")       + '</td>' +
    '<td style="text-align:center">' + (name || "")      + '</td>' +
    '<td style="text-align:center">' + (firstHire || "") + '</td>' +
    '<td style="text-align:center">' + chk80             + '</td>' +
    '<td style="text-align:center">' + (leaveDays ? (leaveDays + "일") : "") + '</td>' +
    '<td></td>' +
    '</tr></table>' +
    '<p style="margin-top:12px">불입 직종별 보수표 사본 1부.</p>' +
    '<p style="margin-top:32px; text-align:right">' + (orgName || "") + '장 &nbsp;&nbsp;&nbsp;&nbsp;</p>' +
    '<p style="margin-top:8px; text-align:right">' + ymd + '</p>' +
    '</body></html>';

  var blob = new Blob([html], { type: "text/html;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "연차휴가일수_통보서.hwp";  // 확장자만 hwp로
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}

document.addEventListener("DOMContentLoaded", function () {
  // 제외기간 추가 버튼
  var btn = document.getElementById("addExBtn");
  if (btn) btn.addEventListener("click", addEx);

  // 모든 input/select에 계산 바인딩
  function bindAll() {
    var fields = document.querySelectorAll("input,select");
    for (var i = 0; i < fields.length; i++) {
      if (fields[i]._boundCalc) continue;
      fields[i].addEventListener("input", calc);
      fields[i].addEventListener("change", calc);
      fields[i]._boundCalc = true;
    }
  }
  bindAll();

  // 동적 노드 감시
  var obs = new MutationObserver(function () {
    bindAll();
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // 직종 직접입력 토글
  (function () {
    function toggleJobCustom() {
      var sel    = document.getElementById("jobSelect");
      var custom = document.getElementById("jobCustom");
      if (!sel || !custom) return;
      custom.style.display = (sel.value === "직접 입력") ? "block" : "none";
    }
    document.addEventListener("change", function (e) {
      if (e.target && e.target.id === "jobSelect") toggleJobCustom();
    });
    toggleJobCustom();
  })();

  // 통보서 다운로드 버튼 (선택 사용)
  var dlBtn = document.getElementById("btnDownloadHwp");
  if (dlBtn) dlBtn.addEventListener("click", downloadHwp);

  // 나이스 엑셀 업로드 핸들러: 여기서는 파일만 읽어서 niceWorkbook에 저장
  var niceInput = document.getElementById("niceFile");
  if (niceInput) {
    niceInput.addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function (evt) {
        try {
          var data = evt.target.result;
          niceWorkbook = XLSX.read(data, { type: "array" });
          alert("엑셀 파일 업로드 완료.\n이제 '계산하기' 버튼을 눌러주세요.");
        } catch (err) {
          console.error("오류:", err);
          alert("파일 못 읽음. 서식 확인 바람.");
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // 나이스 연차 사용일수 계산 버튼
  var btnNiceCalc = document.getElementById("btnNiceCalc");
  if (btnNiceCalc) {
    btnNiceCalc.addEventListener("click", function () {
      if (!niceWorkbook) {
        alert("엑셀 먼저 업로드하쇼쇼.");
        return;
      }
      handleNiceWorkbook(niceWorkbook);
    });
  }

  // 미사용수당 계산 버튼
  var btnUnused = document.getElementById("btnCalcUnused");
  if (btnUnused) {
    btnUnused.addEventListener("click", function () {
      updateUnusedLeave(); // 혹시 값이 안 맞아 있을 수 있으니 한 번 더 정리
      var dailyEl  = document.getElementById("dailyWage");
      var unusedEl = document.getElementById("unusedLeaveDays");
      var resultEl = document.getElementById("unusedLeavePay");
      if (!dailyEl || !unusedEl || !resultEl) return;

      var daily  = parseFloat(dailyEl.value || "0") || 0;
      var unused = parseFloat(unusedEl.value || "0") || 0;
      var pay    = daily * unused;

      if (!pay) {
        resultEl.value = "";
      } else {
        resultEl.value = pay.toLocaleString("ko-KR") + "원";
      }
    });
  }

  // 최초 1회 계산
  calc();
});
