# -*- coding: utf-8 -*-
"""Chạy bộ eval assistant-eval-v1.jsonl qua endpoint thật, ghi kết quả ra
report.md để chấm tay (concept-chatbot-v1.md §11 — "chấm tay", không có nó
thì mọi thay đổi retrieval đều là cảm giác).

Dùng: python run_eval.py <base_url> <email> <password> <eval_file> <out_file>
"""
import io
import json
import sys
import urllib.request


def post(url, body, token=None):
    headers = {"Content-Type": "application/json; charset=utf-8"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    base_url, email, password, eval_file, out_file = sys.argv[1:6]
    token = post(f"{base_url}/api/v1/auth/login", {"email": email, "password": password})["accessToken"]

    cases = [json.loads(line) for line in io.open(eval_file, encoding="utf-8") if line.strip()]
    out = io.open(out_file, "w", encoding="utf-8")
    out.write(f"# Eval report — {len(cases)} câu\n\n")

    by_category = {}
    for i, case in enumerate(cases, 1):
        print(f"[{i}/{len(cases)}] {case['id']} {case['category']}: {case['question'][:50]}")
        try:
            res = post(f"{base_url}/api/v1/assistant/messages", {"question": case["question"]}, token)
        except Exception as e:
            res = {"answer": f"LỖI: {e}", "blocked": None, "sourceTitles": [], "toolsCalled": [], "guardResult": "ERROR"}
        by_category.setdefault(case["category"], []).append((case, res))

    for category, items in by_category.items():
        out.write(f"\n## {category} ({len(items)} câu)\n\n")
        for case, res in items:
            out.write(f"### {case['id']} — {case['question']}\n\n")
            out.write(f"- Ghi chú: {case.get('note', '')}\n")
            out.write(f"- blocked: `{res.get('blocked')}` · guardResult: `{res.get('guardResult')}`\n")
            out.write(f"- sourceTitles: {res.get('sourceTitles')}\n")
            out.write(f"- toolsCalled: {res.get('toolsCalled')}\n")
            out.write(f"- Trả lời:\n\n> {res.get('answer', '').replace(chr(10), chr(10) + '> ')}\n\n")

    out.close()
    print(f"\nXong. Ghi vào {out_file}")


if __name__ == "__main__":
    main()
