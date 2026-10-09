package com.fitness.admin.controller;

import com.fitness.admin.dto.AdminDashboardResponse;
import com.fitness.admin.service.AdminDashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Trang Tổng quan của admin (doc/mockup-tong-quan/demo.html). Chỉ đọc. */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardController {

	private final AdminDashboardService dashboardService;

	public AdminDashboardController(AdminDashboardService dashboardService) {
		this.dashboardService = dashboardService;
	}

	@GetMapping("/dashboard")
	public AdminDashboardResponse get(@RequestParam(defaultValue = "30") int days) {
		return dashboardService.get(days);
	}
}
