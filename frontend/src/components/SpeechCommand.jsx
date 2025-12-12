import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import './SpeechCommand.css';

/**
 * Speech Command Component - Voice-Controlled Board Actions
 * 
 * Features:
 * - Web Speech API with fallback to MediaRecorder + Whisper
 * - Live transcript display
 * - Command parsing to JSON actions
 * - WebSocket streaming support
 * - Debounced continuous speech
 */
const SpeechCommand = ({
    socket,
    onCommand,
    canvasPosition = { x: 0, y: 0 }
}) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState(null);
    const [useWebSpeech, setUseWebSpeech] = useState(true);
    const [volume, setVolume] = useState(0);

    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const debounceTimerRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const volumeIntervalRef = useRef(null);

    // Check for Web Speech API support
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.log('Web Speech API not supported, will use MediaRecorder + Whisper');
            setUseWebSpeech(false);
        }
    }, []);

    // Initialize Web Speech API
    const initializeWebSpeech = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return null;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            console.log('Speech recognition started');
            setError(null);
        };

        recognition.onresult = (event) => {
            let interimText = '';
            let finalText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += transcript;
                } else {
                    interimText += transcript;
                }
            }

            setInterimTranscript(interimText);

            if (finalText) {
                setTranscript(prev => prev + ' ' + finalText);
                handleSpeechCommand(finalText.trim());
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setError(`Error: ${event.error}`);
            if (event.error === 'no-speech' || event.error === 'audio-capture') {
                // Auto-restart on certain errors
                setTimeout(() => {
                    if (isListening) {
                        recognition.start();
                    }
                }, 1000);
            }
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
            if (isListening) {
                // Auto-restart if still supposed to be listening
                recognition.start();
            }
        };

        return recognition;
    }, [isListening]);

    // Initialize MediaRecorder for fallback
    const initializeMediaRecorder = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Setup audio visualization
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);
            analyser.fftSize = 256;

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            // Start volume monitoring
            startVolumeMonitoring();

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];

                // Send to backend for Whisper transcription
                await transcribeWithWhisper(audioBlob);
            };

            return mediaRecorder;
        } catch (err) {
            console.error('MediaRecorder initialization error:', err);
            setError('Microphone access denied');
            return null;
        }
    }, []);

    // Start volume monitoring
    const startVolumeMonitoring = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        volumeIntervalRef.current = setInterval(() => {
            if (!analyserRef.current) return;

            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            setVolume(Math.min(100, (average / 255) * 100));
        }, 100);
    };

    // Stop volume monitoring
    const stopVolumeMonitoring = () => {
        if (volumeIntervalRef.current) {
            clearInterval(volumeIntervalRef.current);
            volumeIntervalRef.current = null;
        }
        setVolume(0);
    };

    // Transcribe audio with Whisper API
    const transcribeWithWhisper = async (audioBlob) => {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');

            const response = await fetch('/api/ai/transcribe', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success && result.data.text) {
                const text = result.data.text.trim();
                setTranscript(prev => prev + ' ' + text);
                handleSpeechCommand(text);
            }
        } catch (err) {
            console.error('Whisper transcription error:', err);
            setError('Transcription failed');
        }
    };

    // Handle speech command with debouncing
    const handleSpeechCommand = (text) => {
        // Clear existing debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Debounce for 500ms to avoid processing partial commands
        debounceTimerRef.current = setTimeout(() => {
            parseAndExecuteCommand(text);
        }, 500);
    };

    // Parse speech into JSON action
    const parseAndExecuteCommand = (text) => {
        const lowerText = text.toLowerCase().trim();
        let action = null;

        // Command patterns
        const patterns = [
            // Insert sticky note
            {
                regex: /(?:insert|add|create)\s+(?:a\s+)?sticky(?:\s+note)?(?:\s+(?:saying|with|that says))?\s+(.+)/i,
                handler: (match) => ({
                    action: 'add_sticky',
                    text: match[1],
                    x: canvasPosition.x,
                    y: canvasPosition.y
                })
            },

            // Insert node
            {
                regex: /(?:insert|add|create)\s+(?:a\s+)?node(?:\s+(?:saying|with|labeled))?\s+(.+)/i,
                handler: (match) => ({
                    action: 'add_node',
                    text: match[1],
                    x: canvasPosition.x,
                    y: canvasPosition.y
                })
            },

            // Undo
            {
                regex: /^undo$/i,
                handler: () => ({
                    action: 'undo'
                })
            },

            // Redo
            {
                regex: /^redo$/i,
                handler: () => ({
                    action: 'redo'
                })
            },

            // Auto layout
            {
                regex: /(?:auto\s+)?layout|organize|arrange/i,
                handler: () => ({
                    action: 'auto_layout'
                })
            },

            // Select all
            {
                regex: /select\s+(?:all|everything)/i,
                handler: () => ({
                    action: 'select_all'
                })
            },

            // Clear selection
            {
                regex: /(?:clear|deselect)\s+(?:selection|all)/i,
                handler: () => ({
                    action: 'clear_selection'
                })
            },

            // Delete selected
            {
                regex: /delete\s+(?:selected|selection)/i,
                handler: () => ({
                    action: 'delete_selected'
                })
            },

            // Zoom in/out
            {
                regex: /zoom\s+(in|out)/i,
                handler: (match) => ({
                    action: 'zoom',
                    direction: match[1]
                })
            },

            // Align
            {
                regex: /align\s+(?:to\s+)?(?:the\s+)?(left|right|top|bottom|center)/i,
                handler: (match) => ({
                    action: 'align',
                    direction: match[1]
                })
            },

            // Group
            {
                regex: /group\s+(?:selected|selection)/i,
                handler: () => ({
                    action: 'group_selected'
                })
            },

            // Ungroup
            {
                regex: /ungroup\s+(?:selected|selection)/i,
                handler: () => ({
                    action: 'ungroup_selected'
                })
            },

            // Save
            {
                regex: /save|export/i,
                handler: () => ({
                    action: 'save'
                })
            },

            // Connect nodes
            {
                regex: /connect\s+(?:selected|nodes)/i,
                handler: () => ({
                    action: 'connect_selected'
                })
            },

            // Change color
            {
                regex: /(?:make|change|set)\s+(?:color\s+)?(?:to\s+)?(red|blue|green|yellow|purple|orange|pink|gray)/i,
                handler: (match) => ({
                    action: 'change_color',
                    color: match[1]
                })
            }
        ];

        // Try to match patterns
        for (const pattern of patterns) {
            const match = lowerText.match(pattern.regex);
            if (match) {
                action = pattern.handler(match);
                break;
            }
        }

        if (action) {
            console.log('🎤 Voice command parsed:', action);

            // Step 1: Apply action locally first
            if (onCommand) {
                try {
                    onCommand(action);
                    console.log('✅ Voice command applied locally');
                } catch (error) {
                    console.error('❌ Failed to apply voice command locally:', error);
                }
            }

            // Step 2: Emit socket event for synchronization with other clients
            if (socket && socket.readyState === WebSocket.OPEN) {
                const voiceActionEvent = {
                    type: 'voice-action',
                    payload: {
                        action,
                        transcript: text,
                        timestamp: Date.now(),
                        userId: socket.userId || 'anonymous'
                    }
                };

                socket.send(JSON.stringify(voiceActionEvent));
                console.log('📡 Voice action emitted to other clients:', voiceActionEvent);
            } else {
                console.warn('⚠️ Socket not connected, action not synchronized');
            }
        } else {
            console.log('❓ No matching command pattern for:', text);
        }
    };

    // Start listening
    const startListening = async () => {
        setError(null);
        setTranscript('');
        setInterimTranscript('');

        if (useWebSpeech) {
            // Use Web Speech API
            if (!recognitionRef.current) {
                recognitionRef.current = initializeWebSpeech();
            }

            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                    setIsListening(true);
                } catch (err) {
                    console.error('Failed to start recognition:', err);
                    setError('Failed to start speech recognition');
                }
            }
        } else {
            // Use MediaRecorder + Whisper
            const mediaRecorder = await initializeMediaRecorder();
            if (mediaRecorder) {
                mediaRecorderRef.current = mediaRecorder;
                mediaRecorder.start(1000); // Collect data every second
                setIsListening(true);
            }
        }
    };

    // Stop listening
    const stopListening = () => {
        setIsListening(false);

        if (useWebSpeech && recognitionRef.current) {
            recognitionRef.current.stop();
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();

            // Stop all tracks
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        stopVolumeMonitoring();

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    // Toggle listening
    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopListening();
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return (
        <div className={`speech-command ${isListening ? 'listening' : ''}`}>
            <button
                className={`speech-button ${isListening ? 'active' : ''}`}
                onClick={toggleListening}
                title={isListening ? 'Stop listening' : 'Start voice commands'}
            >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {isListening && (
                <div className="speech-panel">
                    <div className="speech-header">
                        <div className="speech-status">
                            <div className="pulse-dot"></div>
                            <span>Listening...</span>
                        </div>
                        <button className="close-button" onClick={stopListening}>×</button>
                    </div>

                    {/* Volume indicator */}
                    <div className="volume-indicator">
                        <Volume2 size={16} />
                        <div className="volume-bar">
                            <div
                                className="volume-fill"
                                style={{ width: `${volume}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Transcript */}
                    <div className="transcript-container">
                        <div className="transcript">
                            {transcript && <p className="final-transcript">{transcript}</p>}
                            {interimTranscript && (
                                <p className="interim-transcript">{interimTranscript}</p>
                            )}
                            {!transcript && !interimTranscript && (
                                <p className="placeholder">Say a command...</p>
                            )}
                        </div>
                    </div>

                    {/* Error display */}
                    {error && (
                        <div className="error-message">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Command hints */}
                    <div className="command-hints">
                        <p className="hints-title">Try saying:</p>
                        <ul>
                            <li>"Insert sticky note with hello world"</li>
                            <li>"Auto layout"</li>
                            <li>"Align to center"</li>
                            <li>"Undo"</li>
                            <li>"Select all"</li>
                            <li>"Make color blue"</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpeechCommand;
