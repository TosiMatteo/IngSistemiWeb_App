package com.example.ingsistemiweb_app.controller;

import com.example.ingsistemiweb_app.dto.PrenotazioneRequest;
import com.example.ingsistemiweb_app.dto.PrenotazioneType;
import com.example.ingsistemiweb_app.model.Prenotazione;
import com.example.ingsistemiweb_app.service.PrenotazioneService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.SortDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/**
 * Controller RESTful per la gestione delle prenotazioni da parte dei professori.
 * Questo controller espone endpoint API che permettono ai professori di:
 * - Creare nuove prenotazioni per intere aule.
 * - Visualizzare le proprie prenotazioni di aule.
 * - Annullare le proprie prenotazioni attive di aule.
 * Le prenotazioni dei professori sono considerate come occupazione dell'intera aula.
 * Vengono rispettati i vincoli specifici dei professori riguardo tempi e disponibilità.
 */
@RestController
@RequestMapping("/api/professore")
public class ProfessoreController {

    @Autowired
    private PrenotazioneService prenotazioneService;

    /**
     * Permette a un professore di prenotare un'intera aula.
     * La prenotazione fallisce se ci sono prenotazioni attive (di studenti o altri professori)
     * che si sovrappongono all'intervallo richiesto.
     *
     * @param request Oggetto PrenotazioneRequest contenente i dettagli della prenotazione.
     * @param principal L'utente autenticato (professore).
     * @return ResponseEntity con un messaggio di successo o errore.
     */
    @PostMapping("/prenotazioni")
    public ResponseEntity<String> prenotaAulaProfessore(
            @RequestBody PrenotazioneRequest request,
            Principal principal) {
        try {
            // Delega la logica al servizio, specificando il tipo di prenotazione
            String successMessage = prenotazioneService.creaPrenotazione(request, principal.getName(), PrenotazioneType.PROFESSORE_FULL_ROOM);
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
    public Page<Prenotazione> getPrenotazioniProfessore(
            Principal principal,
            @RequestParam(name = "stato", defaultValue = "tutte") String stato,
            // Aggiungi la stessa annotazione anche qui
            @SortDefault(sort = "inizio", direction = Sort.Direction.DESC) Pageable pageable) {

        // Il resto del metodo rimane invariato
        return prenotazioneService.getPrenotazioniUtente(principal.getName(), stato, pageable);
    }

    /**
     * Permette a un professore di annullare una propria prenotazione di aula.
     * Delega la logica al PrenotazioneProfessoreService.
     *
     * @param id L'ID della prenotazione da annullare.
     * @param principal L'utente autenticato (professore).
     * @return ResponseEntity con un messaggio di successo o errore.
     */
    @PostMapping("/prenotazioni/{id}/termina")
    public ResponseEntity<String> terminaPrenotazioneProfessore(
            @PathVariable Long id,
            Principal principal) {
        try {
            // Delega la logica al servizio
            String successMessage = prenotazioneService.terminaPrenotazione(id, principal.getName());
            return ResponseEntity.ok(successMessage);
        } catch (UsernameNotFoundException e) {
            // L'utente autenticato non è stato trovato (situazione insolita ma gestita)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utente autenticato non trovato.");
        } catch (IllegalArgumentException e) {
            // Errore di validazione o logica di business (es. Prenotazione non tua, già terminata)
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            // Errore generico (es. Prenotazione non trovata)
            // Puoi differenziare meglio le eccezioni nel servizio se vuoi status code diversi
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore interno del server: " + e.getMessage());
        }
    }

}