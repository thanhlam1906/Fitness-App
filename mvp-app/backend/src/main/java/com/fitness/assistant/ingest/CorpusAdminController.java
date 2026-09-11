package com.fitness.assistant.ingest;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Nạp lại kho kiến thức từ content/corpus. Admin bấm sau khi đổi file .md. */
@RestController
@RequestMapping("/api/v1/admin/corpus")
@PreAuthorize("hasRole('ADMIN')")
public class CorpusAdminController {

	private final CorpusLoader loader;

	public CorpusAdminController(CorpusLoader loader) {
		this.loader = loader;
	}

	@PostMapping("/reload")
	public CorpusLoader.Result reload() {
		return loader.reload();
	}
}
