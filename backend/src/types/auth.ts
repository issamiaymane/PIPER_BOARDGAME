/**
 * Authentication Types
 * Types for therapist authentication
 */

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
