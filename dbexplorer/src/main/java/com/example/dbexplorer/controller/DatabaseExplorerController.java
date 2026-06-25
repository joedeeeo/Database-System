package com.example.dbexplorer.controller;

import com.example.dbexplorer.service.DatabaseExplorerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/db")
@RequiredArgsConstructor
public class DatabaseExplorerController {

    private final DatabaseExplorerService service;

    @GetMapping("/schemas")
    public List<String> getSchemas() throws SQLException {
        return service.getAllSchemas();
    }

    @GetMapping("/tables")
    public List<String> getTables(@RequestParam String schema) throws SQLException {
        return service.getTablesBySchema(schema);
    }

    @GetMapping("/data")
    public Map<String, Object> getTableData(
            @RequestParam String schema,
            @RequestParam String tableName,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int pageSize) throws SQLException {
        return service.getTableData(schema, tableName, page, pageSize);
    }

    @PostMapping("/query")
    public Map<String, Object> executeQuery(@RequestBody Map<String, String> body) throws SQLException {
        String sql = body.get("sql");
        if (sql == null || sql.trim().isEmpty()) {
            throw new IllegalArgumentException("SQL query cannot be empty");
        }
        return service.executeQuery(sql);
    }

    @GetMapping("/structure")
    public List<Map<String, String>> getTableStructure(
            @RequestParam String schema,
            @RequestParam String tableName) throws SQLException {
        return service.getTableStructure(schema, tableName);
    }
}
