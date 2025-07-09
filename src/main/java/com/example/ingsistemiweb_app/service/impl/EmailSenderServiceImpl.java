package com.example.ingsistemiweb_app.service.impl;

import com.example.ingsistemiweb_app.service.EmailSenderService;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Implementazione del servizio di invio email utilizzando JavaMailSender di Spring.
 * Questa classe si occupa di gestire l'invio di email sia a destinatari singoli
 * che a gruppi di destinatari, con gestione degli errori e logging appropriato.
 */
@Service
public class EmailSenderServiceImpl implements EmailSenderService {

    private final JavaMailSender javaMailSender;
    // Email del mittente
    private final String senderEmail = "matteo03.tosi@edu.unife.it";

    /**
     * Costruttore che inizializza il servizio con un'istanza di JavaMailSender.
     * 
     * @param javaMailSender Il componente Spring per l'invio di email
     */
    public EmailSenderServiceImpl(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    /**
     * Invia un'email a un singolo destinatario.
     * Il metodo configura un messaggio semplice con mittente, destinatario, oggetto e testo,
     * poi tenta di inviarlo tramite il JavaMailSender.
     * 
     * @param to      Indirizzo email del destinatario
     * @param subject Oggetto dell'email
     * @param text    Corpo del messaggio dell'email
     */
    @Override
    public void sendEmail(String to, String subject, String text) {
        // Crea un nuovo messaggio email semplice
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        try {
            // Tentativo di invio del messaggio
            this.javaMailSender.send(message);
            System.out.println("Email inviata a " + to + " con oggetto: " + subject);
        } catch (MailException e) {
            // Gestione delle eccezioni durante l'invio
            System.err.println("Errore nell'invio dell'email a " + to + ": " + e.getMessage());
        }
    }

    /**
     * Invia un'email a più destinatari contemporaneamente utilizzando il campo BCC.
     * Il metodo verifica prima che la lista di destinatari non sia vuota, configura un messaggio
     * con tutti i destinatari in BCC (Blind Carbon Copy) per privacy, poi tenta di inviarlo.
     * 
     * @param toList  Lista di indirizzi email dei destinatari
     * @param subject Oggetto dell'email
     * @param text    Corpo del messaggio dell'email
     */
    @Override
    public void sendEmail(List<String> toList, String subject, String text) {
        // Verifica che ci siano destinatari validi
        if (toList == null || toList.isEmpty()) {
            System.out.println("Nessun destinatario specificato per l'email: " + subject);
            return;
        }

        // Crea un nuovo messaggio email
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderEmail);
        message.setSubject(subject);
        message.setText(text);

        // Converti la lista di email in un array per BCC
        String[] recipientsArray = toList.toArray(new String[0]);
        message.setBcc(recipientsArray); // Usa BCC per non mostrare gli indirizzi a tutti i destinatari

        try {
            // Tentativo di invio del messaggio a tutti i destinatari
            this.javaMailSender.send(message);
            System.out.println("Email inviata a " + toList.size() + " destinatari (BCC) con oggetto: " + subject);
        } catch (MailException e) {
            // Gestione delle eccezioni durante l'invio
            System.err.println("Errore nell'invio dell'email (BCC) con oggetto '" + subject + "': " + e.getMessage());
        }
    }
}
