import { create } from "zustand";

// Re-export all shared store types
export * from "./types/store";

// Re-export all formatting & calculation utilities
export * from "./utils/formatters";

// Import slice creators and interfaces
import { UserSlice, createUserSlice } from "./stores/user-slice";
import { CourseSlice, createCourseSlice } from "./stores/course-slice";
import { AssessmentSlice, createAssessmentSlice } from "./stores/assessment-slice";
import { CertificateSlice, createCertificateSlice } from "./stores/certificate-slice";
import { ProgressSlice, createProgressSlice } from "./stores/progress-slice";
import { CommunicationSlice, createCommunicationSlice } from "./stores/communication-slice";
import { CalendarSlice, createCalendarSlice } from "./stores/calendar-slice";
import { CheckpointSlice, createCheckpointSlice } from "./stores/checkpoint-slice";

export type DataState = UserSlice &
  CourseSlice &
  AssessmentSlice &
  CertificateSlice &
  ProgressSlice &
  CommunicationSlice &
  CalendarSlice &
  CheckpointSlice;

export const useData = create<DataState>()((...a) => ({
  ...createUserSlice(...a),
  ...createCourseSlice(...a),
  ...createAssessmentSlice(...a),
  ...createCertificateSlice(...a),
  ...createProgressSlice(...a),
  ...createCommunicationSlice(...a),
  ...createCalendarSlice(...a),
  ...createCheckpointSlice(...a),
}));

export const useDataStore = useData;
