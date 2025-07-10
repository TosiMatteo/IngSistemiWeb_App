package com.example.ingsistemiweb_app.service;

import java.util.List;

/**
 * Interfaccia per il servizio di invio email all'interno dell'applicazione.
 * Fornisce metodi per inviare email sia a singoli destinatari che a liste di destinatari.
 */
public interface EmailSenderService {
    /**
     * Invia un'email a un singolo destinatario.
     * 
     * @param to      Indirizzo email del destinatario
     * @param subject Oggetto dell'email
     * @param text    Corpo del messaggio dell'email
     */
    void sendEmail(String to, String subject, String text);

    /**
     * Invia un'email a più destinatari contemporaneamente.
     * 
     * @param toList  Lista di indirizzi email dei destinatari
     * @param subject Oggetto dell'email
     * @param text    Corpo del messaggio dell'email
     */
    void sendEmail(List<String> toList, String subject, String text);
}
