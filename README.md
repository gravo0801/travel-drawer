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
| `public/media/posts/` | 글 사진 |
| `public/media/site/` | 첫 화면·글 찾기·맨 아래 기본 그림 (`npm run gen:art`로 다시 생성) |
| `scripts/import_naver_pdf.py` | 네이버 "PDF로 저장" 파일 → 글 데이터 변환 |

## 글 옮기기 (현재 방식)
```bash
pip install pymupdf
python3 -I scripts/import_naver_pdf.py <네이버PDF> out/
```
결과의 `trip`(여행 날짜·나라·도시)을 채운 뒤 `content/posts/`로 옮깁니다. 849편 일괄 이전은 다음 단계에서 자동화합니다.

## PDF로 글 올리기 (`/admin/import`)
다른 곳에서 만든 여행기 PDF(네이버 'PDF로 저장', 워드 등)를 끌어다 놓으면:
1. 브라우저에서 PDF의 글자·사진을 순서대로 읽고 (한글은 `public/pdfjs/cmaps` 필요, dev·build 때 자동 복사)
2. AI가 제목·여행 날짜·나라·도시·여행 묶음·분류·태그·요약·방문 장소를 채우고, 본문을 이 블로그 형식으로 정리 (글쓴이 문장은 그대로)
3. 실제 글 화면과 같은 부품(`components/PostView.tsx`)으로 미리 보며 순서 변경·사진 묶기·삭제·원본 사진 교체·대표 사진 지정·글 고치기
4. **게시** → 저장소에 커밋(`content/posts/<번호>/post.json` + `public/media/posts/<번호>/`) → Vercel이 자동 재배포 (1~2분)

여러 편을 한 번에 올리면 차례로 분석하고, "선택한 n편 게시"로 커밋 한 번에 올립니다.
필요한 환경변수는 `.env.example` 아래쪽 참고 (Vercel > Settings > Environment Variables).
스캔한 이미지 PDF(글자가 그림인 PDF)는 아직 지원하지 않습니다.

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
