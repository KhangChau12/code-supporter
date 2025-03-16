# Code Supporter Integration Guide

This guide provides detailed instructions on how to integrate the Code Supporter chatbot into your website, application, or learning platform.

## Table of Contents
- [Overview](#overview)
- [Creating an API Key](#creating-an-api-key)
- [JavaScript Widget Integration](#javascript-widget-integration)
- [Direct API Integration](#direct-api-integration)
- [Widget Customization](#widget-customization)
- [Troubleshooting](#troubleshooting)
- [Integration Examples](#integration-examples)
- [API Versioning](#api-versioning)
- [Support](#support)

## Overview

Code Supporter offers two main integration methods:

1. **JavaScript Widget**: The simplest way to add the chatbot to your website
2. **Direct API Integration**: For complete customization of the user experience

## Creating an API Key

Before starting integration, you need to create an API Key:

1. Log in to your Code Supporter account
2. Navigate to the Admin page
3. In the "API Key Management" section, enter a name for your new API key
4. Select the required permissions:
   - **Chat API**: Allows basic chat API calls
   - **Stream API**: Allows streaming chat API calls
5. Click "Create API Key"
6. Save both the API Key and API Secret (the API Secret will not be shown again after leaving the page)

## JavaScript Widget Integration

### Adding the Script

Add the following code to the `<head>` or end of the `<body>` of your web page:

```html
<script src="https://your-code-supporter-domain.com/static/js/codesupporter-widget.js"></script>
```

### Initializing the Widget

Add the following code to initialize the widget:

```html
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const chatbot = window.initCodeSupporter({
            apiUrl: 'https://your-code-supporter-domain.com/api/chat/public',
            apiKey: 'YOUR_API_KEY_HERE',
            position: 'bottom-right',
            theme: 'dark',
            chatTitle: 'Code Supporter',
            initialMessage: 'Hello! How can I help with your programming questions?'
        });
    });
</script>
```

## Direct API Integration

If you want to completely customize the interface, you can call the API directly.

### Chat API

**Endpoint**: `POST /api/chat/public`

**Headers**:
```
Content-Type: application/json
X-API-Key: YOUR_API_KEY_HERE
```

**Request Body**:
```json
{
    "message": "How do I write a recursive function to calculate factorial in Python?",
    "conversation_history": [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hello! How can I help you?"}
    ],
    "session_id": "unique-session-id-123"
}
```

**Field Descriptions**:
- `message`: The user's message
- `conversation_history` (optional): Conversation history to maintain context
- `session_id` (optional): Session identifier

**Response**:
```json
{
    "reply": "To write a recursive function for calculating factorials in Python, you can do the following:\n\n```python\ndef factorial(n):\n    if n == 0 or n == 1:\n        return 1\n    else:\n        return n * factorial(n-1)\n```\n\nThis function works by...",
    "status": "success"
}
```

### Streaming Chat API

**Endpoint**: `POST /api/chat/stream`

**Headers**: Same as Chat API

**Request Body**: Same as Chat API

**Response**: Server-Sent Events (SSE) with portions of the response sent in real-time.

## Widget Customization

The widget offers many customization options to match your website design:

| Parameter | Description | Default Value |
|-----------|-------------|---------------|
| `apiUrl` | API endpoint URL | `'http://localhost:5000/api/chat/public'` |
| `apiKey` | API key for authentication | `null` |
| `position` | Widget position | `'bottom-right'` |
| `theme` | Light/dark theme | `'dark'` |
| `chatTitle` | Chat window title | `'Code Supporter'` |
| `initialMessage` | Welcome message | `'Hello! How can I help...'` |
| `maxHeight` | Maximum chat window height | `'500px'` |
| `width` | Chat window width | `'350px'` |
| `showOnInit` | Auto-show chat on page load | `false` |
| `sessionId` | Session ID for conversation storage | `random ID` |

### Advanced Methods

You can access widget methods after initialization:

```javascript
const chatbot = window.initCodeSupporter({...});

// Show chat window on demand
document.getElementById('help-button').addEventListener('click', function() {
    chatbot.toggleChatWindow(true);
});

// Send a message programmatically
chatbot.addMessage("I need help with Python for loops", "user");
```

## Troubleshooting

### CORS (Cross-Origin Resource Sharing) Issues

If you encounter CORS errors when calling the API from a different domain, check:

1. That your domain is added to the allowed CORS list
2. That `X-API-Key` and `Content-Type` headers are properly configured

### API Connection Failures

If you cannot connect to the API:

1. Verify your API Key is valid
2. Ensure the API URL is correct
3. Check your browser console for specific errors

## Integration Examples

### Static Website Integration

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Programming Learning Website</title>
    <!-- Your website styles -->
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Programming Learning Website</h1>
        <!-- Navigation menu -->
    </header>
    
    <main>
        <!-- Website content -->
    </main>
    
    <footer>
        <!-- Footer content -->
    </footer>
    
    <!-- Code Supporter Integration -->
    <script src="https://your-code-supporter-domain.com/static/js/codesupporter-widget.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const chatbot = window.initCodeSupporter({
                apiUrl: 'https://your-code-supporter-domain.com/api/chat/public',
                apiKey: 'YOUR_API_KEY_HERE',
                theme: 'dark',
                position: 'bottom-right'
            });
            
            // Optional: Activate chat when user clicks "Help" button
            document.getElementById('help-button').addEventListener('click', function() {
                chatbot.toggleChatWindow(true);
            });
        });
    </script>
</body>
</html>
```

### React Integration

```jsx
import React, { useEffect } from 'react';

function App() {
    useEffect(() => {
        // Add script
        const script = document.createElement('script');
        script.src = 'https://your-code-supporter-domain.com/static/js/codesupporter-widget.js';
        script.async = true;
        script.onload = () => {
            // Initialize widget when script loads
            window.initCodeSupporter({
                apiUrl: 'https://your-code-supporter-domain.com/api/chat/public',
                apiKey: 'YOUR_API_KEY_HERE',
                theme: 'dark'
            });
        };
        document.body.appendChild(script);
        
        // Cleanup when component unmounts
        return () => {
            document.body.removeChild(script);
        };
    }, []);
    
    return (
        <div className="App">
            {/* React application content */}
        </div>
    );
}

export default App;
```

### WordPress Integration

Add the following code to your theme's functions.php file or use a plugin to insert code:

```php
function add_code_supporter_widget() {
    ?>
    <script src="https://your-code-supporter-domain.com/static/js/codesupporter-widget.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            window.initCodeSupporter({
                apiUrl: 'https://your-code-supporter-domain.com/api/chat/public',
                apiKey: 'YOUR_API_KEY_HERE',
                theme: 'dark'
            });
        });
    </script>
    <?php
}
add_action('wp_footer', 'add_code_supporter_widget');
```

## User Tracking (Optional)

If you want to track users interacting with the chatbot, you can add `user_id` and `user_info` parameters:

```javascript
// Using widget initialization
const chatbot = window.initCodeSupporter({
    apiUrl: 'https://your-code-supporter-domain.com/api/chat/public',
    apiKey: 'YOUR_API_KEY_HERE',
    userId: 'user123', // Optional: User ID for tracking
    userInfo: {  // Optional: Additional user information
        name: 'John Doe',
        email: 'john@example.com' 
    }
});

// Or using direct API
fetch('https://your-code-supporter-domain.com/api/chat/public', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'YOUR_API_KEY_HERE'
    },
    body: JSON.stringify({
        message: "How do I write a recursive function to calculate factorial in Python?",
        user_id: "user123",  // Optional
        user_info: {  // Optional
            name: "John Doe",
            email: "john@example.com"
        }
    })
})
.then(response => response.json())
.then(data => console.log(data));
```

## API Versioning

| Version | Release Date | Changes |
|---------|--------------|---------|
| v1.0.0  | 01/01/2025   | Initial release |

## API Key vs API Secret

When creating a new API key, the system provides you with:
- **API Key**: The public identifier used in headers for API calls (`X-API-Key`)
- **API Secret**: A secret code, similar to a password, that is only shown once

For integration purposes, you only need to use the **API Key**, not the API Secret.

## Support

If you need additional integration support, please contact us at:
- Email: student230212@ptnk.edu.vn