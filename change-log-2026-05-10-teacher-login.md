# Change Log — Teacher Login หลายบัญชี

วันที่: 2026-05-10

## สรุปสิ่งที่แก้

ปรับระบบ login ของครูจากเดิมที่ใช้ username/password จาก environment variable ได้แค่ครูคนเดียว ให้รองรับครูหลายคนผ่าน Google Sheet tab ใหม่ชื่อ `TeacherLogins`

## Behavior ใหม่

- ครูไม่ login ผ่าน LINE แล้ว
- ครูเข้า `/teacher` ด้วย username/password เท่านั้น
- username/password ของครูเก็บใน Google Sheet tab `TeacherLogins`
- เมื่อครู login สำเร็จ ระบบจะใช้ `TeacherLogins.userId` ไปหา user ใน tab `Users`
- user ที่ผูกกับ teacher login ต้องมี role เป็น `INSTRUCTOR` หรือ `ADMIN`
- หน้า teacher จะเห็นเฉพาะนักเรียนที่ `Enrollments.instructorId` ตรงกับ `userId` ของครูที่ login
- LINE login จะ resolve เฉพาะ `Users.role = STUDENT` แล้ว redirect ไป `/student`

## Google Sheet tab ใหม่

เพิ่ม tab:

```csv
TeacherLogins
```

Header:

```csv
teacherLoginId,userId,username,password,createdAt,updatedAt
```

ตัวอย่าง:

```csv
teacher-login-earth,teacher-earth,teacher,teacher123456,2026-05-09T10:00:00.000Z,2026-05-09T10:00:00.000Z
```

เงื่อนไข:

- `userId` ต้องตรงกับ `Users.userId`
- user นั้นควรมี `role = INSTRUCTOR`
- `username` ต้องไม่ซ้ำกัน

## ไฟล์ที่แก้

### Backend

- `src/types.ts`
  - เพิ่ม type `TeacherLoginRow`

- `src/mock-data.ts`
  - เพิ่ม mock data `mockTeacherLogins`

- `src/sheets.ts`
  - เพิ่ม `TeacherLogins` เข้า `SheetName`
  - เพิ่ม `teacherLogins` ใน `SheetDatabase`
  - เพิ่มการอ่าน tab `TeacherLogins` ใน `loadSheetDatabase`
  - เพิ่ม mapper `toTeacherLogin`
  - เพิ่ม serializer `teacherLoginToSheetObject`
  - เพิ่ม CRUD:
    - `createTeacherLoginRow`
    - `updateTeacherLoginRow`
    - `deleteTeacherLoginRow`

- `src/routes/instructor-routes.ts`
  - เปลี่ยน `/api/teacher/login` ให้เช็คจาก `db.teacherLogins`
  - เลิก fallback ไปใช้ `TEACHER_USERNAME`, `TEACHER_PASSWORD`, `TEACHER_USER_ID`, `TEACHER_DISPLAY_NAME`
  - ตรวจว่า teacher login ผูกกับ user ที่ role เป็น `INSTRUCTOR` หรือ `ADMIN`

- `src/routes/auth-routes.ts`
  - LINE login ไม่เลือก `INSTRUCTOR` หรือ `ADMIN` แล้ว
  - LINE login จะใช้เฉพาะ user role `STUDENT`
  - redirectPath จาก LINE login เป็น `/student` เท่านั้น

- `src/routes/admin-routes.ts`
  - เพิ่ม Admin API สำหรับ `TeacherLogins`
    - `POST /api/admin/teacher-logins`
    - `PUT /api/admin/teacher-logins/:id`
    - `DELETE /api/admin/teacher-logins/:id`
  - เพิ่ม `teacherLogins` ใน admin dashboard response พร้อม `userDisplayName`

- `src/config.ts`
  - เอา env teacher login เดิมออก:
    - `TEACHER_USERNAME`
    - `TEACHER_PASSWORD`
    - `TEACHER_USER_ID`
    - `TEACHER_DISPLAY_NAME`

- `src/check-sheets.ts`
  - เพิ่ม `TeacherLogins` ในรายการ tab ที่ต้องเช็ค

- `src/validate-sheets.ts`
  - เพิ่ม validation สำหรับ `TeacherLogins`
  - ตรวจ missing `teacherLoginId`, `username`, `password`
  - ตรวจว่า `userId` มีจริงใน `Users`
  - ตรวจว่า user ที่อ้างถึงเป็น `INSTRUCTOR` หรือ `ADMIN`

### Frontend

- `public/js/admin.js`
  - เพิ่ม tab ใหม่ `TeacherLogins`
  - เพิ่ม form เพิ่ม/แก้ไข teacher login
  - เพิ่ม filter ตามครูและ search
  - เพิ่ม table แสดง Login ID, Teacher, Username, Password
  - ซ่อน password ใน table เป็น `••••••••`

### Documentation / Setup

- `README.md`
  - เพิ่ม section `TeacherLogins`
  - ระบุว่าครู login ผ่าน `/teacher` ด้วย username/password จาก tab `TeacherLogins`
  - ระบุว่า LINE login ใช้สำหรับนักเรียน/ผู้ปกครองเท่านั้น
  - เอา env teacher login เดิมออกจาก production setup

- `.env.local.example`
  - เอา teacher env เดิมออก

- `.env.production.example`
  - เอา teacher env เดิมออก

- `google-sheet-dropdown-guide.md`
  - เพิ่ม header ของ tab `TeacherLogins`

- `google-sheet-data-validation.gs`
  - เพิ่ม dropdown validation ให้ `TeacherLogins.userId` เลือกจาก `Users.userId`

## การทดสอบที่รันแล้ว

```bash
node --check public/js/admin.js
npm run build
MOCK_SHEET_ENABLED=true SESSION_SECRET=local-secret-local-secret-123 node dist/src/validate-sheets.js
```

ผลลัพธ์:

- JavaScript syntax ผ่าน
- TypeScript build ผ่าน
- Mock relation validation ผ่าน

ทดสอบ login mock:

```text
username=teacher password=teacher123456 -> 200 token returned
username=teacher password=wrong -> 401 Username or password is incorrect
```

## สิ่งที่ต้องทำใน Google Sheet จริง

1. เพิ่ม tab `TeacherLogins`
2. ใส่ header:

```csv
teacherLoginId,userId,username,password,createdAt,updatedAt
```

3. เพิ่ม user ครูใน tab `Users` โดย role เป็น `INSTRUCTOR`
4. เพิ่ม row ใน `TeacherLogins` โดย `userId` ต้องตรงกับครูคนนั้น
5. ใน tab `Enrollments` ใส่ `instructorId` ให้ตรงกับ `Users.userId` ของครู

## หมายเหตุ

ตอนนี้ password เก็บเป็น plain text ใน Google Sheet ตาม scope ปัจจุบัน ถ้าต้องการ production hardening ควรเปลี่ยนเป็น password hash ในรอบถัดไป
