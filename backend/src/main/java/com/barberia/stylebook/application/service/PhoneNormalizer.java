package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;

public final class PhoneNormalizer {
    private PhoneNormalizer() {
    }

    public static String normalize(String rawPhone) {
        String value = rawPhone == null ? "" : rawPhone.trim();
        String digits = value.replaceAll("\\D", "");
        if (digits.length() < 8 || digits.length() > 15) {
            throw new BusinessRuleException("Telefono invalido (entre 8 y 15 digitos)");
        }
        return digits;
    }
}
