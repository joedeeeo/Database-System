import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DbExplorerService, TableDataResponse, ColumnStructure } from '../../services/db-explorer';

interface QueryHistoryItem {
  sql: string;
  timestamp: number;
  rowCount: number;
  executionTime: number;
}

@Component({
  selector: 'app-db-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DbExplorerService],
  templateUrl: './db-explorer.html',
  styleUrls: ['./db-explorer.css']
})
export class DbExplorer implements OnInit {
  // Schema/Table selection
  schemas: string[] = [];
  tables: string[] = [];
  filteredTables: string[] = [];
  tableSearchQuery: string = '';
  searchHighlightIndex: number = -1;
  showTableSearchResults: boolean = false;
  selectedSchema: string = '';
  selectedTable: string = '';

  // Table data
  columns: string[] = [];
  tableRows: any[] = [];
  filteredRows: any[] = [];
  columnFilters: string[] = [];

  // Pagination
  currentPage: number = 1;
  pageSize: number = 50;
  totalRows: number = 0;
  totalPages: number = 0;

  // UI State
  loading = false;
  activeTab: 'data' | 'structure' | 'query' = 'data';
  darkMode = false;
  errorMessage: string = '';

  // Table Structure
  tableStructure: ColumnStructure[] = [];
  structureLoading = false;

  // SQL Query Editor
  sqlQuery: string = '';
  queryColumns: string[] = [];
  queryRows: any[] = [];
  queryLoading = false;
  queryError: string = '';
  queryExecutionTime: number = 0;

  // Query History
  queryHistory: QueryHistoryItem[] = [];
  showHistory = false;

  // Cell Copy
  copiedCell: string = '';
  showCopyToast = false;
  cellModalValue: string = '';
  cellModalColumn: string = '';
  showCellModal = false;

  constructor(
    private dbService: DbExplorerService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const savedTheme = localStorage.getItem('db-explorer-theme');
    if (savedTheme === 'dark') {
      this.darkMode = true;
    }
    this.loadQueryHistory();
    this.loadSchemas();
  }

  private loadSchemas() {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.dbService.getSchemas().subscribe({
      next: (data: string[]) => {
        this.zone.run(() => {
          this.schemas = data;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.errorMessage = 'Failed to load schemas. Check backend connection.';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  toggleTheme() {
    this.darkMode = !this.darkMode;
    localStorage.setItem('db-explorer-theme', this.darkMode ? 'dark' : 'light');
  }

  onSchemaChange() {
    if (!this.selectedSchema) return;

    this.loading = true;
    this.errorMessage = '';
    this.columns = [];
    this.tableRows = [];
    this.filteredRows = [];
    this.selectedTable = '';
    this.tables = [];
    this.filteredTables = [];
    this.tableSearchQuery = '';
    this.tableStructure = [];
    this.activeTab = 'data';
    this.cdr.detectChanges();

    this.dbService.getTables(this.selectedSchema).subscribe({
      next: (data: string[]) => {
        this.zone.run(() => {
          this.tables = data;
          this.filteredTables = [...data];
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.errorMessage = 'Failed to load tables for schema: ' + this.selectedSchema;
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Table Search
  onTableSearch() {
    const query = this.tableSearchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredTables = [...this.tables];
    } else {
      this.filteredTables = this.tables.filter(t => t.toLowerCase().includes(query));
    }
    this.searchHighlightIndex = -1;
    this.showTableSearchResults = this.tableSearchQuery.length > 0;
    this.cdr.detectChanges();
  }

  onTableSearchKeydown(event: KeyboardEvent) {
    if (!this.showTableSearchResults || this.filteredTables.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.searchHighlightIndex = Math.min(this.searchHighlightIndex + 1, this.filteredTables.length - 1);
      this.cdr.detectChanges();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.searchHighlightIndex = Math.max(this.searchHighlightIndex - 1, 0);
      this.cdr.detectChanges();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.searchHighlightIndex >= 0 && this.searchHighlightIndex < this.filteredTables.length) {
        this.selectTable(this.filteredTables[this.searchHighlightIndex]);
      }
    } else if (event.key === 'Escape') {
      this.showTableSearchResults = false;
      this.cdr.detectChanges();
    }
  }

  selectTable(table: string) {
    this.selectedTable = table;
    this.showTableSearchResults = false;
    this.tableSearchQuery = '';
    this.searchHighlightIndex = -1;
    this.cdr.detectChanges();
    this.onTableChange();
  }

  onTableChange() {
    if (!this.selectedSchema || !this.selectedTable) return;
    this.currentPage = 1;
    this.tableStructure = [];
    this.loadTableData();
  }

  loadTableData() {
    this.loading = true;
    this.errorMessage = '';
    this.columns = [];
    this.tableRows = [];
    this.filteredRows = [];
    this.cdr.detectChanges();

    this.dbService.getTableData(this.selectedSchema, this.selectedTable, this.currentPage, this.pageSize).subscribe({
      next: (data: TableDataResponse) => {
        this.zone.run(() => {
          this.columns = data.columns || [];
          this.tableRows = data.rows || [];
          this.filteredRows = [...this.tableRows];
          this.columnFilters = new Array(this.columns.length).fill('');
          this.totalRows = data.totalRows || 0;
          this.totalPages = Math.ceil(this.totalRows / this.pageSize);
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.errorMessage = 'Failed to load data for table: ' + this.selectedTable;
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // Pagination
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadTableData();
  }
  nextPage() { this.goToPage(this.currentPage + 1); }
  prevPage() { this.goToPage(this.currentPage - 1); }
  onPageSizeChange() {
    this.currentPage = 1;
    this.loadTableData();
  }

  applyColumnFilters() {
    this.filteredRows = this.tableRows.filter(row =>
      row.every((cell: any, idx: number) => {
        const filterVal = (this.columnFilters[idx] || '').trim().toLowerCase();
        if (!filterVal) return true;
        return String(cell || '').toLowerCase().includes(filterVal);
      })
    );
  }

  // Table Structure
  loadStructure() {
    this.activeTab = 'structure';
    if (!this.selectedSchema || !this.selectedTable) return;
    if (this.tableStructure.length > 0) return;

    this.structureLoading = true;
    this.cdr.detectChanges();

    this.dbService.getTableStructure(this.selectedSchema, this.selectedTable).subscribe({
      next: (data: ColumnStructure[]) => {
        this.zone.run(() => {
          this.tableStructure = data;
          this.structureLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.structureLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // SQL Query execution
  executeQuery() {
    if (!this.sqlQuery.trim()) return;

    this.queryLoading = true;
    this.queryError = '';
    this.queryColumns = [];
    this.queryRows = [];
    this.cdr.detectChanges();
    const startTime = Date.now();

    this.dbService.executeQuery(this.sqlQuery).subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.queryColumns = data.columns || [];
          this.queryRows = data.rows || [];
          this.queryExecutionTime = Date.now() - startTime;
          this.queryLoading = false;
          // Save to history
          this.addToHistory(this.sqlQuery, this.queryRows.length, this.queryExecutionTime);
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.queryError = err.error?.message || err.message || 'Query execution failed';
          this.queryExecutionTime = Date.now() - startTime;
          this.queryLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // === QUERY HISTORY ===
  private loadQueryHistory() {
    const saved = localStorage.getItem('db-explorer-query-history');
    if (saved) {
      try {
        this.queryHistory = JSON.parse(saved);
      } catch { this.queryHistory = []; }
    }
  }

  private saveQueryHistory() {
    // Keep max 50 items
    if (this.queryHistory.length > 50) {
      this.queryHistory = this.queryHistory.slice(0, 50);
    }
    localStorage.setItem('db-explorer-query-history', JSON.stringify(this.queryHistory));
  }

  addToHistory(sql: string, rowCount: number, executionTime: number) {
    // Don't add duplicates of the last query
    if (this.queryHistory.length > 0 && this.queryHistory[0].sql === sql) return;

    this.queryHistory.unshift({
      sql,
      timestamp: Date.now(),
      rowCount,
      executionTime
    });
    this.saveQueryHistory();
  }

  loadFromHistory(item: QueryHistoryItem) {
    this.sqlQuery = item.sql;
    this.showHistory = false;
    this.cdr.detectChanges();
  }

  deleteFromHistory(index: number, event: Event) {
    event.stopPropagation();
    this.queryHistory.splice(index, 1);
    this.saveQueryHistory();
    this.cdr.detectChanges();
  }

  clearHistory() {
    this.queryHistory = [];
    this.saveQueryHistory();
    this.cdr.detectChanges();
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
    this.cdr.detectChanges();
  }

  formatTimestamp(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // === CELL COPY ===
  private toastTimer: any = null;

  copyCell(value: any, event: MouseEvent) {
    const text = String(value || '');

    // Show toast immediately
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.copiedCell = text.length > 40 ? text.substring(0, 40) + '...' : text;
    this.showCopyToast = true;
    this.cdr.detectChanges();

    // Copy to clipboard
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });

    // Hide toast after 2.5s
    this.toastTimer = setTimeout(() => {
      this.showCopyToast = false;
      this.cdr.detectChanges();
    }, 2500);
  }

  openCellModal(value: any, colIndex: number) {
    this.cellModalValue = String(value || '');
    this.cellModalColumn = this.columns[colIndex] || this.queryColumns[colIndex] || '';
    this.showCellModal = true;
    this.cdr.detectChanges();
  }

  closeCellModal() {
    this.showCellModal = false;
    this.cdr.detectChanges();
  }

  copyCellModalValue() {
    navigator.clipboard.writeText(this.cellModalValue).then(() => {
      this.closeCellModal();
      this.copiedCell = 'Value copied!';
      this.showCopyToast = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.showCopyToast = false;
        this.cdr.detectChanges();
      }, 2000);
    });
  }

  // Export to CSV
  exportToCsv() {
    if (this.columns.length === 0) return;
    const csvRows: string[] = [];
    csvRows.push(this.columns.map(col => `"${col}"`).join(','));
    this.filteredRows.forEach(row => {
      csvRows.push(row.map((cell: any) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','));
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.selectedSchema}_${this.selectedTable}_page${this.currentPage}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) { pages.push(i); }
    return pages;
  }
}
