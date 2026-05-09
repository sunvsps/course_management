# Google Sheet Student App

โปรเจกต์ใหม่สำหรับโชว์ **หน้านักเรียนอย่างเดียว** โดย backend เป็น Node.js และใช้ Google Sheet เป็น database

## Run Local Demo

```bash
npm install
cp .env.local.example .env.local
npm run dev:local
```

เปิด:

```text
http://localhost:3001/student
http://localhost:3001/teacher
http://localhost:3001/admin
```

ค่า local อยู่ใน `.env.local` และจะถูกโหลดเมื่อรัน `npm run dev:local`

หลังบ้าน `/admin` ใช้ username/password จาก env:

```env
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123456"
TEACHER_USERNAME="teacher"
TEACHER_PASSWORD="teacher123456"
TEACHER_USER_ID="teacher-earth"
TEACHER_DISPLAY_NAME="ครูเอิร์ธ"
```

เวลา deploy บน Render ให้ตั้ง `ADMIN_PASSWORD` เป็นรหัสจริงที่เดายาก และไม่ต้องใส่เครื่องหมาย `"` ในหน้า Environment ของ Render

ถ้าต้องการใช้ Google Sheet จริงในเครื่อง ให้ตั้ง:

```env
MOCK_SHEET_ENABLED=false
DEMO_USER_ID="userId-from-users-tab"
```

ถ้าต้องการใช้ mock data ไม่ต่อ Google Sheet ให้ตั้ง:

```env
MOCK_SHEET_ENABLED=true
DEMO_USER_ID="1234"
```

## Environment Files

โปรเจกต์นี้แยก env เป็น 2 ชุด:

```text
.env.local.example       ตัวอย่างสำหรับรันในเครื่อง
.env.production.example  ตัวอย่างสำหรับ deploy จริง เช่น Render
```

ไฟล์จริงที่มี secret ไม่ควร commit:

```text
.env.local
.env.production
.env
```

คำสั่ง local:

```bash
cp .env.local.example .env.local
npm run dev:local
```

ถ้าจะรัน production local เพื่อทดสอบ:

```bash
cp .env.production.example .env.production
npm run build
npm run start:production
```

## Google Sheet Tabs

สร้าง Google Sheet โดยมี tab และ header ตามนี้:

### LineProfiles

ข้อมูลที่ได้จาก LIFF/LINE Login จะถูก upsert ลง tab นี้อัตโนมัติหลัง login จริง

```csv
lineProfileId,lineUserId,displayName,pictureUrl,statusMessage,email,createdAt,updatedAt
```

### Users

```csv
userId,displayName,pictureUrl,birthDate,role,createdAt,updatedAt
student-demo,Demo Student,,2018-01-15,STUDENT,2026-05-09T10:00:00.000Z,2026-05-09T10:00:00.000Z
```

ระบบใช้ `birthDate` เพื่อคำนวณอายุเป็นปีและเดือนให้อัตโนมัติ

### UserLineProfiles

ตารางกลางสำหรับผูกผู้ใช้ในระบบกับ LINE profile รองรับผู้ปกครองหลายคนต่อเด็กหนึ่งคน และ LINE profile เดียวดูแลเด็กหลายคน

```csv
userLineProfileId,userId,lineProfileId,relationship,isPrimary,createdAt,updatedAt
ulp-001,student-a,line-profile-mom-001,mother,TRUE,2026-05-09T10:00:00.000Z,2026-05-09T10:00:00.000Z
ulp-002,student-a,line-profile-dad-001,father,FALSE,2026-05-09T10:00:00.000Z,2026-05-09T10:00:00.000Z
ulp-003,student-b,line-profile-mom-001,mother,TRUE,2026-05-09T10:00:00.000Z,2026-05-09T10:00:00.000Z
```

เมื่อผู้ปกครองเปิดหน้า `/student` ระบบจะดึงนักเรียนทุกคนที่ผูกกับ LINE profile ที่ login อยู่มาให้เลือกอัตโนมัติ

### Courses

```csv
courseId,name,courseType,totalClasses,createdAt,updatedAt
course-10,Private Course 10 Classes,CLASS,10,2026-05-09T10:00:00.000Z,2026-05-09T10:00:00.000Z
hour-10,Private Course 10 Hours,HOUR,10,2026-05-09T10:00:00.000Z,2026-05-09T10:00:00.000Z
```

`courseType` ใช้กำหนดหน่วยที่แสดงบนหน้านักเรียน:

- `CLASS` = แสดงเป็น `ครั้ง`
- `HOUR` = แสดงเป็น `ชม.`

### Enrollments

```csv
enrollmentId,userId,courseId,instructorId,purchasedClasses,remainingClasses,status,createdAt,updatedAt
enroll-demo,student-demo,course-10,teacher-earth,,10,ACTIVE,2026-05-09T10:00:00.000Z,2026-05-09T10:00:00.000Z
```

ระบบจะใช้ `userId` เป็นหลักในการผูก enrollment กับ tab `Users`
`instructorId` อ้างถึง `Users.userId` ของคุณครู เช่น `teacher-earth` ที่มี role เป็น `INSTRUCTOR`
ถ้า `purchasedClasses` ว่าง ระบบจะใช้ `Courses.totalClasses` แทน
จำนวนคงเหลือจะถูกคำนวณอัตโนมัติจาก `purchasedClasses - Attendances.classesUsed` และไม่อ่านค่าจาก `Enrollments.remainingClasses`
หน้า `/teacher` จะใช้ `Enrollments.instructorId` เพื่อเลือกเฉพาะนักเรียนของครูคนนั้น

### Lessons

```csv
lessonId,enrollmentId,instructorName,startsAt,endsAt,status,createdAt,updatedAt
lesson-next,enroll-demo,Demo Teacher,2026-05-04T10:00:00+07:00,2026-05-04T11:00:00+07:00,SCHEDULED,2026-05-09T10:00:00.000Z,2026-05-09T10:00:00.000Z
```

### Attendances

```csv
attendanceId,enrollmentId,instructorName,checkedInAt,classesUsed,hyperactiveScore,distractionScore,attentionSpanScore,selfControlScore,selfEsteemScore,timeManagementScore,behaviorScore,note,createdAt,updatedAt
att-1,enroll-demo,Demo Teacher,2026-04-28,1,4,3.5,4.5,4,5,4,5,เรียนครั้งที่ 1,2026-05-09T10:00:00.000Z,2026-05-09T10:00:00.000Z
```

คะแนนแต่ละช่องเป็น optional ถ้าว่างไว้ หน้าผู้เรียนจะไม่แสดงคะแนนช่องนั้น

## Connect Google Sheet

1. สร้าง Google Cloud service account
2. เปิด Google Sheets API
3. สร้าง key แบบ JSON
4. เอา `client_email` ใส่ `GOOGLE_SERVICE_ACCOUNT_EMAIL`
5. เอา `private_key` ใส่ `GOOGLE_PRIVATE_KEY`
6. Share Google Sheet ให้ service account email เป็น Editor เพราะหน้า admin ต้องเพิ่ม/แก้ไข/ลบข้อมูล
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
- Admin ค่อยสร้าง link ใน tab `UserLineProfiles` เพื่อผูก `lineProfileId` กับ `userId`

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

ให้เอาค่าจาก `.env.production.example` ไปกรอกใน Render Dashboard > Environment ทีละตัว โดยเฉพาะ:

```env
SESSION_SECRET=...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
TEACHER_USERNAME=...
TEACHER_PASSWORD=...
TEACHER_USER_ID=...
TEACHER_DISPLAY_NAME=...
APP_BASE_URL=https://your-app.onrender.com
LIFF_ID=...
LINE_LOGIN_CHANNEL_ID=...
GOOGLE_SPREADSHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
```

แล้วนำ URL ไปตั้งเป็น LIFF endpoint
