package com.example.ingsistemiweb_app.controller;

import com.example.ingsistemiweb_app.dto.AdminUserUpdateDTO;
import com.example.ingsistemiweb_app.model.Prenotazione;
import com.example.ingsistemiweb_app.model.User;
import com.example.ingsistemiweb_app.repository.PrenotazioneRepository;
import com.example.ingsistemiweb_app.service.AdminUserService;
import com.example.ingsistemiweb_app.service.PrenotazioneService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.SortDefault;
import org.springframework.format.annotation.DateTimeFormat; // Per formattare parametri data
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity; // Per risposte HTTP personalizzate
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*; // Annota per definire controller REST e mapping richieste

import java.security.Principal;
import java.time.LocalDate; // Per gestire solo la data
import java.time.LocalDateTime; // Per gestire data e ora
import java.util.List; // Utilizzato per liste di oggetti

/**
 * Controller RESTful per la gestione amministrativa delle prenotazioni.
 * Questo controller è dedicato alle operazioni che gli amministratori possono eseguire sulle prenotazioni.
 * Fornisce endpoint per:
 * - Visualizzare le prenotazioni filtrate per aula e data.
 * - Terminare una prenotazione (operazione di controllo amministrativo).
 */
@RestController // Indica a Spring che questa classe è un controller RESTful, i cui metodi restituiscono direttamente il corpo della risposta (solitamente JSON).
@RequestMapping("/api/admin") // Mappa tutte le richieste che iniziano con "/api/admin" a questo controller.
public class AdminController {

    @Autowired // Inietta l'istanza di PrenotazioneRepository per interagire con il database delle prenotazioni.
    private PrenotazioneRepository prenotazioneRepository;

    @Autowired
    private PrenotazioneService prenotazioneService;

    @Autowired
    private AdminUserService adminUserService;

    /**
     * Recupera le prenotazioni di un'aula specifica per una determinata data.
     * Mappa le richieste GET a "/admin/prenotazioni".
     *
     * @param aulaId L'ID dell'aula per cui filtrare le prenotazioni (obbligatorio).
     * @param data La data di interesse nel formato ISO (YYYY-MM-DD), estratta dai parametri della richiesta (obbligatorio).
     * `@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)` assicura il corretto parsing della stringa data.
     * @return Una lista di oggetti `Prenotazione` (sia attive che non attive) per l'aula specificata e all'interno dell'intervallo di tempo della data fornita.
     * @apiNote L'endpoint considera l'intera giornata (dalle 00:00:00 del giorno `data` alle 23:59:59 del giorno `data`).
     * @example GET /admin/prenotazioni?aulaId=1&data=2023-06-15
     */
    @GetMapping("/prenotazioni") // Mappa le richieste GET a "/admin/prenotazioni".
    public List<Prenotazione> getPrenotazioniByAulaAndDate(
            @RequestParam Long aulaId, // Ottiene l'ID dell'aula dal parametro di query "aulaId".
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data // Ottiene la data dal parametro "data" e la converte in LocalDate.
    ) {
        // Calcola l'inizio della giornata (00:00:00) per la data specificata.
        LocalDateTime startOfDay = data.atStartOfDay();
        // Calcola l'inizio del giorno successivo (00:00:00) per definire la fine dell'intervallo.
        // Questo approccio è comune per includere tutti gli eventi di una singola giornata.
        LocalDateTime endOfDay = data.plusDays(1).atStartOfDay();

        // Esegue una query al repository per trovare tutte le prenotazioni relative all'aula specificata
        // che iniziano all'interno dell'intervallo temporale definito.
        return prenotazioneRepository.findByAulaIdAndInizioBetween(aulaId, startOfDay, endOfDay);
    }

    /**
     * Termina una prenotazione specifica. Questa operazione è riservata agli amministratori.
     * Delega la logica di business e le validazioni al PrenotazioneService.
     *
     * @param id L'ID della prenotazione da terminare.
     * @param principal L'utente autenticato che esegue l'azione (dovrebbe essere un ADMIN).
     * @return `ResponseEntity<String>` con il risultato dell'operazione.
     */
    @PostMapping("/prenotazioni/{id}/termina")
    public ResponseEntity<String> terminaPrenotazioneAdmin(
            @PathVariable Long id,
            Principal principal) {
        try {
            // Chiama il metodo generico del servizio, passando l'ID della prenotazione
            // e l'email dell'utente autenticato (che qui sarà l'Admin).
            String successMessage = prenotazioneService.terminaPrenotazione(id, principal.getName());
            return ResponseEntity.ok(successMessage); // 200 OK
        } catch (UsernameNotFoundException e) {
            // Questo caso è improbabile per l'Admin già autenticato, ma gestito
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utente autenticato non trovato."); // 401 Unauthorized
        } catch (IllegalArgumentException e) {
            // Cattura eccezioni di validazione dal servizio (es. Prenotazione non attiva, permessi)
            return ResponseEntity.badRequest().body(e.getMessage()); // 400 Bad Request
        } catch (RuntimeException e) {
            // Cattura altre RuntimeException, es. "Prenotazione non trovata"
            if (e.getMessage().contains("Prenotazione non trovata")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage()); // 404 Not Found
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore interno del server: " + e.getMessage()); // 500 Internal Server Error
        }
    }

    // Endpoint per ottenere gli utenti
    @GetMapping("/users")
    public Page<User> getAllUsers(
            @RequestParam(required = false) String ruolo,
            @RequestParam(required = false) String searchTerm,
            @SortDefault(sort = "id", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return adminUserService.findUsers(ruolo, searchTerm, pageable);
    }

    // Endpoint per aggiornare un utente
    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody AdminUserUpdateDTO userData) {
        try {
            User updatedUser = adminUserService.updateUser(id, userData);
            return ResponseEntity.ok(updatedUser);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(null); // O un messaggio di errore più specifico
        }
    }

    // Endpoint per eliminare un utente
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        try {
            adminUserService.deleteUser(id);
            return ResponseEntity.noContent().build(); // 204 No Content
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

}