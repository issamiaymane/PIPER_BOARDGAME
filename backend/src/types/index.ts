// Therapist Auth types
export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Therapist {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface TherapistAuthResult {
  therapist: Therapist;
  token: string;
}

// Child types (for child dashboard)
export interface Child {
  id: number;
  therapist_id: number;
  username: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  grade_level?: string;
  problem_type?: 'language' | 'articulation' | 'both';
  created_at: string;
}

export interface ChildLoginRequest {
  username: string;
  password: string;
}

export interface ChildAuthResult {
  child: Child;
  token: string;
}

export interface CreateChildRequest {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  grade_level?: string;
  problem_type?: 'language' | 'articulation' | 'both';
}

// Express extensions
declare global {
  namespace Express {
    interface Request {
      therapist?: { therapist_id: number };
      child?: { child_id: number };
    }
  }
}
