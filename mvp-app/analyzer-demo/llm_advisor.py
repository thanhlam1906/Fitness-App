# -*- coding: utf-8 -*-
"""
Lớp LLM diễn giải (opt-in): rule engine đo & kết luận → LLM (DeepSeek) phân tích
các SỐ LIỆU đã đo để viết góp ý tự nhiên như huấn luyện viên.

Nguyên tắc an toàn (đặc tả N3):
- LLM KHÔNG nhìn video — chỉ nhận bảng số liệu đã được rule engine kiểm chứng.
- LLM KHÔNG được bịa số, KHÔNG được thay đổi kết luận đạt/chưa đạt.
- LLM lỗi / thiếu key → hệ thống vẫn chạy bình thường với lời khuyên từ rule.

Bật: tạo file .env cạnh main.py với nội dung:
    DEEPSEEK_API_KEY=sk-...
    DEEPSEEK_MODEL=deepseek-chat   (tùy chọn; mặc định deepseek-chat)
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict

API_URL = "https://api.deepseek.com/chat/completions"
STATUS_VI = {"pass": "ĐẠT", "warn": "CẦN CHÚ Ý", "fail": "CHƯA ĐẠT", "na": "KHÔNG KIỂM TRA (do góc quay)"}

SYSTEM_PROMPT = (
    "Bạn là huấn luyện viên thể hình tận tâm, viết góp ý ngắn gọn bằng tiếng Việt. "
    "Bạn CHỈ được phân tích dựa trên các số liệu đo được cung cấp dưới đây. "
    "Quy tắc bắt buộc:\n"
    "1. Tuyệt đối KHÔNG bịa thêm số đo nào ngoài số liệu được cung cấp; khi cần nhắc số, "
    "chỉ dùng đúng số đã cho.\n"
    "2. KHÔNG thay đổi kết luận ĐẠT/CHƯA ĐẠT của hệ thống.\n"
    "3. KHÔNG chẩn đoán y khoa, không khuyên bất cứ điều gì nguy hiểm.\n"
    "4. Giọng động viên, thực dụng, ngôn ngữ hành động.\n"
    "5. Tối đa 120 từ. Cấu trúc: (1) nhận xét chính về các số liệu; "
    "(2) nếu có điểm cần sửa: MỘT hướng dẫn khắc phục cụ thể; "
    "(3) nếu mọi thứ đều đạt: khen ngắn + một mẹo để buổi sau tốt hơn."
)


def _post(url: str, payload: Dict[str, Any], headers: Dict[str, str],
          timeout: int = 60) -> Dict[str, Any]:
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _build_user_content(result: Dict[str, Any]) -> str:
    lines = [
        f"BÀI TẬP: {result.get('exercise', 'squat')}",
        f"GÓC QUAY: {result.get('viewpoint', {}).get('label', '?')}",
        f"SỐ REP PHÂN TÍCH: {result.get('reps', 0)}",
        "KẾT QUẢ ĐO (nguồn chân lý — không thay đổi kết luận):",
    ]
    for c in result.get("checks", []):
        status = STATUS_VI.get(c.get("status"), c.get("status"))
        metric = f" | số liệu: {c['metric']}" if c.get("metric") else ""
        lines.append(f"- {c.get('name', '?')} [{status}]: {c.get('text', '')}{metric}")
    lines.append(f"LỖI ƯU TIÊN (do hệ thống xác định): {result.get('primary_advice') or 'không có'}")
    if result.get("notes"):
        lines.append("GHI CHÚ KỸ THUẬT: " + " / ".join(result["notes"]))
    return "\n".join(lines)


def advise(result: Dict[str, Any]) -> Dict[str, Any]:
    """Trả phân tích LLM (DeepSeek) cho một kết quả rule engine.

    Không bao giờ ném exception — mọi lỗi đều chuyển thành trường 'error'.
    """
    key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not key:
        return {"enabled": False, "ok": False, "model": None, "advice": None,
                "reason": "chưa cấu hình DEEPSEEK_API_KEY"}
    model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat").strip()
    payload = {
        "model": model,
        "max_tokens": 600,
        "temperature": 0.6,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_content(result)},
        ],
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    try:
        data = _post(API_URL, payload, headers)
        choice = (data.get("choices") or [{}])[0]
        text = (choice.get("message") or {}).get("content", "").strip()
        return {"enabled": True, "ok": bool(text), "model": model, "advice": text or None,
                "error": None if text else "LLM trả kết quả rỗng"}
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = json.loads(exc.read().decode("utf-8", "ignore")).get("error", {}).get("message", "")
        except Exception:
            pass
        return {"enabled": True, "ok": False, "model": model, "advice": None,
                "error": f"HTTP {exc.code} từ DeepSeek" + (f": {detail}" if detail else "")}
    except Exception as exc:  # timeout, mạng, parse lỗi...
        return {"enabled": True, "ok": False, "model": model, "advice": None,
                "error": str(exc)[:200]}
