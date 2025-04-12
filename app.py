from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import fitz  # PyMuPDF
import nltk
from nltk.tokenize import sent_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
import ollama

# Download required NLTK resources
nltk.download('punkt')
nltk.download('stopwords')

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

# ------------ Helper: Generate MCQs -------------
def generate_mcqs_with_ollama(sentence, num_questions):
    prompt = f"Generate {num_questions} multiple-choice questions from the following sentence:\n\n{sentence}\n\nEach MCQ should have 4 options, with one correct answer marked clearly."
    response = ollama.chat(model="mistral", messages=[{"role": "user", "content": prompt}])
    return response['message']['content']

# ------------ Endpoint: Highlight Text & Generate MCQs -------------
@app.route('/highlight-text', methods=['POST'])
def highlight_text():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    filename = file.filename
    pdf_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(pdf_path)

    try:
        doc = fitz.open(pdf_path)
        full_text = "".join([page.get_text() for page in doc])

        # Extract sentences & score them
        sentences = sent_tokenize(full_text)
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(sentences)
        scores = np.array(tfidf_matrix.sum(axis=1)).flatten()
        top_indices = scores.argsort()[::-1][:5]

        mcq_text = "\n\nGenerated MCQs:\n"
        highlighted_text = ""

        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            for index in top_indices:
                sentence = sentences[index]
                highlighted_text += f"=> {sentence}\n"
                mcq_text += generate_mcqs_with_ollama(sentence, 1) + "\n"

                # Highlight sentence
                for rect in page.search_for(sentence):
                    page.add_highlight_annot(rect)

        # Add MCQs as a new page
        doc.insert_page(doc.page_count, text=mcq_text)

        # Save new PDF
        output_path = os.path.join(UPLOAD_FOLDER, 'highlighted_with_mcqs.pdf')
        doc.save(output_path)

        return send_file(output_path, as_attachment=True)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ------------ Endpoint: Generate MCQs only -------------
@app.route('/generate-mcqs', methods=['POST'])
def generate_mcqs():
    if 'file' not in request.files or 'num_questions' not in request.form:
        return jsonify({'error': 'Missing file or num_questions'}), 400

    file = request.files['file']
    num_questions = int(request.form.get('num_questions'))
    pdf_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(pdf_path)

    try:
        doc = fitz.open(pdf_path)
        text = "".join([doc[i].get_text() for i in range(doc.page_count)])
        mcqs = generate_mcqs_with_ollama(text, num_questions)
        return jsonify({'mcqs': mcqs})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ------------ Server Start -------------
if __name__ == '__main__':
    app.run(debug=True)

