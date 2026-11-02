package com.healingcinema.room.controller;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.regex.Pattern;

import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

/** Lấy tiêu đề video từ YouTube phía server để không bị chính sách CORS của trình duyệt chặn. */
@RestController
public class YouTubeMetadataController {

    private static final Pattern VIDEO_ID = Pattern.compile("^[A-Za-z0-9_-]{11}$");
    private final RestClient youtubeClient;

    public YouTubeMetadataController() {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(3));
        this.youtubeClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    @GetMapping("/api/youtube/video-title")
    public ResponseEntity<VideoTitle> videoTitle(@RequestParam String videoId) {
        if (!VIDEO_ID.matcher(videoId == null ? "" : videoId).matches()) {
            return ResponseEntity.badRequest().body(new VideoTitle(""));
        }

        try {
            var uri = UriComponentsBuilder.fromUriString("https://www.youtube.com/oembed")
                    .queryParam("url", "https://www.youtube.com/watch?v=" + videoId)
                    .queryParam("format", "json")
                    .build()
                    .encode()
                    .toUri();
            OEmbedResponse metadata = youtubeClient.get().uri(uri).retrieve().body(OEmbedResponse.class);
            String title = metadata == null || metadata.title() == null ? "" : metadata.title().strip();
            if (title.isEmpty()) title = fallbackTitle(videoId);
            return ResponseEntity.ok(new VideoTitle(limit(title, 100)));
        } catch (RuntimeException error) {
            // Metadata không làm hỏng việc thêm video nếu YouTube hoặc mạng bên ngoài đang lỗi.
            return ResponseEntity.ok(new VideoTitle(fallbackTitle(videoId)));
        }
    }

    private static String fallbackTitle(String videoId) {
        return "Video YouTube (" + videoId + ")";
    }

    private static String limit(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    public record VideoTitle(String title) {}

    public record OEmbedResponse(String title) {}
}
