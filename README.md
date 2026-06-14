# BigQuery Release Pulse 🚀

**BigQuery Release Pulse** is a premium developer-focused dashboard web application built to monitor, search, and share Google Cloud BigQuery release updates. The application retrieves notes directly from Google's official feed, splits multiple daily announcements into individual cards, and features an integrated Twitter (X) composer workspace with preloaded templates and character limit indicators.

---

## ✨ Key Features

1. **Granular Release Cards**: Google packages all releases on a single date together. This application splits entry HTML by `<h3>` tags to extract and classify individual updates (Features, Deprecations, Bug Fixes, Notices, etc.).
2. **Multi-tier Caching**: Fetches from the live Google Atom feed with custom HTTP headers, stores updates locally in `feed_cache.xml` for sub-millisecond loads, and uses the cache as an offline fallback if Google's servers time out.
3. **Advanced Tweet Composer**:
   * **Visual SVG Progress Circle**: Tracks remaining character limits interactively (turns yellow when <20 left, red when over limit).
   * **Preset Templates**: Auto-formats tweets using 4 preloaded styles (Hype, Official/Formal, Quick Summary, Direct Quote).
   * **Twitter Link Rules**: Accurately counts any URL as exactly 23 characters matching Twitter/X limits.
   * **Web Intent Integration**: Safely opens a pre-composed tweet draft in a browser tab.
4. **Real-time UI Filtering**: Instantly filters by release category or searches keyword strings locally in the browser.

---

## 🛠️ Project Structure

```
agy-cli-projects/
├── static/
│   ├── css/
│   │   └── style.css      # Custom dark theme variables, responsive grids, animations
│   └── js/
│       └── app.js         # API interface, dynamic rendering, Twitter rules
├── templates/
│   └── index.html         # Sidebar, card container layout, off-canvas composer drawer
├── app.py                 # Flask server, Atom feed requester, XML parser
├── requirements.txt       # Flask and requests packages
├── .gitignore             # Configured ignores for python bytecode, cache, venv
└── README.md              # Project documentation (this file)
```

---

## 🚀 Installation & Setup

Ensure you have Python 3.8+ installed on your system.

### 1. Clone or Copy the Repository
Place the project files inside your target directory (e.g. `D:\agy-cli-projects`).

### 2. Set Up a Virtual Environment
Initialize a virtual environment to keep dependencies isolated:
```bash
python -m venv venv
```

Activate the environment:
* **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
* **Windows (Command Prompt)**:
  ```cmd
  .\venv\Scripts\activate.bat
  ```
* **macOS/Linux**:
  ```bash
  source venv/bin/activate
  ```

### 3. Install Dependencies
Install Flask and the requests module:
```bash
pip install -r requirements.txt
```

### 4. Run the Development Server
Launch the Flask server:
```bash
python app.py
```
Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 👥 Git Repository Push
To link and push your local files to a new GitHub repository:

1. Create a blank repository on GitHub named `kprasath-event-talks-app` (do not add a README, license, or gitignore).
2. Configure the remote and push from your terminal:
   ```bash
   git push -u origin main
   ```
   *(Note: Use `--force` if you need to overwrite existing remote template files.)*

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).