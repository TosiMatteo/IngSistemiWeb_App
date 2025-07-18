package com.example.ingsistemiweb_app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Questo è il percorso fisico della cartella.
        String uploadPath = "file:/home/matteo/Documents/ImmaginiAule/";

        /**
         * Questa regola dice a Spring:
         * "Quando un browser chiede un file che inizia con /uploads/ (es. /uploads/foto.jpg),
         * cercalo nella cartella fisica specificata in uploadPath (es. /home/matteo/Documents/ImmaginiAule/foto.jpg)".
         */
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadPath);
    }
}