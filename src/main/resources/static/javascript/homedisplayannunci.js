// homedisplayannunci.js

/**
 * Inizializza il modulo di visualizzazione degli annunci quando il DOM è completamente caricato.
 * Questo script gestisce il caricamento, la visualizzazione e l'interazione con gli annunci
 * nella homepage del sistema.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Riferimento al container HTML dove verranno visualizzati gli annunci
    const annunciContainer = document.getElementById("annunciContainer");

    /**
     * Carica gli annunci attivi dal server e li visualizza nell'interfaccia utente.
     * Gestisce anche la creazione degli elementi interattivi per ogni annuncio.
     * @returns {Promise<void>} Una promise che si risolve quando gli annunci sono stati caricati e visualizzati
     */
    async function loadAnnunci() {
        try {
            // Effettua una richiesta GET asincrona per ottenere gli annunci attivi
            const response = await axios.get('/api/annunci/attivi');
            const annunci = response.data;

            // Pulisce il contenitore dagli annunci precedenti
            annunciContainer.innerHTML = '';

            // Gestisce il caso in cui non ci siano annunci disponibili
            if (annunci.length === 0) {
                annunciContainer.innerHTML = '<p class="has-text-grey">Nessun annuncio disponibile al momento.</p>';
                return;
            }

            // Itera su ogni annuncio ricevuto dal server per crearne la rappresentazione HTML
            annunci.forEach(annuncio => {
                // Crea un nuovo elemento div per contenere l'annuncio
                const annuncioDiv = document.createElement('div');
                // Applica le classi CSS per lo stile dell'annuncio
                annuncioDiv.className = 'notification is-info is-light annuncio-item';

                // Formatta la data di pubblicazione nel formato italiano (gg/mm/aaaa)
                const dataPubblicazione = new Date(annuncio.dataPubblicazione).toLocaleDateString('it-IT');

                // Costruisce la struttura HTML dell'annuncio utilizzando template literals
                annuncioDiv.innerHTML = `
                    <p class="title is-5">${annuncio.titolo}</p>
                    <div class="annuncio-content-wrapper"> <p class="annuncio-contenuto-text">${annuncio.contenuto}</p>
                    </div>
                    <div class="level is-mobile is-flex is-justify-content-space-between is-align-items-center mt-3">
                        <p class="is-size-7 has-text-grey">Pubblicato il: ${dataPubblicazione} da ${annuncio.amministratore.nome} ${annuncio.amministratore.cognome}</p>
                        <button class="button is-small is-link is-light toggle-content-btn" data-target="annuncio-content-${annuncio.id}">
                            Mostra Contenuto
                        </button>
                    </div>
                `;

                // Assegna un ID univoco al wrapper del contenuto per facilitare il targeting JS/CSS
                annuncioDiv.querySelector('.annuncio-content-wrapper').id = `annuncio-content-${annuncio.id}`;

                // Aggiunge l'elemento annuncio al container principale
                annunciContainer.appendChild(annuncioDiv);
            });

            /**
             * Configura gli event listener per i pulsanti di espansione/collasso del contenuto degli annunci.
             * Ogni pulsante, quando cliccato, alterna la visibilità del contenuto dell'annuncio.
             */
            document.querySelectorAll('.toggle-content-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    // Ottiene l'ID del contenuto target dal data-attribute del pulsante
                    const targetId = event.target.dataset.target;
                    // Trova l'elemento contenitore del contenuto usando l'ID
                    const contentWrapper = document.getElementById(targetId);

                    if (contentWrapper) {
                        // Alterna la classe CSS per espandere/collassare il contenuto
                        contentWrapper.classList.toggle('is-expanded');

                        // Aggiorna il testo del pulsante in base allo stato corrente
                        if (contentWrapper.classList.contains('is-expanded')) {
                            event.target.textContent = 'Nascondi Contenuto';
                        } else {
                            event.target.textContent = 'Mostra Contenuto';
                        }
                    }
                });
            });

        } catch (error) {
            // Gestisce eventuali errori durante il caricamento degli annunci
            console.error("Errore nel caricamento degli annunci:", error);
            // Mostra un messaggio di errore all'utente
            annunciContainer.innerHTML = '<p class="has-text-danger">Impossibile caricare gli annunci.</p>';
        }
    }

    // Avvia il caricamento degli annunci non appena il DOM è pronto
    loadAnnunci();
});
