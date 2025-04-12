import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet
} from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export default function App() {
  const [started, setStarted] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [fileText, setFileText] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [highlightText, setHighlightText] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file || (file.type !== 'application/pdf' && file.type !== 'text/plain')) {
      alert("Please upload a .txt or .pdf file.");
      return;
    }

    setFileName(file.name);

    if (file.type === 'text/plain') extractFromText(file);
    if (file.type === 'application/pdf') {
      setPdfFile(file);
    }
  };

  const extractFromText = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      setFileText(text);
    };
    reader.readAsText(file);
  };

  const highlightAndDownloadPDF = async () => {
    if (!pdfFile || !highlightText) return alert('No PDF or highlights provided.');

    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    const lines = highlightText.split('\n');
    lines.forEach((line, idx) => {
      page.drawText(line, {
        x: 50,
        y: height - 50 - idx * 20,
        size: 14,
        font: helveticaFont,
        color: rgb(1, 0.8, 0),
      });
    });

    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `highlighted_${fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <View style={styles.container}>
      {!started ? (
        <View style={styles.startPage}>
          <Text style={styles.mainTitle}>📄 Welcome to DocScanner</Text>
          <Text style={styles.mainSubtitle}>
            Upload a text or PDF file. View PDFs or extract highlights from .txt.
          </Text>
          <Button mode="contained" style={styles.getStartedBtn} onPress={() => setStarted(true)}>
            Get Started
          </Button>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>📄 DocScanner Web</Text>
            <Text style={styles.subtitle}>Upload a PDF or .txt file. Highlighted words from .txt will be saved.</Text>
          </View>

          <View style={styles.card}>
            <input
              type="file"
              accept="application/pdf,text/plain"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <View style={styles.buttonGroup}>
              <Button mode="contained" onPress={() => fileInputRef.current.click()}>
                Upload PDF or TXT
              </Button>
              <Button mode="contained" disabled={!fileText && !pdfFile} onPress={highlightAndDownloadPDF}>
                Save Highlights
              </Button>
            </View>

            {fileName ? (
              <Text style={styles.helperText}>Uploaded: {fileName}</Text>
            ) : (
              <Text style={styles.helperText}>Select a file to begin.</Text>
            )}

            {pdfFile && (
              <iframe
                src={URL.createObjectURL(pdfFile)}
                width="100%"
                height="600px"
                style={{ border: '1px solid #ccc', borderRadius: 10, marginTop: 20 }}
              ></iframe>
            )}

            <TextInput
              label="Enter text to highlight"
              value={highlightText}
              onChangeText={setHighlightText}
              mode="outlined"
              multiline
              style={{ marginTop: 20 }}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  startPage: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  mainSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  getStartedBtn: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  container: {
    flex: 1,
    padding: 30,
    backgroundColor: '#f4f6f8',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  card: {
    width: '100%',
    maxWidth: 1000,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 20,
  },
  helperText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#999',
  },
});
