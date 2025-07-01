package com.example.ingsistemiweb_app.controller;

import com.example.ingsistemiweb_app.dto.PrenotazioneRequest; // DTO per i dati in input della richiesta di prenotazione
// DTO per i dati in output degli slot di disponibilità
import com.example.ingsistemiweb_app.dto.PrenotazioneType;
import com.example.ingsistemiweb_app.model.Prenotazione;
import com.example.ingsistemiweb_app.repository.PrenotazioneRepository;
import com.example.ingsistemiweb_app.service.PrenotazioneService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.SortDefault;
import org.springframework.http.HttpStatus; // Enum per gli stati HTTP
import org.springframework.http.ResponseEntity; // Wrapper per risposte HTTP complete
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*; // Annota per definire controller REST e mapping richieste
import org.springframework.web.server.ResponseStatusException; // Per lanciare eccezioni con stato HTTP

import java.security.Principal; // Utilizzato per ottenere l'utente autenticato

/**
 * Controller RESTful per la gestione delle prenotazioni da parte degli studenti.
 * Questo controller espone endpoint API che permettono agli studenti di:
 * - Creare nuove prenotazioni per le aule.
 * - Visualizzare le proprie prenotazioni.
 * - Terminare le proprie prenotazioni attive.
 * - Verificare la disponibilità degli slot orari delle aule.
 * - Lasciare recensioni per le prenotazioni terminate.
 */
@RestController // Indica che questa classe è un controller RESTful.
@RequestMapping("/api/studente") // Mappa tutte le richieste che iniziano con "/api/studente" a questo controller.
public class StudenteController {

    // Dipendenze iniettate automaticamente da Spring.
    @Autowired
    private PrenotazioneRepository prenotazioneRepository;

    @Autowired
    private PrenotazioneService prenotazioneService;

    /**
     * Permette a uno studente di prenotare.
     * La prenotazione fallisce se ci sono prenotazioni attive (di studenti o altri professori)
     * che si sovrappongono all'intervallo richiesto.
     *
     * @param request Oggetto PrenotazioneRequest contenente i dettagli della prenotazione.
     * @param principal L'utente autenticato (studente).
     * @return ResponseEntity con un messaggio di successo o errore.
     */
    @PostMapping("/prenotazioni")
    public ResponseEntity<String> prenotaAula(
            @RequestBody PrenotazioneRequest request,
            Principal principal) {
        try {
            // Delega la logica al servizio, specificando il tipo di prenotazione
            String successMessage = prenotazioneService.creaPrenotazione(request, principal.getName(), PrenotazioneType.STUDENTE_SINGLE_SEAT);
            return ResponseEntity.ok(successMessage);
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Errore di autenticazione: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            // Errore generico, ad esempio problemi di database o di invio email
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Si è verificato un errore interno: " + e.getMessage());
        }
    }

    /**
     * Recupera tutte le prenotazioni dello studente autenticato.
     * Mappa le richieste GET a "/api/student/prenotazioni".
     *
     * @param principal Oggetto `Principal` contenente l'identità dell'utente autenticato.
     * @return Una lista di oggetti `Prenotazione` appartenenti allo studente corrente, ordinate (presumibilmente per data/ora di inizio).
     */
    @GetMapping("/prenotazioni")
    public Page<Prenotazione> getPrenotazioniStudente(
            Principal principal,
            @RequestParam(name = "stato", defaultValue = "tutte") String stato,
            // Aggiungi questa annotazione per impostare l'ordinamento di default
            @SortDefault(sort = "inizio", direction = Sort.Direction.DESC) Pageable pageable) {

        // Il resto del metodo rimane invariato
        return prenotazioneService.getPrenotazioniUtente(principal.getName(), stato, pageable);
    }

    /**
     * Termina una prenotazione attiva dello studente autenticato.
     * Delega la logica di business e le validazioni al PrenotazioneService.
     *
     * @param id L'ID della prenotazione da terminare.
     * @param principal L'oggetto `Principal` che rappresenta l'utente autenticato (studente).
     * @return `ResponseEntity<String>` con il risultato dell'operazione.
     */
    @PostMapping("/prenotazioni/{id}/termina")
    public ResponseEntity<String> terminaPrenotazione(
            @PathVariable Long id,
            Principal principal) {
        try {
            // Chiama il metodo generico del servizio, passando l'ID della prenotazione
            // e l'email dell'utente autenticato (che qui sarà lo Studente).
            String successMessage = prenotazioneService.terminaPrenotazione(id, principal.getName());
            return ResponseEntity.ok(successMessage); // 200 OK
        } catch (UsernameNotFoundException e) {
            // L'utente autenticato non è stato trovato (situazione insolita ma gestita)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utente autenticato non trovato."); // 401 Unauthorized
        } catch (IllegalArgumentException e) {
            // Cattura eccezioni di validazione dal servizio (es. prenotazione non tua, non attiva)
            return ResponseEntity.badRequest().body(e.getMessage()); // 400 Bad Request
        } catch (RuntimeException e) {
            // Cattura altre RuntimeException, es. "Prenotazione non trovata"
            if (e.getMessage().contains("Prenotazione non trovata")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage()); // 404 Not Found
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore interno del server: " + e.getMessage()); // 500 Internal Server Error
        }
    }



    /**
     * Permette a uno studente di lasciare una recensione per una propria prenotazione terminata.
     * Mappa le richieste POST a "/api/prenotazioni/{id}/recensione".
     * Include validazioni per assicurarsi che la prenotazione sia terminata, non sia già stata recensita
     * e appartenga all'utente che sta tentando di lasciare la recensione.
     *
     * @param id L'ID della prenotazione a cui allegare la recensione.
     * @param recensione Il testo della recensione, ricevuto come corpo della richiesta.
     * @param principal Oggetto `Principal` per l'autorizzazione.
     * @return `ResponseEntity<String>` con un messaggio di successo o errore.
     */
    @PostMapping("/prenotazioni/{id}/recensione") // Mappa le richieste POST per lasciare una recensione.
    public ResponseEntity<String> lasciaRecensione(
            @PathVariable Long id, // ID della prenotazione.
            @RequestBody String recensione, // Testo della recensione (corpo della richiesta).
            Principal principal) { // Utente autenticato.

        // 1. Cerca la prenotazione per ID, lancia 404 se non trovata.
        Prenotazione p = prenotazioneRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prenotazione non trovata"));

        // 2. Controllo di autorizzazione: verifica che l'utente autenticato sia il proprietario della prenotazione.
        if (!p.getUtente().getEmail().equals(principal.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Non sei autorizzato"); // 403 Forbidden.
        }

        // 3. Validazione dello stato: non si può recensire una prenotazione ancora attiva.
        if (p.isAttiva()) {
            return ResponseEntity.badRequest().body("Non puoi recensire una prenotazione attiva"); // 400 Bad Request.
        }

        // 4. Validazione: non si può recensire una prenotazione che ha già una recensione.
        if (p.getRecensione() != null) {
            return ResponseEntity.badRequest().body("Hai già lasciato una recensione"); // 400 Bad Request.
        }

        // 5. Imposta la recensione e la salva nel database.
        p.setRecensione(recensione.trim()); // Trim per rimuovere spazi bianchi inutili.
        prenotazioneRepository.save(p);
        return ResponseEntity.ok("Recensione salvata"); // 200 OK.
    }

    @PostMapping("/prenotazioni/{id}/check-in")
    public ResponseEntity<String> checkInPrenotazione(@PathVariable Long id, Principal principal) {
        try {
            String message = prenotazioneService.effettuaCheckIn(id, principal.getName());
            return ResponseEntity.ok(message);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
}