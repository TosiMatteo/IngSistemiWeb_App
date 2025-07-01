package com.example.ingsistemiweb_app.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
public class Annuncio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String titolo; // Titolo breve dell'annuncio

    @Column(nullable = false, length = 1000)
    private String contenuto; // Testo completo dell'annuncio

    @Column(nullable = false)
    private LocalDateTime dataPubblicazione; // Quando è stato pubblicato

    private boolean attivo = true; // Se l'annuncio è attualmente visibile

    @ManyToOne
    @JoinColumn(name = "utente_id")
    @JsonManagedReference // Previene la serializzazione circolare
    private User amministratore;

    @PrePersist
    protected void onCreate() {
        dataPubblicazione = LocalDateTime.now();
    }
}