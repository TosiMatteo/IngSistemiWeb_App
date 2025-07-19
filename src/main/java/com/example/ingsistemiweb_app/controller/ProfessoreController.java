package com.example.ingsistemiweb_app.controller;

import com.example.ingsistemiweb_app.dto.PrenotazioneRequestDTO;
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
     * Permette a un professore di prenotare un'intera aula per un determinato periodo.
     * La prenotazione fallisce se ci sono prenotazioni attive (di studenti o altri professori)
     * che si sovrappongono all'intervallo richiesto. Questo endpoint gestisce la creazione
     * di prenotazioni di tipo PROFESSORE_FULL_ROOM, che occupano tutti i posti dell'aula.
     *
     * @param request Oggetto PrenotazioneRequestDTO contenente i dettagli della prenotazione (aula, orario di inizio e fine).
     * @param principal L'oggetto `Principal` che rappresenta l'utente autenticato (professore).
     * @return ResponseEntity con un messaggio di successo o un messaggio di errore appropriato.
     * @throws UsernameNotFoundException Se l'utente autenticato non viene trovato nel sistema.
     * @throws IllegalArgumentException Se ci sono errori di validazione (es. aula non disponibile).
     * @throws Exception Per altri errori generici durante il processo di prenotazione.
     */
    @PostMapping("/prenotazioni")
    public ResponseEntity<String> prenotaAulaProfessore(
            @RequestBody PrenotazioneRequestDTO request,
            Principal principal) {
        try {
            // Delega la logica al servizio, specificando il tipo di prenotazione come PROFESSORE_FULL_ROOM
            // che indica la prenotazione dell'intera aula da parte di un professore
            String successMessage = prenotazioneService.creaPrenotazione(request, principal.getName(), PrenotazioneType.PROFESSORE_FULL_ROOM);
            return ResponseEntity.ok(successMessage); // 200 OK con messaggio di successo
        } catch (UsernameNotFoundException e) {
            // L'utente autenticato non è stato trovato nel sistema
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Errore di autenticazione: " + e.getMessage()); // 401 Unauthorized
        } catch (IllegalArgumentException e) {
            // Errori di validazione (es. aula non disponibile, orari non validi, sovrapposizioni)
            return ResponseEntity.badRequest().body(e.getMessage()); // 400 Bad Request
        } catch (Exception e) {
            // Errori generici non previsti (es. problemi di database, errori di sistema)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Si è verificato un errore interno: " + e.getMessage()); // 500 Internal Server Error
        }
    }

    /**
     * Recupera tutte le prenotazioni del professore autenticato.
     * Mappa le richieste GET a "/api/professore/prenotazioni".
     *
     * @param principal Oggetto `Principal` contenente l'identità dell'utente autenticato (professore).
     * @param stato Parametro opzionale per filtrare le prenotazioni per stato ("attive", "terminate", "tutte").
     * @param pageable Oggetto per la paginazione e l'ordinamento dei risultati.
     * @return Una pagina di oggetti `Prenotazione` appartenenti al professore corrente, ordinate per data/ora di inizio in ordine decrescente.
     */
    @GetMapping("/prenotazioni")
    public Page<Prenotazione> getPrenotazioniProfessore(
            Principal principal,
            @RequestParam(name = "stato", defaultValue = "tutte") String stato,
            @SortDefault(sort = "inizio", direction = Sort.Direction.DESC) Pageable pageable) {

        // Delega al servizio la logica di recupero delle prenotazioni
        return prenotazioneService.getPrenotazioniUtente(principal.getName(), stato, pageable);
    }

    /**
     * Permette a un professore di annullare (terminare) una propria prenotazione di aula.
     * Questo endpoint verifica che la prenotazione esista, appartenga al professore autenticato,
     * e sia in uno stato che ne permetta la terminazione. La logica di business è delegata
     * al PrenotazioneService.
     *
     * @param id L'ID della prenotazione da annullare.
     * @param principal L'oggetto `Principal` che rappresenta l'utente autenticato (professore).
     * @return ResponseEntity con un messaggio di successo o un messaggio di errore appropriato.
     */
    @PostMapping("/prenotazioni/{id}/termina")
    public ResponseEntity<String> terminaPrenotazioneProfessore(
            @PathVariable Long id,
            Principal principal) {
        try {
            // Delega la logica al servizio, passando l'ID della prenotazione e l'email del professore
            String successMessage = prenotazioneService.terminaPrenotazione(id, principal.getName());
            return ResponseEntity.ok(successMessage); // 200 OK con messaggio di successo
        } catch (UsernameNotFoundException e) {
            // L'utente autenticato non è stato trovato nel sistema (situazione rara ma possibile)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utente autenticato non trovato."); // 401 Unauthorized
        } catch (IllegalArgumentException e) {
            // Errori di validazione o logica di business (es. prenotazione non appartiene all'utente, 
            // prenotazione già terminata, ecc.)
            return ResponseEntity.badRequest().body(e.getMessage()); // 400 Bad Request
        } catch (RuntimeException e) {
            // Altri errori di runtime (es. problemi di database, errori interni)
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore interno del server: " + e.getMessage()); // 500 Internal Server Error
        }
    }

}
