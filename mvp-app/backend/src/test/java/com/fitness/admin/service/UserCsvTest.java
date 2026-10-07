package com.fitness.admin.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.admin.repository.AdminUserQueryRepository.UserRow;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class UserCsvTest {

	private static UserRow row(String fullName, String programName) {
		return new UserRow(UUID.randomUUID(), "a@example.com", fullName, "USER", true, "TRAINING",
				Instant.parse("2026-10-01T03:00:00Z"), null, programName, (short) 2, (short) 8, 5, 1, 60);
	}

	@Test
	void coBomVaDongTieuDe() {
		String csv = UserCsv.write(List.of());
		assertThat(csv).startsWith("\uFEFFho_ten,email,vai_tro,trang_thai,tham_gia,hoat_dong_gan_nhat,"
				+ "chuong_trinh,tuan,buoi,clip,tuan_thu_pct\r\n");
	}

	@Test
	void oBatDauBangDauCongThuc_biVoHieu() {
		String csv = UserCsv.write(List.of(row("=HYPERLINK(\"x\")", "+cmd")));
		assertThat(csv).contains("\"'=HYPERLINK(\"\"x\"\")\"").contains("'+cmd");
	}

	@Test
	void oCoDauPhay_duocBaoNgoacKep_oNullDeTrong() {
		String csv = UserCsv.write(List.of(row("Trần, Thị B", null)));
		assertThat(csv).contains("\"Trần, Thị B\",a@example.com,USER,TRAINING,2026-10-01T03:00:00Z,,,2/8,5,1,60\r\n");
	}
}
