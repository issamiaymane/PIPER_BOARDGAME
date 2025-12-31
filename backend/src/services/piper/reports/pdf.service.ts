/**
 * PIPER PDF Generation Service
 * Generates PDF documents for SOAP notes using Puppeteer and Handlebars
 */

import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../../utils/logger';
import { getSessionById } from '../sessions/session.service';
import { getStudentById } from '../students/student.service';
import { getGoalById } from '../goals/goal.service';
import { PROMPT_LEVEL_LABELS, PromptLevel } from '../../../types/piper';

// Cache compiled templates
let soapNoteTemplate: Handlebars.TemplateDelegate | null = null;
let iepGoalTemplate: Handlebars.TemplateDelegate | null = null;

/**
 * Load and compile the SOAP note template
 */
function getSOAPNoteTemplate(): Handlebars.TemplateDelegate {
  if (soapNoteTemplate) {
    return soapNoteTemplate;
  }

  const templatePath = path.join(__dirname, '../../../templates/soap-note.hbs');
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  soapNoteTemplate = Handlebars.compile(templateSource);

  return soapNoteTemplate;
}

/**
 * Load and compile the IEP Goal template
 */
function getIEPGoalTemplate(): Handlebars.TemplateDelegate {
  if (iepGoalTemplate) {
    return iepGoalTemplate;
  }

  const templatePath = path.join(__dirname, '../../../templates/iep-goal.hbs');
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  iepGoalTemplate = Handlebars.compile(templateSource);

  return iepGoalTemplate;
}

/**
 * Data structure for SOAP note PDF
 */
interface SOAPNotePDFData {
  student_name: string;
  session_date: string;
  therapist_name?: string;
  goal_type?: string;
  soap_subjective: string;
  soap_objective: string;
  soap_assessment: string;
  soap_plan: string;
  show_stats: boolean;
  accuracy?: string;
  correct_trials?: number;
  total_trials?: number;
  prompt_level?: string;
  generated_date: string;
}

/**
 * Generate PDF for a session SOAP note
 */
export async function generateSOAPNotePDF(
  session_id: number,
  therapist_name?: string
): Promise<Buffer> {
  const session = getSessionById(session_id);
  if (!session) {
    throw new Error('Session not found');
  }

  // Check if SOAP note exists
  if (!session.soap_subjective && !session.soap_objective && !session.soap_assessment && !session.soap_plan) {
    throw new Error('No SOAP note saved for this session');
  }

  const student = getStudentById(session.student_id);
  if (!student) {
    throw new Error('Student not found');
  }

  const goal = session.iep_goal_id ? getGoalById(session.iep_goal_id) : null;

  // Prepare data for template
  const data: SOAPNotePDFData = {
    student_name: `${student.first_name} ${student.last_name}`,
    session_date: new Date(session.start_time).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    therapist_name,
    goal_type: goal?.goal_type,
    soap_subjective: session.soap_subjective || 'Not documented',
    soap_objective: session.soap_objective || 'Not documented',
    soap_assessment: session.soap_assessment || 'Not documented',
    soap_plan: session.soap_plan || 'Not documented',
    show_stats: session.total_trials > 0,
    accuracy: session.accuracy_percentage?.toFixed(0),
    correct_trials: session.correct_trials,
    total_trials: session.total_trials,
    prompt_level: PROMPT_LEVEL_LABELS[session.prompt_level_used as PromptLevel]?.toUpperCase(),
    generated_date: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  // Generate HTML from template
  const template = getSOAPNoteTemplate();
  const html = template(data);

  // Generate PDF using Puppeteer
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    logger.info(`PDF generated for session ${session_id}`);
    return Buffer.from(pdfBuffer);
  } catch (error) {
    logger.error('PDF generation failed:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Check if a session has a saved SOAP note
 */
export function hasSOAPNote(session_id: number): boolean {
  const session = getSessionById(session_id);
  if (!session) {
    return false;
  }

  return !!(session.soap_subjective || session.soap_objective || session.soap_assessment || session.soap_plan);
}

/**
 * Data structure for Goal PDF
 */
interface GoalPDFData {
  student_name: string;
  therapist_name?: string;
  goal_type: string;
  goal_description: string;
  target_percentage: number;
  sessions_to_confirm: number;
  prompt_level: string;
  deadline?: string;
  baseline?: string;
  comments?: string;
  categories: string[];
  generated_date: string;
}

/**
 * Generate PDF for an IEP Goal
 */
export async function generateGoalPDF(
  goal_id: number,
  therapist_name?: string
): Promise<Buffer> {
  const goal = getGoalById(goal_id);
  if (!goal) {
    throw new Error('Goal not found');
  }

  const student = getStudentById(goal.student_id);
  if (!student) {
    throw new Error('Student not found');
  }

  // Parse categories
  let categories: string[] = [];
  try {
    categories = JSON.parse(goal.mapped_categories);
  } catch {
    categories = [goal.goal_type];
  }

  // Prepare data
  const data: GoalPDFData = {
    student_name: `${student.first_name} ${student.last_name}`,
    therapist_name,
    goal_type: goal.goal_type,
    goal_description: goal.goal_description,
    target_percentage: goal.target_percentage,
    sessions_to_confirm: goal.sessions_to_confirm,
    prompt_level: PROMPT_LEVEL_LABELS[goal.current_prompt_level as PromptLevel]?.toUpperCase() || 'MOD',
    deadline: goal.deadline,
    baseline: goal.baseline,
    comments: goal.comments,
    categories,
    generated_date: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  // Generate HTML from template
  const template = getIEPGoalTemplate();
  const html = template(data);

  // Generate PDF using Puppeteer
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    logger.info(`PDF generated for goal ${goal_id}`);
    return Buffer.from(pdfBuffer);
  } catch (error) {
    logger.error('Goal PDF generation failed:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export default {
  generateSOAPNotePDF,
  generateGoalPDF,
  hasSOAPNote,
};
