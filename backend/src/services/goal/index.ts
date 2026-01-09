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
} from './upload.js';

export {
  extractGoalsData,
  PasswordRequiredError,
} from './extraction.js';

export {
  createGoalsFromExtraction,
  getGoalById,
  getGoalForStudent,
  listGoalsByStudent,
  listActiveGoalsByStudent,
  updateGoal,
  deleteGoal,
  deleteAllGoalsForStudent,
} from './goal.js';
