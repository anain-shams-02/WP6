from flask import Flask, jsonify, request, session, render_template
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import mysql.connector
import os
from datetime import datetime
from flask import Flask, jsonify, request, session, render_template, redirect, url_for
from functools import wraps  # For the decorator

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

# MySQL Configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Aceraspire@3',
    'database': 'video_portal'
}

# File Upload Configuration
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'mp4', 'webm', 'mkv'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_db():
    return mysql.connector.connect(**db_config)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Routes
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT * FROM users WHERE username = %s OR email = %s", 
                      (data['username'], data['email']))
        existing_user = cursor.fetchone()
        
        if existing_user:
            return jsonify({"error": "Username or email already exists"}), 400
        
        hashed_password = generate_password_hash(data['password'])
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
            (data['username'], data['email'], hashed_password)
        )
        conn.commit()
        return jsonify({"message": "User registered successfully"}), 201
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')
    
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
            
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"success": False, "error": "Email and password are required"}), 400
        
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Get user by email
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
            
            if user and check_password_hash(user['password'], password):
                # Store user info in session
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['is_admin'] = user['is_admin']
                
                # Debug print to verify session data
                print("Session after login:", session)
                
                return jsonify({
                    "success": True,
                    "user_id": user['id'],
                    "username": user['username'],
                    "is_admin": user['is_admin'],
                    "redirect": "/admin" if user['is_admin'] else "/"
                })
            
            return jsonify({
                "success": False,
                "error": "Invalid email or password"
            }), 401
            
        except Exception as e:
            print("Login error:", e)
            return jsonify({
                "success": False,
                "error": "An error occurred during login"
            }), 500
        finally:
            cursor.close()
            conn.close()
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or not session.get('is_admin'):
            return redirect(url_for('serve_login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/upload')
def upload_page():
    return render_template('upload.html')

@app.route('/upload', methods=['POST'])
def upload_video():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor()
    
    try:
        file = request.files.get('file')
        title = request.form.get('title', 'Untitled')
        description = request.form.get('description', '')

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Store only the filename in the database, not the full path
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            
            # Store just the filename in the database
            cursor.execute(
                "INSERT INTO videos (title, description, file_path, user_id) VALUES (%s, %s, %s, %s)",
                (title, description, filename, session['user_id'])
            )
            conn.commit()
            return jsonify({"message": "Video uploaded successfully"}), 201
        return jsonify({"error": "Invalid file type"}), 400
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

@app.route('/videos')
def get_videos():
    search_query = request.args.get('q', '')  # Get search term from URL query params

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Search in title or description using SQL LIKE
        cursor.execute("""
            SELECT videos.*, users.username 
            FROM videos 
            JOIN users ON videos.user_id = users.id
            WHERE videos.title LIKE %s OR videos.description LIKE %s
            ORDER BY videos.created_at DESC
        """, (f'%{search_query}%', f'%{search_query}%'))
        
        videos = cursor.fetchall()
        return jsonify(videos)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

@app.route('/videos/<int:video_id>', methods=['DELETE'])
def delete_video(video_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT is_admin FROM users WHERE id = %s", (session['user_id'],))
        user = cursor.fetchone()
        
        if not user or not user['is_admin']:
            return jsonify({"error": "Admin access required"}), 403

        cursor.execute("SELECT file_path FROM videos WHERE id = %s", (video_id,))
        video = cursor.fetchone()
        
        if video and video['file_path']:
            try:
                os.remove(video['file_path'])
            except Exception as e:
                print("Error deleting file:", e)

        cursor.execute("DELETE FROM videos WHERE id = %s", (video_id,))
        conn.commit()
        return jsonify({"message": "Video deleted"}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

@app.route('/register')
def serve_register():
    return render_template('register.html')


# --------------------------
# Admin Routes
# --------------------------
@app.route('/admin')
@admin_required
def admin_dashboard():
    return render_template('admin.html')
@app.route('/check-admin')
def check_admin():
    return jsonify({
        'is_admin': session.get('is_admin', False),
        'logged_in': 'user_id' in session
    })

@app.route('/admin/users')
@admin_required
def get_all_users():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT id, username, email, is_admin, created_at FROM users")
        users = cursor.fetchall()
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    if not session.get('is_admin'):
        return jsonify({"error": "Admin access required"}), 403

    conn = get_db()
    cursor = conn.cursor()
    
    try:
        # Delete user's videos first (optional, add ON DELETE CASCADE in SQL instead)
        cursor.execute("DELETE FROM videos WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return jsonify({"message": "User deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/admin/users/<int:user_id>/toggle-admin', methods=['POST'])
def toggle_admin(user_id):
    if not session.get('is_admin'):
        return jsonify({"error": "Admin access required"}), 403

    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("UPDATE users SET is_admin = NOT is_admin WHERE id = %s", (user_id,))
        conn.commit()
        return jsonify({"message": "Admin status updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('serve_login'))

if __name__ == '__main__':
    app.run(debug=True)