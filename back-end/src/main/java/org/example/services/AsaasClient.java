package org.example.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.models.Usuarios;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Service
public class AsaasClient {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final RestTemplate restTemplate;

    @Value("${asaas.api-key:}")
    private String apiKey;

    @Value("${asaas.base-url:https://sandbox.asaas.com/api/v3}")
    private String baseUrl;

    @Value("${asaas.card.default-remote-ip:127.0.0.1}")
    private String defaultRemoteIp;

    @Value("${asaas.card.default-postal-code:00000000}")
    private String defaultPostalCode;

    @Value("${asaas.card.default-address:Rua Teste Sandbox}")
    private String defaultAddress;

    @Value("${asaas.card.default-address-number:0}")
    private String defaultAddressNumber;

    @Value("${asaas.card.default-phone:11999999999}")
    private String defaultPhone;

    @Value("${asaas.card.default-email:sandbox@easyparking.local}")
    private String defaultEmail;

    public AsaasClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public boolean hasConfiguredCredentials() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    public Map<String, Object> createPixPayment(String externalReference,
                                                BigDecimal amount,
                                                String description,
                                                Usuarios usuario) throws Exception {
        if (!hasConfiguredCredentials()) {
            throw new IllegalStateException("A chave de API do Asaas não está configurada");
        }

        String customerId = ensureCustomer(usuario);
        if (!hasText(customerId)) {
            throw new IllegalStateException("Não foi possível identificar o cliente no Asaas");
        }

        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("customer", customerId);
        body.put("billingType", "PIX");
        body.put("value", normalizeAmount(amount));
        body.put("dueDate", LocalDate.now().toString());
        body.put("description", hasText(description) ? description : "Pagamento Easy Parking");
        body.put("externalReference", externalReference);

        Map<String, Object> payment = exchange("/payments", HttpMethod.POST, body);
        String paymentId = readString(payment.get("id"));
        if (hasText(paymentId)) {
            Map<String, Object> pixQrCode = fetchPixQrCode(paymentId);
            if (!pixQrCode.isEmpty()) {
                payment.put("pixTransaction", pixQrCode);
            }
        }
        return payment;
    }

    public Map<String, Object> getPayment(String paymentId) throws Exception {
        if (!hasConfiguredCredentials()) {
            throw new IllegalStateException("A chave de API do Asaas não está configurada");
        }
        if (!hasText(paymentId)) {
            throw new IllegalArgumentException("paymentId é obrigatório");
        }

        Map<String, Object> payment = exchange("/payments/" + paymentId.trim(), HttpMethod.GET, null);
        String billingType = readString(payment.get("billingType"));
        if (billingType != null && "PIX".equalsIgnoreCase(billingType.trim())) {
            Map<String, Object> pixQrCode = fetchPixQrCode(paymentId.trim());
            if (!pixQrCode.isEmpty()) {
                payment.put("pixTransaction", pixQrCode);
            }
        }
        return payment;
    }

    /**
     * Disponível apenas no ambiente Sandbox da Asaas: simula a confirmação do
     * pagamento de uma cobrança (ex.: PIX dinâmico), atualizando o status para
     * RECEIVED sem movimentar dinheiro real. Não existe endpoint equivalente
     * em produção.
     */
    public Map<String, Object> confirmSandboxPayment(String paymentId) throws Exception {
        if (!hasConfiguredCredentials()) {
            throw new IllegalStateException("A chave de API do Asaas não está configurada");
        }
        if (!hasText(paymentId)) {
            throw new IllegalArgumentException("paymentId é obrigatório");
        }
        return exchange("/sandbox/payment/" + paymentId.trim() + "/confirm", HttpMethod.POST, java.util.Collections.emptyMap());
    }

    public Map<String, Object> createCardPayment(String method,
                                                 String externalReference,
                                                 BigDecimal amount,
                                                 String description,
                                                 Usuarios usuario,
                                                 Map<String, Object> cardData,
                                                 String remoteIp) throws Exception {
        if (!hasConfiguredCredentials()) {
            throw new IllegalStateException("A chave de API do Asaas não está configurada");
        }

        String customerId = ensureCustomer(usuario);
        if (!hasText(customerId)) {
            throw new IllegalStateException("Não foi possível identificar o cliente no Asaas");
        }

        String requestedMethod = hasText(method) ? method.trim().toUpperCase(Locale.ROOT) : "CREDIT_CARD";
        String billingType = "DEBIT_CARD".equals(requestedMethod) ? "DEBIT_CARD" : "CREDIT_CARD";
        String cardNumber = onlyDigits(readString(cardData.get("number")));
        String securityCode = onlyDigits(readString(cardData.get("security_code")));
        String expiryMonth = normalizeMonth(readString(cardData.get("exp_month")));
        String expiryYear = normalizeYear(readString(cardData.get("exp_year")));

        Map<String, Object> holder = asMap(cardData.get("holder"));
        String holderName = firstNonBlank(
                readString(holder.get("name")),
                usuario != null ? usuario.getNomeCompleto() : null
        );
        String holderCpf = resolveCustomerCpf(onlyDigits(firstNonBlank(
                readString(holder.get("tax_id")),
                readString(holder.get("taxId")),
                usuario != null ? usuario.getCpf() : null
        )));
        String holderEmail = firstNonBlank(
                readString(holder.get("email")),
                usuario != null ? usuario.getEmail() : null
        );
        String holderPhone = onlyDigits(firstNonBlank(
                readString(holder.get("phone")),
                usuario != null ? usuario.getTelefone() : null
        ));
        String holderAddress = firstNonBlank(
                readString(holder.get("address")),
                defaultAddress
        );
        String holderAddressNumber = firstNonBlank(
                readString(holder.get("address_number")),
                readString(holder.get("addressNumber")),
                defaultAddressNumber
        );
        String holderPostalCode = onlyDigits(firstNonBlank(
                readString(holder.get("postal_code")),
                readString(holder.get("postalCode")),
                defaultPostalCode
        ));
        String holderAddressComplement = firstNonBlank(
                readString(holder.get("address_complement")),
                readString(holder.get("addressComplement"))
        );

        if (!hasText(cardNumber) || cardNumber.length() < 13 || cardNumber.length() > 19) {
            throw new IllegalArgumentException("Número do cartão inválido.");
        }
        if (!hasText(securityCode) || securityCode.length() < 3 || securityCode.length() > 4) {
            throw new IllegalArgumentException("Código de segurança do cartão inválido.");
        }
        if (!hasText(expiryMonth) || !hasText(expiryYear)) {
            throw new IllegalArgumentException("Validade do cartão inválida.");
        }
        if (!hasText(holderName)) {
            throw new IllegalArgumentException("Nome do titular do cartão é obrigatório.");
        }
        if (!hasText(holderCpf)) {
            throw new IllegalArgumentException("CPF do titular do cartão é obrigatório.");
        }

        Map<String, Object> creditCard = new LinkedHashMap<String, Object>();
        creditCard.put("holderName", holderName.trim());
        creditCard.put("number", cardNumber);
        creditCard.put("expiryMonth", expiryMonth);
        creditCard.put("expiryYear", expiryYear);
        creditCard.put("ccv", securityCode);

        Map<String, Object> creditCardHolderInfo = new LinkedHashMap<String, Object>();
        creditCardHolderInfo.put("name", holderName.trim());
        creditCardHolderInfo.put("email", firstNonBlank(holderEmail, defaultEmail));
        creditCardHolderInfo.put("cpfCnpj", holderCpf);
        creditCardHolderInfo.put("phone", normalizePhone(holderPhone));
        if (hasText(holderAddress)) {
            creditCardHolderInfo.put("address", holderAddress.trim());
        }
        creditCardHolderInfo.put("postalCode", hasText(holderPostalCode) ? holderPostalCode : "00000000");
        creditCardHolderInfo.put("addressNumber", hasText(holderAddressNumber) ? holderAddressNumber.trim() : "0");
        if (hasText(holderAddressComplement)) {
            creditCardHolderInfo.put("addressComplement", holderAddressComplement.trim());
        }

        Map<String, Object> body = buildCardChargeBody(
                customerId,
                billingType,
                amount,
                description,
                externalReference,
                creditCard,
                creditCardHolderInfo,
                remoteIp
        );

        Map<String, Object> payment;
        try {
            payment = exchange("/payments", HttpMethod.POST, body);
        } catch (RuntimeException ex) {
            if ("DEBIT_CARD".equals(requestedMethod) && isUnsupportedDebitBillingType(ex)) {
                body.put("billingType", "CREDIT_CARD");
                payment = exchange("/payments", HttpMethod.POST, body);
                payment.put("fallbackBillingType", "CREDIT_CARD");
            } else {
                throw ex;
            }
        }
        payment.put("requestedMethod", requestedMethod);
        return payment;
    }

    private Map<String, Object> fetchPixQrCode(String paymentId) throws Exception {
        if (!hasText(paymentId)) {
            return Collections.emptyMap();
        }
        try {
            return exchange("/payments/" + paymentId.trim() + "/pixQrCode", HttpMethod.GET, null);
        } catch (RuntimeException ex) {
            if (isPixQrCodeUnavailable(ex)) {
                return Collections.emptyMap();
            }
            throw ex;
        }
    }

    private boolean isPixQrCodeUnavailable(RuntimeException ex) {
        if (!(ex.getCause() instanceof HttpStatusCodeException)) {
            return false;
        }
        HttpStatusCodeException httpEx = (HttpStatusCodeException) ex.getCause();
        if (httpEx.getStatusCode() != HttpStatus.BAD_REQUEST) {
            return false;
        }
        String responseBody = readString(httpEx.getResponseBodyAsString());
        if (!hasText(responseBody)) {
            return false;
        }
        String normalizedResponse = responseBody.toLowerCase(Locale.ROOT);
        return normalizedResponse.contains("invalid_action")
                || normalizedResponse.contains("não pode mais ser paga")
                || normalizedResponse.contains("nao pode mais ser paga");
    }

    private String ensureCustomer(Usuarios usuario) throws Exception {
        String cpf = usuario != null && usuario.getCpf() != null
                ? usuario.getCpf().replaceAll("\\D", "")
                : "";
        String customerCpf = resolveCustomerCpf(cpf);
        if (!hasText(customerCpf)) {
            throw new IllegalStateException("Usuário sem CPF/CNPJ válido para criar cobrança no Asaas.");
        }

        String customerIdByCpf = findCustomerByCpf(customerCpf);
        if (hasText(customerIdByCpf)) {
            return customerIdByCpf;
        }

        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("name", resolveCustomerName(usuario));
        if (usuario != null && hasText(usuario.getEmail())) {
            body.put("email", usuario.getEmail().trim());
        }
        body.put("cpfCnpj", customerCpf);

        Map<String, Object> customer = exchange("/customers", HttpMethod.POST, body);
        return readString(customer.get("id"));
    }

    private String resolveCustomerCpf(String rawCpf) {
        if (isValidCpf(rawCpf)) {
            return rawCpf;
        }
        if (isSandboxEnvironment()) {
            return "11144477735";
        }
        return null;
    }

    private boolean isSandboxEnvironment() {
        String normalizedBaseUrl = baseUrl != null ? baseUrl.trim().toLowerCase() : "";
        return normalizedBaseUrl.contains("sandbox.asaas.com");
    }

    private String findCustomerByCpf(String cpf) throws Exception {
        Map<String, Object> response = exchange("/customers?cpfCnpj=" + cpf, HttpMethod.GET, null);
        Object data = response.get("data");
        if (!(data instanceof List) || ((List<?>) data).isEmpty()) {
            return null;
        }
        Object first = ((List<?>) data).get(0);
        if (!(first instanceof Map)) {
            return null;
        }
        return readString(((Map<?, ?>) first).get("id"));
    }

    private String resolveCustomerName(Usuarios usuario) {
        if (usuario != null && hasText(usuario.getNomeCompleto())) {
            return usuario.getNomeCompleto().trim();
        }
        return "Cliente Easy Parking";
    }

    private boolean isValidCpf(String cpf) {
        if (!hasText(cpf) || cpf.length() != 11) {
            return false;
        }
        if (cpf.chars().distinct().count() == 1) {
            return false;
        }
        int d1 = calculateCpfDigit(cpf, 9, 10);
        int d2 = calculateCpfDigit(cpf, 10, 11);
        return d1 == Character.getNumericValue(cpf.charAt(9))
                && d2 == Character.getNumericValue(cpf.charAt(10));
    }

    private int calculateCpfDigit(String cpf, int length, int weightStart) {
        int sum = 0;
        int weight = weightStart;
        for (int i = 0; i < length; i++) {
            sum += Character.getNumericValue(cpf.charAt(i)) * weight--;
        }
        int remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        BigDecimal safeAmount = amount != null ? amount : BigDecimal.ONE;
        return safeAmount.setScale(2, RoundingMode.HALF_UP);
    }

    private Map<String, Object> buildCardChargeBody(String customerId,
                                                    String billingType,
                                                    BigDecimal amount,
                                                    String description,
                                                    String externalReference,
                                                    Map<String, Object> creditCard,
                                                    Map<String, Object> creditCardHolderInfo,
                                                    String remoteIp) {
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("customer", customerId);
        body.put("billingType", billingType);
        body.put("value", normalizeAmount(amount));
        body.put("totalValue", normalizeAmount(amount));
        body.put("dueDate", LocalDate.now().toString());
        body.put("description", hasText(description) ? description : "Pagamento Easy Parking");
        body.put("externalReference", externalReference);
        body.put("installmentCount", 1);
        body.put("creditCard", creditCard);
        body.put("creditCardHolderInfo", creditCardHolderInfo);
        body.put("remoteIp", hasText(remoteIp)
                ? remoteIp.trim()
                : (hasText(defaultRemoteIp) ? defaultRemoteIp.trim() : "127.0.0.1"));
        return body;
    }

    private boolean isUnsupportedDebitBillingType(RuntimeException ex) {
        if (!(ex.getCause() instanceof HttpStatusCodeException)) {
            return false;
        }
        HttpStatusCodeException httpEx = (HttpStatusCodeException) ex.getCause();
        if (httpEx.getStatusCode() != HttpStatus.BAD_REQUEST) {
            return false;
        }
        String responseBody = readString(httpEx.getResponseBodyAsString());
        if (!hasText(responseBody)) {
            return false;
        }
        String normalizedResponse = responseBody.toLowerCase(Locale.ROOT);
        return normalizedResponse.contains("invalid_parameter")
                && normalizedResponse.contains("billingtype");
    }

    private String normalizeMonth(String rawMonth) {
        String digits = onlyDigits(rawMonth);
        if (!hasText(digits)) {
            return null;
        }
        if (digits.length() == 1) {
            digits = "0" + digits;
        }
        if (digits.length() != 2) {
            return null;
        }
        int month = Integer.parseInt(digits);
        return month >= 1 && month <= 12 ? digits : null;
    }

    private String normalizeYear(String rawYear) {
        String digits = onlyDigits(rawYear);
        if (!hasText(digits)) {
            return null;
        }
        if (digits.length() == 2) {
            return "20" + digits;
        }
        return digits.length() == 4 ? digits : null;
    }

    private String normalizePhone(String rawPhone) {
        String digits = onlyDigits(rawPhone);
        if (digits.length() >= 10 && digits.length() <= 11) {
            return digits;
        }
        String fallback = onlyDigits(defaultPhone);
        if (fallback.length() >= 10 && fallback.length() <= 11) {
            return fallback;
        }
        return "11999999999";
    }

    private String onlyDigits(String value) {
        if (!hasText(value)) {
            return "";
        }
        return value.replaceAll("\\D", "");
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map) {
            return (Map<String, Object>) value;
        }
        return Collections.emptyMap();
    }

    private Map<String, Object> exchange(String path, HttpMethod method, Object body) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.set("access_token", apiKey.trim());

        HttpEntity<?> entity = body != null
                ? new HttpEntity<Object>(body, headers)
                : new HttpEntity<Object>(null, headers);
        try {
            String normalizedBaseUrl = baseUrl != null ? baseUrl.trim() : "";
            if (normalizedBaseUrl.endsWith("/")) {
                normalizedBaseUrl = normalizedBaseUrl.substring(0, normalizedBaseUrl.length() - 1);
            }
            ResponseEntity<String> response = restTemplate.exchange(
                    normalizedBaseUrl + path,
                    method,
                    entity,
                    String.class
            );
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return MAPPER.readValue(response.getBody(), Map.class);
            }
            throw new RuntimeException("Falha na integração Asaas: " + response.getStatusCode());
        } catch (HttpStatusCodeException ex) {
            throw new RuntimeException(
                    "Falha na integração Asaas: " + ex.getStatusCode() + " - " + ex.getResponseBodyAsString(),
                    ex
            );
        }
    }

    private String readString(Object value) {
        return value != null ? value.toString() : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
