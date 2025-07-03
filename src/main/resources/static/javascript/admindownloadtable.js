/**
 * Genera e scarica un PDF con i dati della tabella delle prenotazioni correntemente visualizzate.
 * Questa funzione si basa sulla libreria pdfmake per creare il documento PDF lato client.
 * @returns {void}
 */
function DownloadTableAsPDF() {
    // 1. Recupera i dati dalla tabella utilizzando una funzione ausiliaria.
    const tableData = get_data_for_pdf();

    // 2. Controllo di validazione: se ci sono solo le intestazioni (lunghezza <= 1), non ci sono dati da esportare.
    if (tableData.length <= 1) {
        alert("Nessuna prenotazione da esportare.");
        return; // Esce dalla funzione.
    }

    // 3. Definizione della struttura della tabella per pdfmake.
    const pdfTable = {
        table: {
            headerRows: 1, // Indica che la prima riga è l'intestazione.
            // Definisce la larghezza delle colonne: 'auto' si adatta al contenuto, '*' prende lo spazio restante equamente.
            widths: ['auto', '*', 'auto', 'auto', 'auto', '*'],
            // Mappa i dati della tabella per creare il corpo del PDF.
            body: tableData.map((row, index) =>
                row.map((cell, i) => {
                    let formattedCell = cell;
                    // Applica l'andata a capo automatica solo alla colonna "Recensione" (indice 5)
                    // e solo per le righe di dati (non l'intestazione, index > 0).
                    if (index > 0 && i === 5 && typeof cell === 'string') {
                        formattedCell = insertLineBreaks(cell, 25); // Spezza il testo ogni 25 caratteri.
                    }
                    return {
                        text: formattedCell,
                        // Applica stili diversi a intestazione e righe di dati.
                        style: index === 0 ? 'tableHeader' : 'tableRow'
                    };
                })
            )
        },
        // Layout della tabella: "lightHorizontalLines" aggiunge solo linee orizzontali leggere.
        layout: 'lightHorizontalLines',
    };

    // 4. Recupera il nome dell'aula selezionata per il titolo del PDF.
    const aulaNome = document.querySelector('#aulaSelectPrenotazioni option:checked')?.textContent || "Aula";
    // Recupera la data selezionata.
    const data = document.getElementById("dataPrenotazione").value;

    // 5. Definizione completa del documento PDF.
    const DocDefinition = {
        content: [
            // Titolo principale del PDF.
            { text: `Prenotazioni - ${aulaNome}`, style: 'title' },
            // Sottotitolo con la data, formattata per l'Italia.
            { text: data ? `Data: ${new Date(data).toLocaleDateString('it-IT')}` : '', style: 'subtitle' },
            { text: '\n' }, // Spazio vuoto.
            pdfTable // Inserisce la definizione della tabella.
        ],
        // Definizione degli stili utilizzati nel documento PDF.
        styles: {
            title: {
                fontSize: 16,
                bold: true,
                alignment: 'center',
                margin: [0, 0, 0, 10] // Margini [sinistra, alto, destra, basso].
            },
            subtitle: {
                fontSize: 12,
                alignment: 'center',
                margin: [0, 0, 0, 10]
            },
            tableHeader: {
                bold: true,
                fontSize: 11,
                color: 'black',
            },
            tableRow: {
                fontSize: 9,
                color: 'black',
            }
        }
    };

    // 6. Crea il PDF con pdfmake e lo avvia il download.
    // Il nome del file include l'aula e la data per una migliore identificazione.
    pdfMake.createPdf(DocDefinition).download(`prenotazioni_${aulaNome}_${data}.pdf`);
}

/**
 * Estrae e formatta i dati per il PDF dalla variabile globale 'prenotazioniCorrenti'.
 * Questa funzione prepara l'array bidimensionale che `pdfmake` userà per costruire la tabella.
 * @returns {Array} Array bidimensionale con i dati pronti per il PDF, inclusa l'intestazione.
 */
function get_data_for_pdf() {
    let data = [];
    // Aggiunge la riga di intestazione della tabella.
    data.push(["Studente", "Email", "Inizio", "Fine", "Stato", "Recensione"]);

    // Verifica se `prenotazioniCorrenti` è definita e un array.
    if (typeof prenotazioniCorrenti !== 'undefined' && Array.isArray(prenotazioniCorrenti)) {
        // Itera su ogni prenotazione e aggiunge i dati formattati all'array `data`.
        prenotazioniCorrenti.forEach(p => {
            data.push([
                `${p.utente.nome} ${p.utente.cognome}`, // Nome e cognome dello studente.
                p.utente.email, // Email dello studente.
                // Orario di inizio formattato (es. 09:30).
                new Date(p.inizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                // Orario di fine formattato.
                new Date(p.fine).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                p.attiva ? 'Attiva' : 'Terminata', // Stato della prenotazione.
                p.recensione || '' // Recensione, o stringa vuota se non presente.
            ]);
        });
    }

    return data;
}

/**
 * Inserisce un carattere di nuova riga ('\n') in una stringa ogni 'n' caratteri.
 * Questa è una funzione di utilità per formattare il testo lungo nelle celle del PDF,
 * in modo che non ecceda la larghezza della colonna.
 * @param {string} str - La stringa da spezzare.
 * @param {number} everyNChars - Numero di caratteri dopo cui inserire un'interruzione di riga.
 * @returns {string} La stringa modificata con '\n' ogni N caratteri, e con spazi bianchi iniziali/finali rimossi.
 */
function insertLineBreaks(str, everyNChars) {
    // Utilizza una Regular Expression per trovare gruppi di 1 a `everyNChars` caratteri
    // e li sostituisce con se stessi seguiti da un newline.
    // `g` è per la sostituzione globale.
    return str.replace(new RegExp(`(.{1,${everyNChars}})`, 'g'), '$1\n').trim();
}