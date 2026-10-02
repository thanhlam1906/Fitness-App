package com.fitness.assistant.ingest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Kho kiến thức trợ lý: thả PDF, duyệt, gỡ (doc/design-nap-tai-lieu-v1.md §5). Thay nút "Nạp lại"
 * đọc content/corpus/*.md trước đây: kho trên web giờ là nguồn duy nhất, gỡ rồi không bị nạp lại.
 */
@RestController
@RequestMapping("/api/v1/admin/corpus")
@PreAuthorize("hasRole('ADMIN')")
public class CorpusAdminController {

	public record PublishRequest(
			@NotBlank(message = "Tên hiển thị không được trống.")
			@Size(max = 200, message = "Tên hiển thị tối đa 200 ký tự.") String title) {
	}

	private final CorpusUploadService uploads;
	private final CorpusDocuments documents;

	public CorpusAdminController(CorpusUploadService uploads, CorpusDocuments documents) {
		this.uploads = uploads;
		this.documents = documents;
	}

	@PostMapping(path = "/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.ACCEPTED)
	public CorpusUploadService.UploadRow upload(@RequestParam("file") MultipartFile file) {
		return uploads.accept(file);
	}

	@GetMapping("/uploads")
	public List<CorpusUploadService.UploadRow> listUploads() {
		return uploads.list();
	}

	@GetMapping("/uploads/{id}")
	public CorpusUploadService.UploadDetail uploadDetail(@PathVariable UUID id) {
		return uploads.detail(id);
	}

	@PostMapping("/uploads/{id}/publish")
	public CorpusLoader.Published publish(@PathVariable UUID id, @Valid @RequestBody PublishRequest body) {
		return uploads.publish(id, body.title());
	}

	@DeleteMapping("/uploads/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void discard(@PathVariable UUID id) {
		uploads.discard(id);
	}

	@GetMapping("/documents")
	public List<CorpusDocuments.DocumentRow> listDocuments() {
		return documents.list();
	}

	@GetMapping("/documents/{id}")
	public CorpusDocuments.DocumentDetail documentDetail(@PathVariable UUID id) {
		return documents.detail(id);
	}

	@DeleteMapping("/documents/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void removeDocument(@PathVariable UUID id) {
		documents.remove(id);
	}
}
