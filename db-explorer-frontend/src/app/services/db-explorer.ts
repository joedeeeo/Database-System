import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout, catchError, throwError } from 'rxjs';

export interface TableDataResponse {
  columns: string[];
  rows: any[];
  totalRows: number;
  page: number;
  pageSize: number;
}

export interface ColumnStructure {
  name: string;
  type: string;
  size: string;
  nullable: string;
  defaultValue: string;
  isPrimaryKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class DbExplorerService {

  private baseUrl = 'http://localhost:8080/api/db';
  private requestTimeout = 30000; // 30 seconds timeout

  constructor(private http: HttpClient) {}

  getSchemas(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/schemas`).pipe(
      timeout(this.requestTimeout),
      catchError(err => {
        console.error('Schema request failed:', err);
        return throwError(() => err);
      })
    );
  }

  getTables(schema: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/tables`, { params: { schema } }).pipe(
      timeout(this.requestTimeout),
      catchError(err => {
        console.error('Tables request failed:', err);
        return throwError(() => err);
      })
    );
  }

  getTableData(schema: string, tableName: string, page: number = 1, pageSize: number = 50): Observable<TableDataResponse> {
    return this.http.get<TableDataResponse>(`${this.baseUrl}/data`, {
      params: { schema, tableName, page: page.toString(), pageSize: pageSize.toString() }
    }).pipe(
      timeout(this.requestTimeout),
      catchError(err => {
        console.error('Table data request failed:', err);
        return throwError(() => err);
      })
    );
  }

  executeQuery(sql: string): Observable<{ columns: string[], rows: any[] }> {
    return this.http.post<{ columns: string[], rows: any[] }>(`${this.baseUrl}/query`, { sql }).pipe(
      timeout(60000), // 60 seconds for custom queries
      catchError(err => {
        console.error('Query execution failed:', err);
        return throwError(() => err);
      })
    );
  }

  getTableStructure(schema: string, tableName: string): Observable<ColumnStructure[]> {
    return this.http.get<ColumnStructure[]>(`${this.baseUrl}/structure`, {
      params: { schema, tableName }
    }).pipe(
      timeout(this.requestTimeout),
      catchError(err => {
        console.error('Structure request failed:', err);
        return throwError(() => err);
      })
    );
  }
}
