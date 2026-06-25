package com.example.dbexplorer.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DatabaseExplorerService {

    private final DataSource dataSource;

    public List<String> getAllSchemas() throws SQLException {
        List<String> schemas = new ArrayList<>();
        try (Connection conn = dataSource.getConnection()) {
            Statement stmt = conn.createStatement();
            stmt.setQueryTimeout(15); // 15 second timeout
            ResultSet rs = stmt.executeQuery(
                "SELECT username FROM all_users ORDER BY username"
            );
            while (rs.next()) {
                schemas.add(rs.getString("USERNAME"));
            }
        }
        return schemas;
    }

    public List<String> getTablesBySchema(String schema) throws SQLException {
        List<String> tables = new ArrayList<>();
        try (Connection conn = dataSource.getConnection()) {
            Statement stmt = conn.createStatement();
            stmt.setQueryTimeout(15); // 15 second timeout
            ResultSet rs = stmt.executeQuery(
                "SELECT table_name FROM all_tables WHERE owner = '" + schema.toUpperCase() + "' ORDER BY table_name"
            );
            while (rs.next()) {
                tables.add(rs.getString("TABLE_NAME"));
            }
        }
        return tables;
    }

    public Map<String, Object> getTableData(String schema, String tableName, int page, int pageSize) throws SQLException {
        List<String> columns = new ArrayList<>();
        List<List<Object>> rows = new ArrayList<>();
        int totalRows = 0;

        try (Connection conn = dataSource.getConnection()) {
            // Use NUM_ROWS from all_tables (approximate but fast) instead of COUNT(*)
            Statement countStmt = conn.createStatement();
            ResultSet countRs = countStmt.executeQuery(
                "SELECT NVL(num_rows, 0) FROM all_tables WHERE owner = '" + schema.toUpperCase()
                + "' AND table_name = '" + tableName.toUpperCase() + "'"
            );
            if (countRs.next()) {
                totalRows = countRs.getInt(1);
            }
            countRs.close();
            countStmt.close();

            // If stats are stale or zero, fall back to actual count only for small indication
            if (totalRows == 0) {
                Statement fallbackStmt = conn.createStatement();
                ResultSet fallbackRs = fallbackStmt.executeQuery(
                    "SELECT COUNT(*) FROM " + schema.toUpperCase() + "." + tableName
                );
                if (fallbackRs.next()) {
                    totalRows = fallbackRs.getInt(1);
                }
                fallbackRs.close();
                fallbackStmt.close();
            }

            // Paginated query using OFFSET/FETCH
            int offset = (page - 1) * pageSize;
            String sql = "SELECT * FROM " + schema.toUpperCase() + "." + tableName
                    + " OFFSET " + offset + " ROWS FETCH NEXT " + pageSize + " ROWS ONLY";

            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(sql);
            ResultSetMetaData rsMeta = rs.getMetaData();
            int columnCount = rsMeta.getColumnCount();

            for (int i = 1; i <= columnCount; i++) {
                columns.add(rsMeta.getColumnName(i));
            }

            while (rs.next()) {
                List<Object> row = new ArrayList<>();
                for (int i = 1; i <= columnCount; i++) {
                    row.add(rs.getString(i));
                }
                rows.add(row);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("columns", columns);
        result.put("rows", rows);
        result.put("totalRows", totalRows);
        result.put("page", page);
        result.put("pageSize", pageSize);
        return result;
    }

    public Map<String, Object> executeQuery(String sql) throws SQLException {
        List<String> columns = new ArrayList<>();
        List<List<Object>> rows = new ArrayList<>();

        // Remove trailing semicolons — Oracle JDBC doesn't accept them
        sql = sql.trim();
        while (sql.endsWith(";")) {
            sql = sql.substring(0, sql.length() - 1).trim();
        }

        try (Connection conn = dataSource.getConnection()) {
            Statement stmt = conn.createStatement();
            stmt.setMaxRows(500); // Safety limit

            boolean isResultSet = stmt.execute(sql);

            if (isResultSet) {
                ResultSet rs = stmt.getResultSet();
                ResultSetMetaData rsMeta = rs.getMetaData();
                int columnCount = rsMeta.getColumnCount();

                for (int i = 1; i <= columnCount; i++) {
                    columns.add(rsMeta.getColumnName(i));
                }

                while (rs.next()) {
                    List<Object> row = new ArrayList<>();
                    for (int i = 1; i <= columnCount; i++) {
                        row.add(rs.getString(i));
                    }
                    rows.add(row);
                }
            } else {
                int updateCount = stmt.getUpdateCount();
                columns.add("Result");
                List<Object> row = new ArrayList<>();
                row.add(updateCount + " row(s) affected");
                rows.add(row);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("columns", columns);
        result.put("rows", rows);
        return result;
    }

    public List<Map<String, String>> getTableStructure(String schema, String tableName) throws SQLException {
        List<Map<String, String>> structure = new ArrayList<>();

        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();

            // Get primary keys
            List<String> primaryKeys = new ArrayList<>();
            ResultSet pkRs = metaData.getPrimaryKeys(null, schema.toUpperCase(), tableName.toUpperCase());
            while (pkRs.next()) {
                primaryKeys.add(pkRs.getString("COLUMN_NAME"));
            }
            pkRs.close();

            // Get columns with metadata
            ResultSet colRs = metaData.getColumns(null, schema.toUpperCase(), tableName.toUpperCase(), "%");
            while (colRs.next()) {
                Map<String, String> col = new HashMap<>();
                String colName = colRs.getString("COLUMN_NAME");
                col.put("name", colName);
                col.put("type", colRs.getString("TYPE_NAME"));
                col.put("size", colRs.getString("COLUMN_SIZE"));
                col.put("nullable", colRs.getString("IS_NULLABLE"));
                col.put("defaultValue", colRs.getString("COLUMN_DEF"));
                col.put("isPrimaryKey", primaryKeys.contains(colName) ? "YES" : "NO");
                structure.add(col);
            }
        }

        return structure;
    }
}
