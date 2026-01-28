/**
 * Member and School Types
 */

import type { ValidRole } from '../config/auth.js';

// =============================================================================
// MEMBER TYPES
// =============================================================================

export interface Member {
  id: number;
  name: string;
  email: string;
  roles: string; // JSON string in DB
  school_id: number | null;
  created_at: string;
  school_name?: string | null;
}

export interface MemberResponse extends Omit<Member, 'roles'> {
  roles: ValidRole[];
}

export interface CreateMemberRequest {
  name: string;
  email: string;
  password: string;
  roles: ValidRole[];
  school_id?: number | null;
}

export interface UpdateMemberRequest {
  name?: string;
  email?: string;
  password?: string;
  roles?: ValidRole[];
  school_id?: number | null;
}

// =============================================================================
// SCHOOL TYPES
// =============================================================================

export interface School {
  id: number;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  member_count?: number;
}

export interface CreateSchoolRequest {
  name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  admin_id?: number | null;
  member_ids?: number[];
}

export interface UpdateSchoolRequest {
  name?: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}
