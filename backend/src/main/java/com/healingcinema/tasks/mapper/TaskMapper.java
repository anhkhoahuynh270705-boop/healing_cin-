package com.healingcinema.tasks.mapper;

import java.util.List;

import com.healingcinema.tasks.dto.TaskDtos.Progress;
import com.healingcinema.tasks.dto.TaskDtos.Task;

/** Mapper tiến độ và nhiệm vụ EXP. */
public final class TaskMapper {
    private TaskMapper() {}

    public static Task toTask(String id, String title, String description, int rewardExp,
            boolean eligible, boolean claimed) {
        return new Task(id, title, description, rewardExp, eligible, claimed);
    }

    public static Progress toProgress(long experiencePoints, int experiencePerLevel, List<Task> tasks) {
        long total = Math.max(0, experiencePoints);
        return new Progress(total, (int) (total / experiencePerLevel) + 1,
                (int) (total % experiencePerLevel), experiencePerLevel, tasks);
    }
}
