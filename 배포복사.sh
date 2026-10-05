#!/bin/sh
# 원본(모두의국어_시안) → 배포 사본(gukeo/) 복사 후 커밋·푸시. 사용: sh 배포복사.sh "커밋 메시지"
set -e
W="$(cd "$(dirname "$0")" && pwd)"; A="$W/../../모두의국어_시안"
cp "$A/index.html" "$A/manifest.webmanifest" "$A/icon.svg" "$W/gukeo/"
cp "$A/data/suneung.js" "$A/data/mock.js" "$W/gukeo/data/"
rm -rf "$W/gukeo/assets"; cp -r "$A/assets" "$W/gukeo/"
cd "$W"; git add -A
git -c user.name=sarsov11 -c user.email=sarsov11@users.noreply.github.com commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin main
git log --oneline | head -1
