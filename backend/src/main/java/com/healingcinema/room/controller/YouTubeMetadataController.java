package com.healingcinema.room.controller;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.regex.Matcher;
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
    private static final Pattern OG_TITLE = Pattern.compile(
            "(?is)<meta\\s+[^>]*property=\"og:title\"[^>]*content=\"([^\"]+)\"[^>]*>");
    private static final Pattern OG_TITLE_REVERSED = Pattern.compile(
            "(?is)<meta\\s+[^>]*content=\"([^\"]+)\"[^>]*property=\"og:title\"[^>]*>");
    private static final Pattern PAGE_TITLE = Pattern.compile("(?is)<title[^>]*>(.*?)</title>");
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

        String title = fetchOEmbedTitle(videoId);
        if (title.isBlank()) title = fetchWatchPageTitle(videoId);
        if (title.isBlank()) title = fallbackTitle();
        return ResponseEntity.ok(new VideoTitle(limit(title, 100)));
    }

    private String fetchOEmbedTitle(String videoId) {
        try {
            var uri = UriComponentsBuilder.fromUriString("https://www.youtube.com/oembed")
                    .queryParam("url", "https://www.youtube.com/watch?v=" + videoId)
                    .queryParam("format", "json")
                    .build()
                    .encode()
                    .toUri();
            OEmbedResponse metadata = youtubeClient.get().uri(uri).retrieve().body(OEmbedResponse.class);
            return metadata == null || metadata.title() == null ? "" : metadata.title().strip();
        } catch (RuntimeException ignored) {
            return "";
        }
    }

    private String fetchWatchPageTitle(String videoId) {
        try {
            String html = youtubeClient.get()
                    .uri("https://www.youtube.com/watch?v=" + videoId + "&hl=vi")
                    .header("User-Agent", "Mozilla/5.0 (compatible; HealingCinema/1.0)")
                    .header("Accept-Language", "vi,en-US;q=0.8,en;q=0.6")
                    .retrieve()
                    .body(String.class);
            if (html == null || html.isBlank()) return "";

            Matcher openGraph = OG_TITLE.matcher(html);
            if (openGraph.find()) return decodeHtml(openGraph.group(1)).strip();
            Matcher reversedOpenGraph = OG_TITLE_REVERSED.matcher(html);
            if (reversedOpenGraph.find()) return decodeHtml(reversedOpenGraph.group(1)).strip();

            Matcher pageTitle = PAGE_TITLE.matcher(html);
            if (pageTitle.find()) {
                return decodeHtml(pageTitle.group(1).replaceFirst("\\s*[-|]\\s*YouTube\\s*$", "")).strip();
            }
        } catch (RuntimeException ignored) {
            // Giữ fallback ID nếu cả oEmbed và trang video đều không trả metadata.
        }
        return "";
    }

    private static String decodeHtml(String value) {
        return value.replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&#x27;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&amp;", "&");
    }

    private static String fallbackTitle() {
        return "Video YouTube";
    }

    private static String limit(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    public record VideoTitle(String title) {}

    public record OEmbedResponse(String title) {}
}
