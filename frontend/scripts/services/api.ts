/**
 * Typed API Service
 * Handles all HTTP communication with the backend
 */

// Types
export interface Therapist {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface AuthResponse {
  therapist: Therapist;
  token: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface Student {
  id: number;
  therapist_id: number;
  username: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  grade_level?: string;
  problem_type?: 'language' | 'articulation' | 'both';
  eval_data?: EvalData | string;
  eval_pdf_path?: string;
  eval_pdf_original_name?: string;
  created_at: string;
}

export interface CreateStudentData {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  grade_level?: string;
}

export interface ExtractedField {
  value: string | number | string[] | null;
  confidence: number;
  source_hint?: string;
  reasoning?: string;
}

export interface EvalData {
  service_type?: ExtractedField;
  languages_spoken?: ExtractedField;
  family_religion?: ExtractedField;
  medical_history?: ExtractedField;
  other_diagnoses?: ExtractedField;
  speech_diagnoses?: ExtractedField;
  prior_therapy?: ExtractedField;
  baseline_accuracy?: ExtractedField;
  goals_benchmarks?: ExtractedField;
  strengths?: ExtractedField;
  weaknesses?: ExtractedField;
  target_sounds?: ExtractedField;
  teachers?: ExtractedField;
  notes?: ExtractedField;
  extraction_notes?: string;
}

export interface EvalUploadResponse {
  success: boolean;
  pdf_url: string;
  extracted_data: EvalData;
  extraction_notes?: string;
}

export interface EvalConfirmResponse {
  success: boolean;
  student: Student;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Storage keys
const TOKEN_KEY = 'piper_therapist_token';

// API Service
class ApiService {
  private baseUrl = '/api/therapist';
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: this.getHeaders(),
      ...options,
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch {
      throw new ApiError('Network error - is the server running?', 0);
    }

    let data: T & { error?: string };
    try {
      data = await response.json();
    } catch {
      throw new ApiError(`Server error (${response.status})`, response.status);
    }

    if (!response.ok) {
      throw new ApiError(data.error || 'Request failed', response.status);
    }

    return data;
  }

  // Auth methods
  async register(data: RegisterData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(result.token);
    return result;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(result.token);
    return result;
  }

  async getMe(): Promise<{ therapist: Therapist }> {
    return this.request<{ therapist: Therapist }>('/me');
  }

  logout(): void {
    this.setToken(null);
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  // Student methods
  async listStudents(): Promise<Student[]> {
    return this.request<Student[]>('/students');
  }

  async createStudent(data: CreateStudentData): Promise<Student> {
    return this.request<Student>('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getStudent(id: number): Promise<Student> {
    return this.request<Student>(`/students/${id}`);
  }

  async deleteStudent(id: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/students/${id}`, {
      method: 'DELETE',
    });
  }

  // Evaluation methods
  async uploadEvaluation(
    studentId: number,
    file: File,
    password?: string
  ): Promise<EvalUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (password) {
      formData.append('password', password);
    }

    const url = `${this.baseUrl}/students/${studentId}/evaluation/upload`;
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch {
      throw new ApiError('Network error - is the server running?', 0);
    }

    const data = await response.json();

    if (!response.ok) {
      const error = new ApiError(data.error || 'Upload failed', response.status);
      if (data.code === 'PASSWORD_REQUIRED') {
        (error as ApiError & { code?: string }).code = 'PASSWORD_REQUIRED';
      }
      throw error;
    }

    return data;
  }

  async confirmEvaluation(
    studentId: number,
    evalData: EvalData,
    serviceType?: string
  ): Promise<EvalConfirmResponse> {
    return this.request<EvalConfirmResponse>(
      `/students/${studentId}/evaluation/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({
          eval_data: evalData,
          service_type: serviceType,
        }),
      }
    );
  }

  async getEvaluationPdfBlob(studentId: number): Promise<Blob> {
    const url = `${this.baseUrl}/students/${studentId}/evaluation/pdf`;
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new ApiError('Failed to load PDF', response.status);
    }
    return response.blob();
  }

  async deleteEvaluationPdf(studentId: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/students/${studentId}/evaluation/pdf`,
      { method: 'DELETE' }
    );
  }
}

// Export singleton instance
export const api = new ApiService();
