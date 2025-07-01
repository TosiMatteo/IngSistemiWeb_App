package com.example.ingsistemiweb_app.dto;

import lombok.Data;

@Data
public class AdminUserUpdateDTO {
    private String nome;
    private String cognome;
    private String email;
    private String password; // Sarà vuoto o null se la password non viene cambiata
}
