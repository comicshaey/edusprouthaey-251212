from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List


# ============================================================
# 0. 공통 도메인 모델
# ============================================================

@dataclass
class RuleProfile:
    """규정 세트 메타 정보.
    - id: 내부용 키
    - name: 화면 표시용 이름
    - grant_type: 연차 부여 로직 구분용 키
    - rounding_step: 금액 절사 단위 (예: 10원, 100원 등)
    - rounding_mode: floor / round / ceil / none
    - description: 규정 세트 설명
    """
    id: str
    name: str
    grant_type: str
    rounding_step: int = 10        # 기본: 10원 단위
    rounding_mode: str = "floor"   # 기본: 버림
    description: str = ""


# 규정 세트 정의
RULES: Dict[str, RuleProfile] = {
    "law_basic": RuleProfile(
        id="law_basic",
        name="법정 기본형 (근로기준법 단순)",
        grant_type="law_basic",
        rounding_step=10,
        rounding_mode="floor",
        description="근로기준법을 단순화한 기본형 예시입니다."
    ),
    "gw_school_cba": RuleProfile(
        id="gw_school_cba",
        name="학교근무자 CBA 예시",
        grant_type="gw_cba_like",
        rounding_step=10,
        rounding_mode="floor",
        description="강원 교육공무직(학교근무자) 단체협약을 흉내낸 예시입니다. 실제 조항은 협약 원문을 확인해야 합니다."
    ),
    "gw_institute_cba": RuleProfile(
        id="gw_institute_cba",
        name="기관근무자 CBA 예시",
        grant_type="gw_cba_like",
        rounding_step=10,
        rounding_mode="floor",
        description="기관근무자 CBA 느낌의 예시입니다. 실제 규정은 원문을 기준으로 수정해야 합니다."
    ),
    "gw_wage_guideline": RuleProfile(
        id="gw_wage_guideline",
        name="통상임금 지침형 (연차일수 외부 산정)",
        grant_type="manual_days",
        rounding_step=10,
        rounding_mode="floor",
        description="연차일수는 외부에서 별도 산정하고, 여기서는 수당계산만 하는 모드입니다."
    ),
    "custom": RuleProfile(
        id="custom",
        name="커스텀 (연차·절사 규칙 수동)",
        grant_type="manual_days",
        rounding_step=10,
        rounding_mode="floor",
        description="연차일수와 절사 규칙을 사용자가 직접 관리하는 모드입니다."
    ),
}


def get_rule(rule_id: str) -> RuleProfile:
    """ID로 규정 세트를 가져오되, 없으면 law_basic으로 fallback."""
    return RULES.get(rule_id, RULES["law_basic"])


# ============================================================
# 1. 나이스 근무상황목록 파싱용 모델
# ============================================================

@dataclass
class NiceRecord:
    """나이스 근무상황목록 한 행을 파싱하기 위한 최소 구조.
    - leave_type: 종별(연가, 병가, 공가 등)
    - duration_raw: '일수/기간' 열 문자열 (예: '0일 6시간 30분', '6:30', '1.5일')
    - hours_per_day: 1일 소정근로시간 (소수 허용)
    """
    leave_type: str
    duration_raw: str
    hours_per_day: float = 8.0

    def to_minutes(self) -> int:
        """duration_raw를 분 단위 정수로 변환.
        다양한 표현을 최대한 수용하고, 해석 실패 시 0분으로 처리한다.
        지원 패턴 예:
          - '0일 6시간 30분'
          - '6시간 30분'
          - '6시간'
          - '1일 0시간'
          - '1일'
          - '1.5일'
          - '6:30' 또는 '06:30'
        """
        s = (self.duration_raw or "").strip()
        if not s:
            return 0

        # 공백 제거 버전도 같이 활용
        s_nospace = s.replace(" ", "")

        days = 0.0
        hours = 0.0
        minutes = 0.0

        # 1) "h:mm" 형태인지 먼저 확인 (일 단위 표기가 없을 때만)
        if ":" in s_nospace and "일" not in s_nospace:
            try:
                h_str, m_str = s_nospace.split(":", 1)
                hours = float(h_str or "0")
                minutes = float(m_str or "0")
                return int(round(hours * 60 + minutes))
            except Exception:
                # 실패하면 아래 규칙 계속 진행
                pass

        # 2) "x일 y시간 z분" / "x일 y시간" / "y시간 z분" / "y시간" / "z분"
        import re

        # 일
        m_day = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*일", s_nospace)
        if m_day:
            days = float(m_day.group(1))

        # 시간
        m_hour = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*시간", s_nospace)
        if m_hour:
            hours = float(m_hour.group(1))

        # 분
        m_min = re.search(r"([0-9]+)\s*분", s_nospace)
        if m_min:
            minutes = float(m_min.group(1))

        if days or hours or minutes:
            total_minutes = days * self.hours_per_day * 60 + hours * 60 + minutes
            return int(round(total_minutes))

        # 3) '1.5일'처럼 일만 있는 케이스
        if s_nospace.endswith("일"):
            num_str = s_nospace[:-1]
            try:
                days = float(num_str)
                total_minutes = days * self.hours_per_day * 60
                return int(round(total_minutes))
            except Exception:
                pass

        # 4) 순수 숫자만 들어온 경우: "2" → 2일로 가정
        if s_nospace.isdigit():
            try:
                days = float(s_nospace)
                total_minutes = days * self.hours_per_day * 60
                return int(round(total_minutes))
            except Exception:
                pass

        # 인식 실패
        return 0


def summarize_nice_records(records: List[NiceRecord]) -> List[Dict[str, Any]]:
    """NiceRecord 리스트를 종별(leave_type)별로 합산.
    반환값은 JS에서 바로 쓰기 좋은 dict 리스트 형태.
    각 항목:
      - leave_type
      - count
      - sum_d_h_m: '0일 6시간 30분' 형식
      - sum_hours_decimal: 10진법 시간(h)
      - converted_days_hours: 'X일 Y.Y시간' (1일 소정근로시간 기준)
    """
    from collections import defaultdict

    grouped_minutes: Dict[str, int] = defaultdict(int)
    grouped_count: Dict[str, int] = defaultdict(int)
    hours_per_day = 8.0

    for rec in records:
        minutes = rec.to_minutes()
        grouped_minutes[rec.leave_type] += minutes
        grouped_count[rec.leave_type] += 1
        # hours_per_day는 모두 동일하다고 가정하고 마지막 값 사용
        hours_per_day = rec.hours_per_day or hours_per_day

    results: List[Dict[str, Any]] = []
    for leave_type, total_min in grouped_minutes.items():
        cnt = grouped_count[leave_type]

        # 전체 시간(분) → 일/시/분
        total_hours = total_min / 60.0
        total_days = int(total_hours // hours_per_day)
        remain_hours = total_hours - total_days * hours_per_day
        h_part = int(remain_hours)
        m_part = int(round((remain_hours - h_part) * 60))

        sum_d_h_m = f"{total_days}일 {h_part}시간 {m_part}분"

        # 10진법 시간
        sum_hours_decimal = round(total_hours, 1)

        # 1일 소정근로시간 기준 일+시간 환산
        conv_days = total_hours / hours_per_day if hours_per_day > 0 else 0.0
        days_int = int(conv_days)
        remain_hours_dec = round((conv_days - days_int) * hours_per_day, 1)
        converted_days_hours = f"{days_int}일 {remain_hours_dec}시간"

        results.append(
            {
                "leave_type": leave_type,
                "count": cnt,
                "sum_d_h_m": sum_d_h_m,
                "sum_hours_decimal": sum_hours_decimal,
                "converted_days_hours": converted_days_hours,
            }
        )

    # 종별 이름 기준 정렬
    results.sort(key=lambda x: str(x["leave_type"]))
    return results


# ============================================================
# 2. 연차일수 추천 로직
# ============================================================

def _get_float(info: Dict[str, Any], key: str, default: float = 0.0) -> float:
    try:
        v = info.get(key, default)
        if v is None:
            return default
        return float(v)
    except Exception:
        return default


def _get_int(info: Dict[str, Any], key: str, default: int = 0) -> int:
    try:
        v = info.get(key, default)
        if v is None:
            return default
        return int(v)
    except Exception:
        return default


def suggest_annual_days(rule_id: str, service_info: Dict[str, Any]) -> Dict[str, Any]:
    """규정 세트(rule_id)와 근속·출근 요약(service_info)를 받아
    추천 연차일수와 설명을 반환한다.
    """
    rule = get_rule(rule_id)
    full_years = _get_int(service_info, "full_years", 0)
    attendance_rate = _get_float(service_info, "attendance_rate", 0.0)
    full_months = _get_int(service_info, "full_months", 0)

    # manual_days 계열은 추천값 없이 안내만
    if rule.grant_type == "manual_days":
        return {
            "suggested_days": None,
            "description": "연차일수는 외부 또는 지침에 따라 별도 산정하는 모드입니다. 부여 연차일수를 직접 입력하세요.",
        }

    # 법정 기본형
    if rule.grant_type == "law_basic":
        if full_years < 1:
            sug = min(full_months, 11)
            desc = f"법정 기본형: 1년 미만 근로, 월 개근 {full_months}개월 → {sug}일 (예시: 최대 11일)"
            return {"suggested_days": sug, "description": desc}

        if attendance_rate < 80:
            sug = full_months
            desc = (
                f"법정 기본형: 출근율 {attendance_rate:.1f}% (80% 미만) → "
                f"월 개근 {full_months}개월 = {sug}일로 단순 계산"
            )
            return {"suggested_days": sug, "description": desc}

        extra = max(0, min(10, (full_years - 1) // 2))
        sug = 15 + extra
        desc = (
            f"법정 기본형: 근속 {full_years}년 / 출근율 {attendance_rate:.1f}% → "
            f"기본 15일 + 가산 {extra}일 = {sug}일 (예시)"
        )
        return {"suggested_days": sug, "description": desc}

    # 강원 CBA 느낌
    if rule.grant_type == "gw_cba_like":
        if full_years < 1:
            sug = min(full_months, 11)
            desc = (
                f"강원 CBA 샘플: 1년 미만, 월 개근 {full_months}개월 → "
                f"{sug}일 (최대 11일 예시)"
            )
            return {"suggested_days": sug, "description": desc}

        if attendance_rate >= 80:
            sug = 26  # 실제 단협 값으로 교체 가능
            desc = (
                f"강원 CBA 샘플: 근속 {full_years}년 / 출근율 {attendance_rate:.1f}% → "
                f"{sug}일 (샘플 값)"
            )
            return {"suggested_days": sug, "description": desc}

        sug = full_months
        desc = (
            f"강원 CBA 샘플: 출근율 {attendance_rate:.1f}% (80% 미만) → "
            f"월 개근 {full_months}개월 = {sug}일로 단순 적용"
        )
        return {"suggested_days": sug, "description": desc}

    # 기타
    return {
        "suggested_days": None,
        "description": "이 규정 세트는 별도 로직이 설정되지 않았습니다. 부여 연차일수를 직접 입력하세요.",
    }


# ============================================================
# 3. 임금 / 미사용 연차수당 계산
# ============================================================

def calc_daily_wage(wage_info: Dict[str, Any]) -> float:
    """임금형태에 따라 1일 통상임금을 계산한다."""
    wage_type = str(wage_info.get("wage_type", "monthly") or "monthly")
    wage_amount = _get_float(wage_info, "wage_amount", 0.0)
    hours_per_day = _get_float(wage_info, "hours_per_day", 0.0)
    monthly_work_days = _get_float(wage_info, "monthly_work_days", 0.0)

    if wage_amount <= 0:
        return 0.0

    if wage_type == "hourly":
        if hours_per_day <= 0:
            return 0.0
        return wage_amount * hours_per_day

    if wage_type == "daily":
        return wage_amount

    # monthly
    if monthly_work_days <= 0:
        return 0.0
    return wage_amount / monthly_work_days


def apply_rounding(amount: float, rule: RuleProfile) -> float:
    """규정 세트 rounding_step/mode 적용 후,
    추가로 1원 단위 절삭(10원 단위 버림)을 공통 적용한다.
    """
    if amount is None:
        return 0.0

    step = rule.rounding_step or 1
    mode = (rule.rounding_mode or "none").lower()

    # 규정 세트 기준 1차 처리
    if step <= 1 or mode == "none":
        rounded = float(amount)
    else:
        base = float(amount) / step
        if mode == "floor":
            import math
            base = math.floor(base)
        elif mode == "round":
            base = round(base)
        elif mode == "ceil":
            import math
            base = math.ceil(base)
        rounded = base * step

    # 2차: 공통 정책 1원 절삭(10원 단위 버림)
    rounded = float(rounded)
    if rounded <= 0:
        return 0.0
    return (int(rounded) // 10) * 10


def calc_unused_payout(
    rule_id: str,
    wage_info: Dict[str, Any],
    granted_days: float,
    used_days: float,
) -> Dict[str, Any]:
    """부여/사용 연차일수와 임금 정보를 받아
    미사용 연차수당(원단위/절사 적용)을 계산한다."""
    rule = get_rule(rule_id)

    try:
        g = float(granted_days or 0.0)
    except Exception:
        g = 0.0

    try:
        u = float(used_days or 0.0)
    except Exception:
        u = 0.0

    unused = g - u
    if unused < 0:
        unused = 0.0

    daily_wage_raw = calc_daily_wage(wage_info)
    payout_raw = daily_wage_raw * unused
    payout_rounded = apply_rounding(payout_raw, rule)

    return {
        "granted_days": g,
        "used_days": u,
        "unused_days": unused,
        "daily_wage_raw": daily_wage_raw,
        "payout_raw": payout_raw,
        "payout_rounded": payout_rounded,
        "rounding_step": rule.rounding_step,
        "rounding_mode": rule.rounding_mode,
    }


# ============================================================
# 4. 전체 파이프라인
# ============================================================

def full_pipeline(
    rule_id: str,
    service_info: Dict[str, Any],
    wage_info: Dict[str, Any],
    granted_days: float,
    used_days: float,
) -> Dict[str, Any]:
    """JS(Pyodide)에서 한 번에 부를 수 있게
    - 규정 세트 메타
    - 추천 연차일수
    - 미사용 연차수당 계산 결과
    를 통합해서 반환한다.
    """
    rule = get_rule(rule_id)

    suggestion = suggest_annual_days(rule_id, service_info)

    # 부여일수가 0 또는 미입력이고, 추천 값이 있으면 그걸 기본값으로 사용
    try:
        g_input = float(granted_days or 0.0)
    except Exception:
        g_input = 0.0

    if g_input <= 0 and suggestion.get("suggested_days") is not None:
        g_input = float(suggestion["suggested_days"] or 0.0)

    payout = calc_unused_payout(
        rule_id=rule_id,
        wage_info=wage_info,
        granted_days=g_input,
        used_days=used_days or 0.0,
    )

    return {
        "rule": asdict(rule),
        "suggestion": suggestion,
        "payout": payout,
    }
