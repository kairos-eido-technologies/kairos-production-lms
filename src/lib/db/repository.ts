import { userRepository } from "./repositories/user.repository";
import { courseRepository } from "./repositories/course.repository";
import { progressRepository } from "./repositories/progress.repository";
import { certificateRepository } from "./repositories/certificate.repository";
import { assessmentRepository } from "./repositories/assessment.repository";
import { communicationRepository } from "./repositories/communication.repository";
import { calendarRepository } from "./repositories/calendar.repository";
import { checkpointRepository } from "./repositories/checkpoint.repository";

export const repository = {
  ...userRepository,
  ...courseRepository,
  ...progressRepository,
  ...certificateRepository,
  ...assessmentRepository,
  ...communicationRepository,
  ...calendarRepository,
  ...checkpointRepository,
};

export type Repository = typeof repository;
export * from "./repositories/user.repository";
export * from "./repositories/course.repository";
export * from "./repositories/progress.repository";
export * from "./repositories/certificate.repository";
export * from "./repositories/assessment.repository";
export * from "./repositories/communication.repository";
export * from "./repositories/calendar.repository";
export * from "./repositories/checkpoint.repository";
