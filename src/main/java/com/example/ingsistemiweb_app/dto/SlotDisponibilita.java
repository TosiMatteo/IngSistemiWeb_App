package com.example.ingsistemiweb_app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO per rappresentare uno slot di disponibilità
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SlotDisponibilita {
    private String inizio;  // Timestamp ISO-8601
    private String fine;     // Timestamp ISO-8601
    private int liberi;      // Posti disponibili nello slot
}
