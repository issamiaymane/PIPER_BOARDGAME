/**
 * Therapist Dashboard API Client
 */

window.TherapistAPI = {
  baseUrl: '/api/piper',
  token: localStorage.getItem('piper_therapist_token'),

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  },

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('piper_therapist_token', token);
    } else {
      localStorage.removeItem('piper_therapist_token');
    }
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      throw new Error('Network error - is the server running?');
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error(`Server error (${response.status}) - no valid response`);
    }

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  },

  // Auth
  async register(data) {
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(result.token);
    return result;
  },

  async login(email, password) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  },

  logout() {
    this.setToken(null);
  },

  async getMe() {
    return await this.request('/auth/me');
  },

  // Students
  async getStudents() {
    return await this.request('/students');
  },

  async createStudent(data) {
    return await this.request('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getStudent(id) {
    return await this.request(`/students/${id}`);
  },

  async updateStudent(id, data) {
    return await this.request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStudent(id) {
    return await this.request(`/students/${id}`, {
      method: 'DELETE',
    });
  },

  // Goals
  async getGoalTypes() {
    return await this.request('/goal-types');
  },

  async getStudentGoals(studentId, activeOnly = false) {
    const query = activeOnly ? '?active=true' : '';
    return await this.request(`/students/${studentId}/goals${query}`);
  },

  async createGoal(studentId, data) {
    return await this.request(`/students/${studentId}/goals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getGoalProgress(goalId) {
    return await this.request(`/goals/${goalId}/progress`);
  },

  async getGoal(goalId) {
    return await this.request(`/goals/${goalId}`);
  },

  async updateGoal(goalId, data) {
    return await this.request(`/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteGoal(goalId) {
    return await this.request(`/goals/${goalId}`, {
      method: 'DELETE',
    });
  },

  // Sessions
  async getStudentSessions(studentId, limit = 10) {
    return await this.request(`/students/${studentId}/sessions?limit=${limit}`);
  },

  async getSessionSOAP(sessionId, format = 'json') {
    const headers = this.getHeaders();
    if (format === 'text') {
      headers['Accept'] = 'text/plain';
    }

    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/soap`, { headers });
    if (!response.ok) {
      throw new Error('Failed to get SOAP note');
    }

    return format === 'text' ? await response.text() : await response.json();
  },

  async getGoalSOAP(goalId, format = 'json') {
    const headers = this.getHeaders();
    if (format === 'text') {
      headers['Accept'] = 'text/plain';
    }

    const response = await fetch(`${this.baseUrl}/goals/${goalId}/soap`, { headers });
    if (!response.ok) {
      throw new Error('Failed to get SOAP note');
    }

    return format === 'text' ? await response.text() : await response.json();
  },

  async saveSessionSOAP(sessionId, soapData) {
    return await this.request(`/sessions/${sessionId}/soap`, {
      method: 'PUT',
      body: JSON.stringify(soapData),
    });
  },

  getSOAPPDFUrl(sessionId) {
    return `${this.baseUrl}/sessions/${sessionId}/soap/pdf`;
  },

  async downloadSOAPPDF(sessionId) {
    const url = this.getSOAPPDFUrl(sessionId);
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download PDF');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'SOAP_Note.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return true;
    } catch (error) {
      throw error;
    }
  },

  async markSessionReviewed(sessionId, reviewed = true) {
    return this.request(`/sessions/${sessionId}/review`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ slp_reviewed: reviewed }),
    });
  },

  // Goal PDF Download
  getGoalPDFUrl(goalId) {
    return `${this.baseUrl}/goals/${goalId}/pdf`;
  },

  async downloadGoalPDF(goalId) {
    const url = this.getGoalPDFUrl(goalId);
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download PDF');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'IEP_Goal.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return true;
    } catch (error) {
      throw error;
    }
  },

  async markGoalReviewed(goalId, reviewed = true) {
    return this.request(`/goals/${goalId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ slp_reviewed: reviewed }),
    });
  },

  // Evaluation Upload
  async uploadEvaluation(studentId, file, password = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (password) {
      formData.append('password', password);
    }

    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    // Note: Don't set Content-Type for FormData - browser will set it with boundary

    const response = await fetch(`${this.baseUrl}/students/${studentId}/evaluation/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  },

  getEvaluationPdfUrl(studentId) {
    return `${this.baseUrl}/students/${studentId}/evaluation/pdf`;
  },

  async confirmEvaluation(studentId, evalData, serviceType) {
    return await this.request(`/students/${studentId}/evaluation/confirm`, {
      method: 'POST',
      body: JSON.stringify({ eval_data: evalData, service_type: serviceType }),
    });
  },

  async deleteEvaluationPdf(studentId) {
    return await this.request(`/students/${studentId}/evaluation/pdf`, {
      method: 'DELETE',
    });
  },

  // Goal Upload
  async uploadGoals(studentId, file, password = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (password) {
      formData.append('password', password);
    }

    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    // Note: Don't set Content-Type for FormData - browser will set it with boundary

    const response = await fetch(`${this.baseUrl}/students/${studentId}/goals/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  },

  getGoalsPdfUrl(studentId) {
    return `${this.baseUrl}/students/${studentId}/goals/pdf`;
  },

  async confirmGoals(studentId, baseline, goals) {
    return await this.request(`/students/${studentId}/goals/confirm`, {
      method: 'POST',
      body: JSON.stringify({ baseline, goals }),
    });
  },

  async deleteGoalsPdf(studentId) {
    return await this.request(`/students/${studentId}/goals/pdf`, {
      method: 'DELETE',
    });
  },
};
