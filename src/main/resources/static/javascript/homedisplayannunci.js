document.addEventListener("DOMContentLoaded", () => {
    const annunciContainer = document.getElementById("annunciContainer");

    async function loadAnnunci() {
        try {
            const response = await axios.get('/api/annunci/attivi');
            const annunci = response.data;
            annunciContainer.innerHTML = ''; // Pulisci i messaggi precedenti

            if (annunci.length === 0) {
                annunciContainer.innerHTML = '<p class="has-text-grey">Nessun annuncio disponibile al momento.</p>';
                return;
            }

            annunci.forEach(annuncio => {
                const annuncioDiv = document.createElement('div');
                annuncioDiv.className = 'notification is-info is-light annuncio-item'; // Aggiunto 'annuncio-item' per stile

                const dataPubblicazione = new Date(annuncio.dataPubblicazione).toLocaleDateString('it-IT');

                // Struttura HTML per l'annuncio con contenuto a scomparsa
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

                annunciContainer.appendChild(annuncioDiv);
            });

            // Aggiungi event listener a tutti i nuovi pulsanti "toggle"
            document.querySelectorAll('.toggle-content-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const targetId = event.target.dataset.target;
                    const contentWrapper = document.getElementById(targetId);
                    if (contentWrapper) {
                        contentWrapper.classList.toggle('is-expanded'); // Alterna la classe per espandere/collassare
                        if (contentWrapper.classList.contains('is-expanded')) {
                            event.target.textContent = 'Nascondi Contenuto';
                        } else {
                            event.target.textContent = 'Mostra Contenuto';
                        }
                    }
                });
            });

        } catch (error) {
            console.error("Errore nel caricamento degli annunci:", error);
            annunciContainer.innerHTML = '<p class="has-text-danger">Impossibile caricare gli annunci.</p>';
        }
    }

    loadAnnunci(); // Carica gli annunci all'avvio della pagina
});
