import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FacadeService } from './facade.service';

@Injectable({ providedIn: 'root' })
export class AdminStatsService {
  constructor(private http: HttpClient, private facade: FacadeService) {}

  private authHeaders() {
    const token = this.facade.getSessionToken();
    return { headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }) };
  }

  // Average resolution time in hours (example)
  getAvgResolutionTime(): Observable<any> {
    return this.http.get<any>(`${environment.url_api}/stats/tickets/avg_resolution_time/`, this.authHeaders());
  }

  // Counts of open vs closed tickets
  getOpenClosedCounts(): Observable<any> {
    return this.http.get<any>(`${environment.url_api}/stats/tickets/status_counts/`, this.authHeaders());
  }

  // Tickets grouped by category
  getTicketsByCategory(): Observable<any> {
    return this.http.get<any>(`${environment.url_api}/stats/tickets/by_category/`, this.authHeaders());
  }

  // Trend data for charts (e.g., last 30 days)
  getTicketsTrend(): Observable<any> {
    return this.http.get<any>(`${environment.url_api}/stats/tickets/trend/`, this.authHeaders());
  }

  // Combined all stats in a single call
  getAllStats(): Observable<any> {
    return this.http.get<any>(`${environment.url_api}/stats/tickets/all/`, this.authHeaders());
  }
}
