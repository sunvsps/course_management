# ER Diagram

โปรเจกต์นี้ใช้ Google Sheets เป็น database โดยแต่ละ sheet ทำหน้าที่เหมือน table
ความสัมพันธ์ด้านล่างอ้างอิงจาก `src/types.ts`, `src/sheets.ts`, service layer และ header ใน `README.md`

```mermaid
erDiagram
  USERS ||--o{ USER_LINE_PROFILES : "is linked by"
  LINE_PROFILES ||--o{ USER_LINE_PROFILES : "links to"
  USERS ||--o{ TEACHER_LOGINS : "has login"
  USERS ||--o{ ENROLLMENTS : "student enrolls"
  USERS ||--o{ ENROLLMENTS : "instructor teaches"
  COURSES ||--o{ ENROLLMENTS : "is enrolled in"
  ENROLLMENTS ||--o{ ATTENDANCES : "records"
  ENROLLMENTS ||--o{ PRE_POST_ASSEMENTS : "is assessed by"
  USER_LINE_PROFILES ||--o{ PRE_POST_ASSEMENTS : "parent submits"

  USERS {
    string userId PK
    string displayName
    string pictureUrl
    date birthDate
    string role "STUDENT | INSTRUCTOR | ADMIN"
    datetime createdAt
    datetime updatedAt
  }

  LINE_PROFILES {
    string lineProfileId PK
    string lineUserId
    string displayName
    string pictureUrl
    string statusMessage
    string email
    datetime createdAt
    datetime updatedAt
  }

  USER_LINE_PROFILES {
    string userLineProfileId PK
    string userId FK
    string lineProfileId FK
    string relationship
    boolean isPrimary
    datetime createdAt
    datetime updatedAt
  }

  TEACHER_LOGINS {
    string teacherLoginId PK
    string userId FK
    string username UK
    string password
    datetime createdAt
    datetime updatedAt
  }

  COURSES {
    string courseId PK
    string name
    string courseType "CLASS | HOUR"
    number totalClasses
    datetime createdAt
    datetime updatedAt
  }

  ENROLLMENTS {
    string enrollmentId PK
    string userId FK
    string courseId FK
    string instructorId FK
    number purchasedClasses
    number remainingClasses
    string status "ACTIVE | PAUSED | COMPLETED | CANCELLED"
    datetime createdAt
    datetime updatedAt
  }

  ATTENDANCES {
    string attendanceId PK
    string userDisplayName
    string courseName
    string enrollmentId FK
    string instructorName
    date checkedInAt
    number classesUsed
    number hyperactiveScore
    number distractionScore
    number attentionSpanScore
    number selfControlScore
    number selfEsteemScore
    number timeManagementScore
    number behaviorScore
    string note
    datetime createdAt
    datetime updatedAt
  }

  PRE_POST_ASSEMENTS {
    string assessmentId PK
    string enrollmentId FK
    string assessmentType "PRE | POST"
    string userLineProfileId FK
    string rateRole "PARENT | INSTRUCTOR"
    number continuousActivityScore
    number listeningInstructionScore
    number emotionalControlScore
    number waitingSelfControlScore
    number concentrationScore
    number physicalBalanceScore
    number planningProblemSolvingScore
    number socialInteractionScore
    number confidenceNewExperienceScore
    number activityCooperationScore
    string note
    datetime createdAt
    datetime updatedAt
  }
```

## Relationship Notes

- `UserLineProfiles.userId` อ้างถึง `Users.userId`
- `UserLineProfiles.lineProfileId` อ้างถึง `LineProfiles.lineProfileId`
- `TeacherLogins.userId` อ้างถึง `Users.userId` ของผู้ใช้ role `INSTRUCTOR` หรือ `ADMIN`
- `Enrollments.userId` อ้างถึง `Users.userId` ของนักเรียน
- `Enrollments.instructorId` อ้างถึง `Users.userId` ของครู
- `Enrollments.courseId` อ้างถึง `Courses.courseId`
- `Attendances.enrollmentId` อ้างถึง `Enrollments.enrollmentId`
- `PrePostAssessments.enrollmentId` อ้างถึง `Enrollments.enrollmentId`
- `PrePostAssessments.userLineProfileId` อ้างถึง `UserLineProfiles.userLineProfileId` สำหรับผู้ปกครอง
- `PrePostAssessments.assessmentType` ใช้แยกแบบประเมินก่อนเรียน `PRE` และหลังเรียน `POST`
- `PrePostAssessments.rateRole` ใช้แยกผู้ประเมิน `PARENT` และ `INSTRUCTOR`

หมายเหตุ: Google Sheets ไม่ enforce primary key/foreign key เหมือน relational database จริง
แต่แอป enforce บางส่วนใน service layer เช่น unique id และ lookup ด้วย id fields เหล่านี้
