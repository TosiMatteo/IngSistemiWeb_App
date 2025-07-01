package com.example.ingsistemiweb_app.service.impl;

import com.example.ingsistemiweb_app.service.EmailSenderService;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EmailSenderServiceImpl implements EmailSenderService {

    private final JavaMailSender javaMailSender;
    // L'email del mittente dovrebbe essere configurata in application.properties
    // o iniettata tramite @Value per maggiore flessibilità.
    // Per ora, la lasciamo hardcoded come nel tuo esempio, ma è consigliabile migliorarla.
    private final String senderEmail = "matteo03.tosi@edu.unife.it";

    public EmailSenderServiceImpl(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    @Override
    public void sendEmail(String to, String subject, String text) {
        // Implementazione per singolo destinatario (già presente)
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        try {
            this.javaMailSender.send(message);
            System.out.println("Email inviata a " + to + " con oggetto: " + subject);
        } catch (MailException e) {
            System.err.println("Errore nell'invio dell'email a " + to + ": " + e.getMessage());
        }
    }

    @Override
    public void sendEmail(List<String> toList, String subject, String text) {
        if (toList == null || toList.isEmpty()) {
            System.out.println("Nessun destinatario specificato per l'email: " + subject);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setSubject(subject);
        message.setText(text);

        // Converti la lista di email in un array per BCC
        String[] recipientsArray = toList.toArray(new String[0]);
        message.setBcc(recipientsArray); // Usa BCC per non mostrare gli indirizzi a tutti i destinatari

        try {
            this.javaMailSender.send(message);
            System.out.println("Email inviata a " + toList.size() + " destinatari (BCC) con oggetto: " + subject);
        } catch (MailException e) {
            System.err.println("Errore nell'invio dell'email (BCC) con oggetto '" + subject + "': " + e.getMessage());
        }
    }
}
