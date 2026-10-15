#!/bin/sh
# 把兩段畫面接起來，配上音樂，壓成網站與手機用的成品
set -e
cd "$(dirname "$0")/out"
printf "file 'partA.mp4'\nfile 'partB.mp4'\n" > parts.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i parts.txt -i music.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 24 -tune animation -profile:v high -level 4.1 -pix_fmt yuv420p \
  -x264-params "keyint=48:min-keyint=24" -c:a aac -b:a 192k -ar 48000 -t 76 -movflags +faststart heijiang-film.mp4
ls -la heijiang-film.mp4
