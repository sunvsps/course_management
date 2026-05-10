# Google Sheet Dropdown Setup

ไฟล์ `google-sheet-data-validation.gs` ใช้สำหรับสร้าง dropdown ใน Google Sheet ให้คุณครูเลือก ID แทนการพิมพ์เอง

ใน tab `Users` ถ้าต้องการโชว์อายุใต้ชื่อนักเรียน ให้เพิ่ม column ได้แบบนี้:

```csv
userId,displayName,pictureUrl,birthDate,role,createdAt,updatedAt
```

กรอก `birthDate` เช่น `2018-01-15` แล้วระบบจะคำนวณอายุเป็นปีและเดือนให้อัตโนมัติ

เพิ่ม tab `UserLineProfiles` สำหรับผูก LINE profile กับ user ได้หลายต่อหลาย:

```csv
userLineProfileId,userId,lineProfileId,relationship,isPrimary,createdAt,updatedAt
```

เพิ่ม tab `TeacherLogins` สำหรับบัญชีครูหลายคนที่ login ผ่าน `/teacher`:

```csv
teacherLoginId,userId,username,password,createdAt,updatedAt
```

แนะนำให้เพิ่ม column ใน tab `Enrollments` เป็นแบบนี้:

```csv
enrollmentId,userDisplayName,userId,courseName,courseId,instructorId,purchasedClasses,remainingClasses,status,createdAt,updatedAt
```

คุณครูเลือก `userDisplayName` และ `courseName` จาก dropdown แล้ว script จะเติม `userId` และ `courseId` ให้อัตโนมัติ
ถ้า `purchasedClasses` ว่าง ระบบจะใช้จำนวนจาก `Courses.totalClasses` แทน ส่วนจำนวนคงเหลือระบบคำนวณจากประวัติใน `Attendances` อัตโนมัติ
`instructorId` อ้างถึง `Users.userId` ของคุณครู เช่น `teacher-earth` และใช้สำหรับหน้า `/teacher` เพื่อให้ครูเห็นเฉพาะนักเรียน/คอร์สของตัวเอง

แนะนำให้เพิ่ม column ใน tab `Attendances` เป็นแบบนี้:

```csv
attendanceId,userDisplayName,courseName,enrollmentId,instructorName,checkedInAt,classesUsed,hyperactiveScore,distractionScore,attentionSpanScore,selfControlScore,selfEsteemScore,timeManagementScore,behaviorScore,note,createdAt,updatedAt
```

คุณครูเลือก `userDisplayName` และ `courseName` จาก dropdown แล้ว script จะหา `enrollmentId` ที่ตรงกับผู้เรียนและคอร์สนั้นให้อัตโนมัติ

## Dropdown ที่ script จะสร้าง

- `Enrollments.userDisplayName` ดึงจาก `Users.displayName`
- `Enrollments.courseName` ดึงจาก `Courses.name`
- `Attendances.userDisplayName` ดึงจาก `Users.displayName`
- `Attendances.courseName` ดึงจาก `Courses.name`
- `Users.role` เลือกจาก `STUDENT`, `INSTRUCTOR`, `ADMIN`
- `Courses.courseType` เลือกจาก `CLASS`, `HOUR`
- `Enrollments.status` เลือกจาก `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`
- `Lessons.status` เลือกจาก `SCHEDULED`, `CHECKED_IN`, `CANCELLED`

Field ที่เป็น ID เช่น `userId`, `courseId`, `enrollmentId` จะไม่มี dropdown แล้ว เพราะระบบจะเติมให้เองจากชื่อที่คุณครูเลือก

## วิธีติดตั้ง

1. เปิด Google Sheet
2. ไปที่ `Extensions > Apps Script`
3. ลบ code เดิมใน `Code.gs`
4. เอา code จาก `google-sheet-data-validation.gs` ไปวาง
5. กด Save
6. เลือก function `setupCourseManagementDropdowns`
7. กด Run
8. กดยืนยัน permission

หลังจากนั้นใน Google Sheet จะมีเมนูใหม่ชื่อ `Course Setup`

ถ้าเพิ่ม tab/header ใหม่ หรือ dropdown หาย ให้กด:

`Course Setup > Setup dropdowns`

## วิธีใช้งานใน Enrollments

1. เพิ่มแถวใหม่
2. ใส่ `enrollmentId`
3. เลือกชื่อผู้เรียนใน `userDisplayName`
4. ระบบจะเติม `userId` ให้เอง
5. เลือกชื่อคอร์สใน `courseName`
6. ระบบจะเติม `courseId` ให้เอง
7. ใส่ `instructorId` ของคุณครู
8. ใส่ `purchasedClasses` ถ้าจำนวนที่ซื้อไม่เท่ากับคอร์สหลัก แล้วเลือก `status`

ตัวอย่าง:

```csv
enr-001,Sun Earth Student,user-001,Private Course 10 Classes,course-001,teacher-earth,,ACTIVE
```

## วิธีใช้งานใน Attendances

1. เพิ่มแถวใหม่
2. ใส่ `attendanceId`
3. เลือกชื่อผู้เรียนใน `userDisplayName`
4. เลือกชื่อคอร์สใน `courseName`
5. ระบบจะเติม `enrollmentId` ให้เอง โดยหา enrollment ที่มี `userId` และ `courseId` ตรงกัน
6. ใส่ `instructorName`, `checkedInAt`, `classesUsed`, คะแนนแต่ละด้าน, `note`
   - `checkedInAt` เป็นวันที่อย่างเดียว เช่น `2026-05-04`
   - คะแนนแต่ละด้านเป็นคะแนนครูประเมินเต็ม 5 ถ้าไม่มีให้เว้นว่าง

ตัวอย่าง:

```csv
att-001,Sun Earth Student,Private Course 10 Classes,enr-001,Teacher A,2026-05-04,1,5,เรียนครั้งที่ 1
```

## ข้อควรระวัง

- ชื่อ tab และ header ต้องตรงกับระบบ เช่น `Users`, `Enrollments`, `userId`, `courseId`
- ID ต้นทางต้องมีอยู่ก่อน เช่น ต้องมี `Users.userId` ก่อน จึงจะเลือกใน `Enrollments.userId` ได้
- ถ้าใช้ auto fill จากชื่อ ควรตั้ง `Users.displayName` และ `Courses.name` ไม่ให้ซ้ำกัน
- ถ้าผู้เรียนคนเดียวกันมีคอร์สชื่อเดียวกันมากกว่า 1 enrollment, script จะหยิบ enrollment แรกที่เจอและไม่ใช่ `CANCELLED`
- Dropdown จะครอบคลุมแถว 2 ถึง 1000
- ห้ามใส่เครื่องหมาย quote รอบ ID ใน cell
