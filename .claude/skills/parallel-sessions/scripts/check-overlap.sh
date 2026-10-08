#!/usr/bin/env bash
# Kiểm tra branch hiện tại so với master và các branch khác đang làm dở.
# Dùng: bash .claude/skills/parallel-sessions/scripts/check-overlap.sh [base]
# Thoát mã 1 nếu branch hiện tại conflict với base hoặc trùng số migration.
set -u
base="${1:-origin/master}"
mig_dir="mvp-app/backend/src/main/resources/db/migration"

git fetch -q --prune origin 2>/dev/null || echo "! Không fetch được origin — kết quả có thể cũ"

me=$(git rev-parse --abbrev-ref HEAD)
status=0

echo "== Branch hiện tại: $me"
echo "   chưa có trong $base: $(git rev-list --count "$base"..HEAD) commit | $base có mà branch chưa có: $(git rev-list --count HEAD.."$base") commit"
if ! git merge-base HEAD "$base" >/dev/null 2>&1; then
  echo "!! Không có tổ tiên chung với $base (lịch sử bị tách) — DỪNG, không push"
  exit 1
fi
if git merge-tree --write-tree --name-only "$base" HEAD >/dev/null 2>&1; then
  echo "   merge vào $base: sạch"
else
  echo "!! Conflict với $base ở các file:"
  git merge-tree --write-tree --name-only "$base" HEAD | sed -n '2,/^$/p' | sed 's/^/     /'
  status=1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "!  Còn thay đổi chưa commit"
fi

mine=$(git diff --name-only "$base"...HEAD)

# Số migration Flyway: trùng số là lỗi khi deploy dù git không báo conflict
dup=$( { git ls-tree --name-only "$base" "$mig_dir/"; git ls-tree --name-only HEAD "$mig_dir/"; } \
  | sort -u | sed -n 's#.*/V\([0-9]*\)__.*#\1#p' | sort | uniq -d)
if [ -n "$dup" ]; then
  echo "!! Trùng số migration với $base: V$(echo $dup | sed 's/ /, V/g') — đổi sang số kế tiếp sau bản lớn nhất trên $base"
  status=1
fi

echo
echo "== Branch khác còn commit chưa vào $base"
found=0
for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -v -e '/HEAD$' -e "^$base$" -e "^origin/$me$"); do
  ahead=$(git rev-list --count "$base".."$b" 2>/dev/null || echo 0)
  [ "$ahead" = 0 ] && continue
  if ! git merge-base "$base" "$b" >/dev/null 2>&1; then
    echo "-- $b: lịch sử tách khỏi $base (bỏ qua)"; continue
  fi
  found=1
  when=$(git log -1 --format=%cr "$b")
  theirs=$(git diff --name-only "$base"..."$b")
  overlap=$(comm -12 <(echo "$mine" | sort) <(echo "$theirs" | sort) | grep -v '^$')
  if [ -n "$overlap" ]; then
    echo "-- $b ($ahead commit, $when) — CÙNG SỬA với mình:"
    echo "$overlap" | sed 's/^/     /'
  else
    echo "-- $b ($ahead commit, $when) — không trùng file"
  fi
  theirs_mig=$(echo "$theirs" | sed -n "s#^$mig_dir/V\([0-9]*\)__.*#\1#p")
  mine_mig=$(echo "$mine" | sed -n "s#^$mig_dir/V\([0-9]*\)__.*#\1#p")
  same=$(comm -12 <(echo "$mine_mig" | sort) <(echo "$theirs_mig" | sort) | grep -v '^$')
  [ -n "$same" ] && echo "     !! cùng dùng số migration V$same — một bên phải đổi số"
done
[ "$found" = 0 ] && echo "   (không có)"

exit $status
