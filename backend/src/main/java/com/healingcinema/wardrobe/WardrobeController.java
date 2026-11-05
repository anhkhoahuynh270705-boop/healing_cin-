package com.healingcinema.wardrobe;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.healingcinema.auth.service.AuthService;
import com.healingcinema.wardrobe.WardrobeDtos.CatalogItem;
import com.healingcinema.wardrobe.WardrobeDtos.PurchaseRequest;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/wardrobe")
@RequiredArgsConstructor
public class WardrobeController {
    private final WardrobeService wardrobe;
    private final AuthService auth;

    @GetMapping("/catalog")
    public List<CatalogItem> catalog() {
        return wardrobe.catalog();
    }

    @GetMapping("/me")
    public ResponseEntity<?> account(@RequestParam String userId,
            @RequestHeader(value = "X-User-Token", required = false) String token) {
        if (!auth.isValidSession(userId, token)) return unauthorized();
        try {
            return ResponseEntity.ok(wardrobe.account(userId));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/purchase")
    public ResponseEntity<?> purchase(@RequestBody PurchaseRequest request) {
        if (request == null || !auth.isValidSession(request.userId(), request.authToken())) return unauthorized();
        try {
            return ResponseEntity.ok(wardrobe.purchase(request.userId(), request.tier()));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
        }
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Vui lòng đăng nhập lại."));
    }
}
