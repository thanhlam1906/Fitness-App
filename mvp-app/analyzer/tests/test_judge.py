# -*- coding: utf-8 -*-
"""Kiểm lớp chấm LLM: code bỏ mọi kết luận không trỏ đúng số đo — doc/design-cham-form-llm-v1.md §4.7.

Không cần numpy, mediapipe, mạng hay DB: judge.py và feature_keys.py cố ý không import chúng.

    python mvp-app/analyzer/tests/test_judge.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from analyzer.feature_keys import glossary, label_vi, rounded, unit  # noqa: E402
from analyzer.judge import (  # noqa: E402
    LlmError, judgment_messages, numbers_are_grounded, parse_recognition, recognition_messages,
    validate_judgment,
)
from analyzer.scoring import FAIL, LOW_CONFIDENCE, NOT_APPLICABLE, PASS, WARN  # noqa: E402

FEATURES = {"views": [
    {"clip": 1, "view": "SAGITTAL", "dominant": "hip", "reps_total": 2, "reps_used": 2,
     "reps": [{"rep": 1, "depth_ratio_P": 1.42, "torso_lean": 30},
              {"rep": 2, "depth_ratio_P": 1.05, "torso_lean": 28}]},
    {"clip": 2, "view": "FRONTAL", "dominant": "knee", "reps_total": 2, "reps_used": 0, "reps": []},
]}
EXERCISE = {"name_vi": "Squat tay không", "description": "Hạ tới khi đùi ngang sàn.", "mistakes_vi": []}
DEPTH = {"clip": 1, "rep": 1, "feature": "depth_ratio_P", "value": 1.42}


def item(name, verdict, evidence=(), cue="Hạ hông thấp hơn."):
    return {"name_vi": name, "verdict": verdict, "evidence": list(evidence), "cue_vi": cue}


def answer(*items, primary=None):
    return json.dumps({"items": list(items), "primary": primary}, ensure_ascii=False)


def judge(*items, primary=None):
    return validate_judgment(answer(*items, primary=primary), FEATURES, EXERCISE)


def expect_llm_error(fn, raw):
    try:
        fn(raw)
    except LlmError:
        return
    raise AssertionError(f"phải ném LlmError: {raw}")


def test_valid_items_kept_with_labels():
    depth, knee = judge(item("Độ sâu", FAIL, [DEPTH]), item("Gối", LOW_CONFIDENCE), primary="Độ sâu")
    assert depth["verdict"] == FAIL and depth["is_primary"] and depth["form_check_id"] is None
    assert depth["confidence"] is None and depth["cue_text_vi"] == "Hạ hông thấp hơn."
    assert depth["measured"] == {"evidence": [{
        "clip": 1, "view": "SAGITTAL", "view_vi": "ngang", "rep": 1, "feature": "depth_ratio_P",
        "label_vi": "tỉ lệ độ sâu ở điểm xa nhất", "value": 1.42, "unit": ""}]}
    assert knee["verdict"] == LOW_CONFIDENCE and knee["measured"] == {"evidence": []}
    assert not knee["is_primary"]


def test_item_with_wrong_or_unknown_evidence_dropped():
    rows = judge(item("Độ sâu", FAIL, [{**DEPTH, "value": 1.5}]),       # sai số
                 item("Thân", WARN, [{**DEPTH, "feature": "khong_co"}]),   # ô không tồn tại
                 item("Gối", WARN, [{**DEPTH, "value": "nan"}]),          # NaN so với gì cũng "không lệch"
                 item("Nghiêng", PASS, [{"clip": 1, "rep": 2, "feature": "torso_lean", "value": "28"}]))
    assert [r["name_vi"] for r in rows] == ["Nghiêng"]


def test_verdict_needs_evidence_but_not_applicable_does_not():
    rows = judge(item("Độ sâu", PASS), item("Gối", NOT_APPLICABLE), item("Thân", PASS, [DEPTH]))
    assert [(r["name_vi"], r["verdict"]) for r in rows] == [("Gối", NOT_APPLICABLE), ("Thân", PASS)]


def test_number_in_item_name_must_be_grounded_too():
    rows = judge(item("Gối dưới 90 độ", FAIL, [DEPTH]), item("Thân", PASS, [DEPTH]))
    assert [r["name_vi"] for r in rows] == ["Thân"]


def test_cue_with_number_not_in_input_dropped():
    rows = judge(item("Độ sâu", FAIL, [DEPTH], cue="Rep 1 mới tới 1.42, hạ thêm 15 cm."),
                 item("Thân", PASS, [{"clip": 1, "rep": 2, "feature": "torso_lean", "value": 28}],
                      cue="Rep 2 thân đổ 28 độ, giữ vậy."))
    assert [r["name_vi"] for r in rows] == ["Thân"]


def test_primary_falls_back_to_first_fail_then_warn():
    rows = judge(item("Thân", WARN, [DEPTH]), item("Độ sâu", FAIL, [DEPTH]), primary="Không có")
    assert [r["name_vi"] for r in rows if r["is_primary"]] == ["Độ sâu"]
    rows = judge(item("Thân", PASS, [DEPTH]), item("Độ sâu", WARN, [DEPTH]), primary="Thân")
    assert [r["name_vi"] for r in rows if r["is_primary"]] == ["Độ sâu"]
    assert not any(r["is_primary"] for r in judge(item("Thân", PASS, [DEPTH])))


def test_duplicate_names_keep_first_and_cap_five():
    rows = judge(item("Độ sâu", PASS, [DEPTH]), item("Độ sâu", FAIL, [DEPTH]))
    assert [(r["name_vi"], r["verdict"]) for r in rows] == [("Độ sâu", PASS)]
    assert len(judge(*[item(n, PASS, [DEPTH]) for n in "ABCDEGH"])) == 5


def test_nothing_valid_raises():
    # Chỉ còn mục không cần dẫn chứng cũng là lỗi: màn kết quả sẽ báo "Kỹ thuật ổn" mà không có số nào.
    for raw in ("khong phai json", '{"items": []}', '{"items": "x"}', "[1, 2]",
                answer(item("Độ sâu", FAIL)), answer(item("Gối", NOT_APPLICABLE), item("Hông", LOW_CONFIDENCE))):
        expect_llm_error(lambda r: validate_judgment(r, FEATURES, EXERCISE), raw)


def test_parse_recognition():
    slugs = {"bodyweight-squat", "push-up"}
    assert parse_recognition('{"exercise": "push-up"}', slugs) == "push-up"
    assert parse_recognition('{"exercise": "unknown"}', slugs) is None
    assert parse_recognition('{"exercise": "deadlift"}', slugs) is None   # không có trong danh sách
    for raw in ("khong phai json", "[]"):
        expect_llm_error(lambda r: parse_recognition(r, slugs), raw)


def test_messages_carry_features_and_ask_for_json():
    msgs = judgment_messages(EXERCISE, FEATURES)
    body = json.loads(msgs[1]["content"])
    assert body["views_recorded"] == ["SAGITTAL", "FRONTAL"] and body["features"] == FEATURES
    assert "JSON" in msgs[0]["content"]   # chế độ json_object của OpenAI đòi chữ JSON trong prompt
    msgs = recognition_messages(FEATURES, [{"slug": "push-up"}])
    assert json.loads(msgs[1]["content"])["candidates"] == [{"slug": "push-up"}]
    assert "JSON" in msgs[0]["content"]


def test_feature_keys():
    assert label_vi("knee_l_P") == "góc gối trái ở điểm xa nhất"
    assert label_vi("knee_in") == "gối chụm vào trong"
    assert label_vi("la_lam") == "la_lam"
    assert rounded("depth_ratio", 1.4249) == 1.42 and rounded("knee_l", 94.6) == 95
    assert isinstance(rounded("knee_l", 94.6), int)
    assert "knee_l_S, knee_l_P" in glossary()
    # Góc có °, tỉ lệ không đơn vị: "thân đổ thêm 31°" chứ không phải "thân đổ thêm 31".
    assert (unit("torso_lean"), unit("knee_l_S"), unit("depth_ratio_P"), unit("knee_in")) == ("°", "°", "", "")


def test_numbers_are_grounded():
    assert numbers_are_grounded("Rep 4 sâu 1.42", '{"rep": 4, "v": 1.42}')
    assert not numbers_are_grounded("Hạ thêm 15 cm", '{"rep": 4}')


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("OK", name)
