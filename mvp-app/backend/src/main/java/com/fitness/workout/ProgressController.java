package com.fitness.workout;

import com.fitness.common.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Màn Cài đặt › Tiến bộ (doc/design-cai-dat-v1.md). userId luôn từ JWT. */
@RestController
@RequestMapping("/api/v1/me")
public class ProgressController {

	private final ProgressService progress;
	private final CurrentUser currentUser;

	public ProgressController(ProgressService progress, CurrentUser currentUser) {
		this.progress = progress;
		this.currentUser = currentUser;
	}

	@GetMapping("/progress")
	public ProgressService.Progress progress(@RequestParam(defaultValue = "4") int weeks) {
		return progress.summary(currentUser.id(), weeks);
	}
}
