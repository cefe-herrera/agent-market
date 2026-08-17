import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AgentDto,
  AgentMetricsDto,
  AgentPermissionDto,
  AgentHireDto,
  MarketplaceAgentDto,
  CategoryInfo,
  ChainInfo,
  CompareAgentDto,
  CreateHireRequest,
  MarketplaceFilters,
  PerformanceChartPoint,
  MarketplaceStats,
} from '@bnb-marketplace/shared-types';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000';

  constructor(private readonly http: HttpClient) {}

  getAgents(): Observable<AgentDto[]> {
    return this.http.get<AgentDto[]>(`${this.baseUrl}/agents`);
  }

  getAgent(id: string): Observable<AgentDto> {
    return this.http.get<AgentDto>(`${this.baseUrl}/agents/${id}`);
  }

  getAgentMetrics(id: string): Observable<AgentMetricsDto> {
    return this.http.get<AgentMetricsDto>(`${this.baseUrl}/agents/${id}/metrics`);
  }

  getAgentPermissions(id: string): Observable<AgentPermissionDto[]> {
    return this.http.get<AgentPermissionDto[]>(`${this.baseUrl}/agents/${id}/permissions`);
  }

  getAgentChart(id: string): Observable<PerformanceChartPoint[]> {
    return this.http.get<PerformanceChartPoint[]>(`${this.baseUrl}/agents/${id}/chart`);
  }

  getMarketplaceAgents(filters: MarketplaceFilters = {}): Observable<PaginatedResponse<MarketplaceAgentDto>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<PaginatedResponse<MarketplaceAgentDto>>(`${this.baseUrl}/marketplace/agents`, { params });
  }

  getCategories(): Observable<CategoryInfo[]> {
    return this.http.get<CategoryInfo[]>(`${this.baseUrl}/marketplace/categories`);
  }

  getFeaturedAgents(): Observable<MarketplaceAgentDto[]> {
    return this.http.get<MarketplaceAgentDto[]>(`${this.baseUrl}/marketplace/featured`);
  }

  getMarketplaceStats(): Observable<MarketplaceStats> {
    return this.http.get<MarketplaceStats>(`${this.baseUrl}/marketplace/stats`);
  }

  getMarketplaceChains(): Observable<ChainInfo[]> {
    return this.http.get<ChainInfo[]>(`${this.baseUrl}/marketplace/chains`);
  }

  compareAgents(ids: string[]): Observable<CompareAgentDto[]> {
    return this.http.get<CompareAgentDto[]>(`${this.baseUrl}/marketplace/compare`, {
      params: { agents: ids.join(',') },
    });
  }

  createHire(request: CreateHireRequest): Observable<AgentHireDto> {
    return this.http.post<AgentHireDto>(`${this.baseUrl}/hires`, request);
  }

  getHire(id: string): Observable<AgentHireDto> {
    return this.http.get<AgentHireDto>(`${this.baseUrl}/hires/${id}`);
  }

  getUserHires(wallet: string): Observable<AgentHireDto[]> {
    return this.http.get<AgentHireDto[]>(`${this.baseUrl}/hires/user/${wallet}`);
  }

  pauseHire(id: string): Observable<AgentHireDto> {
    return this.http.post<AgentHireDto>(`${this.baseUrl}/hires/${id}/pause`, {});
  }

  revokeHire(id: string): Observable<AgentHireDto> {
    return this.http.post<AgentHireDto>(`${this.baseUrl}/hires/${id}/revoke`, {});
  }

  getStudioAgents(): Observable<MarketplaceAgentDto[]> {
    return this.http.get<MarketplaceAgentDto[]>(`${this.baseUrl}/agents/studio`);
  }
}
