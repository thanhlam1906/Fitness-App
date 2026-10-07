package com.fitness.assistant.controller;

import com.fitness.assistant.dto.DocumentDetailResponse;
import com.fitness.assistant.dto.DocumentRowResponse;
import com.fitness.assistant.dto.PublishRequest;
import com.fitness.assistant.dto.PublishResponse;
import com.fitness.assistant.dto.UploadDetailResponse;
import com.fitness.assistant.dto.UploadRowResponse;
import com.fitness.assistant.service.ingest.CorpusDocuments;
import com.fitness.assistant.service.ingest.CorpusUploadService;
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

	private final CorpusUploadService uploads;
	private final CorpusDocuments documents;

	public CorpusAdminController(CorpusUploadService uploads, CorpusDocuments documents) {
		this.uploads = uploads;
		this.documents = documents;
	}

	@PostMapping(path = "/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.ACCEPTED)
	public UploadRowResponse upload(@RequestParam("file") MultipartFile file) {
		return uploads.accept(file);
	}

	@GetMapping("/uploads")
	public List<UploadRowResponse> listUploads() {
		return uploads.list();
	}

	@GetMapping("/uploads/{id}")
	public UploadDetailResponse uploadDetail(@PathVariable UUID id) {
		return uploads.detail(id);
	}

	@PostMapping("/uploads/{id}/publish")
	public PublishResponse publish(@PathVariable UUID id, @Valid @RequestBody PublishRequest body) {
		return uploads.publish(id, body.title());
	}

	@DeleteMapping("/uploads/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void discard(@PathVariable UUID id) {
		uploads.discard(id);
	}

	@GetMapping("/documents")
	public List<DocumentRowResponse> listDocuments() {
		return documents.list();
	}

	@GetMapping("/documents/{id}")
	public DocumentDetailResponse documentDetail(@PathVariable UUID id) {
		return documents.detail(id);
	}

	@DeleteMapping("/documents/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void removeDocument(@PathVariable UUID id) {
		documents.remove(id);
	}
}
