package com.fitness.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

class SocialTokenVerifierTest {

	private static final String GOOGLE_INFO = "https://oauth2.googleapis.com/tokeninfo?access_token=tok";
	private static final String GOOGLE_USER = "https://openidconnect.googleapis.com/v1/userinfo";
	private static final String FB_DEBUG = "https://graph.facebook.com/debug_token?input_token=tok&access_token=app-id%7Capp-secret";
	// HMAC-SHA256("app-secret", "tok") dạng hex, tính sẵn bằng openssl để test không tự kiểm chính nó.
	private static final String FB_PROOF = "0c7995e8dd6b88affbf589a744709e103fb98788391c39e83252391a4a93b5bb";

	private MockRestServiceServer server;
	private SocialTokenVerifier verifier;

	@BeforeEach
	void setUp() {
		RestClient.Builder builder = RestClient.builder();
		server = MockRestServiceServer.bindTo(builder).build();
		verifier = new SocialTokenVerifier(builder, "google-client", "app-id", "app-secret");
	}

	private void json(String url, String body) {
		server.expect(requestTo(url)).andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
	}

	@Test
	void google_validToken_returnsEmailAndName() {
		json(GOOGLE_INFO, "{\"aud\":\"google-client\",\"email\":\"a@gmail.com\",\"email_verified\":\"true\"}");
		server.expect(requestTo(GOOGLE_USER)).andExpect(header("Authorization", "Bearer tok"))
				.andRespond(withSuccess("{\"name\":\"Nguyễn A\"}", MediaType.APPLICATION_JSON));

		assertThat(verifier.google("tok")).isEqualTo(new SocialTokenVerifier.Identity("a@gmail.com", "Nguyễn A"));
	}

	@Test
	void google_tokenForAnotherApp_rejected() {
		json(GOOGLE_INFO, "{\"aud\":\"app-khac\",\"email\":\"a@gmail.com\",\"email_verified\":\"true\"}");

		assertStatus(() -> verifier.google("tok"), HttpStatus.UNAUTHORIZED);
	}

	@Test
	void google_unverifiedEmail_rejected() {
		json(GOOGLE_INFO, "{\"aud\":\"google-client\",\"email\":\"a@gmail.com\",\"email_verified\":\"false\"}");

		assertStatus(() -> verifier.google("tok"), HttpStatus.UNAUTHORIZED);
	}

	@Test
	void google_invalidToken_is401_andOutage_is502() {
		server.expect(requestTo(GOOGLE_INFO)).andRespond(withBadRequest());
		assertStatus(() -> verifier.google("tok"), HttpStatus.UNAUTHORIZED);

		server.reset();
		server.expect(requestTo(GOOGLE_INFO)).andRespond(withServerError());
		assertStatus(() -> verifier.google("tok"), HttpStatus.BAD_GATEWAY);
	}

	@Test
	void google_nullBody_is401NotCrash() {
		json(GOOGLE_INFO, "null");

		assertStatus(() -> verifier.google("tok"), HttpStatus.UNAUTHORIZED);
	}

	@Test
	void google_missingName_fallsBackToEmailPrefix() {
		json(GOOGLE_INFO, "{\"aud\":\"google-client\",\"email\":\"lam@gmail.com\",\"email_verified\":true}");
		json(GOOGLE_USER, "{}");

		assertThat(verifier.google("tok").name()).isEqualTo("lam");
	}

	@Test
	void facebook_validToken_returnsEmailAndName() {
		json(FB_DEBUG, "{\"data\":{\"app_id\":\"app-id\",\"is_valid\":true}}");
		json("https://graph.facebook.com/me?fields=name,email&access_token=tok&appsecret_proof=" + FB_PROOF,
				"{\"name\":\"Trần B\",\"email\":\"b@x.com\"}");

		assertThat(verifier.facebook("tok")).isEqualTo(new SocialTokenVerifier.Identity("b@x.com", "Trần B"));
	}

	@Test
	void facebook_jsonWithNonJsonContentType_stillParsed() {
		// Không ghi charset: tên tiếng Việt vẫn phải đọc đúng vì JSON luôn là UTF-8.
		MediaType js = MediaType.parseMediaType("text/javascript");
		server.expect(requestTo(FB_DEBUG))
				.andRespond(withSuccess("{\"data\":{\"app_id\":\"app-id\",\"is_valid\":true}}", js));
		server.expect(requestTo("https://graph.facebook.com/me?fields=name,email&access_token=tok&appsecret_proof=" + FB_PROOF))
				.andRespond(withSuccess("{\"name\":\"Trần B\",\"email\":\"b@x.com\"}", js));

		assertThat(verifier.facebook("tok")).isEqualTo(new SocialTokenVerifier.Identity("b@x.com", "Trần B"));
	}

	@Test
	void facebook_nonJsonBody_is502() {
		server.expect(requestTo(FB_DEBUG)).andRespond(withSuccess("<html>bảo trì</html>", MediaType.TEXT_HTML));

		assertStatus(() -> verifier.facebook("tok"), HttpStatus.BAD_GATEWAY);
	}

	@Test
	void facebook_tokenForAnotherApp_rejected() {
		json(FB_DEBUG, "{\"data\":{\"app_id\":\"app-khac\",\"is_valid\":true}}");

		assertStatus(() -> verifier.facebook("tok"), HttpStatus.UNAUTHORIZED);
	}

	@Test
	void facebook_expiredToken_rejected() {
		json(FB_DEBUG, "{\"data\":{\"app_id\":\"app-id\",\"is_valid\":false}}");

		assertStatus(() -> verifier.facebook("tok"), HttpStatus.UNAUTHORIZED);
	}

	@Test
	void facebook_noEmail_is400() {
		json(FB_DEBUG, "{\"data\":{\"app_id\":\"app-id\",\"is_valid\":true}}");
		json("https://graph.facebook.com/me?fields=name,email&access_token=tok&appsecret_proof=" + FB_PROOF,
				"{\"name\":\"Trần B\"}");

		assertStatus(() -> verifier.facebook("tok"), HttpStatus.BAD_REQUEST);
	}

	@Test
	void notConfigured_is400_andConfigIsNull() {
		var off = new SocialTokenVerifier(RestClient.builder(), "", "", "");

		assertStatus(() -> off.google("tok"), HttpStatus.BAD_REQUEST);
		assertStatus(() -> off.facebook("tok"), HttpStatus.BAD_REQUEST);
		assertThat(off.config().googleClientId()).isNull();
		assertThat(off.config().facebookAppId()).isNull();
	}

	private static void assertStatus(Runnable call, HttpStatus status) {
		assertThatThrownBy(call::run).isInstanceOfSatisfying(ResponseStatusException.class,
				e -> assertThat(e.getStatusCode()).isEqualTo(status));
	}
}
