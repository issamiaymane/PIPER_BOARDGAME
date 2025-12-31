/**
 * Evaluation Services
 * Re-exports all evaluation-related services
 */

export {
  validatePdfFile,
  saveEvaluationPdf,
  updateStudentPdfMetadata,
  getEvaluationPdfPath,
  hasEvaluationPdf,
  deleteEvaluationPdf,
  readEvaluationPdf,
} from './upload.service.js';

export {
  extractEvaluationData,
  extractionResultToEvalData,
  PasswordRequiredError,
} from './extraction.service.js';
