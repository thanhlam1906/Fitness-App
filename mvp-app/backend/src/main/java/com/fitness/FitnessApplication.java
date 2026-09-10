package com.fitness;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** @EnableScheduling cho ClipCleanupJob — concept-backend-v1.md §8. */
@SpringBootApplication
@EnableScheduling
public class FitnessApplication {

	public static void main(String[] args) {
		SpringApplication.run(FitnessApplication.class, args);
	}
}
