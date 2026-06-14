from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
import re
import html
import os
import hashlib

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "feed_cache.xml"

def get_xml_data(force_refresh=False):
    # If not force_refresh and cache exists, try to read from cache first
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return f.read(), True
        except Exception:
            pass
            
    # Fetch from live URL
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntigravityFeedReader/1.0'}
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            xml_data = response.read().decode("utf-8")
        # Save to cache
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            f.write(xml_data)
        return xml_data, False
    except Exception as e:
        # Fallback to cache if request fails
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    return f.read(), True
            except Exception:
                pass
        raise e

def clean_html(html_content):
    if not html_content:
        return ""
    # Convert code tags to markdown backticks
    text = re.sub(r'<code>(.*?)</code>', r'`\1`', html_content)
    # Remove other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Unescape HTML entities
    text = html.unescape(text)
    # Replace multiple spaces/newlines with single space
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_release_notes(xml_data):
    root = ET.fromstring(xml_data)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    
    updates = []
    
    for entry in root.findall("atom:entry", ns):
        date_str = entry.find("atom:title", ns).text or ""
        updated_str = entry.find("atom:updated", ns).text or ""
        
        # Get alternate link
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        if link_elem is None:
            link_elem = entry.find("atom:link", ns)
        link = link_elem.attrib.get("href", "") if link_elem is not None else ""
        
        content_elem = entry.find("atom:content", ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Split content_html by <h3> tags
        parts = re.split(r'(<h3>.*?</h3>)', content_html)
        
        # If there are no <h3> tags, parse the whole thing as one update
        if len(parts) <= 1:
            clean_txt = clean_html(content_html)
            # Create a unique ID
            unique_str = f"{date_str}-General-{clean_txt[:50]}"
            uid = hashlib.md5(unique_str.encode('utf-8')).hexdigest()
            updates.append({
                "id": uid,
                "date": date_str,
                "iso_date": updated_str[:10] if updated_str else "",
                "type": "General",
                "html_content": content_html,
                "clean_text": clean_txt,
                "link": link
            })
        else:
            # If parts[0] has content, it's text before the first <h3>
            if parts[0].strip():
                clean_txt = clean_html(parts[0])
                if clean_txt:
                    unique_str = f"{date_str}-General-{clean_txt[:50]}"
                    uid = hashlib.md5(unique_str.encode('utf-8')).hexdigest()
                    updates.append({
                        "id": uid,
                        "date": date_str,
                        "iso_date": updated_str[:10] if updated_str else "",
                        "type": "General",
                        "html_content": parts[0],
                        "clean_text": clean_txt,
                        "link": link
                    })
            
            # Match <h3> tags and their content
            for i in range(1, len(parts), 2):
                h3_tag = parts[i]
                desc_html = parts[i+1] if i+1 < len(parts) else ""
                
                type_match = re.search(r'<h3>(.*?)</h3>', h3_tag)
                update_type = type_match.group(1) if type_match else "Update"
                
                clean_txt = clean_html(desc_html)
                
                unique_str = f"{date_str}-{update_type}-{clean_txt[:50]}"
                uid = hashlib.md5(unique_str.encode('utf-8')).hexdigest()
                
                updates.append({
                    "id": uid,
                    "date": date_str,
                    "iso_date": updated_str[:10] if updated_str else "",
                    "type": update_type,
                    "html_content": desc_html,
                    "clean_text": clean_txt,
                    "link": link
                })
                
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        xml_data, from_cache = get_xml_data(force_refresh=force_refresh)
        notes = parse_release_notes(xml_data)
        return jsonify({
            "status": "success",
            "from_cache": from_cache,
            "data": notes
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
