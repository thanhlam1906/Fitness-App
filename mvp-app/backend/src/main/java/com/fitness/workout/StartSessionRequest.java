package com.fitness.workout;

import java.util.UUID;

/** scheduledWorkoutId null = tập ngoài lịch (V1__init.sql). userId lấy từ JWT, không nhận từ client. */
public record StartSessionRequest(UUID scheduledWorkoutId) {
}
