# 낡은 서랍속의 추억을 따라 — 여행 블로그

네이버 블로그(blog.naver.com/bbae30714, 849편)를 옮겨 오는 새 여행 블로그입니다.

## 구성
- **Next.js 16 (App Router) + TypeScript**, 배포는 **Vercel**
- **Firebase**: 글쓰기 단계에서 로그인·글 저장·사진 저장에 사용 (아직 연결 전, `.env.example` 참고)
- 모션: GSAP + ScrollTrigger
- 글꼴: Pretendard (SIL OFL, `public/fonts`), 설정에서 다른 글꼴로 교체 가능

## 실행
```bash
npm install
npm run dev        # http://localhost:3000
npm run build
```

## 폴더
| 위치 | 내용 |
|---|---|
| `content/posts/<글번호>/post.json` | 옮겨 온 글 (제목, 여행 날짜·나라·도시, 본문 블록, 해시태그) |
| `content/samples.json` | 글 이전 전까지 보여 주는 가상 목록 (`NEXT_PUBLIC_SHOW_SAMPLES=false`로 끔) |
| `public/media/posts/` | 글 사진 |
| `public/media/site/` | 첫 화면·글 찾기·맨 아래 기본 그림 (`npm run gen:art`로 다시 생성) |
| `scripts/import_naver_pdf.py` | 네이버 "PDF로 저장" 파일 → 글 데이터 변환 |

## 글 옮기기 (현재 방식)
```bash
pip install pymupdf
python3 -I scripts/import_naver_pdf.py <네이버PDF> out/
```
결과의 `trip`(여행 날짜·나라·도시)을 채운 뒤 `content/posts/`로 옮깁니다. 849편 일괄 이전은 다음 단계에서 자동화합니다.

## 사진 크기 안내
| 위치 | 화면비 | 권장 크기 |
|---|---|---|
| 첫 화면 | 16:9 | 2400×1350 |
| 글 찾기 배경 | 3:2 | 2400×1600 |
| 맨 아래 | 16:9 | 2400×1350 |
| 여행기 대표 사진 | 4:5 또는 4:3 | 1200×1500 |

## 출처
- 산·구름 기본 그림 생성기: summit-teams-template (MIT, Kedhareswer Naidu)
- Pretendard: SIL Open Font License 1.1
