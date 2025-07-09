package com.example.ingsistemiweb_app.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Servizio responsabile della gestione e archiviazione dei file caricati dagli utenti.
 * Fornisce funzionalità per inizializzare la directory di archiviazione e salvare i file
 * con nomi univoci per evitare conflitti.
 */
@Service
public class FileStorageService {

    /**
     * Percorso della directory root dove vengono memorizzati i file delle immagini.
     * I file salvati in questa directory saranno accessibili pubblicamente tramite il web server.
     */
    private final Path root = Paths.get("src/main/resources/static/images");

    /**
     * Inizializza la directory di archiviazione dei file.
     * Questo metodo dovrebbe essere chiamato all'avvio dell'applicazione per assicurarsi
     * che la directory esista prima che vengano effettuati i caricamenti.
     * 
     * @throws RuntimeException se non è possibile creare la directory
     */
    public void init() {
        try {
            // Crea la directory se non esiste già
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize folder for upload!");
        }
    }

    /**
     * Salva un file caricato nella directory di archiviazione con un nome univoco.
     * 
     * Il metodo esegue le seguenti operazioni:
     * 1. Estrae l'estensione dal nome file originale
     * 2. Genera un nome file univoco utilizzando UUID per evitare conflitti
     * 3. Salva il file nella directory di archiviazione
     * 4. Restituisce il percorso relativo del file per l'accesso web
     * 
     * @param file Il file caricato come MultipartFile (da form o API)
     * @return Il percorso relativo del file salvato, utilizzabile direttamente nelle URL dell'applicazione
     * @throws RuntimeException se il salvataggio del file fallisce per qualsiasi motivo
     */
    public String save(MultipartFile file) {
        try {
            // Genera un nome file univoco per evitare conflitti
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String newFilename = UUID.randomUUID().toString() + fileExtension;

            // Salva il file nella directory root usando il nuovo nome generato
            Files.copy(file.getInputStream(), this.root.resolve(newFilename));

            // Restituisce il percorso web accessibile relativo alla root del web server
            return "/images/" + newFilename;
        } catch (Exception e) {
            throw new RuntimeException("Could not store the file. Error: " + e.getMessage());
        }
    }
}
