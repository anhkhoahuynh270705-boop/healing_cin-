package com.healingcinema.tasks.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.healingcinema.auth.service.AuthService;
import com.healingcinema.tasks.dto.TaskDtos.ClaimRequest;
import com.healingcinema.tasks.dto.TaskDtos.Progress;
import com.healingcinema.tasks.service.TaskService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {
    private final TaskService tasks;
    private final AuthService auth;

    @GetMapping("/me")
    public ResponseEntity<?> getProgress(@RequestParam String userId,
            @RequestHeader(value = "X-User-Token", required = false) String token) {
        if (!auth.isValidSession(userId, token)) return unauthorized();
        try {
            return ResponseEntity.ok(tasks.getProgress(userId));
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(Map.of("message", error.getMessage()));
        }
    }

    @PostMapping("/claim")
    public ResponseEntity<?> claim(@RequestBody ClaimRequest request) {
        if (request == null || !auth.isValidSession(request.userId(), request.authToken())) return unauthorized();
        try {
            Progress progress = tasks.claim(request.userId(), request.taskId());
            return ResponseEntity.ok(progress);
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(Map.of("message", error.getMessage()));
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("message", "Vui lòng đăng nhập lại."));
    }
}
