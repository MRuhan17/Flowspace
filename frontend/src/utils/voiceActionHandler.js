/**
 * Socket Client Handler - Voice Action Synchronization
 * 
 * Example implementation for handling voice-action events from other clients
 * and applying them to the local canvas.
 */

export class VoiceActionHandler {
    constructor(socket, canvasEngine) {
        this.socket = socket;
        this.canvas = canvasEngine;
        this.setupListeners();
    }

    setupListeners() {
        if (!this.socket) return;

        // Listen for voice-action events from other clients
        this.socket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'voice-action') {
                    this.handleVoiceAction(data.payload);
                }
            } catch (error) {
                console.error('Error parsing socket message:', error);
            }
        });

        console.log('✅ Voice action handler initialized');
    }

    /**
     * Handle incoming voice action from other clients
     */
    handleVoiceAction(payload) {
        const { action, transcript, timestamp, userId } = payload;

        console.log(`🎤 Received voice action from ${userId}:`, action);
        console.log(`   Transcript: "${transcript}"`);

        // Check if this is from another user (not self)
        if (userId === this.socket.userId) {
            console.log('   Skipping - this is our own action');
            return;
        }

        // Apply the action to the canvas
        try {
            this.applyAction(action);
            console.log('✅ Voice action applied from remote user');

            // Optional: Show notification
            this.showNotification(userId, transcript);
        } catch (error) {
            console.error('❌ Failed to apply voice action:', error);
        }
    }

    /**
     * Apply action to canvas
     */
    applyAction(action) {
        switch (action.action) {
            case 'add_sticky':
                this.canvas.createStickyNote({
                    text: action.text,
                    x: action.x,
                    y: action.y
                });
                break;

            case 'add_node':
                this.canvas.createNode({
                    text: action.text,
                    x: action.x,
                    y: action.y
                });
                break;

            case 'undo':
                this.canvas.undo();
                break;

            case 'redo':
                this.canvas.redo();
                break;

            case 'auto_layout':
                this.canvas.applyAutoLayout();
                break;

            case 'select_all':
                this.canvas.selectAll();
                break;

            case 'clear_selection':
                this.canvas.clearSelection();
                break;

            case 'delete_selected':
                this.canvas.deleteSelected();
                break;

            case 'zoom':
                if (action.direction === 'in') {
                    this.canvas.zoomIn();
                } else {
                    this.canvas.zoomOut();
                }
                break;

            case 'align':
                this.canvas.alignSelected(action.direction);
                break;

            case 'group_selected':
                this.canvas.groupSelected();
                break;

            case 'ungroup_selected':
                this.canvas.ungroupSelected();
                break;

            case 'save':
                this.canvas.save();
                break;

            case 'connect_selected':
                this.canvas.connectSelected();
                break;

            case 'change_color':
                this.canvas.changeColorSelected(action.color);
                break;

            default:
                console.warn('Unknown action type:', action.action);
        }
    }

    /**
     * Show notification for remote voice action
     */
    showNotification(userId, transcript) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'voice-action-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">🎤</span>
                <div class="notification-text">
                    <strong>${userId}</strong> said: "${transcript}"
                </div>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

/**
 * Usage Example:
 * 
 * import { VoiceActionHandler } from './utils/voiceActionHandler';
 * 
 * // In your main app component
 * const socket = new WebSocket('ws://localhost:5000');
 * const canvasEngine = new CanvasEngine();
 * 
 * // Initialize voice action handler
 * const voiceActionHandler = new VoiceActionHandler(socket, canvasEngine);
 * 
 * // Now all voice actions from other clients will be automatically applied
 */

export default VoiceActionHandler;
