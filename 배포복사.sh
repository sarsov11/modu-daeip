#!/bin/sh
# 원본(모두의국어_시안) → 배포 사본(gukeo/) 복사 후 커밋·푸시. 사용: sh 배포복사.sh "커밋 메시지"
set -e
W="$(cd "$(dirname "$0")" && pwd)"; A="$W/../../모두의국어_시안"
cp "$A/index.html" "$A/manifest.webmanifest" "$A/icon.svg" "$W/gukeo/"
# 공개판에만 있는 수정(채점 뒤 다음 세트 단추·짜잔 별 / 기록 탭이 세트 기록 표시) — 시안 원본에 없어서 복사하면 지워진다. 복사 직후 다시 입힌다(2026-10-13).
# 2026-10-20: 합격전략 브리핑(공용 zzstrat) 단추·스크립트도 같은 방식으로 패치에 보관 — 패치/*.patch 를 차례로 입힌다.
for P in "$W"/패치/*.patch; do
  [ -f "$P" ] || continue
  if (cd "$W" && git apply --reverse --check "$P" 2>/dev/null); then echo "이미 들어 있음: $(basename "$P")"; else (cd "$W" && git apply "$P") && echo "패치 적용: $(basename "$P")"; fi
done
cp "$A/data/suneung.js" "$A/data/mock.js" "$W/gukeo/data/"
rm -rf "$W/gukeo/assets"; cp -r "$A/assets" "$W/gukeo/"
cd "$W"; git add -A
git -c user.name=sarsov11 -c user.email=sarsov11@users.noreply.github.com commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin main
git log --oneline | head -1
