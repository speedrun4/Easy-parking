package org.example.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class PagBankClient {
	private final RestTemplate restTemplate;
	private static final ObjectMapper MAPPER = new ObjectMapper();

	@Value("${pagbank.sandbox:true}")
	private boolean sandbox;

	@Value("${pagbank.client_id:}")
	private String clientId;

	@Value("${pagbank.client_secret:}")
	private String clientSecret;

	@Value("${pagbank.token:}")
	private String tokenFallback;

	@Value("${pagbank.notification_url:}")
	private String notificationUrl;

	private volatile String cachedAccessToken;
	private volatile long tokenExpiresAtMillis;

	private boolean hasOauthCredentials() {
		return clientId != null && !clientId.isEmpty() && clientSecret != null && !clientSecret.isEmpty();
	}

	public PagBankClient(RestTemplate restTemplate) {
		this.restTemplate = restTemplate;
	}

	public String getBaseUrl() {
		return sandbox ? "https://sandbox.api.pagseguro.com" : "https://api.pagseguro.com";
	}

	private boolean shouldSendNotificationUrl() {
		if (notificationUrl == null || notificationUrl.isEmpty()) {
			return false;
		}
		String url = notificationUrl.trim().toLowerCase();
		if (!url.startsWith("https://")) {
			return false;
		}
		return !url.contains("localhost") && !url.contains("127.0.0.1");
	}

	public boolean hasConfiguredCredentials() {
		boolean hasToken = tokenFallback != null && !tokenFallback.isEmpty();
		return hasToken || hasOauthCredentials();
	}

	/**
	 * Retrieve an OAuth2 access token via client_credentials. Caches until near expiry.
	 * Falls back to token property if client credentials are not configured or request fails.
	 */
	public synchronized String getAccessToken() {
		long now = System.currentTimeMillis();
		if (cachedAccessToken != null && now < tokenExpiresAtMillis) {
			return cachedAccessToken;
		}
		if (clientId == null || clientId.isEmpty() || clientSecret == null || clientSecret.isEmpty()) {
			return tokenFallback; // fallback when client credentials not provided
		}
		try {
			String url = getBaseUrl() + "/oauth2/token";

			// Primary: Basic auth + form grant_type=client_credentials
			HttpHeaders headers = new HttpHeaders();
			headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
			String basic = java.util.Base64.getEncoder().encodeToString((clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));
			headers.set("Authorization", "Basic " + basic);
			headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

			MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
			form.add("grant_type", "client_credentials");

			HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(form, headers);
			ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
			if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
				JsonNode node = MAPPER.readTree(resp.getBody());
				String accessToken = node.path("access_token").asText(null);
				int expiresIn = node.path("expires_in").asInt(1800); // seconds
				if (accessToken != null) {
					cachedAccessToken = accessToken;
					tokenExpiresAtMillis = now + (Math.max(60, expiresIn - 60)) * 1000L; // refresh a bit earlier
					return cachedAccessToken;
				}
			}

			// Fallback: JSON body with client_id/client_secret (some environments expect this)
			Map<String, Object> body = new HashMap<>();
			body.put("grant_type", "client_credentials");
			body.put("client_id", clientId);
			body.put("client_secret", clientSecret);

			HttpHeaders jsonHeaders = new HttpHeaders();
			jsonHeaders.setContentType(MediaType.APPLICATION_JSON);
			jsonHeaders.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
			ResponseEntity<String> altResp = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body, jsonHeaders), String.class);
			if (altResp.getStatusCode().is2xxSuccessful() && altResp.getBody() != null) {
				JsonNode node = MAPPER.readTree(altResp.getBody());
				String accessToken = node.path("access_token").asText(null);
				int expiresIn = node.path("expires_in").asInt(1800);
				if (accessToken != null) {
					cachedAccessToken = accessToken;
					tokenExpiresAtMillis = now + (Math.max(60, expiresIn - 60)) * 1000L;
					return cachedAccessToken;
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return tokenFallback; // last resort
	}

	public Map<String, Object> createPixCharge(String referenceId, int amountCents, String description) throws Exception {
		return createPixCharge(referenceId, amountCents, description, null);
	}

	public Map<String, Object> createPixCharge(String referenceId, int amountCents, String description, String pixKey) throws Exception {
		// Validar token de acesso
		String token = getAccessToken();
		String authMode = hasOauthCredentials() ? "oauth" : "token";
		if (token == null || token.isEmpty()) {
			throw new IllegalStateException("Token de acesso PagBank não está configurado (modo auth=" + authMode + ")");
		}

		String url = getBaseUrl() + "/charges";
		Map<String, Object> body = new HashMap<>();
		body.put("reference_id", referenceId);
		Map<String, Object> amount = new HashMap<>();
		amount.put("value", amountCents);
		amount.put("currency", "BRL");
		body.put("amount", amount);
		body.put("description", description);
		body.put("payment_method", Collections.singletonMap("type", "PIX"));
		if (shouldSendNotificationUrl()) {
			body.put("notification_urls", Collections.singletonList(notificationUrl));
		}

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);
		headers.setBearerAuth(token);
		try {
			ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
			if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
				return MAPPER.readValue(resp.getBody(), Map.class);
			}

			throw new RuntimeException(
					"Falha ao criar cobrança PIX (auth=" + authMode + ", sandbox=" + sandbox + "): " + resp.getStatusCode() + " - " + resp.getBody()
			);
		} catch (HttpStatusCodeException ex) {
			String guidance = "";
			if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED || ex.getStatusCode() == HttpStatus.FORBIDDEN) {
				guidance = " Verifique credenciais LIVE do PagBank. Recomendado usar OAuth (pagbank.client_id e pagbank.client_secret) e manter pagbank.sandbox=false para cobrança real.";
			}
			String responseBody = ex.getResponseBodyAsString();
			throw new RuntimeException(
					"Falha ao criar cobrança PIX (auth=" + authMode + ", sandbox=" + sandbox + "): " + ex.getStatusCode() + " - " + responseBody + guidance,
					ex
			);
		}
	}

	public Map<String, Object> createCardCharge(String referenceId, int amountCents, String description,
												String methodType, Map<String, Object> cardPayload) throws Exception {
		String url = getBaseUrl() + "/charges";
		Map<String, Object> body = new HashMap<>();
		body.put("reference_id", referenceId);
		Map<String, Object> amount = new HashMap<>();
		amount.put("value", amountCents);
		amount.put("currency", "BRL");
		body.put("amount", amount);
		body.put("description", description);
		Map<String, Object> payment = new HashMap<>();
		payment.put("type", methodType); // CREDIT_CARD or DEBIT_CARD
		payment.put("installments", 1);
		payment.put("capture", true);
		payment.put("card", cardPayload);
		body.put("payment_method", payment);
		if (shouldSendNotificationUrl()) {
			body.put("notification_urls", Collections.singletonList(notificationUrl));
		}

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);
		headers.setBearerAuth(getAccessToken());
		ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
		if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
			return MAPPER.readValue(resp.getBody(), Map.class);
		}
		throw new RuntimeException("Falha ao criar cobrança " + methodType + ": " + resp.getStatusCode());
	}

	public Map<String, Object> getCharge(String chargeId) throws Exception {
		String url = getBaseUrl() + "/charges/" + chargeId;
		HttpHeaders headers = new HttpHeaders();
		headers.setBearerAuth(getAccessToken());
		ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
		if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
			return MAPPER.readValue(resp.getBody(), Map.class);
		}
		throw new RuntimeException("Falha ao consultar cobrança: " + resp.getStatusCode());
	}
}
