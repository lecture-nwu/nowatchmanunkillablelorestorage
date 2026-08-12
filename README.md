# LORE ARCHIVE

가상 창작 텍스트를 데스티니 가디언즈의 로어 뷰어 스타일로 열람할 수 있는 정적 홈페이지.
GitHub Pages로 배포해 링크만 공유하면 친구들이 바로 열람 가능.

타이프페이스:
- **Jibaek**(`assets/fonts/jibaek.otf`, 자체 호스팅): 사이트 제목("LORE ARCHIVE"), 기록 열람 시의 제목, 가로로 쓰인 문서철 제목(로스터 헤더)
- **AppleSDGothicNeoB**(macOS/iOS 시스템 폰트, 없는 기기는 Pretendard로 대체): 그 외 제목류 — 문서철 내부 기록 제목, 좌측 스파인의 세로 문서철 버튼, 관리자 페이지 제목 등
- **AppleSDGothicNeoT**(macOS/iOS 시스템 폰트, 없는 기기는 Pretendard로 대체): 태그 텍스트
- **Pretendard**(CDN): 본문 전반
- **JetBrains Mono**(CDN): RECORD 번호, 타임스탬프 등 유틸리티 텍스트

## 구성

```
lore-viewer/
├─ index.html          공개 열람 페이지 (접속하면 자동으로 기록을 불러와 표시)
├─ admin.html          관리자 페이지 (기록 입력/편집/삭제, GitHub 커밋)
├─ data/
│  └─ entries.json     실제 기록 데이터 (문서철 + 기록 목록)
├─ assets/
│  ├─ style.css
│  ├─ viewer.js        index.html 로직 (좌측 메뉴, 즐겨찾기/태그, 마크다운 렌더링 포함)
│  ├─ admin.js         admin.html 로직 (비밀번호 게이트 포함)
│  ├─ marked.min.js    마크다운 파서 (vendored, MIT)
│  ├─ purify.min.js    렌더링 전 HTML sanitize (DOMPurify, vendored)
│  └─ fonts/
│     └─ jibaek.otf    제목용 타이프페이스
└─ README.md
```

## 좌측 메뉴 (index.html)

페이지 좌측 끝에 마우스를 가져가면(또는 모바일에서 탭하면) 세로 메뉴가 나타남.

- **로그인**: 실제 인증이 아닌 닉네임 식별용(브라우저 localStorage에 저장).
- **즐겨찾기**: 기록 카드의 별표를 눌러 추가, 메뉴에서 모아보기 가능(localStorage 저장, 브라우저별로 독립적).
- **태그**: 관리자 페이지에서 기록에 붙인 태그를 모아보고 필터링.
- **관리자 페이지로 이동**: 비밀번호 확인 후 `admin.html`로 이동. `admin.html`에 직접 URL로 접속해도
  동일한 비밀번호 확인 화면이 먼저 뜸(둘 다 `assets/viewer.js` · `assets/admin.js`에 하드코딩된
  `lore-admin-2026`과 비교하며, 브라우저 세션 동안만 유지됨). 정적 사이트 특성상 완벽한 보안은 아니고
  가벼운 접근 저지 용도이며, 실제 데이터 커밋에는 여전히 GitHub 토큰이 필요함.

## 본문 마크다운

`admin.html`의 "본문" 입력란은 마크다운 문법(`#` 제목, `**굵게**`, `*기울임*`, `- 목록`, `>` 인용, 코드블록, 링크 등)을
지원하며, 열람 페이지에서 HTML로 변환되어 표시됨(`marked` 파싱 후 `DOMPurify`로 sanitize).

## 배포 방법 (GitHub Pages)

1. GitHub에 새 저장소를 만들고 이 폴더 전체를 업로드(또는 `git push`).
2. 저장소 **Settings → Pages**로 이동.
3. **Source**를 `Deploy from a branch`로 설정, 브랜치는 `main`(또는 사용 중인 브랜치), 폴더는 `/ (root)` 선택 후 저장.
4. 몇 분 후 `https://<사용자명>.github.io/<저장소명>/` 주소가 생성됨. 이 링크가 친구들에게 공유할 **공개 열람 페이지** 주소.
5. 관리자 페이지는 열람 페이지 좌측 끝 메뉴의 "관리자 페이지로 이동" 버튼(비밀번호 필요)으로 접속하거나,
   `https://<사용자명>.github.io/<저장소명>/admin.html`로 직접 접속해도 동일하게 비밀번호를 요구함.

## 관리자 페이지 사용법

1. `admin.html` 접속 → **① 저장소 연결**에 GitHub 사용자명/저장소명/브랜치를 입력.
2. 기록을 GitHub에 직접 저장(커밋)하려면 **write 권한이 있는 Personal Access Token**이 필요.
   - GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → 새로 생성
   - 대상 저장소를 이 프로젝트 저장소로 한정하고, 권한은 **Contents: Read and write**만 부여 (그 외 권한 불필요)
   - 생성된 토큰을 admin.html의 토큰 입력란에 붙여넣기 → "연결 정보 저장"
   - 토큰은 본인 브라우저의 localStorage에만 저장되며, GitHub API 호출 외 다른 곳으로 전송되지 않음
3. **저장소에서 불러오기**로 기존 데이터를 가져온 뒤, 문서철/기록을 추가·편집·삭제.
4. **GitHub에 커밋**을 누르면 `data/entries.json`이 갱신되고, GitHub Pages가 자동 재배포(보통 1~2분)되면서
   공개 열람 페이지(`index.html`)에도 즉시 반영됨.
5. 토큰을 사용하고 싶지 않다면 **entries.json 다운로드** 버튼으로 파일을 받아 GitHub 웹사이트에서
   `data/entries.json`을 직접 교체 업로드해도 동일하게 동작함.

### "Resource not accessible by personal access token" 오류

**GitHub에 커밋**을 눌렀을 때 이 오류가 뜬다면, 요청 자체는 GitHub에 정상 도달했지만 이 토큰으로는
쓰기 권한이 없다고 GitHub가 거부한 것임(코드 버그가 아니라 토큰/저장소 설정 문제). admin.js는 이제
커밋 전에 `GET /repos/{owner}/{repo}`로 이 토큰의 push 권한을 먼저 확인해 더 구체적인 원인을
안내하도록 되어 있음. 그래도 막히면 아래를 순서대로 확인:

1. 토큰을 만든 GitHub 계정이 이 저장소의 **소유자(owner)** 이거나, 아니라면 **Write 이상 권한을 가진
   협업자(collaborator)** 로 초대되어 있는지. fine-grained PAT는 "외부 협업자(outside collaborator)"
   권한만으로는 쓰기가 거부되는 경우가 많음(GitHub의 알려진 제약).
2. 토큰 생성 화면의 **Resource owner** 가 이 저장소를 소유한 계정/조직과 정확히 일치하는지.
3. **Repository access** 를 `Only select repositories`로 하고 이 저장소를 직접 선택했는지
   (fine-grained PAT는 명시적으로 선택하지 않은 공개 저장소에는 기본적으로 읽기 권한만 부여됨).
4. 권한 목록에서 **Contents** 가 `Read-only`가 아닌 `Read and write`로 되어 있는지.
5. 저장소가 **조직(organization) 소유**라면, 조직 Settings → Personal access tokens에서
   이 fine-grained 토큰이 관리자에게 승인(approve)되어 있는지 — 조직은 기본적으로 fine-grained PAT
   접근에 소유자 승인을 요구하는 경우가 많음.
6. 토큰이 만료되지 않았는지(만료 시엔 "Bad credentials"로 다르게 표시됨).

## 참고 / 보안

- `admin.html`은 검색엔진 노출을 막아두었지만(`robots noindex`), 저장소가 **공개(public)** 라면
  URL을 아는 사람은 누구나 접근할 수 있음. 다만 자신의 GitHub 토큰이 없으면 실제로 커밋은 불가능.
  더 확실히 막고 싶다면 저장소를 **비공개(private)** 로 만들거나(Pages는 GitHub Pro 이상 필요),
  로컬에서만 admin.html을 열어 편집 후 다운로드한 파일을 수동으로 커밋하는 방식을 권장.
- 데이터는 순수 JSON 파일이라 별도 서버나 데이터베이스 없이 GitHub Pages만으로 동작함.
