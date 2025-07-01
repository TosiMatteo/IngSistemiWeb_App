package com.example.ingsistemiweb_app.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
public class Prenotazione {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private boolean attiva = true;

    @Column(length = 1000)
    private String recensione;

    @Column
    private int numeroPostiPrenotati;

    @Column(nullable = false)
    private boolean checkedIn = false;


    @ManyToOne
    @JoinColumn(name = "utente_id")
    @JsonManagedReference // Previene la serializzazione circolare
    private User utente;

    @ManyToOne
    @JoinColumn(name = "aula_id")
    @JsonManagedReference
    private Aula aula;
    private LocalDateTime inizio;
    private LocalDateTime fine;
}