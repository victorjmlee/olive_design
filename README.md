# 올리브디자인 견적기

네이버 쇼핑 검색 API로 자재 검색 후 견적 시트에 넣는 웹 앱입니다.

## 준비

- [Python 3](https://www.python.org/downloads/) 설치 (설치 시 "Add Python to PATH" 체크)
- [네이버 개발자센터](https://developers.naver.com/)에서 앱 등록 후 **검색** API 사용, Client ID / Client Secret 발급

---

## 실행 방법

### 1. 폴더로 이동

```bash
cd naver-shop
```
(Windows: `cd` 대신 탐색기에서 해당 폴더 주소창에 `cmd` 입력 후 Enter 해도 됨)

### 2. 가상환경 만들기 (한 번만)

```bash
python -m venv .venv
```
(macOS/Linux에선 `python3 -m venv .venv` 사용 가능)

### 3. 가상환경 켜기

- **Windows (명령 프롬프트):**
  ```cmd
  .venv\Scripts\activate
  ```
- **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
  (실행 정책 오류 나면: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` 후 다시 실행)
- **macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```

앞에 `(.venv)` 가 붙으면 성공입니다.

### 4. 패키지 설치 (한 번만)

```bash
pip install -r requirements.txt
```

### 5. API 키 넣고 실행

- **Windows (명령 프롬프트):**
  ```cmd
  set NAVER_CLIENT_ID=본인_Client_ID
  set NAVER_CLIENT_SECRET=본인_Client_Secret
  python app.py
  ```
- **Windows (PowerShell):**
  ```powershell
  $env:NAVER_CLIENT_ID="본인_Client_ID"
  $env:NAVER_CLIENT_SECRET="본인_Client_Secret"
  python app.py
  ```
- **macOS / Linux:**
  ```bash
  NAVER_CLIENT_ID=본인_Client_ID NAVER_CLIENT_SECRET=본인_Client_Secret python app.py
  ```

### 6. 브라우저에서 접속

**http://localhost:5000** 로 접속하면 됩니다.

---

## 요약 (Windows에서 한 번에)

명령 프롬프트(cmd)에서:

```cmd
cd naver-shop
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set NAVER_CLIENT_ID=여기에_ID
set NAVER_CLIENT_SECRET=여기에_Secret
python app.py
```

그 다음 브라우저에서 http://localhost:5000 접속.
