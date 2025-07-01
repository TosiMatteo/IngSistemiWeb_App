package com.example.ingsistemiweb_app.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true)
    private String email;
    private String password;
    private String nome;
    private String cognome;
    private String insegnamento;
    @Enumerated(EnumType.STRING)
    private UserRole ruolo;
}
