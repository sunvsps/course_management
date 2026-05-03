# Google Sheet Student App

โปรเจกต์ใหม่สำหรับโชว์ **หน้านักเรียนอย่างเดียว** โดย backend เป็น Node.js และใช้ Google Sheet เป็น database

## Run Local Demo

```bash
npm install
cp .env.example .env
npm run dev
```

เปิด:

```text
http://localhost:3001
```

ค่า default ใน `.env.example` ใช้ `MOCK_SHEET_ENABLED=true` จึงเปิดดูหน้านักเรียนได้ทันทีโดยยังไม่ต้องต่อ Google Sheet จริง

## Google Sheet Tabs

สร้าง Google Sheet โดยมี tab และ header ตามนี้:

### LineProfiles

ข้อมูลที่ได้จาก LIFF/LINE Login จะถูก upsert ลง tab นี้อัตโนมัติหลัง login จริง

```csv
lineProfileId,lineUserId,displayName,pictureUrl,statusMessage,email,createdAt,updatedAt
```

### Users

```csv
userId,lineProfileId,displayName,role
student-demo,line-profile-demo,Demo Student,STUDENT
```

ถ้ายังใช้ demo/mock แบบเดิม โค้ดยังรองรับ header เก่า `lineUserId,displayName,pictureUrl,role` อยู่

### Courses

```csv
courseId,name,totalClasses
course-10,Private Course 10 Classes,10
```

### Enrollments

```csv
enrollmentId,lineUserId,courseId,purchasedClasses,remainingClasses,status
enroll-demo,demo-student,course-10,10,5,ACTIVE
```

### Lessons

```csv
lessonId,enrollmentId,instructorName,startsAt,endsAt,status
lesson-next,enroll-demo,Demo Teacher,2026-05-04T10:00:00+07:00,2026-05-04T11:00:00+07:00,SCHEDULED
```

### Attendances

```csv
attendanceId,enrollmentId,instructorName,checkedInAt,classesUsed,note
att-1,enroll-demo,Demo Teacher,2026-04-28T10:05:00+07:00,1,เรียนครั้งที่ 1
```

## Connect Google Sheet

1. สร้าง Google Cloud service account
2. เปิด Google Sheets API
3. สร้าง key แบบ JSON
4. เอา `client_email` ใส่ `GOOGLE_SERVICE_ACCOUNT_EMAIL`
5. เอา `private_key` ใส่ `GOOGLE_PRIVATE_KEY`
6. Share Google Sheet ให้ service account email เป็น Viewer
7. ตั้งค่า:

```env
MOCK_SHEET_ENABLED=false
GOOGLE_SPREADSHEET_ID="..."
```

## LIFF Profile Sync

เมื่อต่อ LIFF จริง:

- Frontend ส่ง `idToken` และ `accessToken` ไป backend
- Backend verify `idToken` กับ LINE
- Backend fetch LINE profile ด้วย `accessToken`
- Backend upsert ข้อมูลลง tab `LineProfiles`
- Admin ค่อยนำ `lineProfileId` จาก `LineProfiles` ไปใส่ใน tab `Users` เอง

ตั้ง scope ใน LIFF/LINE Login channel:

- `profile`
- `openid`
- `email` ถ้าต้องการเก็บ email

## Deploy

เหมาะกับ Render:

```bash
npm install && npm run build
```

Start command:

```bash
npm run start
```

ตั้ง env:

```env
HOST=0.0.0.0
LOCAL_DEMO_ENABLED=false
MOCK_SHEET_ENABLED=false
APP_BASE_URL=https://your-app.onrender.com
```

แล้วนำ URL ไปตั้งเป็น LIFF endpoint
