package com.fitness.auth.dto;

/** ID công khai của app trên Google/Facebook cho web. null = chưa cấu hình, nút hiện "Sắp có". */
public record SocialConfigResponse(String googleClientId, String facebookAppId) {
}
