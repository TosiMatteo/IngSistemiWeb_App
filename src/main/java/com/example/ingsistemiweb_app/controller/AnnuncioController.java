package com.example.ingsistemiweb_app.controller;

import com.example.ingsistemiweb_app.model.Annuncio;
import com.example.ingsistemiweb_app.service.AnnuncioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;


/**
 * Controller RESTful per la gestione degli annunci.
 * Funge da punto di ingresso per le richieste HTTP provenienti dall'interfaccia utente,
 * gestendo l'autenticazione e la validazione di base prima di delegare al servizio.
 */
@RestController
@RequestMapping("/api/annunci")
public class AnnuncioController {

    @Autowired
    private AnnuncioService annuncioService;

    /**
     * Endpoint per la creazione di un nuovo annuncio.
     * Accesso limitato ai soli amministratori tramite @PreAuthorize.
     */
    @PostMapping
    @PreAuthorize("hasRole('AMMINISTRATORE')")
    public ResponseEntity<Annuncio> creaAnnuncio(@RequestBody Map<String, Object> payload, Authentication authentication) {
        try {
            String titolo = (String) payload.get("titolo");
            String contenuto = (String) payload.get("contenuto");

            // Validazione preliminare dei dati in ingresso.
            if (titolo == null || titolo.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(null);
            }
            if (titolo.length() > 100) {
                return ResponseEntity.badRequest().body(null);
            }

            if (contenuto == null || contenuto.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(null);
            }
            if (contenuto.length() > 1000) {
                return ResponseEntity.badRequest().body(null);
            }
            // Fine controlli di validazione

            Annuncio nuovoAnnuncio = annuncioService.creaAnnuncio(titolo, contenuto, authentication.getName());
            return ResponseEntity.status(HttpStatus.CREATED).body(nuovoAnnuncio);

        } catch (IllegalArgumentException e) {
            // Questa eccezione dovrebbe essere lanciata dal servizio se, ad esempio,
            // l'utente autenticato non è un amministratore o altri errori specifici.
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            // Per qualsiasi altra eccezione imprevista
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    /**
     * Endpoint per l'aggiornamento di un annuncio esistente.
     * Accesso limitato ai soli amministratori.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('AMMINISTRATORE')")
    public ResponseEntity<Annuncio> aggiornaAnnuncio(@PathVariable Long id, @RequestBody Map<String, Object> payload, Authentication authentication) {
        try {
            // Estrae i dati dal payload, delega la logica di aggiornamento al servizio.
            String titolo = (String) payload.get("titolo");
            String contenuto = (String) payload.get("contenuto");
            Boolean attivo = (Boolean) payload.getOrDefault("attivo", true);

            Annuncio annuncioAggiornato = annuncioService.aggiornaAnnuncio(id, titolo, contenuto, attivo, authentication.getName());
            return ResponseEntity.ok(annuncioAggiornato);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Endpoint per la disattivazione (archiviazione) di un annuncio.
     * L'annuncio non viene eliminato, ma reso non visibile al pubblico.
     */
    @PostMapping("/{id}/disattiva")
    @PreAuthorize("hasRole('AMMINISTRATORE')")
    public ResponseEntity<?> disattivaAnnuncio(@PathVariable Long id, Authentication authentication) {
        try {
            annuncioService.disattivaAnnuncio(id, authentication.getName());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Endpoint pubblico per ottenere la lista degli annunci attivi.
     * Accessibile da chiunque, anche utenti non autenticati.
     */
    @GetMapping("/attivi")
    public ResponseEntity<List<Annuncio>> getAnnunciAttivi() {
        List<Annuncio> annunci = annuncioService.getAnnunciAttivi();
        return ResponseEntity.ok(annunci);
    }

    /**
     * Endpoint per gli amministratori per visualizzare tutti gli annunci, inclusi quelli non attivi.
     * Utile per la gestione e la revisione dell'archivio storico.
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('AMMINISTRATORE')")
    public ResponseEntity<List<Annuncio>> getAllAnnunciForAdmin(Authentication authentication) {
        List<Annuncio> annunci = annuncioService.getAllAnnunciForAdmin(authentication.getName());
        return ResponseEntity.ok(annunci);
    }

    /**
     * Endpoint per recuperare un singolo annuncio per la visualizzazione/modifica da parte dell'admin.
     */
    @GetMapping("/admin/{id}")
    @PreAuthorize("hasRole('AMMINISTRATORE')")
    public ResponseEntity<?> getAnnuncioByIdForAdmin(@PathVariable Long id) {
        try {
            Annuncio annuncio = annuncioService.getAnnuncioById(id) // Assumi che findById esista nel tuo service
                    .orElseThrow(() -> new IllegalArgumentException("Annuncio non trovato con ID: " + id));
            return ResponseEntity.ok(annuncio);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.singletonMap("error", "Errore durante il recupero dell'annuncio."));
        }
    }

    /**
     * Endpoint per l'eliminazione fisica di un annuncio.
     * Operazione distruttiva, riservata agli amministratori.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('AMMINISTRATORE')")
    public ResponseEntity<?> eliminaAnnuncio(@PathVariable Long id, Authentication authentication) {
        try {
            annuncioService.eliminaAnnuncio(id, authentication.getName());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}