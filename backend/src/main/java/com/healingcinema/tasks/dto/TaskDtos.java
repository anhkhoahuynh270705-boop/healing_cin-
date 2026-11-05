package com.healingcinema.tasks.dto;

import java.util.List;

public final class TaskDtos {
    private TaskDtos() {}

    public record Task(String id, String title, String description, int rewardExp,
            boolean eligible, boolean claimed) {}

    public record Progress(long experiencePoints, int level, int levelExperience,
            int nextLevelExperience, List<Task> tasks) {}

    public record ClaimRequest(String userId, String authToken, String taskId) {}
}
