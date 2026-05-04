/**
 * Google Sheet setup script for course management data validation.
 *
 * How to use:
 * 1. Open the Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this file into Code.gs.
 * 4. Save, then run setupCourseManagementDropdowns().
 * 5. Approve permissions.
 *
 * This script adds dropdowns and auto-fills IDs from readable names.
 */

const HEADER_ROW = 1;
const FIRST_DATA_ROW = 2;
const MAX_ROWS = 1000;

function setupCourseManagementDropdowns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const lineProfiles = requireSheet_(ss, "LineProfiles");
  const users = requireSheet_(ss, "Users");
  const courses = requireSheet_(ss, "Courses");
  const enrollments = requireSheet_(ss, "Enrollments");
  const lessons = requireSheet_(ss, "Lessons");
  const attendances = requireSheet_(ss, "Attendances");

  applyOptionalDropdownFromRange_(enrollments, "userDisplayName", users, "displayName");
  applyOptionalDropdownFromRange_(enrollments, "courseName", courses, "name");
  applyOptionalDropdownFromRange_(attendances, "userDisplayName", users, "displayName");
  applyOptionalDropdownFromRange_(attendances, "courseName", courses, "name");
  clearOptionalValidation_(users, "lineProfileId");
  clearOptionalValidation_(enrollments, "userId");
  clearOptionalValidation_(enrollments, "courseId");
  clearOptionalValidation_(lessons, "enrollmentId");
  clearOptionalValidation_(attendances, "enrollmentId");

  applyDropdownList_(users, "role", ["STUDENT", "INSTRUCTOR", "ADMIN"]);
  applyDropdownList_(courses, "courseType", ["CLASS", "HOUR"]);
  applyDropdownList_(enrollments, "status", ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);
  applyDropdownList_(lessons, "status", ["SCHEDULED", "CHECKED_IN", "CANCELLED"]);
  applyOptionalDateValidation_(attendances, "checkedInAt");

  notify_("Dropdown setup completed.");
}

function onEdit(event) {
  if (!event || !event.range) return;

  const sheet = event.range.getSheet();
  if (event.range.getRow() < FIRST_DATA_ROW) return;

  if (sheet.getName() === "Enrollments") {
    handleEnrollmentEdit_(sheet, event);
    return;
  }

  if (sheet.getName() === "Attendances") {
    handleAttendanceEdit_(sheet, event);
  }
}

function handleEnrollmentEdit_(sheet, event) {
  const editedColumn = event.range.getColumn();
  const userDisplayNameColumn = findOptionalColumn_(sheet, "userDisplayName");
  const courseNameColumn = findOptionalColumn_(sheet, "courseName");

  if (userDisplayNameColumn && editedColumn === userDisplayNameColumn) {
    fillEnrollmentUserId_(sheet, event.range.getRow(), event.value);
  }

  if (courseNameColumn && editedColumn === courseNameColumn) {
    fillEnrollmentCourseId_(sheet, event.range.getRow(), event.value);
  }
}

function handleAttendanceEdit_(sheet, event) {
  const editedColumn = event.range.getColumn();
  const userDisplayNameColumn = findOptionalColumn_(sheet, "userDisplayName");
  const courseNameColumn = findOptionalColumn_(sheet, "courseName");

  if (
    (userDisplayNameColumn && editedColumn === userDisplayNameColumn) ||
    (courseNameColumn && editedColumn === courseNameColumn)
  ) {
    fillAttendanceEnrollmentId_(sheet, event.range.getRow());
  }
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("Course Setup")
      .addItem("Setup dropdowns", "setupCourseManagementDropdowns")
      .addToUi();
  } catch (error) {
    console.log("Menu skipped because Spreadsheet UI is not available.");
  }
}

function notify_(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (error) {
    console.log(message);
  }
}

function applyDropdownFromRange_(targetSheet, targetHeader, sourceSheet, sourceHeader) {
  const targetColumn = findColumn_(targetSheet, targetHeader);
  const sourceColumn = findColumn_(sourceSheet, sourceHeader);
  const sourceRange = sourceSheet.getRange(FIRST_DATA_ROW, sourceColumn, MAX_ROWS - 1, 1);
  const targetRange = targetSheet.getRange(FIRST_DATA_ROW, targetColumn, MAX_ROWS - 1, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(sourceRange, true)
    .setAllowInvalid(false)
    .build();

  targetRange.setDataValidation(rule);
}

function applyOptionalDropdownFromRange_(targetSheet, targetHeader, sourceSheet, sourceHeader) {
  if (!findOptionalColumn_(targetSheet, targetHeader)) return;
  applyDropdownFromRange_(targetSheet, targetHeader, sourceSheet, sourceHeader);
}

function clearOptionalValidation_(targetSheet, targetHeader) {
  const targetColumn = findOptionalColumn_(targetSheet, targetHeader);
  if (!targetColumn) return;

  targetSheet.getRange(FIRST_DATA_ROW, targetColumn, MAX_ROWS - 1, 1).clearDataValidations();
}

function applyDropdownList_(targetSheet, targetHeader, values) {
  const targetColumn = findColumn_(targetSheet, targetHeader);
  const targetRange = targetSheet.getRange(FIRST_DATA_ROW, targetColumn, MAX_ROWS - 1, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();

  targetRange.setDataValidation(rule);
}

function applyOptionalDateValidation_(targetSheet, targetHeader) {
  const targetColumn = findOptionalColumn_(targetSheet, targetHeader);
  if (!targetColumn) return;

  const targetRange = targetSheet.getRange(FIRST_DATA_ROW, targetColumn, MAX_ROWS - 1, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(false)
    .build();

  targetRange.setDataValidation(rule);
  targetRange.setNumberFormat("yyyy-mm-dd");
}

function fillEnrollmentUserId_(enrollmentsSheet, rowNumber, displayName) {
  const userIdColumn = findOptionalColumn_(enrollmentsSheet, "userId");
  if (!userIdColumn) return;

  const usersSheet = requireSheet_(SpreadsheetApp.getActiveSpreadsheet(), "Users");
  const userId = lookupValue_(usersSheet, "displayName", displayName, "userId");
  enrollmentsSheet.getRange(rowNumber, userIdColumn).setValue(userId || "");
}

function fillEnrollmentCourseId_(enrollmentsSheet, rowNumber, courseName) {
  const courseIdColumn = findOptionalColumn_(enrollmentsSheet, "courseId");
  if (!courseIdColumn) return;

  const coursesSheet = requireSheet_(SpreadsheetApp.getActiveSpreadsheet(), "Courses");
  const courseId = lookupValue_(coursesSheet, "name", courseName, "courseId");
  enrollmentsSheet.getRange(rowNumber, courseIdColumn).setValue(courseId || "");
}

function fillAttendanceEnrollmentId_(attendancesSheet, rowNumber) {
  const enrollmentIdColumn = findOptionalColumn_(attendancesSheet, "enrollmentId");
  const userDisplayNameColumn = findOptionalColumn_(attendancesSheet, "userDisplayName");
  const courseNameColumn = findOptionalColumn_(attendancesSheet, "courseName");
  if (!enrollmentIdColumn || !userDisplayNameColumn || !courseNameColumn) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usersSheet = requireSheet_(ss, "Users");
  const coursesSheet = requireSheet_(ss, "Courses");
  const enrollmentsSheet = requireSheet_(ss, "Enrollments");
  const userDisplayName = attendancesSheet.getRange(rowNumber, userDisplayNameColumn).getValue();
  const courseName = attendancesSheet.getRange(rowNumber, courseNameColumn).getValue();
  const userId = lookupValue_(usersSheet, "displayName", userDisplayName, "userId");
  const courseId = lookupValue_(coursesSheet, "name", courseName, "courseId");

  if (!userId || !courseId) {
    attendancesSheet.getRange(rowNumber, enrollmentIdColumn).setValue("");
    return;
  }

  const enrollmentId = lookupEnrollmentId_(enrollmentsSheet, userId, courseId);
  attendancesSheet.getRange(rowNumber, enrollmentIdColumn).setValue(enrollmentId || "");
}

function lookupEnrollmentId_(enrollmentsSheet, userId, courseId) {
  const enrollmentIdColumn = findColumn_(enrollmentsSheet, "enrollmentId");
  const userIdColumn = findColumn_(enrollmentsSheet, "userId");
  const courseIdColumn = findColumn_(enrollmentsSheet, "courseId");
  const statusColumn = findOptionalColumn_(enrollmentsSheet, "status");
  const lastRow = enrollmentsSheet.getLastRow();
  if (lastRow < FIRST_DATA_ROW) return "";

  const rows = enrollmentsSheet.getRange(
    FIRST_DATA_ROW,
    1,
    lastRow - FIRST_DATA_ROW + 1,
    enrollmentsSheet.getLastColumn()
  ).getValues();

  const match = rows.find((row) => {
    const rowUserId = String(row[userIdColumn - 1]).trim();
    const rowCourseId = String(row[courseIdColumn - 1]).trim();
    const rowStatus = statusColumn ? String(row[statusColumn - 1]).trim() : "ACTIVE";
    return rowUserId === String(userId).trim() &&
      rowCourseId === String(courseId).trim() &&
      rowStatus !== "CANCELLED";
  });

  return match ? String(match[enrollmentIdColumn - 1]).trim() : "";
}

function lookupValue_(sheet, lookupHeader, lookupValue, returnHeader) {
  if (!lookupValue) return "";

  const lookupColumn = findColumn_(sheet, lookupHeader);
  const returnColumn = findColumn_(sheet, returnHeader);
  const lastRow = sheet.getLastRow();
  if (lastRow < FIRST_DATA_ROW) return "";

  const rows = sheet.getRange(FIRST_DATA_ROW, 1, lastRow - FIRST_DATA_ROW + 1, sheet.getLastColumn()).getValues();
  const match = rows.find((row) => String(row[lookupColumn - 1]).trim() === String(lookupValue).trim());
  return match ? String(match[returnColumn - 1]).trim() : "";
}

function requireSheet_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Missing sheet: ${sheetName}`);
  }
  return sheet;
}

function findColumn_(sheet, headerName) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(HEADER_ROW, 1, 1, lastColumn).getValues()[0];
  const index = headers.findIndex((header) => String(header).trim() === headerName);

  if (index === -1) {
    throw new Error(`Missing header "${headerName}" in sheet "${sheet.getName()}"`);
  }

  return index + 1;
}

function findOptionalColumn_(sheet, headerName) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(HEADER_ROW, 1, 1, lastColumn).getValues()[0];
  const index = headers.findIndex((header) => String(header).trim() === headerName);
  return index === -1 ? null : index + 1;
}
