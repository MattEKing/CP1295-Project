/**
 * ui.js - UI management and event handlers
 * Functions for handling the user interface elements and interactions
 */

import { createNote, NoteManager } from './notes.js';
import { saveNotes, exportNotesAsJson } from './storage.js';

/**
 * Initialize UI event listeners
 * @param {NoteManager} noteManager - The note manager instance
 */
export function initializeUI(noteManager) {
    const noteBoard = document.getElementById('note-board');
    const exportBtn = document.getElementById('export-btn');
    //------------------------------------------------------------
    const ascBtn = document.getElementById('asc-btn');
    const descBtn = document.getElementById('desc-btn');
    //------------------------------------------------------------

    // Double click on board to create a new note
    noteBoard.addEventListener('dblclick', (event) => {
        // Only create note if we clicked directly on the board, not on an existing note
        if (event.target === noteBoard) {
            createNewNote(event.clientX, event.clientY, noteManager);
        }
    });

    // Export button click handler
    exportBtn.addEventListener('click', () => {
        exportNotes(noteManager);
    });

    //Sorting Ascending button click handler
    ascBtn.addEventListener('click', () => {
        sortAsc(noteManager);
    })

    //Sorting Descending button click handler
    descBtn.addEventListener('click', () => {
        sortDesc(noteManager)
    })

    // Setup auto-save timer
    setupAutoSave(noteManager);
}

/**
 * Create a new note at the specified position
 * @param {number} x - X position for the new note
 * @param {number} y - Y position for the new note
 * @param {NoteManager} noteManager - The note manager instance
 */
export function createNewNote(x, y, noteManager) {
    // Calculate position relative to the board
    const noteBoard = document.getElementById('note-board');
    const boardRect = noteBoard.getBoundingClientRect();
    
    const boardX = x - boardRect.left;
    const boardY = y - boardRect.top;
    
    // Create the new note
    const note = createNote({
        content: '',
        x: boardX,
        y: boardY
    });
    
    // Add to manager
    noteManager.addNote(note);
    
    // Create DOM element
    const noteElement = note.createElement();
    
    // Add event listeners to the note
    setupNoteEventListeners(noteElement, note, noteManager);
    
    // Add to board
    noteBoard.appendChild(noteElement);
    
    // Focus the content area for immediate editing
    const contentElement = noteElement.querySelector('.note-content');
    contentElement.focus();
    
    return note;
}

/**
 * Set up event listeners for a note element
 * @param {HTMLElement} noteElement - The note DOM element
 * @param {Note} note - The note object
 * @param {NoteManager} noteManager - The note manager instance
 */
export function setupNoteEventListeners(noteElement, note, noteManager) {
    // Get elements
    const contentElement = noteElement.querySelector('.note-content');
    const deleteButton = noteElement.querySelector('.delete-btn');
    //----------------------------------------------------------------------------
    const quoteButton = noteElement.querySelector('.quote-btn');
    const imageButton = noteElement.querySelector('.img-btn')
    //----------------------------------------------------------------------------

    // Track whether the note is being dragged
    let isDragging = false;
    let dragOffsetX, dragOffsetY;
    
    // Content change handler
    contentElement.addEventListener('input', () => {
        note.updateContent(contentElement.textContent);
    });
    
    // Delete button handler
    deleteButton.addEventListener('click', () => {
        deleteNote(noteElement, note, noteManager);
    });
    
    // Quote button handler
    quoteButton.addEventListener('click', async () => {
        try {
            quoteButton.textContent = '⌛'; // Show loading indicator
            await note.addRandomQuote();
            quoteButton.textContent = '💡'; // Restore original icon
        } catch (error) {
            // Show error indicator briefly
            quoteButton.textContent = '❌';
            setTimeout(() => {
                quoteButton.textContent = '💡';
            }, 1500);
            
            // Display error in console
            console.error('Failed to fetch quote:', error);
        }
    });
    //--------------------------------------------------------------------------------------------
    //Image button Handler
    const browser = noteElement.querySelector('.fileExp');
    

    imageButton.addEventListener('click', () => {
        browser.click();
                        console.log(noteManager.getAllNotes())

    });

    browser.addEventListener('change', (event) => {
        const img = event.target.files[0];
        if (img) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const src = e.target.result;
                note.updateImage(src)
                console.log(noteManager.getAllNotes())
            }
         reader.readAsDataURL(img);
            
        }
    })
    //------------------------------------------------------------------------------------------------

    // Drag start
    noteElement.addEventListener('mousedown', (event) => {
        // Ignore if clicking on buttons or content area
        if (event.target === deleteButton || 
            event.target === quoteButton ||
            event.target === contentElement) {
            return;
        }
        
        // Start dragging
        isDragging = true;
        
        // Calculate offset from note's top-left corner
        const noteRect = noteElement.getBoundingClientRect();
        dragOffsetX = event.clientX - noteRect.left;
        dragOffsetY = event.clientY - noteRect.top;
        
        // Add active class for styling
        noteElement.classList.add('note-active');
        
        // Prevent text selection during drag
        event.preventDefault();
    });
    
    // Drag move
    document.addEventListener('mousemove', (event) => {
        if (!isDragging) return;
        
        // Get board position and dimensions
        const noteBoard = document.getElementById('note-board');
        const boardRect = noteBoard.getBoundingClientRect();
        
        // Calculate new position relative to board
        let newX = event.clientX - boardRect.left - dragOffsetX;
        let newY = event.clientY - boardRect.top - dragOffsetY;
        
        // Keep note within board boundaries
        newX = Math.max(0, Math.min(newX, boardRect.width - noteElement.offsetWidth));
        newY = Math.max(0, Math.min(newY, boardRect.height - noteElement.offsetHeight));
        
        // Update note position
        note.updatePosition(newX, newY);
    });
    
    // Drag end
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            noteElement.classList.remove('note-active');
        }
    });
}

/**
 * Delete a note
 * @param {HTMLElement} noteElement - The note DOM element
 * @param {Note} note - The note object
 * @param {NoteManager} noteManager - The note manager instance
 */
export function deleteNote(noteElement, note, noteManager) {
    // Add fade-out animation
    noteElement.classList.add('note-fade-out');
    
    // Remove after animation completes
    noteElement.addEventListener('animationend', () => {
        // Remove from DOM
        noteElement.remove();
        
        // Remove from manager
        noteManager.removeNote(note.id);
    });
}

/**
 * Export all notes as JSON file
 * @param {NoteManager} noteManager - The note manager instance
 */
export function exportNotes(noteManager) {
    const notes = noteManager.toJSON();
    exportNotesAsJson(notes);
}

/**
 * Setup auto-save functionality
 * @param {NoteManager} noteManager - The note manager instance
 */
export function setupAutoSave(noteManager) {
    // Save every 5 seconds if there are changes
    setInterval(() => {
        const notes = noteManager.toJSON();
        saveNotes(notes);
    }, 5000);
}

/**
 * Render all notes from manager to the board
 * @param {NoteManager} noteManager - The note manager instance
 */
export function renderAllNotes(noteManager) {
    const noteBoard = document.getElementById('note-board');
    
    // Clear existing notes
    const existingNotes = noteBoard.querySelectorAll('.note');
    existingNotes.forEach(noteElement => {
        noteElement.remove();
    });
    
    // Render all notes
    noteManager.getAllNotes().forEach(note => {
        const noteElement = note.createElement();
        setupNoteEventListeners(noteElement, note, noteManager);
        noteBoard.appendChild(noteElement);
    });
}

//---------------------------------------------------------------------------------------------
/**
 * Sorts the notes by TimeStamp in ascending order.
 * @param {NoteManager} noteManager -- The note manager instance
 */
export function sortAsc(noteManager) {
    const Notes = noteManager.getAllNotes()
    Notes.sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp))
    arrangeNotes(Notes);
}

/**
 * Sorts the notes by TimeStamp in descending order.
 * @param {NoteManager} noteManager -- The note manager instance
 */
export function sortDesc(noteManager) {
    const Notes = noteManager.getAllNotes()
    Notes.sort((a, b) => new Date(b.timeStamp) - new Date(a.timeStamp))
    arrangeNotes(Notes);
}

/**
 * 
 * @param {Array} notes -- array of note objects
 */
export function arrangeNotes(notes) {
    const noteBoard = document.getElementById('note-board');
    const boardRect = noteBoard.getBoundingClientRect();
    let x = 10;
    let y = 10;
    let row = 0;
    
    notes.forEach(note => {
        const noteWidth = note.element.offsetWidth;
        const noteHeight = note.element.offsetHeight;

        if (x + noteWidth > boardRect.width) {
            x = 10;
            y += row + 10;
        }

        note.updatePosition(x, y);
        x += noteWidth + 10;
        row = Math.max(row, noteHeight);
    })
}
//-------------------------------------------------------------------------------