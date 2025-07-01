package com.example.ingsistemiweb_app.controller;

import com.example.ingsistemiweb_app.dto.EmailRequest; // Data Transfer Object per la richiesta email
import com.example.ingsistemiweb_app.service.EmailSenderService; // Servizio per l'invio effettivo delle email
import org.springframework.http.ResponseEntity; // Utilizzato per costruire risposte HTTP
import org.springframework.web.bind.annotation.PostMapping; // Annota un metodo come gestore di richieste POST
import org.springframework.web.bind.annotation.RequestBody; // Annota un parametro per bindare il corpo della richiesta
import org.springframework.web.bind.annotation.RestController; // Combina @Controller e @ResponseBody

/**
 * Controller RESTful per la gestione delle operazioni di invio email.
 * Fornisce un endpoint API per inviare email tramite il servizio `EmailSenderService`.
 */
@RestController // Indica a Spring che questa classe è un controller REST, implicando che i metodi restituiranno direttamente dati (JSON/XML) invece di nomi di vista.
public class EmailController {

    // Iniezione della dipendenza per il servizio di invio email.
    // L'uso di `final` con l'iniezione tramite costruttore è una best practice.
    private final EmailSenderService emailSenderService;

    /**
     * Costruttore per l'iniezione del servizio EmailSenderService.
     * @param emailSenderService Il servizio per inviare email.
     */
    public EmailController(EmailSenderService emailSenderService) {
        this.emailSenderService = emailSenderService;
    }

    /**
     * Gestisce le richieste POST all'endpoint "/send-email".
     * Riceve un oggetto `EmailRequest` dal corpo della richiesta HTTP (presumibilmente JSON).
     * Delega l'invio effettivo dell'email al `EmailSenderService`.
     *
     * @param request Oggetto `EmailRequest` contenente destinatario, oggetto e corpo dell'email.
     * @return `ResponseEntity<String>` che indica il successo o il fallimento dell'operazione.
     */
    @PostMapping("/send-email") // Mappa le richieste POST a "/send-email".
    public ResponseEntity<String> sendEmail(@RequestBody EmailRequest request) {
        // Chiama il metodo `sendEmail` del servizio, passando i dati dalla richiesta.
        emailSenderService.sendEmail(
                request.getTo(),     // Indirizzo email del destinatario.
                request.getSubject(),// Oggetto dell'email.
                request.getText()    // Corpo dell'email.
        );
        // Restituisce una risposta HTTP 200 OK con un messaggio di successo.
        return ResponseEntity.ok("Email inviata con successo.");
    }
}