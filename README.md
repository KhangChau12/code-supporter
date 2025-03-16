# Code Supporter

Code Supporter is an intelligent chatbot designed to assist programmers with learning and software development challenges. Built with Flask, it offers an intuitive chat interface and API for seamless integration into various platforms.

## 🚀 Features

- **Intuitive Chat Interface**: User-friendly interface with Markdown support and syntax highlighting
- **JWT Authentication**: Secure user authentication system
- **LLM Integration**: Powered by Together AI's LLaMA 3.3-70B-Instruct-Turbo model
- **REST API**: Comprehensive API with authentication for third-party integrations
- **API Key Management**: Create, manage, and track usage of API keys
- **User Analytics**: Track user engagement and usage patterns
- **Flexible Storage**: Supports both MongoDB and file-based storage
- **Light/Dark Mode**: Theme switching for better user experience
- **Mobile Responsive**: Works on devices of all sizes

## 📋 Requirements

- Python 3.7+
- Pip (Python package manager)
- MongoDB (optional, can use file storage)
- Together AI API Key

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/code-supporter.git
   cd code-supporter
   ```

2. **Create and activate a virtual environment**
   ```bash
   # For Linux/Mac
   python -m venv venv
   source venv/bin/activate
   
   # For Windows
   python -m venv venv
   venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create a .env file in the project root**
   ```
   DEBUG=True
   PORT=5000
   API_SECRET_KEY=your_secret_key_here
   TOGETHER_API_KEY=your_together_api_key_here
   TOGETHER_MODEL_NAME=meta-llama/Llama-3.3-70B-Instruct-Turbo
   MONGODB_URI=mongodb://localhost:27017/code_supporter  # Optional
   ```

5. **Start the application**
   ```bash
   python app.py
   ```

## 🏗️ Project Structure

```
code-supporter/
├── api/
│   ├── __init__.py
│   ├── chatbot_service.py  # LLM integration 
│   ├── api_service.py      # API Blueprint
│   └── storage_service.py  # Data storage service
├── static/                 # Static assets
│   ├── css/
│   ├── js/
│   └── ...
├── templates/              # HTML templates
│   ├── login.html
│   ├── chat.html
│   └── admin.html
├── data/                   # Storage directory (when not using MongoDB)
├── app.py                  # Main application
├── wsgi.py                 # WSGI entry point
├── cors_middleware.py      # CORS handling
├── requirements.txt        # Dependencies
└── README.md               # Documentation
```

## 🌐 API Endpoints

### Authentication and Registration
- `POST /api/register` - Register a new user
- `POST /api/login` - User login
- `GET /api/user/info` - Get user information

### Chat API
- `POST /api/chat` - Chat API for authenticated users
- `POST /api/chat/stream` - Streaming chat responses
- `POST /api/chat/public` - Public chat API (requires API key)
- `POST /api/chat/public/stream` - Public streaming chat API

### API Key Management
- `POST /api/apikey/create` - Create a new API key
- `GET /api/apikey/list` - List API keys
- `GET /api/apikey/analytics` - Get API key usage analytics

## 💾 Data Storage

### MongoDB (Recommended)
Code Supporter supports storing data in MongoDB. To use MongoDB:

1. Install MongoDB or register for MongoDB Atlas (cloud database)
2. Set the `MONGODB_URI` environment variable in your `.env` file
3. Restart the application

Collections in MongoDB:
- `users` - User information
- `conversations` - Chat conversation metadata
- `conversation_messages` - Chat messages
- `api_keys` - API key storage
- `api_users` - API user tracking

### File Storage (Fallback)
If MongoDB is not configured, the system automatically uses file storage in the `data/` directory:
- `data/users/` - User information
- `data/conversations/` - Conversation history
- `data/api_keys/` - API keys
- `data/api_users/` - API user information

## 🚀 Deployment

### Deploying on Render

1. Create a new Web Service on Render
2. Connect to your GitHub repository
3. Configure as follows:
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn wsgi:app`
4. Add environment variables in the Render dashboard

### Using Docker

1. Build the image:
```bash
docker build -t code-supporter .
```

2. Run the container:
```bash
docker run -p 5000:5000 \
  -e API_SECRET_KEY=your_secret_key_here \
  -e TOGETHER_API_KEY=your_together_api_key_here \
  -e MONGODB_URI=mongodb://your-mongodb-uri \
  code-supporter
```

Or use Docker Compose:
```bash
docker-compose up -d
```

## 🔌 Integration

For detailed integration instructions, please see [INTEGRATION.md](INTEGRATION.md).

### Quick Start with Widget

1. Add the widget script to your website:
```html
<script src="https://your-domain.com/static/js/codesupporter-widget.js"></script>
```

2. Initialize the widget with your API key:
```html
<script>
const chatbot = window.initCodeSupporter({
    apiUrl: 'https://your-domain.com/api/chat/public',
    apiKey: 'YOUR_API_KEY_HERE',
    position: 'bottom-right',
    theme: 'dark',
    chatTitle: 'Code Supporter',
    initialMessage: 'Hello! How can I help with your programming questions?'
});
</script>
```

## 📊 Analytics and Monitoring

Code Supporter provides an admin dashboard to monitor:

- Number of API users
- Total API requests
- Active users in the last 24 hours and 7 days
- Detailed user information

## 📜 License

This project is distributed under the MIT License. See the `LICENSE` file for more details.

## 📞 Contact

If you have any questions or suggestions, please contact [student230212@ptnk.edu.vn].