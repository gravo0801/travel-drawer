# 여행 일정·메모 동기화 배포 순서

## 1. 기존 데이터 보존

- 기존 `drawer.private.v1`은 읽기 전용 원본으로 유지한다.
- 로그인 UID별 `drawer.private.v2.<uid>`로 최초 한 번 복사한다. 로컬 편집은 새 키에 저장한다.
- `/me`의 `백업·동기화 관리`에서 JSON 백업을 내려받을 수 있다. 백업에는 현재 기록과 이 브라우저에 보관된 이전 기록이 함께 들어간다. 가져오기·클라우드 기록 선택·원격 덮어쓰기 전의 기록은 `drawer.private.backup.v1.<uid>.*`에 별도 보관한다.
- 기록 형식이 잘못됐거나 브라우저 저장 공간이 부족하면 자동 동기화를 멈춘다. 해당 저장값을 지우지 않는다.

## 2. Firestore 규칙 점검

Firebase Console에서 **현재 운영 규칙 전체를 먼저 백업**한다. 기존 컬렉션 규칙을 유지한 채 아래 블록을 `match /databases/{database}/documents` 안에 병합한다. 광역 허용 규칙이 이 경로에도 적용되는지 점검한다.

```text
match /drawer_private_data/{userId} {
  function validPrivateData() {
    return request.resource.data.keys().hasOnly(['schema', 'revision', 'data', 'updatedAt'])
    && request.resource.data.keys().hasAll(['schema', 'revision', 'data', 'updatedAt'])
    && request.resource.data.schema == 1
    && request.resource.data.revision is int
    && request.resource.data.data is map
    && request.resource.data.data.keys().hasOnly(['trips', 'memo'])
    && request.resource.data.data.keys().hasAll(['trips', 'memo'])
    && request.resource.data.data.trips is list
    && request.resource.data.data.trips.size() <= 300
    && request.resource.data.data.memo is string
    && request.resource.data.data.memo.size() <= 100000;
  }
  allow get: if request.auth != null && request.auth.uid == userId;
  allow create: if request.auth != null
    && request.auth.uid == userId
    && validPrivateData()
    && request.resource.data.revision == 1;
  allow update: if request.auth != null
    && request.auth.uid == userId
    && validPrivateData()
    && request.resource.data.revision == resource.data.revision + 1;
  allow list, delete: if false;
}
```

운영 규칙을 게시하기 전에 Firebase Rules Playground/Emulator에서 본인 UID 읽기·쓰기 허용, 다른 UID 읽기·쓰기 거부, 목록 조회 거부, 삭제 거부를 확인한다. 이 저장소에는 운영 규칙 전체가 없으므로 위 예시만 단독으로 게시하지 않는다.

## 3. 소규모 연결 및 기기 간 확인

1. 첫 기기 `/me`에서 JSON 백업을 내려받는다.
2. `클라우드 기록 확인`을 눌러 어느 기록을 사용할지 명시적으로 선택한다.
3. 두 번째 기기에서도 로그인 후 클라우드 기록을 확인하고 가져온다.
4. 여행 일정과 메모 각각을 한 기기에서 수정한 후 다른 기기에서 반영을 확인한다.
5. 두 기기에서 동시에 수정해 버전 충돌이 나면 각 로컬 기록을 백업하고 선택 화면에서 복구한다. 충돌 시 자동 덮어쓰기는 하지 않는다.

연결 전에는 클라우드에 쓰지 않는다. 클라우드 쓰기나 읽기 실패 시 로컬 기록을 보존하고 상태를 표시한다. 기존 블로그 글, 카드 혜택, Google Calendar 설정은 이 기능의 대상이 아니다.
