export const mockLineProfiles = [
    {
        lineProfileId: "line-profile-demo",
        lineUserId: "demo-student",
        displayName: "Demo Student",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];
export const mockUsers = [
    {
        userId: "student-demo",
        lineProfileId: "line-profile-demo",
        lineUserId: "demo-student",
        displayName: "Demo Student",
        role: "STUDENT"
    }
];
export const mockCourses = [
    {
        courseId: "course-10",
        name: "Private Course 10 Classes",
        courseType: "CLASS",
        totalClasses: 10
    },
    {
        courseId: "hour-10",
        name: "Private Course 10 Hours",
        courseType: "HOUR",
        totalClasses: 10
    }
];
export const mockEnrollments = [
    {
        enrollmentId: "enroll-demo",
        userId: "student-demo",
        lineUserId: "demo-student",
        courseId: "course-10",
        purchasedClasses: 10,
        remainingClasses: 5,
        status: "ACTIVE"
    }
];
export const mockLessons = [
    {
        lessonId: "lesson-next",
        enrollmentId: "enroll-demo",
        instructorName: "Demo Teacher",
        startsAt: futureDate(1, 10),
        endsAt: futureDate(1, 11),
        status: "SCHEDULED"
    }
];
export const mockAttendances = Array.from({ length: 5 }, (_, index) => ({
    attendanceId: `att-${index + 1}`,
    enrollmentId: "enroll-demo",
    instructorName: "Demo Teacher",
    checkedInAt: pastDate(5 - index, 10, 5),
    classesUsed: 1,
    note: `เรียนครั้งที่ ${index + 1}`
}));
function futureDate(daysFromNow, hour) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
}
function pastDate(daysAgo, hour, minute) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
}
