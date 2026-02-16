# AWS에 올리브디자인 견적기 배포하기

친구가 URL로 접속할 수 있게 **AWS Elastic Beanstalk**으로 배포하는 방법입니다.  
배포 후 예: `http://올리브견적기.elasticbeanstalk.com` 같은 주소로 접속 가능합니다.

---

## 1. 사전 준비

- **AWS 계정** (없으면 [aws.amazon.com](https://aws.amazon.com)에서 가입)
- **네이버 API** Client ID / Client Secret (이미 있으면 그대로 사용)
- PC에 **Python 3** 설치됨

---

## 2. EB CLI 설치 (한 번만)

Elastic Beanstalk 명령줄 도구를 설치합니다.

```bash
pip install awsebcli
```

(가상환경이면 `pip install awsebcli` 후 아래에서 해당 환경 활성화한 채로 진행)

---

## 3. 프로젝트에서 EB 초기화

```bash
cd naver-shop
eb init
```

- **Region**: 사용할 리전 선택 (예: ap-northeast-2 서울)
- **Application name**: 예: `olive-estimate`
- **Platform**: **Python** 선택
- **Python version**: 3.11 또는 3.12 등 (권장)
- **SSH**: 원하면 Yes (나중에 서버 접속용)

---

## 4. 환경 만들고 배포

```bash
eb create olive-estimate-env
```

(이름은 원하는 대로 변경 가능, 예: `olive-prod`)

처음이면 5~10분 정도 걸릴 수 있습니다. 끝나면 터미널에 **Environment URL**이 나옵니다.

---

## 5. API 키(환경 변수) 설정

네이버 API 키는 **코드에 넣지 말고** Elastic Beanstalk 환경 변수로 넣습니다.

```bash
eb setenv NAVER_CLIENT_ID=본인_Client_ID NAVER_CLIENT_SECRET=본인_Client_Secret
```

또는 AWS 콘솔에서:

1. [Elastic Beanstalk 콘솔](https://console.aws.amazon.com/elasticbeanstalk) → 해당 환경 선택
2. **구성** → **편집** → **소프트웨어** → **환경 속성**
3. `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 추가 후 **적용**

적용 후 환경이 한 번 재시작됩니다.

---

## 6. 접속 주소 확인

```bash
eb open
```

또는 터미널에 나온 **Environment URL**을 브라우저에 붙여넣기하면 됩니다.  
이 URL을 친구에게 보내면 됩니다.

---

## 7. 이후 코드 수정 후 다시 배포

코드를 바꾼 뒤 같은 환경에 다시 배포하려면:

```bash
cd naver-shop
eb deploy
```

---

## 8. 비용 대략

- **Elastic Beanstalk** 자체는 추가 비용 없음 (사용한 EC2 등만 과금)
- **t2.micro / t3.micro** 인스턴스 1대로 가면 **프리 티어** 범위 안에서 사용 가능한 경우가 많음 (리전·사용량에 따라 다름)
- [AWS 프리 티어](https://aws.amazon.com/ko/free/) 조건 확인 권장

---

## 9. HTTPS(도메인) 쓰고 싶을 때

- **Route 53**에서 도메인 구매 후 Elastic Beanstalk 환경에 연결
- **Load Balancer**에 **ACM 인증서** 붙여서 HTTPS 적용

필요하면 이 단계는 나중에 추가하면 됩니다. 우선은 `http://xxx.elasticbeanstalk.com` 만 써도 동작합니다.

---

## 요약

| 단계 | 명령 |
|------|------|
| EB CLI 설치 | `pip install awsebcli` |
| 초기화 | `cd naver-shop` → `eb init` (Python 선택) |
| 환경 생성 | `eb create olive-estimate-env` |
| API 키 설정 | `eb setenv NAVER_CLIENT_ID=xxx NAVER_CLIENT_SECRET=xxx` |
| 열기 | `eb open` |
| 재배포 | `eb deploy` |

이렇게 하면 친구는 받은 URL만 열면 견적기 사용할 수 있습니다.
