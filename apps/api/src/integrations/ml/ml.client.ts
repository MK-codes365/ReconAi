import axios from 'axios';
import { config } from '@reconai/config';
import { PredictMLRequest, PredictMLResponse, ModelInfoResponse } from './ml.types';

export class MLClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.mlServiceUrl || 'http://localhost:8000';
  }

  async predictRecovery(req: PredictMLRequest): Promise<PredictMLResponse> {
    const url = `${this.baseUrl}/predict/recovery`;
    const response = await axios.post<PredictMLResponse>(url, req, { timeout: 3000 });
    return response.data;
  }

  async getModelInfo(): Promise<ModelInfoResponse> {
    const url = `${this.baseUrl}/model/info`;
    const response = await axios.get<ModelInfoResponse>(url, { timeout: 2000 });
    return response.data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/health`;
      const response = await axios.get(url, { timeout: 2000 });
      return response.data?.status === 'ok';
    } catch (err) {
      return false;
    }
  }
}
