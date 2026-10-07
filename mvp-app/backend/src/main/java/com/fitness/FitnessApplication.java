package com.fitness;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** @EnableScheduling cho ClipCleanupJob — concept-backend-v1.md §8. */
@SpringBootApplication
@EnableScheduling
public class FitnessApplication {

	// "Hôm nay" (LocalDate.now() ở lịch, cân nặng, ngày bắt đầu chương trình) theo giờ Việt Nam
	// như web. Container chạy UTC nên từ 0h tới 7h sáng backend và web lệch một ngày: "buổi hôm
	// nay" sai, cân nặng sáng sớm ghi sang hôm trước. Mốc thời gian (Instant) không đổi, DB vẫn
	// lưu UTC (spring.jpa…jdbc.time_zone). Khối static chạy cả khi test dựng context.
	// ponytail: một múi giờ cho cả app — có người dùng ngoài VN thì nhận múi giờ từ client.
	static {
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
	}

	public static void main(String[] args) {
		SpringApplication.run(FitnessApplication.class, args);
	}
}
