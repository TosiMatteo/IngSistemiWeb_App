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

    /**
     * Elimina un file dalla directory di archiviazione.
     * * @param imageUrl Il percorso web dell'immagine da eliminare (es. /images/nomefile.jpg)
     */
    public void delete(String imageUrl) {
        // Se l'URL dell'immagine non è valido o è nullo, non fare nulla.
        if (imageUrl == null || imageUrl.isEmpty() || !imageUrl.startsWith("/images/")) {
            return;
        }

        try {
            // Estrai il nome del file dal percorso web
            String filename = imageUrl.substring("/images/".length());
            // Costruisci il percorso completo del file sul disco
            Path filePath = root.resolve(filename);

            // Elimina il file se esiste, senza lanciare errori se non viene trovato.
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Logga un avviso invece di bloccare l'operazione.
            // La mancata eliminazione di un file non dovrebbe impedire la cancellazione dei dati dal DB.
            System.err.println("Impossibile eliminare il file immagine: " + imageUrl + ". Errore: " + e.getMessage());
        }
    }
}
