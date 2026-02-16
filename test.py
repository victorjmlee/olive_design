#!/usr/bin/env python3
"""네이버 쇼핑 검색 API 테스트.
   환경변수로 실행: NAVER_CLIENT_ID=xxx NAVER_CLIENT_SECRET=xxx python3 test.py
   또는 .env 파일 사용 (git에 올리지 말 것)."""
import os
import urllib.request
import urllib.parse
import json

# 여기에 ID, Secret 넣으면 됨 (git에 올릴 땐 비우고 환경변수 사용 권장)
CLIENT_ID = os.environ.get("NAVER_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("NAVER_CLIENT_SECRET", "")

if not CLIENT_ID or not CLIENT_SECRET:
    print("test.py 상단의 CLIENT_ID, CLIENT_SECRET을 수정하거나,")
    print("환경변수: NAVER_CLIENT_ID=xxx NAVER_CLIENT_SECRET=xxx python3 test.py")
    exit(1)

url = "https://openapi.naver.com/v1/search/shop.json?" + urllib.parse.urlencode({"query": "타일"})
req = urllib.request.Request(
    url,
    headers={
        "X-Naver-Client-Id": CLIENT_ID,
        "X-Naver-Client-Secret": CLIENT_SECRET,
    },
)

try:
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print("성공! 상품 수:", len(data.get("items", [])))
        for item in data.get("items", [])[:3]:
            print(" -", item.get("title", "")[:50], "|", item.get("lprice"), "원")
except urllib.error.HTTPError as e:
    print("HTTP 에러:", e.code)
    print(e.read().decode())
except Exception as e:
    print("에러:", e)
