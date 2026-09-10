# -*- coding: utf-8 -*-
"""Đọc clip và XOÁ clip.

N2 của đặc tả §3: ai đọc file cuối cùng thì người đó xoá. Analyzer xoá, không
phải Spring Boot xoá — để Spring Boot xoá thì phải có tín hiệu "analyzer xong
rồi" và một cửa sổ chạy đua ở giữa (concept-analyzer-v1.md §7).

Ngay cả khi FAILED, clip vẫn bị xoá. Giữ clip để debug là bắt đầu của việc lưu
trữ video, và N2 không có ngoại lệ "chỉ để debug thôi".
"""
from __future__ import annotations

from pathlib import Path


class ClipStorage:
    def __init__(self, root: Path):
        self._root = root.resolve()

    def path_of(self, storage_key: str) -> Path:
        resolved = (self._root / storage_key).resolve()
        if not resolved.is_relative_to(self._root):
            raise ValueError(f"storage key không hợp lệ: {storage_key}")
        return resolved

    def delete(self, storage_key: str) -> None:
        self.path_of(storage_key).unlink(missing_ok=True)
