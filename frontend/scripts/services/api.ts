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
}

// Export singleton instance
export const api = new ApiService();
