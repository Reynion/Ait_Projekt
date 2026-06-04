# 🎸 Ait 놀이터

락 밴드 **Ait(아잇)**의 멤버 전용 커뮤니티 웹앱입니다.  
연주할 음악 선정, 일정 공유, 공연 기록 등 밴드 활동 전반을 함께 관리합니다.

**배포 주소:** https://ait-projekt-alpha.vercel.app

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 🎵 음악 제안 | 멤버별 음악 제안 (유튜브 링크 + 좋아요/비추천 + 댓글) |
| 📋 게시판 | 자유 게시판 (이미지·파일 첨부, 공지 기능) |
| 🗳 투표 | 후보곡 투표, 현황 공개/비공개, 자동 마감 |
| 📅 일정 | 월간 달력, 공식·개인 일정 관리 |
| 📼 기록 | 공연·연습 기록 (셋리스트, 사진, 유튜브) |
| 🔔 알림 | 댓글·멘션·투표 생성 시 앱 푸시 알림 (FCM) |
| 📱 PWA | 홈 화면에 앱으로 설치 가능 |

---

## 기술 스택

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Push 알림:** Firebase Cloud Messaging (FCM)
- **배포:** Vercel

---

## 로컬 실행

```bash
# 패키지 설치
npm install

# 환경변수 설정 (.env.local)
# Supabase, Firebase 관련 키 필요

# 개발 서버 실행 (포트 3001)
npm run dev
```

---

## 접근 방법

초대 코드 기반 가입 또는 관리자 초대 메일을 통해 가입할 수 있습니다.
