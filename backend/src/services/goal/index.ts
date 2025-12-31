/**
 * Goal Services
 * Re-exports all goal-related services
 */

export {
  validatePdfFile,
  saveGoalsPdf,
  updateStudentGoalsPdfMetadata,
  getGoalsPdfPath,
  hasGoalsPdf,
  deleteGoalsPdf,
} from './upload.service.js';

export {
  extractGoalsData,
  PasswordRequiredError,
} from './extraction.service.js';

export {
  createGoalsFromExtraction,
  getGoalById,
  getGoalForStudent,
  listGoalsByStudent,
  listActiveGoalsByStudent,
  updateGoal,
  deleteGoal,
  deleteAllGoalsForStudent,
} from './goal.service.js';
