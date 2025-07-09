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
 * Controller RESTful per le operazioni di amministrazione.
 * Funge da "sportello" per le richieste provenienti dall'interfaccia web dell'amministratore,
 * delegando la logica di business ai servizi specializzati.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    // --- DIPENDENZE INIETTATE ---
    // Spring inietta automaticamente le istanze dei servizi e repository necessari.

    @Autowired
    private PrenotazioneRepository prenotazioneRepository; // Accesso diretto all'archivio prenotazioni per query semplici.

    @Autowired
    private PrenotazioneService prenotazioneService; // Servizio con le regole di business per le prenotazioni.

    @Autowired
    private AdminUserService adminUserService; // Servizio per la gestione degli utenti.


    // --- ENDPOINT GESTIONE PRENOTAZIONI ---

    /**
     * Recupera le prenotazioni per un'aula e una data specifiche.
     * @param aulaId ID dell'aula.
     * @param data Data di interesse (formato YYYY-MM-DD).
     * @return Lista delle prenotazioni trovate.
     */
    @GetMapping("/prenotazioni")
    public List<Prenotazione> getPrenotazioniByAulaAndDate(
            @RequestParam Long aulaId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {

        LocalDateTime startOfDay = data.atStartOfDay();
        LocalDateTime endOfDay = data.plusDays(1).atStartOfDay();

        // Query diretta al repository per una semplice operazione di lettura.
        return prenotazioneRepository.findByAulaIdAndInizioBetween(aulaId, startOfDay, endOfDay);
    }

    /**
     * Termina una prenotazione esistente. Operazione riservata agli amministratori.
     * @param id ID della prenotazione da terminare.
     * @param principal Oggetto che rappresenta l'utente autenticato (l'admin).
     * @return ResponseEntity con un messaggio di successo o di errore.
     */
    @PostMapping("/prenotazioni/{id}/termina")
    public ResponseEntity<String> terminaPrenotazioneAdmin(@PathVariable Long id, Principal principal) {
        try {
            // Delega tutta la logica (validazioni, permessi, etc.) al servizio specializzato.
            String successMessage = prenotazioneService.terminaPrenotazione(id, principal.getName());
            return ResponseEntity.ok(successMessage);
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utente non trovato.");
        } catch (IllegalArgumentException e) {
            // Errore di validazione (es. prenotazione già terminata).
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            // Altri errori (es. prenotazione non esistente).
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }


    // --- ENDPOINT GESTIONE UTENTI ---

    /**
     * Fornisce un elenco paginato e filtrabile di tutti gli utenti.
     * @param ruolo Filtro opzionale per ruolo (STUDENTE, PROFESSORE).
     * @param searchTerm Filtro opzionale per cercare per nome, cognome o email.
     * @param pageable Oggetto per la paginazione e l'ordinamento.
     * @return Una "pagina" di utenti che corrispondono ai criteri.
     */
    @GetMapping("/users")
    public Page<User> getAllUsers(
            @RequestParam(required = false) String ruolo,
            @RequestParam(required = false) String searchTerm,
            @SortDefault(sort = "id", direction = Sort.Direction.ASC) Pageable pageable) {
        return adminUserService.findUsers(ruolo, searchTerm, pageable);
    }

    /**
     * Aggiorna i dati di un utente specifico.
     * @param id L'ID dell'utente da modificare.
     * @param userData DTO (Data Transfer Object) con i nuovi dati.
     * @return L'utente aggiornato.
     */
    @PutMapping("/users/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody AdminUserUpdateDTO userData) {
        try {
            User updatedUser = adminUserService.updateUser(id, userData);
            return ResponseEntity.ok(updatedUser);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    /**
     * Elimina un utente dal sistema.
     * @param id L'ID dell'utente da eliminare.
     * @return Risposta vuota con stato 204 No Content se l'operazione ha successo.
     */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        try {
            adminUserService.deleteUser(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}