package com.fitness.content.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.entity.Role;
import com.fitness.content.dto.ExerciseRequest;
import com.fitness.content.dto.ExerciseResponse;
import com.fitness.support.PostgresIntegrationTest;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/** Ảnh bài tập: admin đặt/xoá, ai cũng xem được (doc/design-anh-bai-tap-v1.md §4). */
class ExerciseImageIntegrationTest extends PostgresIntegrationTest {

	private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3};
	private static final byte[] JPG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 4, 5, 6};
	private static final byte[] GIF = "GIF89a-anh-dong".getBytes(StandardCharsets.ISO_8859_1);

	@Autowired
	private TestRestTemplate rest;

	private ExerciseResponse createExercise(HttpHeaders admin) {
		var request = new ExerciseRequest(
				"img-test-" + UUID.randomUUID(), "Image Test", "Bài thử ảnh", List.of("QUADS"), List.of(), null, null, true);
		return rest.exchange("/api/v1/exercises", HttpMethod.POST, new HttpEntity<>(request, admin), ExerciseResponse.class)
				.getBody();
	}

	private ResponseEntity<String> upload(HttpHeaders auth, UUID exerciseId, String kind, String fileName, byte[] bytes) {
		MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
		body.add("file", new ByteArrayResource(bytes) {
			@Override
			public String getFilename() {
				return fileName;
			}
		});
		HttpHeaders headers = new HttpHeaders();
		headers.putAll(auth);
		headers.setContentType(MediaType.MULTIPART_FORM_DATA);
		return rest.exchange("/api/v1/exercises/" + exerciseId + "/images/" + kind, HttpMethod.POST,
				new HttpEntity<>(body, headers), String.class);
	}

	private ResponseEntity<byte[]> view(String slug, String kind) {
		return rest.getForEntity("/api/v1/exercise-images/" + slug + "/" + kind, byte[].class);
	}

	private ExerciseResponse fetch(HttpHeaders auth, UUID id) {
		return rest.exchange("/api/v1/exercises/" + id, HttpMethod.GET, new HttpEntity<>(auth), ExerciseResponse.class)
				.getBody();
	}

	@Test
	void adminDatAnhTinh_xemKhongCanDangNhap() {
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		ExerciseResponse ex = createExercise(admin);

		assertThat(upload(admin, ex.id(), "still", "anh.png", PNG).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

		ResponseEntity<byte[]> got = view(ex.slug(), "still");
		assertThat(got.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(got.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_PNG);
		assertThat(got.getHeaders().getCacheControl()).isEqualTo("no-cache");
		assertThat(got.getBody()).isEqualTo(PNG);
	}

	@Test
	void etagKhop_tra304() {
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		ExerciseResponse ex = createExercise(admin);
		upload(admin, ex.id(), "animated", "dong.gif", GIF);
		String etag = view(ex.slug(), "animated").getHeaders().getETag();

		HttpHeaders conditional = new HttpHeaders();
		conditional.setIfNoneMatch(etag);
		var again = rest.exchange("/api/v1/exercise-images/" + ex.slug() + "/animated", HttpMethod.GET,
				new HttpEntity<>(conditional), byte[].class);
		assertThat(again.getStatusCode()).isEqualTo(HttpStatus.NOT_MODIFIED);
	}

	@Test
	void thayAnhDaCo_xemRaAnhMoi_etagDoi() {
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		ExerciseResponse ex = createExercise(admin);
		upload(admin, ex.id(), "still", "anh.png", PNG);
		ResponseEntity<byte[]> before = view(ex.slug(), "still");

		assertThat(upload(admin, ex.id(), "still", "anh.jpg", JPG).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

		ResponseEntity<byte[]> after = view(ex.slug(), "still");
		assertThat(after.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(after.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_JPEG);
		assertThat(after.getBody()).isEqualTo(JPG);
		assertThat(after.getHeaders().getETag()).isNotNull().isNotEqualTo(before.getHeaders().getETag());
	}

	@Test
	void nguoiTapThuong_khongDatDuocAnh() {
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		ExerciseResponse ex = createExercise(admin);
		HttpHeaders user = newAuthedUser(Role.USER).headers();

		assertThat(upload(user, ex.id(), "still", "anh.png", PNG).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
	}

	@Test
	void fileDoiLot_saiO_hoacQua5MB_bi400() {
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		ExerciseResponse ex = createExercise(admin);
		byte[] tooBig = Arrays.copyOf(PNG, 5 * 1024 * 1024 + 1);

		assertThat(upload(admin, ex.id(), "still", "chu.jpg", "hello".getBytes()).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(upload(admin, ex.id(), "still", "dong.gif", GIF).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(upload(admin, ex.id(), "animated", "anh.png", PNG).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		var big = upload(admin, ex.id(), "still", "to.png", tooBig);
		assertThat(big.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(big.getBody()).contains("5 MB");
		assertThat(view(ex.slug(), "still").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	@Test
	void xoaAnh_coTrongDanhSach_roiMat() {
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		ExerciseResponse ex = createExercise(admin);
		assertThat(ex.hasStillImage()).isFalse();

		upload(admin, ex.id(), "still", "anh.png", PNG);
		ExerciseResponse withImage = fetch(admin, ex.id());
		assertThat(withImage.hasStillImage()).isTrue();
		assertThat(withImage.hasAnimatedImage()).isFalse();
		assertThat(withImage.updatedAt()).isAfter(ex.updatedAt());

		var deleted = rest.exchange("/api/v1/exercises/" + ex.id() + "/images/still", HttpMethod.DELETE,
				new HttpEntity<>(admin), Void.class);
		assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
		assertThat(view(ex.slug(), "still").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
		assertThat(fetch(admin, ex.id()).hasStillImage()).isFalse();
	}

	@Test
	void anhBaiCu_xemDuoc_loaiLa404() {
		assertThat(view("goblet-squat", "still").getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_JPEG);
		assertThat(view("goblet-squat", "animated").getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_GIF);
		assertThat(view("bodyweight-squat", "animated").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
		assertThat(view("goblet-squat", "khac").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	@Test
	void baiKhongTonTai_404() {
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		assertThat(upload(admin, UUID.randomUUID(), "still", "anh.png", PNG).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}
}
