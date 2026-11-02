package com.healingcinema.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;

import com.healingcinema.auth.dto.AuthDtos.AuthResponse;
import com.healingcinema.auth.dto.AuthDtos.LoginRequest;
import com.healingcinema.auth.dto.AuthDtos.ProfileRequest;
import com.healingcinema.auth.dto.AuthDtos.RegisterRequest;
import com.healingcinema.auth.dto.AuthDtos.UserProfile;
import com.healingcinema.auth.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        AuthResponse res = authService.register(request);
        if (!res.success()) {
            return ResponseEntity.badRequest().body(res);
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        AuthResponse res = authService.login(request);
        if (!res.success()) {
            return ResponseEntity.badRequest().body(res);
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/profile")
    public ResponseEntity<UserProfile> updateProfile(@RequestBody ProfileRequest request) {
        UserProfile profile = authService.updateProfile(request);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfile> getMe(@RequestParam String userId) {
        UserProfile profile = authService.getProfile(userId);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(profile);
    }
}

