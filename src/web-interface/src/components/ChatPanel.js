import React, { useState, useRef, useEffect } from 'react';
import { Card, Form, Button, Badge } from 'react-bootstrap';
import './ChatPanel.css';

const ChatPanel = ({ 
  messages = [], 
  onSendMessage, 
  isTyping = false, 
  agentActions = [], 
  currentStep = 0,
  onToggle = null,
  onReset = null
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const [showWelcome, setShowWelcome] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Hide welcome message after first interaction
  useEffect(() => {
    if (messages.length > 0) {
      setShowWelcome(false);
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="chat-panel">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-content">
          <div className="chat-title">
            <span className="chat-icon">🤖</span>
            <h5 className="mb-0">AI Assistant</h5>
          </div>
          <div className="chat-status">
            {isTyping ? (
              <Badge bg="info" className="typing-badge">
                <span className="typing-dots">AI is typing</span>
              </Badge>
            ) : (
              <Badge bg="success">Ready</Badge>
            )}
          </div>
        </div>
        
        {/* Reset Button */}
        {onReset && (
          <button 
            className="chat-reset-btn"
            onClick={onReset}
            title="Reset conversation and start fresh"
          >
            <span className="reset-icon">🔄</span>
          </button>
        )}
        
        {/* Minimize Button */}
        {onToggle && (
          <button 
            className="chat-toggle-btn"
            onClick={onToggle}
            title="Minimize chat"
          >
            <span className="toggle-icon">−</span>
          </button>
        )}

        {/* Reset Button */}
        {onReset && (
          <button 
            className="chat-reset-btn"
            onClick={onReset}
            title="Reset chat"
          >
            <span className="reset-icon">🔄</span>
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div className="chat-messages">
        {showWelcome && (
          <div className="welcome-message">
            <div className="welcome-content">
              <div className="welcome-icon">🚀</div>
              <h6>Welcome to MCS-CEV Optimization!</h6>
              <p>
                I'm your AI assistant for configuring mobile charging station optimization scenarios. 
                I can help you:
              </p>
              <ul>
                <li>Configure scenarios with natural language</li>
                <li>Set up vehicle and location parameters</li>
                <li>Optimize charging schedules</li>
                <li>Analyze results and provide insights</li>
              </ul>
              <p>
                <strong>Try saying:</strong> "I need to optimize charging for 3 electric excavators at 2 construction sites"
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.type === 'user' ? 'user-message' : 'agent-message'}`}
          >
            <div className="message-content">
              <div className="message-header">
                <span className="message-sender">
                  {message.type === 'user' ? 'You' : 'AI Assistant'}
                </span>
                <span className="message-time">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div 
                className="message-text"
                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
              />
              
              {/* Show agent actions if available */}
              {message.actions && message.actions.length > 0 && (
                <div className="agent-actions">
                  {message.actions.map((action, actionIndex) => (
                    <div key={actionIndex} className="action-item">
                      <span className="action-icon">⚙️</span>
                      <span className="action-text">{action.description}</span>
                      {action.status && (
                        <span className={`action-status ${action.status}`}>
                          {action.status === 'applying' ? 'Applying...' : action.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="message agent-message">
            <div className="message-content">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="chat-input">
        <Form.Group className="mb-0">
          <div className="input-group">
            <Form.Control
              type="text"
              placeholder="Describe your scenario or ask a question..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isTyping}
              className="chat-input-field"
            />
            <Button
              variant="primary"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="send-button"
            >
              <span className="send-icon">📤</span>
            </Button>
          </div>
        </Form.Group>
        
        {/* Quick suggestions */}
        {messages.length === 0 && !showWelcome && (
          <div className="quick-suggestions">
            <small className="text-muted">Quick suggestions:</small>
            <div className="suggestion-chips">
              <button 
                className="suggestion-chip"
                onClick={() => onSendMessage("I need to optimize charging for 2 electric vehicles at 3 construction sites")}
              >
                "2 EVs at 3 sites"
              </button>
              <button 
                className="suggestion-chip"
                onClick={() => onSendMessage("What parameters do I need to configure?")}
              >
                "What parameters?"
              </button>
              <button 
                className="suggestion-chip"
                onClick={() => onSendMessage("Help me understand the optimization results")}
              >
                "Explain results"
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
