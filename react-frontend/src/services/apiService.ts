/**
 * REST API Service for FastAPI backend
 */

import { API_CONFIG } from '../config/api';
import { ControlMessage } from '../types/telemetry';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async healthCheck() {
    return this.request(API_CONFIG.API.HEALTH);
  }

  async getTelemetry() {
    return this.request(API_CONFIG.API.TELEMETRY);
  }

  async getEndurance() {
    return this.request(API_CONFIG.API.ENDURANCE);
  }

  async getEnduranceByVehicle(vehicleId: string) {
    return this.request(`${API_CONFIG.API.ENDURANCE}/vehicle/${vehicleId}`);
  }

  async getLeaderboard() {
    return this.request(API_CONFIG.API.LEADERBOARD);
  }

  async getLeaderboardByPosition(position: number) {
    return this.request(`${API_CONFIG.API.LEADERBOARD}/position/${position}`);
  }

  async sendControlCommand(command: ControlMessage) {
    return this.request(API_CONFIG.API.CONTROL, {
      method: 'POST',
      body: JSON.stringify(command),
    });
  }
}

export const apiService = new ApiService();

