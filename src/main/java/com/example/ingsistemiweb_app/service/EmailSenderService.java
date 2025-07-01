package com.example.ingsistemiweb_app.service;

import java.util.List;

public interface EmailSenderService {
    void sendEmail(String to, String subject, String text);
    void sendEmail(List<String> toList, String subject, String text);
}
