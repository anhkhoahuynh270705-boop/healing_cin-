package com.healingcinema.media;

import java.nio.file.Files;
import java.util.Map;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.healingcinema.auth.service.AuthService;
import com.healingcinema.media.MediaDtos.UploadResponse;
import com.healingcinema.media.entity.PersonalMediaEntity;
import com.healingcinema.room.service.RoomService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class PersonalMediaController {
    private final PersonalMediaService media;
    private final AuthService auth;
    private final RoomService rooms;
    private final SimpMessagingTemplate messaging;

    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            @RequestParam String userId,
            @RequestParam String guestSessionId,
            @RequestParam String roomId,
            @RequestParam(required = false, defaultValue = "indoor") String environment,
            @RequestParam int durationSeconds,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "X-User-Token", required = false) String token) {
        if (!auth.isValidSession(userId, token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Vui lòng đăng nhập lại."));
        }
        try {
            UploadResponse response = media.upload(userId, guestSessionId, roomId, environment, durationSeconds, file);
            String safeEnvironment = "outdoor".equalsIgnoreCase(environment) ? "outdoor" : "indoor";
            messaging.convertAndSend("/topic/room/" + roomId + "/state/" + safeEnvironment,
                    rooms.snapshot(roomId, safeEnvironment));
            messaging.convertAndSend("/topic/room/" + roomId + "/playback/" + safeEnvironment,
                    rooms.playbackSnapshot(roomId, safeEnvironment));
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(Map.of("message", error.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> get(@PathVariable String id) {
        if (id == null || !id.matches("[a-fA-F0-9]{32}")) return ResponseEntity.notFound().build();
        try {
            PersonalMediaEntity item = media.find(id);
            var path = media.filePath(item);
            if (!Files.isRegularFile(path)) return ResponseEntity.notFound().build();
            Resource resource = new FileSystemResource(path);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(item.getContentType()))
                    .contentLength(Files.size(path))
                    .cacheControl(CacheControl.noCache())
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + item.getStorageName() + "\"")
                    .body(resource);
        } catch (IllegalArgumentException | java.io.IOException error) {
            return ResponseEntity.notFound().build();
        }
    }
}
