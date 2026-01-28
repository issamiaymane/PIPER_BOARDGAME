/**
 * School Service
 * Handles school CRUD operations
 */

import { getDatabase } from '../database.js';
import { config } from '../../config/index.js';
import type { School, CreateSchoolRequest, UpdateSchoolRequest } from '../../types/index.js';

const { isValidEmail } = config.auth;

// =============================================================================
// READ OPERATIONS
// =============================================================================

export function getSchoolById(id: number): School | undefined {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      s.*,
      COUNT(m.id) as member_count
    FROM therapist_schools s
    LEFT JOIN therapist_members m ON m.school_id = s.id
    WHERE s.id = ?
    GROUP BY s.id
  `).get(id) as School | undefined;
}

export function listSchools(): School[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT
      s.*,
      COUNT(m.id) as member_count
    FROM therapist_schools s
    LEFT JOIN therapist_members m ON m.school_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all() as School[];
}

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

export interface CreateSchoolOptions extends CreateSchoolRequest {
  admin_id?: number;
  member_ids?: number[];
}

export function createSchool(data: CreateSchoolOptions): School {
  const db = getDatabase();

  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    throw new Error('School name is required');
  }

  // Validate contact email format if provided
  if (data.contact_email && !isValidEmail(data.contact_email.trim())) {
    throw new Error('Invalid contact email format');
  }

  // Create the school
  const result = db.prepare(`
    INSERT INTO therapist_schools (name, contact_name, contact_email, contact_phone)
    VALUES (?, ?, ?, ?)
  `).run(
    data.name.trim(),
    data.contact_name?.trim() || null,
    data.contact_email?.trim() || null,
    data.contact_phone?.trim() || null
  );

  const schoolId = result.lastInsertRowid as number;

  // Assign admin to the school if provided
  if (data.admin_id) {
    db.prepare('UPDATE therapist_members SET school_id = ? WHERE id = ?').run(schoolId, data.admin_id);
  }

  // Assign selected members to the school
  if (data.member_ids && data.member_ids.length > 0) {
    const placeholders = data.member_ids.map(() => '?').join(',');
    db.prepare(`UPDATE therapist_members SET school_id = ? WHERE id IN (${placeholders})`).run(schoolId, ...data.member_ids);
  }

  const school = getSchoolById(schoolId);
  if (!school) {
    throw new Error('Failed to create school');
  }

  return school;
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

export function updateSchool(id: number, data: UpdateSchoolRequest): School {
  const db = getDatabase();

  // Check school exists
  const existing = getSchoolById(id);
  if (!existing) {
    throw new Error('School not found');
  }

  // Build update fields
  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      throw new Error('School name cannot be empty');
    }
    updates.push('name = ?');
    values.push(data.name.trim());
  }

  if (data.contact_name !== undefined) {
    updates.push('contact_name = ?');
    values.push(data.contact_name?.trim() || null);
  }

  if (data.contact_email !== undefined) {
    if (data.contact_email && !isValidEmail(data.contact_email.trim())) {
      throw new Error('Invalid contact email format');
    }
    updates.push('contact_email = ?');
    values.push(data.contact_email?.trim() || null);
  }

  if (data.contact_phone !== undefined) {
    updates.push('contact_phone = ?');
    values.push(data.contact_phone?.trim() || null);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  // Execute update
  values.push(id.toString());
  db.prepare(`UPDATE therapist_schools SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const school = getSchoolById(id);
  if (!school) {
    throw new Error('Failed to retrieve updated school');
  }

  return school;
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

export function deleteSchool(id: number): void {
  const db = getDatabase();

  const school = getSchoolById(id);
  if (!school) {
    throw new Error('School not found');
  }

  // Delete the school (members will have school_id set to NULL due to ON DELETE SET NULL)
  db.prepare('DELETE FROM therapist_schools WHERE id = ?').run(id);
}
