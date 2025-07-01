package com.example.ingsistemiweb_app.dto;


import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class EmailRequest {
    private String to;
    private String subject;
    private String text;
}
