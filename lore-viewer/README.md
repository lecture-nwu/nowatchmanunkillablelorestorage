# LORE ARCHIVE

가상 창작 텍스트를 데스티니 가디언즈의 로어 뷰어 스타일로 열람할 수 있는 정적 홈페이지.
GitHub Pages로 배포해 링크만 공유하면 친구들이 바로 열람 가능.

## 구성

```
lore-viewer/
├─ index.html          공개 열람 페이지 (접속하면 자동으로 기록을 불러와 표시)
├─ admin.html          관리자 페이지 (기록 입력/편집/삭제, GitHub 커밋)
├─ data/
│  └─ entries.json     실제 기록 데이터 (문서철 + 기록 목록)
├─ assets/
│  ├─ style.css
│  ├─ viewer.js        index.html 로직
│  └─ admin.js         admin.html 로직
└─ README.md
```

## 배포 방법 (GitHub Pages)

1. GitHub에 새 저장소를 만들고 이 폴더 전체를 업로드(또는 `git push`).
2. 저장소 **Settings → Pages**로 이동.
3. **Source**를 `Deploy from a branch`로 설정, 브랜치는 `main`(또는 사용 중인 브랜치), 폴더는 `/ (root)` 선택 후 저장.
4. 몇 분 후 `https://<사용자명>.github.io/<저장소명>/` 주소가 생성됨. 이 링크가 친구들에게 공유할 **공개 열람 페이지** 주소.
5. 관리자 페이지는 `https://<사용자명>.github.io/<저장소명>/admin.html` 로 접속.

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

## 참고 / 보안

- `admin.html`은 검색엔진 노출을 막아두었지만(`robots noindex`), 저장소가 **공개(public)** 라면
  URL을 아는 사람은 누구나 접근할 수 있음. 다만 자신의 GitHub 토큰이 없으면 실제로 커밋은 불가능.
  더 확실히 막고 싶다면 저장소를 **비공개(private)** 로 만들거나(Pages는 GitHub Pro 이상 필요),
  로컬에서만 admin.html을 열어 편집 후 다운로드한 파일을 수동으로 커밋하는 방식을 권장.
- 데이터는 순수 JSON 파일이라 별도 서버나 데이터베이스 없이 GitHub Pages만으로 동작함.
