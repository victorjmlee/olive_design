"""
네이버 쇼핑 검색 웹 앱.
실행: NAVER_CLIENT_ID=xxx NAVER_CLIENT_SECRET=xxx python app.py
"""
import os
import re
import json
import urllib.request
import urllib.parse
import urllib.error
from flask import Flask, request, jsonify, render_template, redirect

app = Flask(__name__)

CLIENT_ID = os.environ.get("NAVER_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("NAVER_CLIENT_SECRET", "")


def search_naver_shop(query: str, display: int = 20, start: int = 1, sort: str = "asc"):
    """네이버 쇼핑 검색 API 호출. start는 1부터."""
    if not CLIENT_ID or not CLIENT_SECRET:
        return None, "API 키가 설정되지 않았습니다."
    url = "https://openapi.naver.com/v1/search/shop.json?" + urllib.parse.urlencode(
        {"query": query, "display": min(display, 100), "start": max(1, start), "sort": sort}
    )
    req = urllib.request.Request(
        url,
        headers={
            "X-Naver-Client-Id": CLIENT_ID,
            "X-Naver-Client-Secret": CLIENT_SECRET,
        },
    )
    try:
        with urllib.request.urlopen(req) as res:
            return res.read().decode(), None
    except urllib.error.HTTPError as e:
        return e.read().decode(), f"HTTP {e.code}"
    except Exception as e:
        return None, str(e)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/estimate")
def estimate():
    return redirect("/")


@app.route("/api/search")
def api_search():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify({"error": "query를 입력하세요.", "items": []}), 400
    display = request.args.get("display", 20, type=int)
    start = request.args.get("start", 1, type=int)
    sort = request.args.get("sort", "asc")
    data, err = search_naver_shop(query, display=display, start=start, sort=sort)
    if err:
        return jsonify({"error": err, "items": []}), 401 if "키" in err else 500
    body = json.loads(data)
    items = body.get("items", [])
    for it in items:
        raw = it.get("lprice")
        if raw is None or str(raw).strip() == "":
            it["lprice"] = "0"
        else:
            digits = re.sub(r"[^0-9]", "", str(raw))
            it["lprice"] = digits if digits else "0"
    resp = jsonify({"items": items, "total": body.get("total", 0), "start": body.get("start", start)})
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    return resp


if __name__ == "__main__":
    if not CLIENT_ID or not CLIENT_SECRET:
        print("NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수를 설정하세요.")
        exit(1)
    app.run(host="0.0.0.0", port=5000, debug=True)
