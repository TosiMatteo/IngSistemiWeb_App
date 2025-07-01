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

@RestController
@RequestMapping("/api/annunci")
public class AnnuncioController {

    @Autowired
    private AnnuncioService annuncioService;

    // Endpoint per gli amministratori: creazione di un nuovo annuncio
    @PostMapping
    @PreAuthorize("hasRole('AMMINISTRATORE')")
    public ResponseEntity<Annuncio> creaAnnuncio(@RequestBody Map<String, Object> payload, Authentication authentication) {
        try {
            String titolo = (String) payload.get("titolo");
            String contenuto = (String) payload.get("contenuto");

            // --- Controlli di validazione ---
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
            // --- Fine controlli di validazione ---

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


    // Endpoint per gli amministratori: aggiornamento di un annuncio esistente
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('AMMINISTRATORE')")
    public ResponseEntity<Annuncio> aggiornaAnnuncio(@PathVariable Long id, @RequestBody Map<String, Object> payload, Authentication authentication) {
        try {
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

    // Endpoint per gli amministratori: disattivazione di un annuncio
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

    // Endpoint per tutti gli utenti (anche non autenticati): ottenere annunci attivi
    @GetMapping("/attivi")
    public ResponseEntity<List<Annuncio>> getAnnunciAttivi() {
        List<Annuncio> annunci = annuncioService.getAnnunciAttivi();
        return ResponseEntity.ok(annunci);
    }

    // Endpoint per gli amministratori: ottenere tutti gli annunci (anche non attivi)
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('AMMINISTRATORE')")
    public ResponseEntity<List<Annuncio>> getAllAnnunciForAdmin(Authentication authentication) {
        List<Annuncio> annunci = annuncioService.getAllAnnunciForAdmin(authentication.getName());
        return ResponseEntity.ok(annunci);
    }

    // Endpoint per recuperare un singolo annuncio per l'admin
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

    // Endpoint per gli amministratori: eliminare un annuncio
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