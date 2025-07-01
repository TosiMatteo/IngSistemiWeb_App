package com.example.ingsistemiweb_app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class IngSistemiWebAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(IngSistemiWebAppApplication.class, args);
    }

}
