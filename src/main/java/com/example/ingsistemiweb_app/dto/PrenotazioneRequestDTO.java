package com.example.ingsistemiweb_app.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * DTO per la richiesta di prenotazione.
 * Mappa il payload JSON in un oggetto Java.
 */

@Setter
@Getter
public class PrenotazioneRequestDTO {
    private Long aulaId;       // ID dell'aula da prenotare
    private String inizio;     // Timestamp ISO-8601 dell'inizio
    private String fine;       // Timestamp ISO-8601 della fine
}
