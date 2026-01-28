/**
 * Member Service
 * Handles member CRUD operations
 */

import bcryptjs from 'bcryptjs';
import { getDatabase } from '../database.js';
import { config } from '../../config/index.js';
import type { Member, MemberResponse, CreateMemberRequest, UpdateMemberRequest } from '../../types/index.js';

const { saltRounds, validRoles, isValidEmail } = config.auth;

// =============================================================================
// READ OPERATIONS
// =============================================================================

export function getMemberById(id: number): Member | undefined {
  const db = getDatabase();
  return db.prepare(`
    SELECT m.*, s.name as school_name
    FROM therapist_members m
    LEFT JOIN therapist_schools s ON m.school_id = s.id
    WHERE m.id = ?
  `).get(id) as Member | undefined;
}

export function getMemberByEmail(email: string): Member | undefined {
  const db = getDatabase();
  return db.prepare(`
    SELECT m.*, s.name as school_name
    FROM therapist_members m
    LEFT JOIN therapist_schools s ON m.school_id = s.id
    WHERE m.email = ?
  `).get(email.trim().toLowerCase()) as Member | undefined;
}

export function listMembers(): MemberResponse[] {
  const db = getDatabase();
  const members = db.prepare(`
    SELECT m.*, s.name as school_name
    FROM therapist_members m
    LEFT JOIN therapist_schools s ON m.school_id = s.id
    ORDER BY m.created_at DESC
  `).all() as Member[];

  return members.map(parseMemberRoles);
}

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

export async function createMember(data: CreateMemberRequest): Promise<MemberResponse> {
  const db = getDatabase();

  // Validate email format
  if (!isValidEmail(data.email.trim())) {
    throw new Error('Invalid email format');
  }

  // Check for duplicate email
  const existing = getMemberByEmail(data.email);
  if (existing) {
    throw new Error('A member with this email already exists');
  }

  // Validate roles
  for (const role of data.roles) {
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Valid roles are: ${validRoles.join(', ')}`);
    }
  }

  // Validate school_id if provided
  if (data.school_id) {
    const school = db.prepare('SELECT id FROM therapist_schools WHERE id = ?').get(data.school_id);
    if (!school) {
      throw new Error('Invalid school ID');
    }
  }

  // Hash the password
  const passwordHash = await bcryptjs.hash(data.password, saltRounds);

  const result = db.prepare(`
    INSERT INTO therapist_members (name, email, password_hash, roles, school_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    data.name.trim(),
    data.email.trim().toLowerCase(),
    passwordHash,
    JSON.stringify(data.roles),
    data.school_id || null
  );

  const member = getMemberById(result.lastInsertRowid as number);
  if (!member) {
    throw new Error('Failed to create member');
  }

  return parseMemberRoles(member);
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

export async function updateMember(id: number, data: UpdateMemberRequest): Promise<MemberResponse> {
  const db = getDatabase();

  // Check member exists
  const existing = getMemberById(id);
  if (!existing) {
    throw new Error('Member not found');
  }

  // Build update fields
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      throw new Error('Member name cannot be empty');
    }
    updates.push('name = ?');
    values.push(data.name.trim());
  }

  if (data.email !== undefined) {
    if (data.email.trim().length === 0) {
      throw new Error('Member email cannot be empty');
    }
    if (!isValidEmail(data.email.trim())) {
      throw new Error('Invalid email format');
    }
    // Check for duplicate email (excluding current member)
    const duplicate = db.prepare('SELECT id FROM therapist_members WHERE email = ? AND id != ?')
      .get(data.email.trim().toLowerCase(), id);
    if (duplicate) {
      throw new Error('A member with this email already exists');
    }
    updates.push('email = ?');
    values.push(data.email.trim().toLowerCase());
  }

  if (data.password !== undefined) {
    const passwordHash = await bcryptjs.hash(data.password, saltRounds);
    updates.push('password_hash = ?');
    values.push(passwordHash);
  }

  if (data.roles !== undefined) {
    if (data.roles.length === 0) {
      throw new Error('At least one role is required');
    }
    for (const role of data.roles) {
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role: ${role}. Valid roles are: ${validRoles.join(', ')}`);
      }
    }
    updates.push('roles = ?');
    values.push(JSON.stringify(data.roles));
  }

  if (data.school_id !== undefined) {
    if (data.school_id !== null) {
      const school = db.prepare('SELECT id FROM therapist_schools WHERE id = ?').get(data.school_id);
      if (!school) {
        throw new Error('Invalid school ID');
      }
    }
    updates.push('school_id = ?');
    values.push(data.school_id);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  // Execute update
  values.push(id);
  db.prepare(`UPDATE therapist_members SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const member = getMemberById(id);
  if (!member) {
    throw new Error('Failed to retrieve updated member');
  }

  return parseMemberRoles(member);
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

export function deleteMember(id: number): void {
  const db = getDatabase();

  const member = getMemberById(id);
  if (!member) {
    throw new Error('Member not found');
  }

  db.prepare('DELETE FROM therapist_members WHERE id = ?').run(id);
}

// =============================================================================
// HELPERS
// =============================================================================

function parseMemberRoles(member: Member): MemberResponse {
  return {
    ...member,
    roles: JSON.parse(member.roles || '[]')
  };
}
