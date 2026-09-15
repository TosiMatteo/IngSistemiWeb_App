package com.example.ingsistemiweb_app.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload-dir}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Questo è il percorso fisico della cartella (configurabile con app.upload-dir).
        String uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize().toUri().toString();

        /**
         * Questa regola dice a Spring:
         * "Quando un browser chiede un file che inizia con /uploads/ (es. /uploads/foto.jpg),
         * cercalo nella cartella fisica specificata in uploadPath (es. ./uploads/foto.jpg)".
         */
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath);
    }
}